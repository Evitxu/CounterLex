from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    # LLM provider selection:
    #   "ollama" — local, free (default for dev).
    #   "openai" — any OpenAI-compatible API (e.g. Groq free tier) for cloud/Railway.
    llm_provider: Literal["ollama", "openai"] = "ollama"
    # OpenAI-compatible settings (used when llm_provider == "openai").
    # Defaults target Groq; set LLM_API_KEY to your free Groq key.
    llm_base_url: str | None = None      # default https://api.groq.com/openai/v1
    llm_model: str | None = None         # default llama-3.1-8b-instant
    llm_api_key: str | None = None

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
    max_case_chars: int = Field(default=12000, ge=10)

    # PDF upload limits for the Analyze Judgment module.
    max_pdf_bytes: int = Field(default=20 * 1024 * 1024, ge=1024)  # 20 MB
    max_pdf_pages: int = Field(default=500, ge=1)

    # OCR fallback for scanned (image) PDFs. Requires Tesseract installed.
    ocr_enabled: bool = True
    ocr_max_pages: int = Field(default=15, ge=1)   # OCR is slow; cap pages
    ocr_languages: str = "spa+eng"
    tesseract_cmd: str | None = None               # full path if not on PATH
    tessdata_dir: str | None = None                # folder with *.traineddata (if not default)

    frontend_origin: str = "http://localhost:3000"

    # Auto-generate + train on startup if the corpus is empty (nice for demos).
    bootstrap_on_startup: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
