from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Normalize DATABASE_URL: Railway/Supabase sometimes returns postgres:// 
# but SQLAlchemy requires postgresql://
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Remove pgbouncer query parameter if present as it's for the server-side pooler
# and causes psycopg2 to throw an "invalid connection option" error
if "pgbouncer=true" in db_url:
    if "?" in db_url:
        # If it's the only param, remove the ? too, otherwise remove it and the &
        db_url = db_url.replace("pgbouncer=true&", "").replace("&pgbouncer=true", "").replace("?pgbouncer=true", "")

# Create database engine
engine = create_engine(
    db_url,
    echo=settings.DATABASE_ECHO,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db():
    """
    Dependency function to get database session.
    Use with FastAPI's Depends().
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables."""
    Base.metadata.create_all(bind=engine)
