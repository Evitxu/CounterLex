"""Verdict ("fallo") detection from raw judgment text.

This is the trickiest heuristic in the system. Real Spanish judgments:
  * render the FALLO heading letter-spaced ("F A L L O"),
  * put it hundreds of pages in,
  * mention "condena" and "absolución" all over the reasoning and dissents,
  * and the operative ruling itself can be *mixed* (convict on one charge,
    acquit on the rest).
These tests pin the behaviour on exactly those cases, including the real
STS 1000/2025 (García Ortiz) fallo text.
"""

from __future__ import annotations

from app.infrastructure.factor_extractor import detect_outcome


def test_plain_conviction():
    assert detect_outcome("El tribunal dictó fallo condenatorio y le condena a 3 años.") is True


def test_plain_acquittal():
    assert detect_outcome("FALLO: se absuelve al acusado de todos los cargos.") is False
    assert detect_outcome("Que debemos absolver y absolvemos al acusado.") is False


def test_letter_spaced_fallo_heading():
    text = (
        "... folios previos ...\n"
        "F A L L O\n"
        "esta Sala ha decidido Que debemos condenar y condenamos al acusado."
    )
    assert detect_outcome(text) is True


def test_real_garcia_ortiz_mixed_verdict_is_conviction():
    # A mixed operative ruling: convicts on the main charge, acquits on the rest.
    # The conviction is the headline → True.
    real = (
        "F A L L O\n"
        "Por todo lo expuesto, en nombre del Rey y por la autoridad que le confiere "
        "la Constitucion, esta Sala ha decidido "
        "Que debemos condenar y condenamos a D. Alvaro Garcia Ortiz, Fiscal General "
        "del Estado, como autor de un delito de revelacion de datos reservados, a la "
        "pena de multa e inhabilitacion especial. "
        "Le absolvemos del resto de los delitos objeto de la acusacion. "
        "VOTO PARTICULAR: considero que procedia la absolucion."
    )
    assert detect_outcome(real) is True


def test_full_acquittal_with_spaced_heading():
    text = (
        "F A L L O  esta Sala ha decidido Que debemos absolver y absolvemos "
        "a D. Fulano de todos los delitos. Sin costas."
    )
    assert detect_outcome(text) is False


def test_acquittal_via_ha_decidido_anchor():
    text = "Parte previa. La Sala ha decidido absolver libremente al acusado."
    assert detect_outcome(text) is False


def test_dissent_after_operative_ruling_is_ignored():
    # A conviction fallo followed by a dissent arguing for acquittal → still True.
    text = (
        "F A L L O esta Sala ha decidido condenar al acusado. "
        + "relleno " * 50
        + "VOTO PARTICULAR: absolver, absolucion, absuelvo, se debio absolver."
    )
    assert detect_outcome(text) is True


def test_no_verdict_returns_none():
    assert detect_outcome("Antecedentes de hecho y fundamentos, sin parte dispositiva.") is None
    assert detect_outcome("") is None


def test_denominacion_social_is_not_a_conviction():
    # Guard against a false positive: "con denominación social" must not read as
    # "conden..." — words separated by a real space are never a conviction cue.
    text = "La mercantil, con denominacion social ACME S.L. y domicilio en Madrid, comparecio."
    assert detect_outcome(text) is None


def test_accent_insensitive():
    assert detect_outcome("FALLO: se le condená e impone la pena.") is True
    assert detect_outcome("FALLO: procede la absolución del acusado.") is False
