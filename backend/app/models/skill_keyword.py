from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.core.database import Base


class SkillKeyword(Base):
    """Skill keywords for question generation."""
    
    __tablename__ = "skill_keywords"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    keyword = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False)  # programming_language, framework, tool, concept
    difficulty_level = Column(String(50))  # beginner, intermediate, advanced
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<SkillKeyword {self.keyword} ({self.category})>"
