"""Provider-agnostic LLM client.

Speaks either a local **Ollama** daemon or any **OpenAI-compatible** API
(e.g. Groq's free tier) — selected by `llm_provider`. Both expose the same
`generate_json` / `generate_text` / `available`, so callers don't care which is
used, and everything degrades gracefully (callers catch errors and fall back).

  - ollama:  POST {base}/api/chat            (format:"json" for JSON mode)
  - openai:  POST {base}/chat/completions    (response_format json_object)
"""

from __future__ import annotations

import json

import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

log = get_logger(__name__)

_GROQ_BASE = "https://api.groq.com/openai/v1"
_GROQ_MODEL = "llama-3.1-8b-instant"


class LlmClient:
    def __init__(self) -> None:
        s = get_settings()
        self.provider = s.llm_provider
        self.timeout = s.ollama_timeout_seconds
        if self.provider == "openai":
            self.base = (s.llm_base_url or _GROQ_BASE).rstrip("/")
            self.model = s.llm_model or _GROQ_MODEL
            self.api_key = s.llm_api_key
        else:
            self.base = s.ollama_base_url.rstrip("/")
            self.model = s.ollama_model
            self.api_key = None

    def _headers(self) -> dict[str, str]:
        h = {"Content-Type": "application/json"}
        if self.api_key:
            h["Authorization"] = f"Bearer {self.api_key}"
        return h

    async def available(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=4.0) as c:
                if self.provider == "openai":
                    if not self.api_key:
                        return False
                    r = await c.get(f"{self.base}/models", headers=self._headers())
                    return r.status_code == 200
                r = await c.get(f"{self.base}/api/tags")
                return r.status_code == 200
        except httpx.HTTPError:
            return False

    async def generate_json(self, system: str, user: str) -> dict:
        return json.loads(await self._chat(system, user, json_mode=True))

    async def generate_text(self, system: str, user: str) -> str:
        return await self._chat(system, user, json_mode=False)

    async def _chat(self, system: str, user: str, json_mode: bool) -> str:
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]
        async with httpx.AsyncClient(timeout=self.timeout) as c:
            if self.provider == "openai":
                body: dict = {
                    "model": self.model,
                    "messages": messages,
                    "temperature": 0.0 if json_mode else 0.3,
                }
                if json_mode:
                    body["response_format"] = {"type": "json_object"}
                r = await c.post(
                    f"{self.base}/chat/completions", json=body, headers=self._headers()
                )
                r.raise_for_status()
                return r.json()["choices"][0]["message"]["content"]
            # ollama
            body = {
                "model": self.model,
                "messages": messages,
                "stream": False,
                "options": {"temperature": 0.0 if json_mode else 0.3},
            }
            if json_mode:
                body["format"] = "json"
            r = await c.post(f"{self.base}/api/chat", json=body)
            r.raise_for_status()
            return r.json()["message"]["content"]


def build_llm_client() -> LlmClient:
    return LlmClient()
