from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Dict, List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.exam import Exam
from app.models.skill_keyword import SkillKeyword

router = APIRouter()


class KeywordCreateRequest(BaseModel):
    keyword: str
    category: str
    difficulty_level: Optional[str] = "intermediate"


@router.get("/exams")
async def get_all_exams(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all exams (admin only)."""
    query = db.query(Exam)
    
    if status:
        query = query.filter(Exam.status == status)
    
    total = query.count()
    exams = query.offset((page - 1) * limit).limit(limit).all()
    
    return {
        "success": True,
        "data": {
            "total": total,
            "page": page,
            "limit": limit,
            "exams": [
                {
                    "exam_id": str(exam.id),
                    "candidate_name": exam.candidate_name,
                    "candidate_email": exam.candidate_email,
                    "status": exam.status,
                    "start_time": exam.start_time.isoformat(),
                    "end_time": exam.end_time.isoformat() if exam.end_time else None,
                    "total_score": float(exam.total_score) if exam.total_score else None,
                    "integrity_score": float(exam.integrity_score) if exam.integrity_score else 100.0
                }
                for exam in exams
            ]
        }
    }


@router.get("/keywords")
async def get_keywords(
    current_user: Dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all skill keywords."""
    keywords = db.query(SkillKeyword).all()
    
    return {
        "success": True,
        "data": {
            "total": len(keywords),
            "keywords": [
                {
                    "id": str(kw.id),
                    "keyword": kw.keyword,
                    "category": kw.category,
                    "difficulty_level": kw.difficulty_level
                }
                for kw in keywords
            ]
        }
    }


@router.post("/keywords", status_code=status.HTTP_201_CREATED)
async def create_keyword(
    request: KeywordCreateRequest,
    current_user: Dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Add new skill keyword (admin only)."""
    # Check if keyword already exists
    existing = db.query(SkillKeyword).filter(
        SkillKeyword.keyword == request.keyword
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Keyword already exists"
        )
    
    keyword = SkillKeyword(
        keyword=request.keyword,
        category=request.category,
        difficulty_level=request.difficulty_level
    )
    
    db.add(keyword)
    db.commit()
    db.refresh(keyword)
    
    return {
        "success": True,
        "data": {
            "id": str(keyword.id),
            "keyword": keyword.keyword,
            "category": keyword.category,
            "difficulty_level": keyword.difficulty_level,
            "created_at": keyword.created_at.isoformat()
        }
    }


@router.delete("/keywords/{keyword_id}")
async def delete_keyword(
    keyword_id: str,
    current_user: Dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a skill keyword (admin only)."""
    keyword = db.query(SkillKeyword).filter(SkillKeyword.id == keyword_id).first()
    
    if not keyword:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Keyword not found"
        )
    
    db.delete(keyword)
    db.commit()
    
    return {
        "success": True,
        "message": "Keyword deleted successfully"
    }
