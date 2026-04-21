from datetime import datetime, timezone

from fastapi import APIRouter, Request

from app.config import settings

router = APIRouter()


@router.get("/ping")
async def ping():
    """Lightweight endpoint for basic connectivity checks."""
    return {
        "success": True,
        "message": "pong",
    }


@router.get("/status")
async def system_status(request: Request):
    """
    Return non-sensitive runtime status details for diagnostics.
    """
    db_ready = bool(getattr(request.app.state, "db_ready", False))

    return {
        "success": True,
        "data": {
            "app_name": settings.APP_NAME,
            "app_version": settings.APP_VERSION,
            "environment": "development" if settings.DEBUG else "production",
            "database": "up" if db_ready else "down",
            "ai_service": settings.AI_SERVICE,
            "storage": "local" if settings.USE_LOCAL_STORAGE else "s3",
            "server_time_utc": datetime.now(timezone.utc).isoformat(),
        },
    }
