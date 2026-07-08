"""The interpretable model is the research core: its coefficients must recover
the known ground-truth effects, and its predictions must be additive in log-odds
(that additivity is what makes a counterfactual a clean intervention)."""

from __future__ import annotations

import math

import pytest

from app.domain.entities import Case
from app.domain.factors import FACTOR_KEYS, GROUND_TRUTH, empty_factors
from app.infrastructure.outcome_model import OutcomeModel
from app.infrastructure.synthetic import generate_corpus


@pytest.fixture(scope="module")
def model_and_metrics():
    # A larger corpus makes sign recovery stable and deterministic (seeded).
    cases = generate_corpus(size=800, seed=7)
    return OutcomeModel.train(cases, seed=7)


def test_recovers_ground_truth_signs(model_and_metrics):
    model, _ = model_and_metrics
    # Every factor with a clear true effect should be learned with the right sign.
    strong = {k: v for k, v in GROUND_TRUTH.items() if abs(v) >= 0.7}
    for k, true_w in strong.items():
        assert math.copysign(1, model.coef[k]) == math.copysign(1, true_w), (
            f"factor {k}: learned {model.coef[k]:.2f} vs true {true_w:.2f}"
        )


def test_metrics_report_heldout_generalization(model_and_metrics):
    _, metrics = model_and_metrics
    for key in ("test_accuracy", "test_auc", "test_brier", "n_train", "n_test", "backend"):
        assert key in metrics
    assert 0.0 <= metrics["test_accuracy"] <= 1.0
    assert 0.0 <= metrics["test_brier"] <= 1.0
    # The synthetic process is learnable → clearly better than chance.
    assert metrics["test_accuracy"] >= 0.7
    assert metrics["test_auc"] >= 0.7


def test_log_odds_is_additive():
    coef = {k: 0.0 for k in FACTOR_KEYS}
    coef[FACTOR_KEYS[0]] = 1.5
    coef[FACTOR_KEYS[1]] = -0.5
    model = OutcomeModel(coef, intercept=-0.4)

    base = empty_factors()
    assert model.log_odds(base) == pytest.approx(-0.4)

    one = {**base, FACTOR_KEYS[0]: True}
    assert model.log_odds(one) == pytest.approx(-0.4 + 1.5)

    two = {**one, FACTOR_KEYS[1]: True}
    assert model.log_odds(two) == pytest.approx(-0.4 + 1.5 - 0.5)


def test_probability_is_sigmoid_of_log_odds_and_monotonic():
    coef = {k: 0.0 for k in FACTOR_KEYS}
    coef[FACTOR_KEYS[0]] = 2.0  # a strong incriminating factor
    model = OutcomeModel(coef, intercept=0.0)

    base = empty_factors()
    p0 = model.probability(base)
    assert p0 == pytest.approx(0.5)  # sigmoid(0)

    p1 = model.probability({**base, FACTOR_KEYS[0]: True})
    assert p1 == pytest.approx(1 / (1 + math.exp(-2.0)))
    assert p1 > p0  # adding a positive factor raises P(conviction)


def test_single_class_corpus_cannot_train():
    cases = [Case(factors=empty_factors(), convicted=True) for _ in range(10)]
    with pytest.raises(ValueError):
        OutcomeModel.train(cases)
