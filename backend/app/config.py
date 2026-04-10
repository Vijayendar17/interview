from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "AI Interview Examination System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ALLOWED_ORIGINS: str = "http://localhost:3000"
    
    # Database
    DATABASE_URL: str
    DATABASE_ECHO: bool = False
    
    # Redis (optional - using in-memory cache instead)
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # JWT (validation only - tokens created by external auth)
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    
    # AI Service Configuration
    AI_SERVICE: str = "qubrid"
    
    # Qubrid API Configuration
    QUBRID_API_KEY: str = ""
    GITHUB_TOKEN: str = ""
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    
    # Mistral API Configuration
    MISTRAL_API_KEY: str = ""
    
    # Storage
    USE_LOCAL_STORAGE: bool = True
    LOCAL_STORAGE_PATH: str = "./storage/clips"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str = "exam-proctoring-clips"
    
    # Proctoring Configuration
    FACE_DETECTION_INTERVAL: float = 2.5
    YAW_THRESHOLD: int = 25
    PITCH_THRESHOLD: int = 20
    INTEGRITY_PENALTY_FACTOR: float = 2.5
    INTEGRITY_TERMINATION_THRESHOLD: int = 50
    CLIP_DURATION: int = 10
    AUDIO_SPEECH_THRESHOLD_DB: float = -50.0  # Decibels relative to full scale (dBFS)
    
    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"
    
    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse allowed origins from comma-separated string."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()
