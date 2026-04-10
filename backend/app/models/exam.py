from sqlalchemy import Column, String, DateTime, Numeric
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.core.database import Base


class Exam(Base):
    """Exam session model."""
    
    __tablename__ = "exams"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    candidate_name = Column(String(255))
    candidate_email = Column(String(255))
    status = Column(String(50), default="in_progress")  # in_progress, completed, terminated
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    total_score = Column(Numeric(5, 2), nullable=True)
    integrity_score = Column(Numeric(5, 2), default=100.0)
    current_difficulty = Column(String(50), default="beginner")
    current_round = Column(String(50), default="aptitude")  # aptitude, coding
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<Exam {self.id} - {self.candidate_email} ({self.status})>"
