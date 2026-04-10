from fastapi import APIRouter
from app.api.v1 import exams, questions, evaluation, proctoring, reports, admin, auth

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(exams.router, prefix="/exams", tags=["Exams"])
api_router.include_router(questions.router, prefix="/questions", tags=["Questions"])
api_router.include_router(evaluation.router, prefix="/evaluation", tags=["Evaluation"])
api_router.include_router(proctoring.router, prefix="/proctoring", tags=["Proctoring"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
