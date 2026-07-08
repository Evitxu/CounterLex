from __future__ import annotations

from app.domain.factors import empty_factors
from app.infrastructure.synthetic import generate_corpus, true_probability


def test_size_and_shape():
    corpus = generate_corpus(size=50, seed=1)
    assert len(corpus) == 50
    assert all(c.reference for c in corpus)
    assert all(not c.is_real for c in corpus)


def test_reproducible_for_same_seed():
    a = generate_corpus(size=100, seed=7)
    b = generate_corpus(size=100, seed=7)
    assert [c.convicted for c in a] == [c.convicted for c in b]
    assert [c.factors for c in a] == [c.factors for c in b]


def test_different_seed_changes_corpus():
    a = generate_corpus(size=100, seed=7)
    b = generate_corpus(size=100, seed=8)
    assert [c.convicted for c in a] != [c.convicted for c in b]


def test_true_probability_bounds_and_direction():
    base = empty_factors()
    p_base = true_probability(base)
    assert 0.0 < p_base < 1.0
    # Confession has a strongly positive ground-truth weight → raises P.
    p_conf = true_probability({**base, "confession": True})
    assert p_conf > p_base
    # Inadmissible evidence has a strongly negative weight → lowers P.
    p_null = true_probability({**base, "evidence_inadmissible": True})
    assert p_null < p_base
