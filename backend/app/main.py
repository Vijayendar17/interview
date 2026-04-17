from urllib.parse import urlparse

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.config import settings
from app.core.database import init_db


def _is_supabase_direct_host(database_url: str) -> bool:
    """Return True when URL uses Supabase direct DB hostname."""
    try:
        host = urlparse(database_url).hostname or ""
    except Exception:
        return False
    return host.startswith("db.") and host.endswith(".supabase.co")


def _print_supabase_dns_help(db_error: str) -> None:
    """Print an actionable hint for common Supabase DNS/IPv6 issues."""
    lowered = db_error.lower()
    is_dns_error = "could not translate host name" in lowered or "no such host is known" in lowered
    mentions_supabase = "supabase.co" in lowered or _is_supabase_direct_host(settings.DATABASE_URL)

    if is_dns_error and mentions_supabase:
        print("Tip: Supabase direct host (db.<project-ref>.supabase.co) is often IPv6-only.")
        print("Use the Session/Transaction pooler URL from Supabase Dashboard -> Settings -> Database.")
        print(
            "Example DATABASE_URL=postgresql://postgres.<project-ref>:<password>"
            "@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require"
        )


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
)
app.state.db_ready = False

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api/v1")


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    try:
        init_db()
        app.state.db_ready = True
        print(f"{settings.APP_NAME} v{settings.APP_VERSION} started.")
        print("API Documentation: http://localhost:8000/docs")
    except Exception as e:
        app.state.db_ready = False
        db_error = str(e)
        print(f"Database initialization failed: {db_error}")
        _print_supabase_dns_help(db_error)
        # We don't raise here so the app can still serve the /health endpoint
        # allowing us to see logs in production even if the DB is down.


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy" if app.state.db_ready else "degraded",
        "database": "up" if app.state.db_ready else "down",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )
