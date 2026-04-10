from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid
from app.core.database import Base


class Question(Base):
    """Question model."""
    
    __tablename__ = "questions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False, index=True)
    keyword_id = Column(UUID(as_uuid=True), ForeignKey("skill_keywords.id"), nullable=False)
    question_type = Column(String(50), nullable=False)  # mcq, coding, descriptive
    question_text = Column(Text, nullable=False)
    options = Column(JSONB, nullable=True)  # For MCQs
    correct_answer = Column(Text, nullable=True)  # For MCQs
    difficulty_level = Column(String(50))
    sequence_number = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<Question {self.id} - {self.question_type}>"
