from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
import random
from app.models.question import Question
from app.models.answer import Answer
from app.models.skill_keyword import SkillKeyword
from app.models.exam import Exam
from app.services.ai_service import ai_service


class QuestionService:
    """Service for question generation."""
    
    def generate_first_question(
        self,
        db: Session,
        exam_id: str,
        skill_keywords: List[str]
    ) -> Question:
        """Generate the first question for an exam."""
        # Get a random keyword from the list
        keyword_obj = db.query(SkillKeyword).filter(
            SkillKeyword.keyword.in_(skill_keywords)
        ).first()
        
        if not keyword_obj:
            raise ValueError("No valid keywords found")
        
        # Start with MCQ at beginner level
        question_data = ai_service.generate_mcq(
            keyword=keyword_obj.keyword,
            difficulty_level="beginner"
        )
        
        question = Question(
            exam_id=exam_id,
            keyword_id=keyword_obj.id,
            question_type="mcq",
            question_text=question_data["question"],
            options=question_data["options"],
            correct_answer=question_data["correct_answer"],
            difficulty_level="beginner",
            sequence_number=1
        )
        
        db.add(question)
        db.commit()
        db.refresh(question)
        
        return question
    
    def generate_next_question(
        self,
        db: Session,
        exam_id: str,
        previous_answer_score: float
    ) -> Optional[Question]:
        """Generate next question with adaptive difficulty and round management."""
        exam = db.query(Exam).filter(Exam.id == exam_id).first()
        if not exam:
            raise ValueError("Exam not found")
        
        # Get all answered questions
        answered_questions = db.query(Question).join(Answer).filter(
            Question.exam_id == exam_id
        ).all()
        
        total_answered = len(answered_questions)
        
        # Round Logic
        # Exam is exactly 10 MCQ questions
        APTITUDE_LIMIT = 10
        
        if total_answered < APTITUDE_LIMIT:
            current_round = "aptitude"
            question_type = "mcq"
        else:
            # Exam complete
            return None

        # Update exam round if changed
        if exam.current_round != current_round:
            exam.current_round = current_round
            db.commit()
        
        # Calculate average score
        answers = db.query(Answer).filter(Answer.exam_id == exam_id).all()
        avg_score = sum(a.score or 0 for a in answers) / len(answers) if answers else 5
        
        # Determine difficulty adjustment
        current_difficulty = exam.current_difficulty
        if previous_answer_score >= 8 and avg_score >= 7:
            difficulty = self._increase_difficulty(current_difficulty)
        elif previous_answer_score <= 4 and avg_score <= 5:
            difficulty = self._decrease_difficulty(current_difficulty)
        else:
            difficulty = current_difficulty
        
        # Update exam difficulty
        exam.current_difficulty = difficulty
        db.commit()
        
        # Select next keyword (rotate through keywords)
        answered_keyword_ids = [q.keyword_id for q in answered_questions]
        keyword_obj = db.query(SkillKeyword).filter(
            ~SkillKeyword.id.in_(answered_keyword_ids) if answered_keyword_ids else True
        ).first()
        
        if not keyword_obj:
            # All keywords used, pick random
            keyword_obj = db.query(SkillKeyword).order_by(func.random()).first()
        
        # Generate question based on type
        if question_type == "mcq":
            question_data = ai_service.generate_mcq(keyword_obj.keyword, difficulty)
            question = Question(
                exam_id=exam_id,
                keyword_id=keyword_obj.id,
                question_type="mcq",
                question_text=question_data["question"],
                options=question_data["options"],
                correct_answer=question_data["correct_answer"],
                difficulty_level=difficulty,
                sequence_number=total_answered + 1
            )
        elif question_type == "coding":
            question_data = ai_service.generate_coding_question(
                keyword_obj.keyword,
                difficulty,
                {"score": previous_answer_score}
            )
            question = Question(
                exam_id=exam_id,
                keyword_id=keyword_obj.id,
                question_type="coding",
                question_text=question_data["question"],
                options=question_data,  # Store full data in options
                difficulty_level=difficulty,
                sequence_number=total_answered + 1
            )
        
        db.add(question)
        db.commit()
        db.refresh(question)
        
        return question
    
    def _increase_difficulty(self, current: str) -> str:
        """Increase difficulty level."""
        levels = ["beginner", "intermediate", "advanced"]
        current_index = levels.index(current) if current in levels else 0
        return levels[min(current_index + 1, len(levels) - 1)]
    
    def _decrease_difficulty(self, current: str) -> str:
        """Decrease difficulty level."""
        levels = ["beginner", "intermediate", "advanced"]
        current_index = levels.index(current) if current in levels else 1
        return levels[max(current_index - 1, 0)]


question_service = QuestionService()
