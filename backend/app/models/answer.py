from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.core.database import Base


class Answer(Base):
    """Answer model."""
    
    __tablename__ = "answers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False, index=True)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id"), nullable=False)
    candidate_answer = Column(Text)
    is_correct = Column(Boolean, nullable=True)  # For MCQs
    score = Column(Numeric(5, 2))
    ai_feedback = Column(Text)
    time_taken = Column(Integer)  # seconds
    submitted_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<Answer {self.id} - Score: {self.score}>"
