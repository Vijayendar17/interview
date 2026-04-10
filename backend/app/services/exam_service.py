from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import random
from app.models.exam import Exam
from app.models.question import Question
from app.models.answer import Answer
from app.models.skill_keyword import SkillKeyword
from app.services.ai_service import ai_service
from app.core.cache import cache


class ExamService:
    """Service for exam management."""
    
    def create_exam(
        self,
        db: Session,
        candidate_id: str,
        candidate_name: str,
        candidate_email: str,
        skill_keywords: List[str]
    ) -> Exam:
        """Create a new exam session."""
        exam = Exam(
            candidate_id=candidate_id,
            candidate_name=candidate_name,
            candidate_email=candidate_email,
            status="in_progress",
            start_time=datetime.utcnow(),
            integrity_score=100.0,
            current_difficulty="beginner"
        )
        db.add(exam)
        db.commit()
        db.refresh(exam)
        
        # Cache exam state
        cache.set(
            f"exam:{exam.id}",
            {
                "candidate_id": str(candidate_id),
                "status": "in_progress",
                "current_question": 0,
                "integrity_score": 100.0,
                "skill_keywords": skill_keywords
            },
            ttl=7200  # 2 hours
        )
        
        return exam
    
    def get_exam(self, db: Session, exam_id: str) -> Optional[Exam]:
        """Get exam by ID."""
        return db.query(Exam).filter(Exam.id == exam_id).first()
    
    def complete_exam(self, db: Session, exam_id: str) -> Exam:
        """Complete an exam."""
        exam = self.get_exam(db, exam_id)
        if not exam:
            raise ValueError("Exam not found")
        
        exam.status = "completed"
        exam.end_time = datetime.utcnow()
        
        # Calculate total score
        answers = db.query(Answer).filter(Answer.exam_id == exam_id).all()
        if answers:
            total_score = sum(a.score or 0 for a in answers) / len(answers)
            exam.total_score = round(total_score, 2)
        
        db.commit()
        db.refresh(exam)
        
        # Clear cache
        cache.delete(f"exam:{exam_id}")
        
        return exam
    
    def terminate_exam(self, db: Session, exam_id: str, reason: str) -> Exam:
        """Terminate an exam due to violations."""
        exam = self.get_exam(db, exam_id)
        if not exam:
            raise ValueError("Exam not found")
        
        exam.status = "terminated"
        exam.end_time = datetime.utcnow()
        db.commit()
        db.refresh(exam)
        
        # Clear cache
        cache.delete(f"exam:{exam_id}")
        
        return exam
    
    def get_exam_stats(self, db: Session, exam_id: str) -> Dict[str, Any]:
        """Get exam statistics."""
        exam = self.get_exam(db, exam_id)
        if not exam:
            raise ValueError("Exam not found")
        
        questions = db.query(Question).filter(Question.exam_id == exam_id).all()
        answers = db.query(Answer).filter(Answer.exam_id == exam_id).all()
        
        return {
            "exam_id": str(exam.id),
            "status": exam.status,
            "total_questions": len(questions),
            "answered_questions": len(answers),
            "current_score": exam.total_score,
            "integrity_score": float(exam.integrity_score) if exam.integrity_score else 100.0,
            "duration_minutes": (
                (exam.end_time or datetime.utcnow()) - exam.start_time
            ).total_seconds() / 60
        }


exam_service = ExamService()
