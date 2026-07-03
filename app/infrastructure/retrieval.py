"""Precedent retrieval by factor overlap.

Deliberately simple and explainable: similarity = share of factors that match
between the query case and a corpus case (Jaccard-like over the boolean vector).
This is transparent ("these precedents match on X, Y, Z") which suits a system
whose whole selling point is interpretability. Text-embedding similarity can be
layered on later without changing the interface.
"""

from __future__ import annotations

from app.domain.entities import Case, PrecedentRef
from app.domain.factors import FACTOR_KEYS


def _similarity(a: dict[str, bool], b: dict[str, bool]) -> tuple[float, list[str]]:
    shared = [k for k in FACTOR_KEYS if a.get(k) and b.get(k)]
    union = [k for k in FACTOR_KEYS if a.get(k) or b.get(k)]
    sim = (len(shared) / len(union)) if union else 0.0
    return sim, shared


class PrecedentIndex:
    def __init__(self, cases: list[Case]) -> None:
        self._cases = cases

    def query(
        self, factors: dict[str, bool], top_k: int, require_factor: str | None = None
    ) -> list[PrecedentRef]:
        """Most similar precedents. If `require_factor` is set, only consider
        cases where that factor is present (used to explain a counterfactual)."""
        scored: list[PrecedentRef] = []
        for c in self._cases:
            if require_factor is not None and not c.factors.get(require_factor):
                continue
            sim, shared = _similarity(factors, c.factors)
            scored.append(
                PrecedentRef(
                    id=c.id,
                    reference=c.reference,
                    convicted=c.convicted,
                    similarity=round(sim, 3),
                    shared_factors=shared,
                    text_preview=(c.text[:180] if c.text else ""),
                )
            )
        scored.sort(key=lambda p: p.similarity, reverse=True)
        return scored[:top_k]
