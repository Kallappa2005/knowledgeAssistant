from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Policy Knowledge Assistant API"
    app_version: str = "0.1.0"
    environment: str = "development"
    database_url: str = (
        "postgresql+psycopg://postgres:postgres@localhost:5432/policy_assistant"
    )
    jwt_secret_key: str = "development-only-change-this-secret"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    refresh_token_cookie_name: str = "refresh_token"
    refresh_token_samesite: Literal["lax", "strict", "none"] = "lax"
    secure_cookies: bool = False
    document_storage_dir: str = "uploads/documents"
    learning_storage_dir: str = "uploads/learning"
    max_document_size_bytes: int = 10 * 1024 * 1024
    chroma_storage_dir: str = "chroma_db"
    embedding_model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    chunk_size: int = 220
    chunk_overlap: int = 40
    groq_api_key: str | None = None
    groq_model: str = "openai/gpt-oss-20b"
    groq_fallback_model: str = "openai/gpt-oss-120b"
    rag_top_k: int = 5
    rag_max_distance: float = 0.65
    rag_max_citations: int = 2
    rag_citation_distance_margin: float = 0.08
    rag_excerpt_max_chars: int = 600
    frontend_origin: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
