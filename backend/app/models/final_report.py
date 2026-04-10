from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid
from app.core.database import Base


class FinalReport(Base):
    """Final exam report model."""
    
    __tablename__ = "final_reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False, unique=True, index=True)
    candidate_id = Column(UUID(as_uuid=True), nullable=False)
    candidate_name = Column(String(255))
    candidate_email = Column(String(255))
    total_score = Column(Numeric(5, 2))
    skill_scores = Column(JSONB)  # Skill-wise breakdown
    integrity_score = Column(Numeric(5, 2))
    strengths = Column(Text)
    weaknesses = Column(Text)
    recommendation = Column(String(50))  # proceed, review, reject
    ai_analysis = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<FinalReport {self.exam_id} - {self.recommendation}>"
