from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List
from datetime import datetime, timedelta
import math
from app.models.proctoring_log import ProctoringLog
from app.models.exam import Exam
from app.core.cache import cache
from app.config import settings


class ProctoringService:
    """Service for proctoring and integrity monitoring."""
    
    def log_event(
        self,
        db: Session,
        exam_id: str,
        event_type: str,
        severity_score: int,
        metadata: Dict[str, Any] = None
    ) -> ProctoringLog:
        """Log a proctoring event."""
        event = ProctoringLog(
            exam_id=exam_id,
            event_type=event_type,
            severity_score=severity_score,
            timestamp=datetime.utcnow(),
            metadata=metadata
        )
        
        db.add(event)
        db.commit()
        db.refresh(event)
        
        return event
    
    def calculate_severity(
        self,
        db: Session,
        exam_id: str,
        event_type: str,
        detection_data: Dict[str, Any]
    ) -> int:
        """Calculate severity score for an event."""
        # Get recent events of same type (last 5 minutes)
        five_min_ago = datetime.utcnow() - timedelta(minutes=5)
        recent_events = db.query(ProctoringLog).filter(
            ProctoringLog.exam_id == exam_id,
            ProctoringLog.event_type == event_type,
            ProctoringLog.timestamp >= five_min_ago
        ).all()
        
        # Base severity
        severity = 5
        
        if event_type == "no_face":
            severity = 5
            if len(recent_events) >= 3:
                severity += 2
            if len(recent_events) >= 5:
                severity += 2
        
        elif event_type == "multiple_faces":
            severity = 9  # High severity
        
        elif event_type == "looking_away":
            yaw = abs(detection_data.get("yaw", 0))
            pitch = abs(detection_data.get("pitch", 0))
            
            if yaw < 35 and pitch < 30:
                severity = 3
            elif yaw < 50 and pitch < 45:
                severity = 5
            else:
                severity = 7
            
            if len(recent_events) >= 4:
                severity += 2
        
        elif event_type == "speech_detected":
            severity = 6
            if len(recent_events) >= 2:
                severity += 3
        
        elif event_type == "high_noise":
            severity = 4
        
        return min(severity, 10)
    
    def update_integrity_score(
        self,
        db: Session,
        exam_id: str,
        new_event_severity: int
    ) -> float:
        """Update exam integrity score."""
        exam = db.query(Exam).filter(Exam.id == exam_id).first()
        if not exam:
            raise ValueError("Exam not found")
        
        # Get all proctoring events
        all_events = db.query(ProctoringLog).filter(
            ProctoringLog.exam_id == exam_id
        ).all()
        
        # Calculate total severity with time decay
        total_severity = 0
        current_time = datetime.utcnow()
        
        for event in all_events:
            time_diff = (current_time - event.timestamp).total_seconds() / 60  # minutes
            
            # Time decay factor: recent events have more weight
            decay_factor = math.exp(-time_diff / 5)  # 5-minute half-life (faster recovery)
            
            weighted_severity = event.severity_score * decay_factor
            total_severity += weighted_severity
        
        # Calculate integrity score
        penalty_factor = settings.INTEGRITY_PENALTY_FACTOR
        integrity_score = max(0, 100 - (total_severity * penalty_factor))
        
        # Update exam
        exam.integrity_score = round(integrity_score, 2)
        db.commit()
        
        # Update cache
        cache.set(
            f"integrity:{exam_id}",
            integrity_score,
            ttl=3600
        )
        
        return integrity_score
    
    def should_terminate_exam(self, integrity_score: float) -> bool:
        """Check if exam should be terminated based on integrity score."""
        return integrity_score < settings.INTEGRITY_TERMINATION_THRESHOLD
    
    def get_proctoring_summary(
        self,
        db: Session,
        exam_id: str
    ) -> Dict[str, Any]:
        """Get proctoring summary for an exam."""
        events = db.query(ProctoringLog).filter(
            ProctoringLog.exam_id == exam_id
        ).all()
        
        high_severity_events = [e for e in events if e.severity_score >= 7]
        
        # Group by event type
        event_counts = {}
        for event in events:
            event_counts[event.event_type] = event_counts.get(event.event_type, 0) + 1
        
        return {
            "total_events": len(events),
            "high_severity_events": len(high_severity_events),
            "event_counts": event_counts,
            "events": [
                {
                    "id": str(e.id),
                    "event_type": e.event_type,
                    "severity_score": e.severity_score,
                    "timestamp": e.timestamp.isoformat(),
                    "video_clip_url": e.video_clip_url
                }
                for e in events
            ]
        }


proctoring_service = ProctoringService()
