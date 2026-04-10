from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.final_report import FinalReport
from app.models.exam import Exam
from app.models.answer import Answer
from app.models.question import Question
from app.services.ai_service import ai_service
from app.services.proctoring_service import proctoring_service

router = APIRouter()


@router.get("/{exam_id}")
async def get_report(
    exam_id: str,
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the final evaluation report for an exam."""
    # Check if report already exists
    report = db.query(FinalReport).filter(FinalReport.exam_id == exam_id).first()
    
    if not report:
        # Generate report if it doesn't exist
        exam = db.query(Exam).filter(Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exam not found"
            )
        
        if exam.status != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Exam not completed yet"
            )
        
        # Aggregate exam data
        exam_data = _aggregate_exam_data(db, exam_id)
        
        # Generate AI report
        ai_report = ai_service.generate_final_report(exam_data)
        
        # Save report
        report = FinalReport(
            exam_id=exam_id,
            candidate_id=exam.candidate_id,
            candidate_name=exam.candidate_name,
            candidate_email=exam.candidate_email,
            total_score=exam_data["total_score"],
            skill_scores=exam_data["skill_scores"],
            integrity_score=exam.integrity_score,
            strengths="\n".join(ai_report.get("strengths", [])),
            weaknesses="\n".join(ai_report.get("weaknesses", [])),
            recommendation=ai_report.get("recommendation"),
            ai_analysis=ai_report.get("detailed_reasoning")
        )
        
        db.add(report)
        db.commit()
        db.refresh(report)
        
        # Save to Student model
        from app.models.student import Student
        student = db.query(Student).filter(Student.id == exam.candidate_id).first()
        if student:
            student.generated_report = ai_report
            db.commit()
    
    return {
        "success": True,
        "data": {
            "report_id": str(report.id),
            "exam_id": str(report.exam_id),
            "candidate": {
                "id": str(report.candidate_id),
                "name": report.candidate_name,
                "email": report.candidate_email
            },
            "scores": {
                "total_score": float(report.total_score) if report.total_score else 0,
                "skill_breakdown": report.skill_scores
            },
            "proctoring": {
                "integrity_score": float(report.integrity_score) if report.integrity_score else 100.0
            },
            "ai_analysis": {
                "strengths": report.strengths.split("\n") if report.strengths else [],
                "weaknesses": report.weaknesses.split("\n") if report.weaknesses else [],
                "recommendation": report.recommendation,
                "detailed_feedback": report.ai_analysis
            },
            "created_at": report.created_at.isoformat()
        }
    }


def _aggregate_exam_data(db: Session, exam_id: str) -> Dict[str, Any]:
    """Aggregate exam data for report generation."""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    questions = db.query(Question).filter(Question.exam_id == exam_id).all()
    answers = db.query(Answer).filter(Answer.exam_id == exam_id).all()
    
    # Create a map for quick question lookup
    question_map = {str(q.id): q for q in questions}
    
    # Calculate scores by type
    mcq_answers = []
    coding_answers = []
    descriptive_answers = []
    
    for answer in answers:
        q = question_map.get(str(answer.question_id))
        if q:
            if q.question_type == "mcq":
                mcq_answers.append(answer)
            elif q.question_type == "coding":
                coding_answers.append(answer)
            elif q.question_type == "descriptive":
                descriptive_answers.append(answer)
    
    mcq_score = (sum(float(a.score) for a in mcq_answers if a.score is not None) / len(mcq_answers)) if mcq_answers else 0
    coding_score = (sum(float(a.score) for a in coding_answers if a.score is not None) / len(coding_answers)) if coding_answers else 0
    descriptive_score = (sum(float(a.score) for a in descriptive_answers if a.score is not None) / len(descriptive_answers)) if descriptive_answers else 0
    
    skill_scores = {}
    for answer in answers:
        if answer.score is None:
            continue
        question = question_map.get(str(answer.question_id))
        if question and question.keyword_id:
            from app.models.skill_keyword import SkillKeyword
            kw = db.query(SkillKeyword).filter(SkillKeyword.id == question.keyword_id).first()
            if kw:
                if kw.keyword not in skill_scores:
                    skill_scores[kw.keyword] = []
                skill_scores[kw.keyword].append(float(answer.score))
    
    skill_averages = {
        skill: round(sum(scores) / len(scores), 2)
        for skill, scores in skill_scores.items() if scores
    }
    
    # Calculate absolute total accurately out of 100 without diluting empty categories
    valid_answers = [float(a.score) for a in answers if a.score is not None]
    overall_average_10 = (sum(valid_answers) / len(valid_answers)) if valid_answers else 0
    total_score_100 = round(overall_average_10 * 10, 2)
    
    # Proctoring summary
    proctor_summary = proctoring_service.get_proctoring_summary(db, exam_id)
    
    return {
        "exam_id": str(exam_id),
        "candidate_name": exam.candidate_name,
        "candidate_email": exam.candidate_email,
        "duration_minutes": round((exam.end_time - exam.start_time).total_seconds() / 60, 2) if exam.end_time else 0,
        "total_score": total_score_100,
        "mcq_score": round(mcq_score, 2),
        "mcq_correct": sum(1 for a in mcq_answers if a.is_correct),
        "mcq_total": len(mcq_answers),
        "coding_score": round(coding_score, 2),
        "coding_avg": round(coding_score, 2),
        "descriptive_score": round(descriptive_score, 2),
        "descriptive_avg": round(descriptive_score, 2),
        "skill_scores": skill_averages,
        "integrity_score": float(exam.integrity_score) if exam.integrity_score else 100.0,
        "total_violations": proctor_summary["total_events"],
        "high_severity_violations": proctor_summary["high_severity_events"],
        "questions": [
            {
                "type": question_map.get(str(a.question_id)).question_type if question_map.get(str(a.question_id)) else "unknown",
                "keyword": "unknown",
                "score": float(a.score) if a.score is not None else 0,
                "feedback": a.ai_feedback
            }
            for a in answers
        ]
    }
