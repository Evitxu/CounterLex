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
