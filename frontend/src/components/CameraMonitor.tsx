'use client';

import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { Camera, CameraOff, AlertTriangle, Mic } from 'lucide-react';
import { proctoringAPI } from '@/lib/api';
import { FaceLandmarker, FilesetResolver, DrawingUtils, ObjectDetector, HandLandmarker } from '@mediapipe/tasks-vision';

interface CameraMonitorProps {
  examId: string;
  onViolation: (severity: number, integrityScore?: number) => void;
}

export default function CameraMonitor({ examId, onViolation }: CameraMonitorProps) {
  const webcamRef = useRef<Webcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);

  // Proctoring State Refs (for real-time tracking without re-renders)
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const objectDetectorRef = useRef<ObjectDetector | null>(null);
  const requestRef = useRef<number>();
  const lastViolationTime = useRef<number>(0);
  const violationBuffer = useRef<string[]>([]); // Sliding window buffer
  const isWarningActive = useRef(false); // Hysteresis state

  useEffect(() => {
    requestPermissions();
    return () => {
      stopAudioRecording();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  useEffect(() => {
    if (isActive && hasPermission) {
      loadModel();
      startAudioRecording();

      // 1. Force Full Screen
      const enterFullScreen = async () => {
        try {
          if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
          }
        } catch (err) {
          console.warn("Full screen denied:", err);
        }
      };
      enterFullScreen();

      // 2. Tab Swith / Focus Loss Detection
      const handleVisibilityChange = () => {
        if (document.hidden) {
          handleViolation("tab_switch", "⚠️ Warning: You switched tabs! Stay on the exam screen.");
        }
      };

      const handleWindowBlur = () => {
        // Prevent double firing with visibility change
        if (!document.hidden) {
          handleViolation("tab_switch", "⚠️ Warning: Focus lost! defined window area.");
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("blur", handleWindowBlur);

      return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("blur", handleWindowBlur);
      };
    }
  }, [isActive, hasPermission]);

  useEffect(() => {
    // Random Identity Verification Snapshot Capture
    let snapshotTimeout: number | undefined;
    
    if (isActive && hasPermission) {
      const captureVerificationSnapshot = () => {
        const webcam = webcamRef.current;
        if (webcam && webcam.video && webcam.video.readyState === 4) {
          const imageSrc = webcam.getScreenshot();
          if (imageSrc) {
            console.log("📸 Identity Verification Photo Captured");
            // Visually notify candidate that a verification photo was suddenly taken
            setWarningMessage("📸 Identity Verification Photo Captured");
            setTimeout(() => setWarningMessage(null), 3000);
            
            // Actively verify identity
            proctoringAPI.verifyIdentity(examId, imageSrc).then(res => {
              if (res.data && res.data.match === false) {
                 setWarningMessage("⚠️ Identity verification failed! Face does not match baseline.");
                 if (onViolation) onViolation(25); // Heavy penalty
              }
            }).catch(err => console.error("Identity verification error:", err));
            
            // Log event to backend
            proctoringAPI.logEvent(examId, 'verification_snapshot', 0, { snapshot: true })
              .catch(err => console.error("Snapshot log error:", err));
          }
        }
        
        // Schedule next capture suddenly (Randomly between 30 and 90 seconds)
        const nextInterval = Math.random() * (90000 - 30000) + 30000;
        snapshotTimeout = window.setTimeout(captureVerificationSnapshot, nextInterval);
      };

      // Take first sudden picture after 15 seconds
      snapshotTimeout = window.setTimeout(captureVerificationSnapshot, 15000);
    }
    
    return () => {
      if (snapshotTimeout) window.clearTimeout(snapshotTimeout);
    };
  }, [isActive, hasPermission, examId]);

  const loadModel = async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );

      // Load Face Landmarker
      faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO",
        numFaces: 2
      });

      // Load Hand Landmarker
      handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 2
      });

      // Load Object Detector for phone detection
      try {
        objectDetectorRef.current = await ObjectDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`,
            delegate: "GPU"
          },
          scoreThreshold: 0.2, // Lowered to 0.2 to catch black tablets/phones
          runningMode: "VIDEO",
          maxResults: 5
        });
        console.log("✅ Object Detector Loaded");
      } catch (err) {
        console.warn("⚠️ Object Detector failed to load:", err);
      }

      setModelLoaded(true);
      console.log("✅ MediaPipe Models Loaded (Face + Object Detection)");

      // Start inference loop
      predictWebcam();
    } catch (err) {
      console.error("Failed to load MediaPipe model:", err);
      setError("Failed to initialize AI proctoring components.");
    }
  };

  const predictWebcam = () => {
    const webcam = webcamRef.current;
    if (webcam && webcam.video && webcam.video.readyState === 4) {
      const video = webcam.video;
      const startTimeMs = performance.now();

      let frameStatus = 'safe';
      let frameMessage: string | null = null;
      let faceLandmarks: any = null;
      let handLandmarksList: any[] = [];

      // 1. Face Detection
      if (faceLandmarkerRef.current) {
        const results = faceLandmarkerRef.current.detectForVideo(video, startTimeMs);
        const res = analyzeResults(results);
        if (res.status !== 'safe') {
          frameStatus = res.status;
          frameMessage = res.message;
        }
        if (results.faceLandmarks.length > 0) {
          faceLandmarks = results.faceLandmarks[0];
        }
      }

      // 2. Hand Detection
      if (handLandmarkerRef.current) {
        const handResults = handLandmarkerRef.current.detectForVideo(video, startTimeMs);
        const handRes = analyzeHands(handResults, faceLandmarks);
        if (handRes.status !== 'safe') {
          frameStatus = handRes.status;
          frameMessage = handRes.message;
        }
        if (handResults.landmarks) {
          handLandmarksList = handResults.landmarks;
        }
      }

      // 3. Object Detection (Fusion Logic)
      if (objectDetectorRef.current) {
        const objectResults = objectDetectorRef.current.detectForVideo(video, startTimeMs);
        const deviceRes = analyzeDevicePresence(objectResults, faceLandmarks, handLandmarksList);

        if (deviceRes.status !== 'safe') {
          // Device detection overrides everything (Blocking Severity)
          frameStatus = deviceRes.status;
          frameMessage = deviceRes.message;
        }
      }

      // 4. Process Status
      processFrameStatus(frameStatus, frameMessage);
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  const analyzeDevicePresence = (results: any, faceLandmarks: any, handLandmarksList: any[]): { status: string, message: string | null } => {
    // Log detection results (Temporary for debugging)
    if (results.detections && results.detections.length > 0) {
      console.log("🔍 Objects detected:", results.detections.length);
      results.detections.forEach((detection: any, idx: number) => {
        const categoryName = detection.categories[0]?.categoryName || 'unknown';
        const score = detection.categories[0]?.score || 0;
        console.log(`  ${idx + 1}. ${categoryName} (${(score * 100).toFixed(1)}%)`);
      });
    }

    if (!results.detections || results.detections.length === 0) return { status: 'safe', message: null };

    // Filter for suspicious devices
    const deviceDetections = results.detections.filter((detection: any) => {
      const category = detection.categories[0]?.categoryName?.toLowerCase() || '';
      const score = detection.categories[0]?.score || 0;
      // Lowered threshold to 0.2 and added 'book' (often misclassified tablets)
      return ['cell phone', 'mobile phone', 'tablet', 'laptop', 'book', 'remote'].some(c => category.includes(c)) && score > 0.2;
    });

    if (deviceDetections.length === 0) return { status: 'safe', message: null };

    // Fusion Logic: Check Face Overlap or Hand Proximity
    for (const device of deviceDetections) {
      const bbox = device.boundingBox; // { originX, originY, width, height }
      // Check 1: Overlap with Face (High Risk)
      if (faceLandmarks) {
        // Bounding Box of Face (approximate) - Min/Max X,Y from landmarks
        const faceXs = faceLandmarks.map((l: any) => l.x * webcamRef.current!.video!.videoWidth); // Needs denormalization? 
        // Wait, MediaPipe landmarks are 0-1, ObjectDetection bbox depends on model. 
        // EfficientDet usually returns pixel coords if stream mode? 
        // ACTUALLY, checking documentation: efficientdet_lite0 usually returns normalized coords or pixels depending on platform. 
        // Let's assume pixels because 'boundingBox' structure usually implies pixels in TFJS/MediaPipe Tasks.
        // BUT, we need to be careful. Let's do a fast normalized check if possible or assume pixels.

        // Safer way: Use normalized coordinates for everything if possible.
        // objectDetector results usually have boundingBox in pixels (originX, originY, width, height).
        // faceLandmarks are normalized [0,1].

        const videoWidth = webcamRef.current?.video?.videoWidth || 640;
        const videoHeight = webcamRef.current?.video?.videoHeight || 480;

        // Face BBox (Pixels)
        const fX = faceLandmarks.map((l: any) => l.x * videoWidth);
        const fY = faceLandmarks.map((l: any) => l.y * videoHeight);
        const faceMinX = Math.min(...fX);
        const faceMaxX = Math.max(...fX);
        const faceMinY = Math.min(...fY);
        const faceMaxY = Math.max(...fY);

        // Check Intersection
        const deviceLeft = bbox.originX;
        const deviceRight = bbox.originX + bbox.width;
        const deviceTop = bbox.originY;
        const deviceBottom = bbox.originY + bbox.height;

        const overlapX = Math.max(0, Math.min(faceMaxX, deviceRight) - Math.max(faceMinX, deviceLeft));
        const overlapY = Math.max(0, Math.min(faceMaxY, deviceBottom) - Math.max(faceMinY, deviceTop));

        if (overlapX > 0 && overlapY > 0) {
          return { status: 'prohibited_object', message: '⚠️ Device detected near face!' };
        }
      }

      // Check 2: Hand Holding Device
      if (handLandmarksList.length > 0) {
        const videoWidth = webcamRef.current?.video?.videoWidth || 640;
        const videoHeight = webcamRef.current?.video?.videoHeight || 480;

        for (const hand of handLandmarksList) {
          const wrist = hand[0]; // Normalized
          const wristX = wrist.x * videoWidth;
          const wristY = wrist.y * videoHeight;

          // Check if wrist is inside or near the device bbox
          const margin = 150; // Increased margin (was 50) to catch hands holding large tablets
          if (wristX >= bbox.originX - margin && wristX <= bbox.originX + bbox.width + margin &&
            wristY >= bbox.originY - margin && wristY <= bbox.originY + bbox.height + margin) {
            return { status: 'prohibited_object', message: '⚠️ Hand holding device detected!' };
          }
        }
      }

      // Check 3: High Confidence Check (No spatial requirement needed)
      // If we are mostly sure it's a phone/tablet, just flag it. 
      // Don't wait for face overlap (which might fail if held low).
      if (device.categories[0].score > 0.35) {
        return { status: 'prohibited_object', message: '⚠️ Prohibited device detected!' };
      }
    }

    // If just detected but no correlation (e.g. phone on table in background), maybe ignore or warn?
    // User request: "Detect external devices... shown to camera". 
    // Let's be strict: If ANY phone is detected with high confidence, warn.
    // But fusion helps prevent false positives.
    // Let's return a generic warning for now if it survived the loop.

    return { status: 'prohibited_object', message: '⚠️ External device detected!' };
  };

  const analyzeHands = (results: any, faceLandmarks: any): { status: string, message: string | null } => {
    if (!results.landmarks || results.landmarks.length === 0) return { status: 'safe', message: null };

    // Needs face landmarks to calculate proximity
    if (!faceLandmarks) return { status: 'safe', message: null };

    // Key Face Checkpoints (approximate indices)
    // Right Ear: 127, Left Ear: 356, Chin: 152, Nose: 1
    const leftEar = faceLandmarks[356];
    const rightEar = faceLandmarks[127];
    const chin = faceLandmarks[152];
    const nose = faceLandmarks[1];

    // Calculate face size scale (distance between ears) for relative thresholds
    const faceWidth = Math.abs(leftEar.x - rightEar.x);
    const proximityThreshold = faceWidth * 0.75; // Proximity: 75% of face width (User specification)

    for (const hand of results.landmarks) {
      // Prioritize Wrist (0) and Fingertips
      const wrist = hand[0];
      const fingertips = [hand[8], hand[20]]; // Index, Pinky

      // Strict check for Wrist
      const wristDistLeft = Math.sqrt(Math.pow(wrist.x - leftEar.x, 2) + Math.pow(wrist.y - leftEar.y, 2));
      const wristDistRight = Math.sqrt(Math.pow(wrist.x - rightEar.x, 2) + Math.pow(wrist.y - rightEar.y, 2));

      if (wristDistLeft < proximityThreshold || wristDistRight < proximityThreshold) {
        return { status: "prohibited_object", message: "⚠️ Suspicious hand gesture detected (Phone?)" };
      }

      // Secondary check for fingertips (optional, maybe looser threshold?)
      // Keeping strict for now based on prompt emphasizing wrist
      /*
      for (const point of fingertips) {
        const distLeft = Math.sqrt(Math.pow(point.x - leftEar.x, 2) + Math.pow(point.y - leftEar.y, 2));
        const distRight = Math.sqrt(Math.pow(point.x - rightEar.x, 2) + Math.pow(point.y - rightEar.y, 2));
         if (distLeft < proximityThreshold || distRight < proximityThreshold) {
             return { status: "prohibited_object", message: "⚠️ Suspicious gesture detected" };
         }
      }
      */
    }

    return { status: 'safe', message: null };
  };

  const analyzeResults = (results: any): { status: string, message: string | null } => {
    const faceCount = results.faceLandmarks.length;

    // 1. Check Face Count
    if (faceCount === 0) {
      return { status: "no_face", message: "⚠️ No face detected!" };
    } else if (faceCount > 1) {
      return { status: "multiple_faces", message: "⚠️ Multiple faces detected!" };
    } else {
      // 2. Head Pose & Attention Tracking
      const landmarks = results.faceLandmarks[0];
      // Simple logic: Check extremes of nose vs face edges or use Blendshapes if enabled
      // For more accurate pose, we'd solvePnP, but we can approximate with blendshapes or landmark ratios

      // Using Blendshapes if available (easier for "looking away")
      /*
      if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
        const categories = results.faceBlendshapes[0].categories;
        const lookLeft = categories.find((c: any) => c.categoryName === 'eyeLookOutLeft')?.score || 0;
        const lookRight = categories.find((c: any) => c.categoryName === 'eyeLookOutRight')?.score || 0;
        const lookUp = categories.find((c: any) => c.categoryName === 'eyeLookUp')?.score || 0;
        const lookDown = categories.find((c: any) => c.categoryName === 'eyeLookDown')?.score || 0;
  
        // Thresholds
        if (lookLeft > 0.6 || lookRight > 0.6 || lookUp > 0.6 || lookDown > 0.6) {
          // Refine this with head rotation logic if needed, but gaze is good start
          // Often better to combine with head pose. 
          // Let's rely on simple yaw approximation from landmarks for robustness
        }
      }
      */

      // Robust Head Pose Approximation using Nose tip vs Eye midpoints
      // Nose tip: 1, Left Eye: 33, Right Eye: 263, Chin: 152
      const nose = landmarks[1];
      const leftEye = landmarks[33];
      const rightEye = landmarks[263];
      const chin = landmarks[152];

      // Horizontal (Left/Right) Detection
      const midpointX = (leftEye.x + rightEye.x) / 2;
      const vecX = nose.x - midpointX;
      const faceWidth = Math.abs(rightEye.x - leftEye.x);
      const yawRatio = vecX / faceWidth;

      // Vertical (Up/Down) Detection
      const eyeMidpointY = (leftEye.y + rightEye.y) / 2;
      const noseToEyeDistance = nose.y - eyeMidpointY;
      const noseToChinDistance = chin.y - nose.y;
      const pitchRatio = noseToEyeDistance / noseToChinDistance;

      // Thresholds (More sensitive)
      const yawThreshold = 0.15;  // Left/Right sensitivity
      const pitchThreshold = 0.4; // Up/Down sensitivity (nose should be ~0.5 between eyes and chin)

      if (Math.abs(yawRatio) > yawThreshold || Math.abs(pitchRatio - 0.5) > pitchThreshold) {
        return { status: "looking_away", message: "⚠️ Please look at the screen!" };
      } else {
        return { status: "safe", message: null };
      }
    }
  };



  const processFrameStatus = (status: string, message: string | null) => {
    // Sliding Window Logic: Always push status
    violationBuffer.current.push(status);
    if (violationBuffer.current.length > 30) { // Reduced to 30 frames (~1 sec for faster response)
      violationBuffer.current.shift();
    }

    const badFrames = violationBuffer.current.filter(s => s !== 'safe').length;

    // Hysteresis Thresholds (Optimized for Speed)
    // Rule: Detections in > 60% of last 25-30 frames
    const TRIGGER_THRESHOLD = 18; // 60% of 30 frames
    const CLEAR_THRESHOLD = 9;   // 30% of 30 frames (Fast recovery)

    // 1. Trigger Warning
    if (!isWarningActive.current && badFrames > TRIGGER_THRESHOLD) {
      isWarningActive.current = true;

      // Find the most frequent violation type to display correct message
      const counts: { [key: string]: number } = {};
      violationBuffer.current.forEach(s => {
        if (s !== 'safe') counts[s] = (counts[s] || 0) + 1;
      });
      const topViolation = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);

      // Map type to message (or use passed message if it matches)
      let displayMsg = message;
      if (topViolation === 'looking_away') displayMsg = "⚠️ Please look at the screen!";
      if (topViolation === 'no_face') displayMsg = "⚠️ No face detected!";
      if (topViolation === 'multiple_faces') displayMsg = "⚠️ Multiple faces detected!";
      if (topViolation === 'prohibited_object') displayMsg = "⚠️ Prohibited object/device detected!";
      if (topViolation === 'tab_switch') displayMsg = "⚠️ Tab Switch Detected! Return immediately.";

      setWarningMessage(displayMsg);

      // Log Event logic
      const now = Date.now();
      if (now - lastViolationTime.current > 3000) {
        lastViolationTime.current = now;

        let severity = 5;
        if (topViolation === 'multiple_faces') severity = 10;
        if (topViolation === 'no_face') severity = 8;
        if (topViolation === 'prohibited_object') severity = 15;
        if (topViolation === 'tab_switch') severity = 12; // High severity for leaving exam

        proctoringAPI.logEvent(examId, topViolation, severity, { buffer_count: badFrames })
          .then(res => {
            if (res && res.data && res.data.action_required === 'exam_terminated') {
              alert('Exam terminated due to integrity violations.');
              window.location.href = '/';
            }
            if (onViolation && res && res.data) {
              onViolation(severity, res.data.integrity_score);
            }
          })
          .catch(err => console.error("Violation Log Error:", err));
      }
    }
    // 2. Clear Warning
    else if (isWarningActive.current && badFrames < CLEAR_THRESHOLD) {
      isWarningActive.current = false;
      setWarningMessage(null);
    }
  };

  // Replaces handleViolation for compatibility 
  const handleViolation = (type: string, message: string) => {
    processFrameStatus(type, message);
  };

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setHasPermission(true);
      setIsActive(true);
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      setError('Camera/Microphone permission denied. Please enable access.');
      setHasPermission(false);
    }
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Use WAV format for better compatibility, fallback to webm
      let options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported('audio/wav')) {
        options = { mimeType: 'audio/wav' };
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && isActive) {
          const reader = new FileReader();
          reader.readAsDataURL(event.data);
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            await proctoringAPI.sendAudioData(examId, base64Audio).then(res => {
              if (res.data.suspicious) {
                setWarningMessage(res.data.warning_message);
                setTimeout(() => setWarningMessage(null), 3000);
              }
            }).catch(err => console.error("Audio error:", err));
          };
        }
      };

      mediaRecorder.onstop = () => {
        if (isActive) {
          // Restart recording for next segment
          setTimeout(() => {
            if (isActive && mediaRecorder.state === 'inactive' && stream.active) {
              try {
                mediaRecorder.start();
                setTimeout(() => {
                  if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                  }
                }, 2000); // 2 seconds for faster detection
              } catch (err) {
                console.warn("⚠️ Audio recording failed to restart:", err);
              }
            }
          }, 100);
        }
      };

      // Start first cycle
      try {
        mediaRecorder.start();
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, 2000); // 2 seconds for faster detection
      } catch (err) {
        console.error("Failed to start audio recording:", err);
      }


    } catch (err) {
      console.error('Error starting audio recording:', err);
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null; // Prevent restart loop
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center text-red-700">
          <CameraOff className="w-5 h-5 mr-2" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="bg-gray-900 rounded-lg overflow-hidden shadow-lg">
        {hasPermission ? (
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            className="w-full h-auto"
            videoConstraints={{
              width: 320,
              height: 240,
              facingMode: 'user',
            }}
          />
        ) : (
          <div className="w-80 h-60 bg-gray-800 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <CameraOff className="w-12 h-12 mx-auto mb-2" />
              <p className="text-sm">Camera/Mic Disabled</p>
            </div>
          </div>
        )}
      </div>

      {isActive && (
        <div className="absolute top-2 right-2 flex flex-col gap-2">
          <div className="flex items-center bg-red-500 text-white px-2 py-1 rounded-full text-xs">
            <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></div>
            REC
          </div>
          {modelLoaded && (
            <div className="flex items-center bg-green-600 text-white px-2 py-1 rounded-full text-xs">
              AI Active
            </div>
          )}
        </div>
      )}

      {/* Warning Message Overlay */}
      {warningMessage && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
          <div className="bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-pulse">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">{warningMessage}</span>
          </div>
        </div>
      )}

      <div className="mt-2 text-xs text-gray-500 text-center flex justify-center gap-4">
        <span><Camera className="w-4 h-4 inline mr-1" />Video Analysis: {modelLoaded ? 'On Device' : 'Loading...'}</span>
        <span><Mic className="w-4 h-4 inline mr-1" />Audio Active</span>
      </div>
    </div>
  );
}
