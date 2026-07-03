"""Interpretable outcome model: logistic regression over the factor vector.

Why logistic regression (not a black box): the coefficients ARE the per-factor
log-odds effects, so (a) the model is transparent, and (b) a counterfactual is a
clean intervention — set a factor, recompute the linear predictor. Under the
model's assumptions (factors are the causal variables, no unmodelled confounding)
this is a genuine `do(factor = x)` on the outcome.

Trains with scikit-learn when available; falls back to a small numpy gradient
descent otherwise, so the project runs with minimal dependencies.
"""

from __future__ import annotations

import math

import numpy as np

from app.domain.entities import Case
from app.domain.factors import FACTOR_KEYS, to_vector


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def _fit_sklearn(X: np.ndarray, y: np.ndarray) -> tuple[np.ndarray, float]:
    from sklearn.linear_model import LogisticRegression

    clf = LogisticRegression(max_iter=1000, C=2.0)
    clf.fit(X, y)
    return clf.coef_[0], float(clf.intercept_[0])


def _fit_numpy(X: np.ndarray, y: np.ndarray, epochs: int = 4000, lr: float = 0.1) -> tuple[np.ndarray, float]:
    n, d = X.shape
    w = np.zeros(d)
    b = 0.0
    for _ in range(epochs):
        z = X @ w + b
        p = 1.0 / (1.0 + np.exp(-z))
        err = p - y
        w -= lr * (X.T @ err) / n + lr * 1e-3 * w  # tiny L2
        b -= lr * float(err.mean())
    return w, b


class OutcomeModel:
    """Holds learned coefficients and does prediction + interventions."""

    def __init__(self, coef: dict[str, float], intercept: float) -> None:
        self.coef = coef
        self.intercept = intercept

    # ---- training --------------------------------------------------------
    @classmethod
    def train(cls, cases: list[Case]) -> tuple["OutcomeModel", dict]:
        X = np.array([to_vector(c.factors) for c in cases], dtype=float)
        y = np.array([1 if c.convicted else 0 for c in cases], dtype=float)
        if len(set(y.tolist())) < 2:
            raise ValueError("Corpus has only one outcome class; cannot train.")

        try:
            weights, intercept = _fit_sklearn(X, y)
            backend = "sklearn"
        except ImportError:
            weights, intercept = _fit_numpy(X, y)
            backend = "numpy"

        coef = {k: float(w) for k, w in zip(FACTOR_KEYS, weights)}
        model = cls(coef, float(intercept))
        metrics = model._training_metrics(X, y)
        metrics["backend"] = backend
        return model, metrics

    # ---- inference -------------------------------------------------------
    def log_odds(self, factors: dict[str, bool]) -> float:
        return self.intercept + sum(self.coef[k] for k in FACTOR_KEYS if factors.get(k))

    def probability(self, factors: dict[str, bool]) -> float:
        return _sigmoid(self.log_odds(factors))

    def _training_metrics(self, X: np.ndarray, y: np.ndarray) -> dict:
        z = X @ np.array([self.coef[k] for k in FACTOR_KEYS]) + self.intercept
        p = 1.0 / (1.0 + np.exp(-z))
        pred = (p >= 0.5).astype(float)
        acc = float((pred == y).mean())
        # Brier score (calibration) — lower is better.
        brier = float(np.mean((p - y) ** 2))
        return {"train_accuracy": round(acc, 4), "brier_score": round(brier, 4), "n": int(len(y))}
