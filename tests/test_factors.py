"""The factor catalog is the single source of truth for the whole system, so its
internal consistency is worth pinning down."""

from __future__ import annotations

import math

from app.domain.factors import (
    BASE_RATES,
    FACTOR_KEYS,
    FACTORS,
    GROUND_TRUTH,
    empty_factors,
    to_vector,
)


def test_keys_match_catalog_and_are_unique():
    assert FACTOR_KEYS == [f.key for f in FACTORS]
    assert len(set(FACTOR_KEYS)) == len(FACTOR_KEYS)


def test_ground_truth_and_base_rates_cover_every_factor():
    for k in FACTOR_KEYS:
        assert k in GROUND_TRUTH
        assert k in BASE_RATES
        assert 0.0 <= BASE_RATES[k] <= 1.0


def test_direction_hint_agrees_with_ground_truth_sign():
    # The cosmetic +/- direction shown in the UI should match the true effect.
    for f in FACTORS:
        assert math.copysign(1, f.direction) == math.copysign(1, GROUND_TRUTH[f.key])


def test_empty_factors_all_false():
    ef = empty_factors()
    assert set(ef) == set(FACTOR_KEYS)
    assert not any(ef.values())


def test_to_vector_is_ordered_and_binary():
    factors = {k: False for k in FACTOR_KEYS}
    factors[FACTOR_KEYS[0]] = True
    factors[FACTOR_KEYS[2]] = True
    vec = to_vector(factors)
    assert vec == [1, 0, 1] + [0] * (len(FACTOR_KEYS) - 3)
    # Missing keys are treated as absent.
    assert to_vector({}) == [0] * len(FACTOR_KEYS)
