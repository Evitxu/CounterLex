"""Interpretable outcome model: logistic regression over the factor vector.

Why logistic regression (not a black box): the coefficients ARE the per-factor
log-odds effects, so (a) the model is transparent, and (b) a counterfactual is a
clean intervention — set a factor, recompute the linear predictor. Under the
model's assumptions (factors are the causal variables, no unmodelled confounding)
this is a genuine `do(factor = x)` on the outcome.

Training reports **held-out** metrics (accuracy / AUC / calibration on cases the
model never saw), not just training fit — the standard evidence of generalization.
The deployed model is then refit on all data. Trains with scikit-learn when
available, else a small numpy gradient descent.
"""

from __future__ import annotations

import math

import numpy as np

from app.domain.entities import Case
from app.domain.factors import FACTOR_KEYS, to_vector


def _sigmoid_scalar(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def _proba(X: np.ndarray, w: np.ndarray, b: float) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-(X @ w + b)))


def _auc(y: np.ndarray, scores: np.ndarray) -> float | None:
    """Mann–Whitney AUC. None if only one class is present."""
    pos = scores[y == 1]
    neg = scores[y == 0]
    if pos.size == 0 or neg.size == 0:
        return None
    diff = pos[:, None] - neg[None, :]
    wins = (diff > 0).sum() + 0.5 * (diff == 0).sum()
    return float(wins / (pos.size * neg.size))


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
        p = _proba(X, w, b)
        err = p - y
        w -= lr * (X.T @ err) / n + lr * 1e-3 * w  # tiny L2
        b -= lr * float(err.mean())
    return w, b


def _fit(X: np.ndarray, y: np.ndarray) -> tuple[np.ndarray, float, str]:
    try:
        w, b = _fit_sklearn(X, y)
        return w, b, "sklearn"
    except ImportError:
        w, b = _fit_numpy(X, y)
        return w, b, "numpy"


class OutcomeModel:
    def __init__(self, coef: dict[str, float], intercept: float) -> None:
        self.coef = coef
        self.intercept = intercept

    @classmethod
    def train(cls, cases: list[Case], seed: int = 7, test_size: float = 0.25) -> tuple["OutcomeModel", dict]:
        X = np.array([to_vector(c.factors) for c in cases], dtype=float)
        y = np.array([1 if c.convicted else 0 for c in cases], dtype=float)
        if len(set(y.tolist())) < 2:
            raise ValueError("Corpus has only one outcome class; cannot train.")

        # --- held-out split → generalization metrics ---
        rng = np.random.RandomState(seed)
        idx = rng.permutation(len(y))
        n_test = max(1, int(len(y) * test_size))
        test_idx, train_idx = idx[:n_test], idx[n_test:]
        metrics: dict = {"n_train": int(train_idx.size), "n_test": int(test_idx.size)}

        if len(set(y[train_idx].tolist())) == 2 and len(set(y[test_idx].tolist())) == 2:
            w_e, b_e, _ = _fit(X[train_idx], y[train_idx])
            p_te = _proba(X[test_idx], w_e, b_e)
            y_te = y[test_idx]
            pred = (p_te >= 0.5).astype(float)
            metrics["test_accuracy"] = round(float((pred == y_te).mean()), 4)
            metrics["test_brier"] = round(float(np.mean((p_te - y_te) ** 2)), 4)
            auc = _auc(y_te, p_te)
            metrics["test_auc"] = round(auc, 4) if auc is not None else None
        else:
            metrics["note"] = "test split had a single class; holdout metrics skipped"

        # --- deploy: refit on ALL data ---
        weights, intercept, backend = _fit(X, y)
        model = cls({k: float(v) for k, v in zip(FACTOR_KEYS, weights)}, float(intercept))

        p_all = _proba(X, weights, intercept)
        metrics["train_accuracy"] = round(float(((p_all >= 0.5).astype(float) == y).mean()), 4)
        metrics["brier_score"] = round(float(np.mean((p_all - y) ** 2)), 4)
        metrics["n"] = int(len(y))
        metrics["backend"] = backend
        return model, metrics

    def log_odds(self, factors: dict[str, bool]) -> float:
        return self.intercept + sum(self.coef[k] for k in FACTOR_KEYS if factors.get(k))

    def probability(self, factors: dict[str, bool]) -> float:
        return _sigmoid_scalar(self.log_odds(factors))
