"""Thin async client for a local Ollama daemon (free, offline LLM)."""

from __future__ import annotations

import json

import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

log = get_logger(__name__)


class OllamaClient:
    def __init__(self, base_url: str | None = None, model: str | None = None) -> None:
        s = get_settings()
        self._base = (base_url or s.ollama_base_url).rstrip("/")
        self._model = model or s.ollama_model
        self._timeout = s.ollama_timeout_seconds

    async def available(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                r = await client.get(f"{self._base}/api/tags")
                return r.status_code == 200
        except httpx.HTTPError:
            return False

    async def generate_json(self, system: str, user: str) -> dict:
        """Ask the model for a JSON object (Ollama's format=json mode)."""
        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "stream": False,
            "format": "json",
            "options": {"temperature": 0.0},
        }
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            r = await client.post(f"{self._base}/api/chat", json=payload)
            r.raise_for_status()
            content = r.json()["message"]["content"]
        return json.loads(content)

    async def generate_text(self, system: str, user: str) -> str:
        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "stream": False,
            "options": {"temperature": 0.2},
        }
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            r = await client.post(f"{self._base}/api/chat", json=payload)
            r.raise_for_status()
            return r.json()["message"]["content"]
