from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    # Ollama (local, free LLM). Requires a running daemon with the model pulled:
    #   ollama pull llama3.1
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1"
    ollama_timeout_seconds: float = 60.0
    # When Ollama is unreachable, the factor extractor falls back to a keyword
    # heuristic so the whole app still works for a demo. Set to False to require Ollama.
    allow_extractor_fallback: bool = True

    # Storage
    sqlite_path: str = "counterlex.db"

    # Synthetic corpus defaults
    default_corpus_size: int = Field(default=400, ge=20, le=10000)
    synthetic_seed: int = 7  # deterministic corpus (Math.random-free, reproducible)

    # Retrieval
    top_k_precedents: int = Field(default=6, ge=1, le=50)

    # Max length of a user-submitted case description (XSS/DoS guard).
    max_case_chars: int = Field(default=5000, ge=10)

    frontend_origin: str = "http://localhost:3000"

    # Auto-generate + train on startup if the corpus is empty (nice for demos).
    bootstrap_on_startup: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
