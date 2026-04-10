from sqlalchemy.orm import Session
from typing import Dict, Any
from app.models.answer import Answer
from app.models.question import Question
from app.services.ai_service import ai_service


class EvaluationService:
    """Service for answer evaluation."""
    
    def evaluate_mcq(
        self,
        db: Session,
        question_id: str,
        candidate_answer: str
    ) -> Dict[str, Any]:
        """Evaluate MCQ answer."""
        question = db.query(Question).filter(Question.id == question_id).first()
        if not question:
            raise ValueError("Question not found")
        
        is_correct = candidate_answer.strip().upper() == question.correct_answer.strip().upper()
        score = 10 if is_correct else 0
        
        return {
            "is_correct": is_correct,
            "score": score,
            "feedback": "Correct!" if is_correct else f"Incorrect. The correct answer is {question.correct_answer}."
        }
    
    def evaluate_coding(
        self,
        db: Session,
        question_id: str,
        candidate_code: str,
        language: str = "python"
    ) -> Dict[str, Any]:
        """Evaluate coding answer using AI."""
        question = db.query(Question).filter(Question.id == question_id).first()
        if not question:
            raise ValueError("Question not found")
        
        # Get question data from options field
        question_data = question.options or {}
        question_data["question"] = question.question_text
        
        # Use AI to evaluate
        evaluation = ai_service.evaluate_code(
            question=question_data,
            candidate_code=candidate_code,
            language=language
        )
        
        return evaluation
    
    def evaluate_descriptive(
        self,
        db: Session,
        question_id: str,
        candidate_answer: str
    ) -> Dict[str, Any]:
        """Evaluate descriptive answer using AI."""
        question = db.query(Question).filter(Question.id == question_id).first()
        if not question:
            raise ValueError("Question not found")
        
        # Get key points from options field
        key_points = question.options.get("key_points", []) if question.options else []
        
        # Use AI to evaluate
        evaluation = ai_service.evaluate_descriptive(
            question=question.question_text,
            candidate_answer=candidate_answer,
            key_points=key_points
        )
        
        return evaluation
    
    def save_answer(
        self,
        db: Session,
        exam_id: str,
        question_id: str,
        candidate_answer: str,
        evaluation: Dict[str, Any],
        time_taken: int
    ) -> Answer:
        """Save answer and evaluation to database."""
        answer = Answer(
            exam_id=exam_id,
            question_id=question_id,
            candidate_answer=candidate_answer,
            is_correct=evaluation.get("is_correct"),
            score=evaluation.get("overall_score") or evaluation.get("score"),
            ai_feedback=evaluation.get("feedback"),
            time_taken=time_taken
        )
        
        db.add(answer)
        db.commit()
        db.refresh(answer)
        
        return answer


evaluation_service = EvaluationService()
