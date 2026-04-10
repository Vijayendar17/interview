from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.exam_service import exam_service
from app.services.question_service import question_service
from app.services.evaluation_service import evaluation_service

router = APIRouter()


# Pydantic schemas
class ExamStartRequest(BaseModel):
    skill_keywords: List[str]


class AnswerSubmitRequest(BaseModel):
    question_id: str
    answer: str
    time_taken: int  # seconds


@router.post("/start", status_code=status.HTTP_201_CREATED)
async def start_exam(
    request: ExamStartRequest,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a new exam session."""
    try:
        # Create exam
        exam = exam_service.create_exam(
            db=db,
            candidate_id=str(current_user.id),
            candidate_name=current_user.name,
            candidate_email=current_user.email,
            skill_keywords=request.skill_keywords
        )
        
        # Generate first question
        first_question = question_service.generate_first_question(
            db=db,
            exam_id=str(exam.id),
            skill_keywords=request.skill_keywords
        )
        
        return {
            "success": True,
            "data": {
                "exam_id": str(exam.id),
                "status": exam.status,
                "current_round": exam.current_round,
                "start_time": exam.start_time.isoformat(),
                "first_question": {
                    "question_id": str(first_question.id),
                    "question_type": first_question.question_type,
                    "question_text": first_question.question_text,
                    "options": first_question.options,
                    "difficulty_level": first_question.difficulty_level,
                    "sequence_number": first_question.sequence_number
                }
            }
        }
    except Exception as e:
        import traceback
        print(f"❌ Error starting exam: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{exam_id}")
async def get_exam(
    exam_id: str,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get exam details."""
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
    
    stats = exam_service.get_exam_stats(db, exam_id)
    
    return {
        "success": True,
        "data": {
            "exam_id": str(exam.id),
            "candidate_id": str(exam.candidate_id),
            "status": exam.status,
            "current_round": exam.current_round,
            "start_time": exam.start_time.isoformat(),
            "end_time": exam.end_time.isoformat() if exam.end_time else None,
            **stats
        }
    }


@router.post("/{exam_id}/submit-answer")
async def submit_answer(
    exam_id: str,
    request: AnswerSubmitRequest,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit an answer and get the next question."""
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
    
    # Get question
    from app.models.question import Question
    question = db.query(Question).filter(Question.id == request.question_id).first()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    # Evaluate answer
    if question.question_type == "mcq":
        evaluation = evaluation_service.evaluate_mcq(
            db, request.question_id, request.answer
        )
    elif question.question_type == "coding":
        evaluation = evaluation_service.evaluate_coding(
            db, request.question_id, request.answer
        )
    else:  # descriptive
        evaluation = evaluation_service.evaluate_descriptive(
            db, request.question_id, request.answer
        )
    
    # Save answer
    evaluation_service.save_answer(
        db=db,
        exam_id=exam_id,
        question_id=request.question_id,
        candidate_answer=request.answer,
        evaluation=evaluation,
        time_taken=request.time_taken
    )
    
    # Generate next question
    score = evaluation.get("overall_score") or evaluation.get("score", 5)
    next_question = question_service.generate_next_question(
        db=db,
        exam_id=exam_id,
        previous_answer_score=score
    )
    
    db.refresh(exam)
    
    return {
        "success": True,
        "data": {
            "is_correct": evaluation.get("is_correct"),
            "score": score,
            "ai_feedback": evaluation.get("feedback"),
            "current_round": exam.current_round,
            "next_question": {
                "question_id": str(next_question.id),
                "question_type": next_question.question_type,
                "question_text": next_question.question_text,
                "options": next_question.options,
                "difficulty_level": next_question.difficulty_level,
                "sequence_number": next_question.sequence_number
            } if next_question else None
        }
    }


@router.post("/{exam_id}/complete")
async def complete_exam(
    exam_id: str,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Complete the exam."""
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
    
    exam = exam_service.complete_exam(db, exam_id)
    
    return {
        "success": True,
        "data": {
            "exam_id": str(exam.id),
            "status": exam.status,
            "end_time": exam.end_time.isoformat(),
            "message": "Exam completed successfully. Report generation in progress."
        }
    }
