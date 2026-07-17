"""Pure domain types — no I/O, no framework. Shared by all layers."""

from __future__ import annotations

from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class Case(BaseModel):
    """A judgment in the corpus: its factors and the observed outcome."""

    id: UUID = Field(default_factory=uuid4)
    text: str = ""
    factors: dict[str, bool] = Field(default_factory=dict)
    convicted: bool = False
    is_real: bool = False  # True for the few hand-seeded real judgments
    reference: str | None = None  # e.g. an ECLI / BOE id when real


class ContactMessage(BaseModel):
    """A message submitted through the public contact form."""

    id: UUID = Field(default_factory=uuid4)
    name: str
    surname: str
    reply_email: str            # where the site owner should reply
    observations: str
    created_at: str = ""        # ISO-8601 UTC, set by the handler
    email_sent: bool = False    # True if SMTP delivery succeeded


class FactorContribution(BaseModel):
    key: str
    label: str
    present: bool
    weight: float           # learned log-odds coefficient
    contribution: float     # weight * present — signed push on the outcome


class OutcomePrediction(BaseModel):
    probability: float                       # P(convicted)
    log_odds: float
    contributions: list[FactorContribution]  # per-factor, sorted by |impact|


class PrecedentRef(BaseModel):
    id: UUID
    reference: str | None
    convicted: bool
    similarity: float           # 0..1 factor-overlap with the query
    shared_factors: list[str]
    text_preview: str = ""


class CaseAnalysis(BaseModel):
    factors: dict[str, bool]
    prediction: OutcomePrediction
    precedents: list[PrecedentRef]
    extraction_source: str = "llm"  # "llm" or "keyword" (fallback)
    # The court's actual decision detected in the text: True=conviction,
    # False=acquittal, None=couldn't determine.
    detected_outcome: bool | None = None
    # Finer-grained status behind `detected_outcome`:
    #   "convicted" | "acquitted" | "procedural" (operative part found but no
    #   conviction/acquittal, e.g. a jurisdiction ruling) | "not_found".
    verdict_status: str = "not_found"


class DebateTurn(BaseModel):
    role: str  # "fiscal" | "defensa" | "juez"
    argument: str


class DebateResult(BaseModel):
    probability: float
    turns: list[DebateTurn]
    consensus: str
    precedents: list[PrecedentRef]
    llm_available: bool  # False when no LLM (model/key) is reachable


class JurisprudenceSearch(BaseModel):
    query_factors: dict[str, bool]
    extraction_source: str  # "llm" or "keyword"
    results: list[PrecedentRef]


class CounterfactualResult(BaseModel):
    base: OutcomePrediction
    counterfactual: OutcomePrediction
    changed: dict[str, bool]          # the factors that were intervened on
    delta: float                      # cf.probability - base.probability
    narrative: str                    # human-readable explanation
    driving_precedents: list[PrecedentRef]
