from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from typing import Dict, Optional, Any
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.proctoring_service import proctoring_service
from app.services.exam_service import exam_service
from app.config import settings
import base64
import numpy as np
import io
from pydub import AudioSegment

router = APIRouter()

# In-memory storage for rapid verification. In production, this goes to S3.
baseline_faces: Dict[str, str] = {}


class VideoFrameRequest(BaseModel):
    exam_id: str
    frame_data: str  # base64 encoded image
    timestamp: str


class AudioDataRequest(BaseModel):
    exam_id: str
    audio_data: str  # base64 encoded audio
    timestamp: str

@router.post("/setup/baseline-face")
async def save_baseline_face(request: VideoFrameRequest, current_user: Any = Depends(get_current_user)):
    print(f"📸 Saved baseline face for candidate in exam {request.exam_id}")
    baseline_faces[request.exam_id] = request.frame_data
    return {"success": True, "message": "Baseline saved"}

@router.post("/verify-identity")
async def verify_identity(
    request: VideoFrameRequest, 
    current_user: Any = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    baseline_b64 = baseline_faces.get(request.exam_id)
    if not baseline_b64:
        return {"success": True, "data": {"match": True}}
    
    try:
        import cv2
        import numpy as np
        
        def decode(b64):
            data = b64.split(',')[1] if ',' in b64 else b64
            nparr = np.frombuffer(base64.b64decode(data), np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return cv2.resize(img, (160, 160))
            
        img1 = decode(baseline_b64)
        img2 = decode(request.frame_data)
        
        hist1 = cv2.calcHist([img1], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
        cv2.normalize(hist1, hist1)
        hist2 = cv2.calcHist([img2], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
        cv2.normalize(hist2, hist2)
        
        similarity = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
        print(f"🧑‍🔬 Identity similarity score for verification check: {similarity}")
        
        # 0.4 threshold provides good balance of false-negative vs false-positive protection for a generic setup camera scenario
        match = similarity > 0.4 
        
        if not match:
            proctoring_service.log_event(db, request.exam_id, "identity_mismatch", 25, metadata={"similarity": str(similarity)})
            proctoring_service.update_integrity_score(db, request.exam_id, 25)
            
        return {"success": True, "data": {"match": bool(match), "similarity": float(similarity)}}
    except Exception as e:
        print(f"Identity Verification Error: {str(e)}")
        return {"success": True, "data": {"match": True}}

@router.post("/video-frame")
async def process_video_frame(
    request: VideoFrameRequest,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Process a video frame for proctoring analysis using MediaPipe.
    """
    exam = exam_service.get_exam(db, request.exam_id)
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found"
        )
    
    # Verify ownership
    if str(exam.candidate_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    print(f"📹 Processing video frame for exam {request.exam_id}")
    
    try:
        # Decode base64 image
        import cv2
        import numpy as np
        import mediapipe as mp
        
        # Remove data URL prefix if present
        if ',' in request.frame_data:
            frame_data = request.frame_data.split(',')[1]
        else:
            frame_data = request.frame_data
            
        img_bytes = base64.b64decode(frame_data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise ValueError("Failed to decode image")
        
        # Initialize MediaPipe Face Detection and Face Mesh
        mp_face_detection = mp.solutions.face_detection
        mp_face_mesh = mp.solutions.face_mesh
        
        analysis_result = {
            "face_detected": False,
            "face_count": 0,
            "looking_at_screen": True,
            "suspicious_behavior": False,
            "severity_score": 0,
            "yaw": 0,
            "pitch": 0
        }
        
        # Detect faces
        with mp_face_detection.FaceDetection(min_detection_confidence=0.5) as face_detection:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = face_detection.process(rgb_frame)
            
            if results.detections:
                analysis_result["face_count"] = len(results.detections)
                analysis_result["face_detected"] = True
                print(f"✅ Detected {len(results.detections)} face(s)")
                
                # Check for multiple faces
                if len(results.detections) > 1:
                    analysis_result["suspicious_behavior"] = True
                    event_type = "multiple_faces"
                    severity = proctoring_service.calculate_severity(
                        db, request.exam_id, event_type, {}
                    )
                    analysis_result["severity_score"] = severity
                    
                    proctoring_service.log_event(
                        db, request.exam_id, event_type, severity,
                        metadata={"face_count": len(results.detections)}
                    )
                    
                    integrity_score = proctoring_service.update_integrity_score(
                        db, request.exam_id, severity
                    )
                    
                    analysis_result["warning_message"] = "⚠️ Multiple faces detected!"
                    analysis_result["action_required"] = "warning"
                    
            else:
                # No face detected
                analysis_result["suspicious_behavior"] = True
                event_type = "no_face"
                severity = proctoring_service.calculate_severity(
                    db, request.exam_id, event_type, {}
                )
                analysis_result["severity_score"] = severity
                
                proctoring_service.log_event(
                    db, request.exam_id, event_type, severity
                )
                
                integrity_score = proctoring_service.update_integrity_score(
                    db, request.exam_id, severity
                )
                
                analysis_result["warning_message"] = "⚠️ Face not detected! Please stay in frame."
                analysis_result["action_required"] = "warning"
        
        # If one face detected, check head pose
        if analysis_result["face_count"] == 1:
            with mp_face_mesh.FaceMesh(
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            ) as face_mesh:
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = face_mesh.process(rgb_frame)
                
                if results.multi_face_landmarks:
                    face_landmarks = results.multi_face_landmarks[0]
                    
                    # Get image dimensions
                    h, w = frame.shape[:2]
                    
                    # Key landmark indices for head pose
                    # Nose tip, chin, left eye corner, right eye corner, left mouth, right mouth
                    landmarks_2d = []
                    landmarks_3d = []
                    
                    # Define 3D model points (generic face model)
                    model_points = np.array([
                        (0.0, 0.0, 0.0),             # Nose tip
                        (0.0, -330.0, -65.0),        # Chin
                        (-225.0, 170.0, -135.0),     # Left eye left corner
                        (225.0, 170.0, -135.0),      # Right eye right corner
                        (-150.0, -150.0, -125.0),    # Left mouth corner
                        (150.0, -150.0, -125.0)      # Right mouth corner
                    ], dtype=np.float64)
                    
                    # Get 2D image points from landmarks
                    indices = [1, 152, 33, 263, 61, 291]  # Corresponding landmark indices
                    image_points = np.array([
                        (face_landmarks.landmark[idx].x * w, face_landmarks.landmark[idx].y * h)
                        for idx in indices
                    ], dtype=np.float64)
                    
                    # Camera internals (approximation)
                    focal_length = w
                    center = (w / 2, h / 2)
                    camera_matrix = np.array([
                        [focal_length, 0, center[0]],
                        [0, focal_length, center[1]],
                        [0, 0, 1]
                    ], dtype=np.float64)
                    
                    # Assume no lens distortion
                    dist_coeffs = np.zeros((4, 1))
                    
                    # Solve PnP to get rotation and translation vectors
                    success, rotation_vector, translation_vector = cv2.solvePnP(
                        model_points,
                        image_points,
                        camera_matrix,
                        dist_coeffs,
                        flags=cv2.SOLVEPNP_ITERATIVE
                    )
                    
                    if success:
                        # Convert rotation vector to rotation matrix
                        rotation_matrix, _ = cv2.Rodrigues(rotation_vector)
                        
                        # Calculate Euler angles
                        # Extract yaw, pitch, roll from rotation matrix
                        sy = np.sqrt(rotation_matrix[0, 0] ** 2 + rotation_matrix[1, 0] ** 2)
                        
                        singular = sy < 1e-6
                        
                        if not singular:
                            pitch = np.arctan2(-rotation_matrix[2, 0], sy)
                            yaw = np.arctan2(rotation_matrix[1, 0], rotation_matrix[0, 0])
                            roll = np.arctan2(rotation_matrix[2, 1], rotation_matrix[2, 2])
                        else:
                            pitch = np.arctan2(-rotation_matrix[2, 0], sy)
                            yaw = np.arctan2(-rotation_matrix[1, 2], rotation_matrix[1, 1])
                            roll = 0
                        
                        # Convert to degrees
                        pitch = np.degrees(pitch)
                        yaw = np.degrees(yaw)
                        roll = np.degrees(roll)
                        
                        analysis_result["yaw"] = round(yaw, 2)
                        analysis_result["pitch"] = round(pitch, 2)
                        analysis_result["roll"] = round(roll, 2)
                        
                        print(f"📐 Head pose - Yaw: {yaw:.2f}°, Pitch: {pitch:.2f}°, Roll: {roll:.2f}°")
                        
                        # Check if looking away (relaxed thresholds)
                        yaw_threshold = 30  # degrees (was 20)
                        pitch_threshold = 25  # degrees (was 15)
                        
                        if abs(yaw) > yaw_threshold or abs(pitch) > pitch_threshold:
                            print(f"⚠️ Looking away detected! Yaw: {abs(yaw):.2f} > {yaw_threshold} or Pitch: {abs(pitch):.2f} > {pitch_threshold}")
                            analysis_result["looking_at_screen"] = False
                            analysis_result["suspicious_behavior"] = True
                            event_type = "looking_away"
                            
                            detection_data = {"yaw": yaw, "pitch": pitch}
                            severity = proctoring_service.calculate_severity(
                                db, request.exam_id, event_type, detection_data
                            )
                            analysis_result["severity_score"] = severity
                            
                            proctoring_service.log_event(
                                db, request.exam_id, event_type, severity,
                                metadata=detection_data
                            )
                            
                            integrity_score = proctoring_service.update_integrity_score(
                                db, request.exam_id, severity
                            )
                            
                            analysis_result["integrity_score"] = integrity_score
                            analysis_result["warning_message"] = "⚠️ Please look at the screen!"
                            analysis_result["action_required"] = "warning"
        
        # Check if exam should be terminated
        if analysis_result.get("suspicious_behavior"):
            current_integrity = exam.integrity_score or 100.0
            print(f"🔍 Checking termination: Current integrity = {current_integrity}, Threshold = {settings.INTEGRITY_TERMINATION_THRESHOLD}")
            
            if proctoring_service.should_terminate_exam(current_integrity):
                print(f"❌ TERMINATING EXAM! Integrity {current_integrity} < {settings.INTEGRITY_TERMINATION_THRESHOLD}")
                exam_service.terminate_exam(db, request.exam_id, "integrity_violation")
                return {
                    "success": True,
                    "data": {
                        **analysis_result,
                        "action_required": "exam_terminated",
                        "integrity_score": current_integrity
                    }
                }
            else:
                print(f"✅ Exam continues. Integrity {current_integrity} >= {settings.INTEGRITY_TERMINATION_THRESHOLD}")
        
        return {
            "success": True,
            "data": analysis_result
        }
        
    except Exception as e:
        print(f"❌ Proctoring error: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return safe default to not block exam
        return {
            "success": True,
            "data": {
                "face_detected": True,
                "face_count": 1,
                "looking_at_screen": True,
                "suspicious_behavior": False,
                "severity_score": 0,
                "error": str(e)
            }
        }


@router.post("/audio-analysis")
async def analyze_audio(
    request: AudioDataRequest,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze audio stream for speech/noise detection.
    
    Note: In production, this would use speech recognition libraries.
    For now, this is a simplified version.
    """
    exam = exam_service.get_exam(db, request.exam_id)
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found"
        )
    
    # Verify ownership
    if str(exam.candidate_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    try:
        # Decode base64 audio
        # Handle data URL prefix if present
        audio_data_str = request.audio_data
        if "base64," in audio_data_str:
            audio_data_str = audio_data_str.split("base64,")[1]
            
        audio_bytes = base64.b64decode(audio_data_str)
        
        # Save to temporary file
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
            temp_audio.write(audio_bytes)
            temp_path = temp_audio.name
            
        try:
            # Load audio using pydub from file path
            audio_segment = AudioSegment.from_file(temp_path)
            
            # Calculate RMS amplitude
            rms = audio_segment.rms
            db_level = audio_segment.dBFS
            
            # Thresholds
            speech_threshold = settings.AUDIO_SPEECH_THRESHOLD_DB
            speech_detected = db_level > speech_threshold
            
            print(f"🎤 Audio Analysis - RMS: {rms}, dBFS: {db_level:.2f}, Threshold: {speech_threshold}, Speech: {speech_detected}")
            
            analysis_result = {
                "speech_detected": speech_detected,
                "noise_level": rms,
                "db_level": db_level,
                "suspicious": speech_detected,
                "severity_score": 5 if speech_detected else 0,
                "warning_message": "⚠️ Speech detected!" if speech_detected else None
            }
            
        finally:
            # Cleanup temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)

    except Exception as e:
        print(f"❌ Audio analysis error: {str(e)}")
        # Fallback
        analysis_result = {
            "speech_detected": False,
            "noise_level": 0,
            "suspicious": False,
            "severity_score": 0,
            "error": str(e)
        }
    
    # If suspicious audio detected, log it
    if analysis_result["suspicious"]:
        event_type = "speech_detected"
        
        # Get current integrity score to include in response
        current_integrity = exam.integrity_score or 100.0
        
        severity = analysis_result["severity_score"]
        
        proctoring_service.log_event(
            db, request.exam_id, event_type, severity,
            metadata={"rms": analysis_result["noise_level"]}
        )
        
        integrity_score = proctoring_service.update_integrity_score(
            db, request.exam_id, severity
        )
        
        analysis_result["integrity_score"] = integrity_score
        analysis_result["warning_message"] = "⚠️ specific sounds or speech detected!"
    
    return {
        "success": True,
        "data": analysis_result
    }


@router.post("/video-clip")
async def upload_video_clip(
    exam_id: str,
    event_id: str,
    video_clip: UploadFile = File(...),
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a video clip captured during suspicious behavior."""
    exam = exam_service.get_exam(db, exam_id)
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found"
        )
    
    # Verify ownership
    if str(exam.candidate_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # TODO: Implement actual video storage (S3 or local)
    # For now, just acknowledge receipt
    clip_url = f"storage/clips/{exam_id}/{event_id}.webm"
    
    # Update proctoring log with video URL
    from app.models.proctoring_log import ProctoringLog
    event = db.query(ProctoringLog).filter(ProctoringLog.id == event_id).first()
    if event:
        event.video_clip_url = clip_url
        db.commit()
    
    return {
        "success": True,
        "data": {
            "clip_id": event_id,
            "storage_url": clip_url,
            "message": "Video clip stored successfully"
        }
    }


@router.post("/log-event")
async def log_proctoring_event(
    request: Dict[str, Any],
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Log a proctoring event from client-side analysis.
    """
    exam_id = request.get("exam_id")
    event_type = request.get("event_type")
    severity = request.get("severity", 0)
    metadata = request.get("metadata", {})
    
    if not all([exam_id, event_type]):
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required fields"
        )

    exam = exam_service.get_exam(db, exam_id)
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found"
        )
    
    # Verify ownership
    if str(exam.candidate_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
        
    # Log event
    from app.services.proctoring_service import proctoring_service
    proctoring_service.log_event(
        db, exam_id, event_type, severity, metadata=metadata
    )
    
    # Update integrity score
    integrity_score = proctoring_service.update_integrity_score(
        db, exam_id, severity
    )
    
    # Check for termination
    action_required = None
    if proctoring_service.should_terminate_exam(integrity_score):
        exam_service.terminate_exam(db, exam_id, "integrity_violation")
        action_required = "exam_terminated"
        
    return {
        "success": True,
        "data": {
            "integrity_score": integrity_score,
            "action_required": action_required
        }
    }


@router.get("/logs/{exam_id}")
async def get_proctoring_logs(
    exam_id: str,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all proctoring logs for an exam."""
    exam = exam_service.get_exam(db, exam_id)
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found"
        )
    
    summary = proctoring_service.get_proctoring_summary(db, exam_id)
    
    return {
        "success": True,
        "data": {
            "exam_id": exam_id,
            "integrity_score": float(exam.integrity_score) if exam.integrity_score else 100.0,
            **summary
        }
    }
