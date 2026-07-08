from __future__ import annotations

from app.core.sanitize import sanitize_text


def test_strips_html_tags():
    assert sanitize_text("<b>hola</b> mundo") == "hola mundo"


def test_strips_script_and_nested_brackets():
    # Repeated stripping removes every "<...>" tag, including the nested case, so
    # no "<" survives — without it no HTML element can be reopened downstream.
    out = sanitize_text("<<script>>alert(1)<</script>>")
    assert "<" not in out
    assert "<script" not in out.lower()


def test_removes_control_characters():
    assert sanitize_text("a\x00b\x07c") == "abc"


def test_preserves_plain_text_and_trims():
    assert sanitize_text("  Caso penal con arma.  ") == "Caso penal con arma."


def test_keeps_accents_and_unicode_letters():
    assert sanitize_text("legítima defensa y coartada") == "legítima defensa y coartada"
