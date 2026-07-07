"""Turn free-text case descriptions into the structured factor vector.

Primary path: the local LLM (Ollama) returns a JSON object of {factor_key: bool}.
Fallback path: an accent-insensitive Spanish keyword heuristic, used when Ollama
is unreachable (config `allow_extractor_fallback`). The fallback keeps the whole
demo working with zero external services.
"""

from __future__ import annotations

import re
import unicodedata

from app.core.config import get_settings
from app.core.logging import get_logger
from app.domain.factors import FACTORS, FACTOR_KEYS, empty_factors
from app.infrastructure.llm_client import LlmClient

log = get_logger(__name__)

# Keyword cues per factor for the no-LLM fallback (lowercase, unaccented).
_KEYWORDS: dict[str, list[str]] = {
    "forensic_evidence": ["adn", "huella", "balistic", "forense", "cientific"],
    "confession": ["confeso", "confesion", "admitio los hechos", "reconocio los hechos"],
    "eyewitness": ["testigo presencial", "presencio", "vio como"],
    "weapon_present": ["arma", "cuchillo", "pistola", "navaja"],
    "violence_used": ["violencia", "agredio", "golpeo", "intimidacion", "forcejeo"],
    "premeditation": ["premeditacion", "alevosia", "planifico", "premeditad"],
    "prior_convictions": ["antecedentes", "reincidente", "condenado anteriormente"],
    "self_defense": ["legitima defensa", "se defendio", "defensa propia"],
    "alibi": ["coartada", "estaba en otro lugar", "no estaba presente"],
    "evidence_inadmissible": ["prueba nula", "prueba ilicita", "obtenida ilegalmente", "nulidad"],
    "witness_unreliable": ["testigo no fiable", "contradiccion", "poco creible", "dudosa credibilidad"],
}


def _norm(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", text.lower())


def _keyword_extract(text: str) -> dict[str, bool]:
    hay = _norm(text)
    return {k: any(kw in hay for kw in _KEYWORDS.get(k, [])) for k in FACTOR_KEYS}


_CONVICT_TERMS = [
    "condeno", "condena", "condenamos", "condenar",
    "condenado", "condenados", "condenatori",
]
_ACQUIT_TERMS = [
    "absuelvo", "absuelve", "absuelto", "absuelta", "absueltos",
    "absolver", "absolucion", "absolutori",
]
# Matches letter-spaced words like "F A L L O" or "C O N D E N A M O S".
_LETTER_SPACED = re.compile(r"(?:\w ){2,}\w")


def detect_outcome(text: str) -> bool | None:
    """Best-effort detection of the court's decision from the ruling text.

    Returns True (conviction), False (acquittal), or None if it can't be told.

    A full judgment mentions *both* conviction and acquittal all over the place
    (reasoning, cited precedents, and the dissenting "votos particulares" after
    the ruling). So we don't scan the whole document: we restrict to the
    **majority opinion** (before any "voto particular") and read the verdict from
    the operative **FALLO** heading onward. Accent-insensitive and robust to
    letter-spaced text ("F A L L O", "C O N D E N A M O S"). Works without an LLM.
    """
    hay = _norm(text)
    # Collapse letter-spaced runs so "c o n d e n o" -> "condeno", "f a l l o" -> "fallo".
    hay = _LETTER_SPACED.sub(lambda m: m.group(0).replace(" ", ""), hay)

    # Drop dissenting/concurring opinions that follow the ruling.
    cut = hay.find("voto particular")
    region = hay[:cut] if cut != -1 else hay

    # Focus on the operative ruling: from the last FALLO heading onward.
    idx = region.rfind("fallo")
    scope = region[idx:] if idx != -1 else region

    has_conv = any(term in scope for term in _CONVICT_TERMS)
    has_acq = any(term in scope for term in _ACQUIT_TERMS)
    if has_conv and not has_acq:
        return True
    if has_acq and not has_conv:
        return False
    return None


def _coerce(raw: dict) -> dict[str, bool]:
    factors = empty_factors()
    for k in FACTOR_KEYS:
        v = raw.get(k)
        if isinstance(v, bool):
            factors[k] = v
        elif isinstance(v, str):
            factors[k] = v.strip().lower() in {"true", "si", "sí", "yes", "1"}
        elif isinstance(v, (int, float)):
            factors[k] = bool(v)
    return factors


class FactorExtractor:
    def __init__(self, llm: LlmClient) -> None:
        self._llm = llm

    def _system_prompt(self) -> str:
        lines = "\n".join(f"- {f.key}: {f.description_es}" for f in FACTORS)
        return (
            "Eres un asistente jurídico. Analiza la descripción de un caso penal y "
            "determina, para cada factor, si está presente (true) o no (false). "
            "Responde SOLO con un objeto JSON cuyas claves sean exactamente estas y "
            "cuyos valores sean booleanos:\n"
            f"{lines}\n"
            'Ejemplo de formato: {"forensic_evidence": true, "confession": false, ...}'
        )

    async def extract(self, text: str) -> tuple[dict[str, bool], str]:
        """Returns (factors, source) where source is 'llm' or 'keyword'."""
        settings = get_settings()
        try:
            raw = await self._llm.generate_json(self._system_prompt(), text)
            return _coerce(raw), "llm"
        except Exception as exc:
            if not settings.allow_extractor_fallback:
                raise
            log.warning("factor_extractor_fallback: %s", exc)
            return _keyword_extract(text), "keyword"
