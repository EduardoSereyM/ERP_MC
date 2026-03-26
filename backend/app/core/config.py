from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Base de datos
    DATABASE_URL: str

    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_JWT_SECRET: str

    # App
    SECRET_KEY: str
    FRONTEND_URL: str = "http://localhost:5173"
    LOG_LEVEL: str = "DEBUG"
    DEBUG: bool = True

    # API
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "ERP MC"

    # Email (SMTP)
    SMTP_HOST: str = "mail.testdesarrollo.cl"
    SMTP_PORT: int = 465
    SMTP_USER: str = "admin@testdesarrollo.cl"
    SMTP_PASSWORD: str = ""
    EMAIL_FROM_NAME: str = "MC ERP"


settings = Settings()
