"""Generate a downloadable PDF report for a case + its counterfactual analysis.

Uses fpdf2 (pure Python). Core fonts are latin-1; `_l()` coerces text so Spanish
accents/guillemets render and any stray symbol degrades gracefully instead of
crashing. Kept dependency-light (no embedded TTF).
"""

from __future__ import annotations

from app.domain.entities import CounterfactualResult
from app.domain.factors import FACTORS

_STR = {
    "es": {
        "title": "Informe CounterLex",
        "subtitle": "Análisis contrafactual de precedentes",
        "generated": "Generado",
        "caseFactors": "Factores del caso",
        "prob": "Probabilidad de condena estimada",
        "explanation": "Factores más influyentes",
        "cf": "Análisis contrafactual",
        "precedents": "Precedentes recuperados",
        "limitations": "Limitaciones",
        "convicted": "Condena",
        "acquitted": "Absolución",
        "similarity": "similitud",
        "none": "Ninguno",
        "limitationsText": (
            "Sistema analítico con fines académicos. El corpus es mayoritariamente "
            "sintético y las probabilidades son estimaciones de un modelo interpretable "
            "basadas en patrones de precedentes; no constituyen asesoramiento jurídico."
        ),
    },
    "en": {
        "title": "CounterLex Report",
        "subtitle": "Counterfactual precedent analysis",
        "generated": "Generated",
        "caseFactors": "Case factors",
        "prob": "Estimated probability of conviction",
        "explanation": "Most influential factors",
        "cf": "Counterfactual analysis",
        "precedents": "Retrieved precedents",
        "limitations": "Limitations",
        "convicted": "Convicted",
        "acquitted": "Acquitted",
        "similarity": "similarity",
        "none": "None",
        "limitationsText": (
            "Analytical system for academic purposes. The corpus is mostly synthetic "
            "and the probabilities are estimates from an interpretable model based on "
            "precedent patterns; they do not constitute legal advice."
        ),
    },
}


def _l(s: str) -> str:
    return s.encode("latin-1", "replace").decode("latin-1")


def build_report_pdf(cf: CounterfactualResult, factors: dict[str, bool], lang: str, generated_at: str) -> bytes:
    from fpdf import FPDF

    s = _STR.get(lang, _STR["es"])
    label = {f.key: (f.label_en if lang == "en" else f.label_es) for f in FACTORS}

    pdf = FPDF(format="A4")
    pdf.set_auto_page_break(True, margin=15)
    pdf.add_page()
    epw = pdf.w - pdf.l_margin - pdf.r_margin

    def h1(txt: str) -> None:
        pdf.set_font("Helvetica", "B", 18)
        pdf.multi_cell(epw, 9, _l(txt))

    def h2(txt: str) -> None:
        pdf.ln(3)
        pdf.set_font("Helvetica", "B", 13)
        pdf.multi_cell(epw, 7, _l(txt))

    def body(txt: str) -> None:
        pdf.set_font("Helvetica", "", 11)
        pdf.multi_cell(epw, 6, _l(txt))

    def small(txt: str) -> None:
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(120, 120, 120)
        pdf.multi_cell(epw, 5, _l(txt))
        pdf.set_text_color(0, 0, 0)

    h1(s["title"])
    small(f"{s['subtitle']}  -  {s['generated']}: {generated_at}")

    # Case factors
    h2(s["caseFactors"])
    present = [label.get(k, k) for k, v in factors.items() if v]
    body(", ".join(present) if present else s["none"])

    # Probability + top contributions
    h2(f"{s['prob']}: {round(cf.base.probability * 100)}%")
    top = [c for c in cf.base.contributions if c.present][:6]
    for c in top:
        sign = "+" if c.contribution >= 0 else ""
        body(f"  - {label.get(c.key, c.key)}: {sign}{round(c.contribution, 2)} (log-odds)")

    # Counterfactual (only if something changed)
    if cf.changed:
        h2(s["cf"])
        changed = ", ".join(label.get(k, k) for k in cf.changed)
        body(f"{changed}: {round(cf.base.probability * 100)}% -> {round(cf.counterfactual.probability * 100)}% "
             f"({round(cf.delta * 100):+d} pp)")
        body(cf.narrative)

    # Precedents
    h2(s["precedents"])
    if not cf.driving_precedents:
        body(s["none"])
    for p in cf.driving_precedents:
        ref = p.reference or f"#{str(p.id)[:8]}"
        outcome = s["convicted"] if p.convicted else s["acquitted"]
        why = ", ".join(label.get(k, k) for k in p.shared_factors) or "-"
        body(f"  - {ref}  |  {round(p.similarity * 100)}% {s['similarity']}  |  {outcome}  |  {why}")

    # Limitations
    h2(s["limitations"])
    small(s["limitationsText"])

    return bytes(pdf.output())
