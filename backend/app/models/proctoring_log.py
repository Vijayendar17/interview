from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid
from app.core.database import Base


class ProctoringLog(Base):
    """Proctoring event log model."""
    
    __tablename__ = "proctoring_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False, index=True)
    event_type = Column(String(100), nullable=False)  # no_face, multiple_faces, looking_away, left_frame, speech_detected, noise_detected
    severity_score = Column(Integer)  # 1-10
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    video_clip_url = Column(String(500), nullable=True)
    event_metadata = Column(JSONB, nullable=True)  # Additional detection data
    
    def __repr__(self):
        return f"<ProctoringLog {self.event_type} - Severity: {self.severity_score}>"
