from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Dayflow API"
    environment: str = "development"
    database_url: str = "postgresql+psycopg2://dayflow:dayflow@db:5432/dayflow"
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60
    cors_origins: str = "*"
    leave_sla_days: int = 3
    redis_url: str = "redis://redis:6379/0"
    email_backend: str = "console"
    model_artifact_path: str = "./artifacts/isolation_forest.joblib"
    groq_api_key: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
