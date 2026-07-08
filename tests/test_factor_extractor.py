"""The keyword fallback keeps the whole app working with no LLM, so its behaviour
is part of the contract. We test the pure helpers directly (no network)."""

from __future__ import annotations

from app.domain.factors import FACTOR_KEYS
from app.infrastructure.factor_extractor import _coerce, _keyword_extract, _norm


def test_norm_deaccents_lowercases_and_collapses_space():
    # _norm lower-cases, strips accents and collapses runs of whitespace to a
    # single space (it intentionally does not trim — callers search substrings).
    assert _norm("  Legítima   DEFENSA\n") == " legitima defensa "


def test_keyword_extract_detects_present_factors():
    text = (
        "Se halló el arma del delito, un testigo presencial identificó al acusado y "
        "existía prueba forense de ADN. El acusado confesó los hechos."
    )
    factors = _keyword_extract(text)
    assert factors["weapon_present"] is True
    assert factors["eyewitness"] is True
    assert factors["forensic_evidence"] is True
    assert factors["confession"] is True
    # Unmentioned factors stay False.
    assert factors["alibi"] is False
    assert set(factors) == set(FACTOR_KEYS)


def test_keyword_extract_detects_exculpatory_factors():
    text = "El acusado alegó legítima defensa y aportó una coartada verificable."
    factors = _keyword_extract(text)
    assert factors["self_defense"] is True
    assert factors["alibi"] is True


def test_keyword_extract_is_accent_insensitive():
    assert _keyword_extract("legitima defensa")["self_defense"] is True


def test_coerce_accepts_bools_strings_and_numbers():
    raw = {
        "forensic_evidence": True,
        "confession": "si",
        "eyewitness": "false",
        "weapon_present": 1,
        "violence_used": 0,
    }
    out = _coerce(raw)
    assert out["forensic_evidence"] is True
    assert out["confession"] is True
    assert out["eyewitness"] is False
    assert out["weapon_present"] is True
    assert out["violence_used"] is False
    # Keys absent from the raw dict default to False, and the shape is complete.
    assert set(out) == set(FACTOR_KEYS)
    assert out["alibi"] is False
