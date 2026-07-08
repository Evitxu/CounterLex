"""Shared fixtures.

Every test runs against an **isolated, temporary** SQLite database and a small,
deterministic corpus — never the developer's real `counterlex.db`. We also force
`allow_extractor_fallback=True` and disable OCR so the suite is fully offline and
needs no Ollama / Tesseract to pass.
"""

from __future__ import annotations

import importlib
from datetime import datetime, timezone

import pytest

from app.application.commands import REAL_SEED
from app.domain.entities import Case
from app.infrastructure.outcome_model import OutcomeModel
from app.infrastructure.repository import CorpusRepository
from app.infrastructure.synthetic import generate_corpus


@pytest.fixture()
def repo(tmp_path) -> CorpusRepository:
    """A repository backed by a throwaway on-disk SQLite file."""
    return CorpusRepository(str(tmp_path / "test.db"))


@pytest.fixture()
def small_corpus() -> list[Case]:
    """A deterministic corpus large enough to train a two-class model."""
    return generate_corpus(size=200, seed=7) + REAL_SEED


@pytest.fixture()
def trained_repo(repo: CorpusRepository, small_corpus: list[Case]) -> CorpusRepository:
    """A repo populated with the corpus and a persisted trained model."""
    repo.add_cases(small_corpus)
    model, metrics = OutcomeModel.train(small_corpus, seed=7)
    repo.save_model(model.coef, model.intercept, metrics, datetime.now(timezone.utc).isoformat())
    return repo


def _client_ctx(tmp_path, monkeypatch, extra_env: dict[str, str]):
    """A FastAPI TestClient wired to an isolated DB, offline settings, and a
    freshly bootstrapped corpus+model (via the app lifespan). `extra_env` lets a
    fixture override settings (e.g. an admin key or a tiny upload limit)."""
    monkeypatch.setenv("SQLITE_PATH", str(tmp_path / "api.db"))
    monkeypatch.setenv("ALLOW_EXTRACTOR_FALLBACK", "true")
    monkeypatch.setenv("LLM_PROVIDER", "ollama")          # unreachable in tests → fallback
    monkeypatch.setenv("OLLAMA_BASE_URL", "http://127.0.0.1:1")  # force connection failure fast
    monkeypatch.setenv("OCR_ENABLED", "false")
    monkeypatch.setenv("DEFAULT_CORPUS_SIZE", "200")
    monkeypatch.setenv("BOOTSTRAP_ON_STARTUP", "true")
    for k, v in extra_env.items():
        monkeypatch.setenv(k, v)

    # get_settings() and the composition-root singletons are lru_cached; rebuild
    # the modules so they pick up the patched environment for this test only.
    from app.core import config as config_mod
    config_mod.get_settings.cache_clear()

    from app.presentation import dependencies as deps
    for fn in (deps.get_repo, deps._extractor, deps.get_command_bus, deps.get_query_bus):
        fn.cache_clear()

    from app import main as main_mod
    importlib.reload(main_mod)
    from fastapi.testclient import TestClient

    with TestClient(main_mod.app) as c:
        yield c

    config_mod.get_settings.cache_clear()
    for fn in (deps.get_repo, deps._extractor, deps.get_command_bus, deps.get_query_bus):
        fn.cache_clear()


@pytest.fixture()
def client(tmp_path, monkeypatch):
    yield from _client_ctx(tmp_path, monkeypatch, {})


@pytest.fixture()
def secured_client(tmp_path, monkeypatch):
    """Like `client`, but with the admin endpoints protected by a shared key."""
    yield from _client_ctx(tmp_path, monkeypatch, {"ADMIN_API_KEY": "s3cret-key"})


@pytest.fixture()
def tiny_pdf_client(tmp_path, monkeypatch):
    """Like `client`, but with a 2 KB PDF upload cap (to test the size guard)."""
    yield from _client_ctx(tmp_path, monkeypatch, {"MAX_PDF_BYTES": "2048"})
