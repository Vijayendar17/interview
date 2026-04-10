from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Dict, Any

from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token, get_current_user
from app.models.student import Student

router = APIRouter()

class StudentSignup(BaseModel):
    name: str
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

@router.post("/signup", response_model=TokenResponse)
def signup(student_in: StudentSignup, db: Session = Depends(get_db)):
    # Check if student exists
    student = db.query(Student).filter(Student.email == student_in.email).first()
    if student:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new student
    hashed_password = get_password_hash(student_in.password)
    new_student = Student(
        name=student_in.name,
        email=student_in.email,
        hashed_password=hashed_password
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    
    # Generate token
    access_token = create_access_token(data={"sub": str(new_student.id), "email": new_student.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(new_student.id),
            "name": new_student.name,
            "email": new_student.email
        }
    }

@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Authenticate student
    student = db.query(Student).filter(Student.email == form_data.username).first()
    if not student or not verify_password(form_data.password, student.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate token
    access_token = create_access_token(data={"sub": str(student.id), "email": student.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(student.id),
            "name": student.name,
            "email": student.email
        }
    }

@router.get("/me")
def get_me(current_user: Student = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "name": current_user.name,
        "email": current_user.email,
        "generated_report": current_user.generated_report
    }
