from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.question import Question

router = APIRouter()


@router.get("/{question_id}")
async def get_question(
    question_id: str,
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific question by ID."""
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    return {
        "success": True,
        "data": {
            "question_id": str(question.id),
            "question_type": question.question_type,
            "question_text": question.question_text,
            "options": question.options,
            "difficulty_level": question.difficulty_level
        }
    }
