"""The legal factor catalog — the vocabulary the whole system reasons over.

Each factor is a boolean feature of a criminal case that plausibly influences
the probability of conviction. This catalog is the single source of truth:
the synthetic generator, the LLM extractor, the outcome model, and the frontend
toggles all derive from it. Keep it small and interpretable (that is the point).

`GROUND_TRUTH` are the log-odds weights used ONLY to generate synthetic data.
Because we know them, we can later measure how well the learned model recovers
them — an honest, quantitative evaluation of the counterfactual engine.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Factor:
    key: str
    label_es: str
    label_en: str
    description_es: str
    # Sign hint for the UI (+1 tends to convict, -1 tends to acquit). Purely
    # cosmetic; the learned model decides the real effect.
    direction: int


# Order matters: it defines the feature-vector order used everywhere.
FACTORS: list[Factor] = [
    Factor("forensic_evidence", "Prueba forense", "Forensic evidence",
           "Existe prueba forense que vincula al acusado (ADN, huellas, balística).", +1),
    Factor("confession", "Confesión", "Confession",
           "El acusado ha confesado la autoría de los hechos.", +1),
    Factor("eyewitness", "Testigo presencial", "Eyewitness",
           "Hay testigo presencial que identifica al acusado.", +1),
    Factor("weapon_present", "Arma hallada", "Weapon found",
           "Se halló el arma o instrumento del delito.", +1),
    Factor("violence_used", "Violencia", "Violence used",
           "Se empleó violencia o intimidación sobre la víctima.", +1),
    Factor("premeditation", "Premeditación", "Premeditation",
           "Existen indicios de premeditación o alevosía.", +1),
    Factor("prior_convictions", "Antecedentes", "Prior convictions",
           "El acusado tiene antecedentes penales.", +1),
    Factor("self_defense", "Legítima defensa", "Self-defense claim",
           "El acusado alega legítima defensa.", -1),
    Factor("alibi", "Coartada", "Alibi",
           "El acusado presenta una coartada verificable.", -1),
    Factor("evidence_inadmissible", "Prueba nula", "Evidence inadmissible",
           "Una prueba clave fue declarada nula (obtenida ilícitamente).", -1),
    Factor("witness_unreliable", "Testigo no fiable", "Unreliable witness",
           "La credibilidad del testigo principal está seriamente cuestionada.", -1),
]

FACTOR_KEYS: list[str] = [f.key for f in FACTORS]

# Log-odds weights of the *true* data-generating process (synthetic only).
GROUND_TRUTH_INTERCEPT: float = -0.4
GROUND_TRUTH: dict[str, float] = {
    "forensic_evidence": 1.6,
    "confession": 2.2,
    "eyewitness": 1.0,
    "weapon_present": 1.1,
    "violence_used": 0.7,
    "premeditation": 0.9,
    "prior_convictions": 0.6,
    "self_defense": -1.2,
    "alibi": -1.7,
    "evidence_inadmissible": -1.9,
    "witness_unreliable": -0.9,
}

# Base rate each factor is present when sampling synthetic cases.
BASE_RATES: dict[str, float] = {
    "forensic_evidence": 0.45,
    "confession": 0.20,
    "eyewitness": 0.50,
    "weapon_present": 0.40,
    "violence_used": 0.55,
    "premeditation": 0.30,
    "prior_convictions": 0.35,
    "self_defense": 0.20,
    "alibi": 0.25,
    "evidence_inadmissible": 0.15,
    "witness_unreliable": 0.30,
}


def empty_factors() -> dict[str, bool]:
    return {k: False for k in FACTOR_KEYS}


def to_vector(factors: dict[str, bool]) -> list[int]:
    """Deterministic feature-vector order (matches FACTOR_KEYS)."""
    return [1 if factors.get(k) else 0 for k in FACTOR_KEYS]
