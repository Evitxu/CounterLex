"""Synthetic corpus generator with a KNOWN data-generating process.

We sample each factor from its base rate, compute the true log-odds using
`GROUND_TRUTH`, and draw the outcome from that probability. Because the true
weights are known, training a model on this corpus lets us *measure recovery*
of the causal effects (see the /evaluation endpoint) — the rigor that makes the
counterfactual claims defensible in a thesis, despite the data being synthetic.

Everything is seeded (numpy RandomState) so the corpus is reproducible.
"""

from __future__ import annotations

import math

import numpy as np

from app.domain.entities import Case
from app.domain.factors import BASE_RATES, FACTOR_KEYS, GROUND_TRUTH, GROUND_TRUTH_INTERCEPT


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def true_probability(factors: dict[str, bool]) -> float:
    logit = GROUND_TRUTH_INTERCEPT + sum(
        GROUND_TRUTH[k] for k in FACTOR_KEYS if factors.get(k)
    )
    return _sigmoid(logit)


# Full Spanish court names (spelled out so non-experts can read them), used for
# realistic-looking references on the synthetic corpus.
_COURTS = [
    "Tribunal Supremo",
    "Audiencia Provincial",
    "Tribunal Superior de Justicia",
    "Audiencia Nacional",
]


def generate_corpus(size: int, seed: int) -> list[Case]:
    rng = np.random.RandomState(seed)
    cases: list[Case] = []
    for i in range(size):
        factors = {k: bool(rng.rand() < BASE_RATES[k]) for k in FACTOR_KEYS}
        p = true_probability(factors)
        convicted = bool(rng.rand() < p)
        court = _COURTS[i % len(_COURTS)]
        reference = f"{court} {100 + i}/{2018 + (i % 7)}"
        cases.append(
            Case(factors=factors, convicted=convicted, is_real=False, reference=reference)
        )
    return cases
