"""End-to-end HTTP tests over the real FastAPI app.

The `client` fixture boots the app with an isolated DB and offline settings; the
app lifespan bootstraps a corpus + trained model, so every route is exercised
against a genuinely working system. No Ollama/Tesseract needed (extraction falls
back to the keyword heuristic).
"""

from __future__ import annotations

from app.domain.factors import FACTOR_KEYS


def _make_pdf(text: str) -> bytes:
    from fpdf import FPDF

    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("helvetica", size=12)
    pdf.multi_cell(0, 8, text)
    return bytes(pdf.output())


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_factor_catalog(client):
    r = client.get("/api/v1/factors")
    assert r.status_code == 200
    body = r.json()
    assert {f["key"] for f in body} == set(FACTOR_KEYS)
    assert all({"label_es", "label_en", "description_es", "direction"} <= set(f) for f in body)


def test_analyze_free_text(client):
    r = client.post("/api/v1/analyze", json={
        "text": "Se halló el arma del delito y un testigo presencial identificó al acusado."
    })
    assert r.status_code == 200
    body = r.json()
    assert body["factors"]["weapon_present"] is True
    assert body["factors"]["eyewitness"] is True
    assert 0.0 <= body["prediction"]["probability"] <= 1.0
    assert len(body["prediction"]["contributions"]) == len(FACTOR_KEYS)
    assert isinstance(body["precedents"], list)
    assert body["extraction_source"] == "keyword"  # Ollama is unreachable in tests


def test_analyze_rejects_too_short_text(client):
    r = client.post("/api/v1/analyze", json={"text": "corto"})
    assert r.status_code == 422


def test_counterfactual_intervention(client):
    factors = {k: False for k in FACTOR_KEYS}
    factors["forensic_evidence"] = True
    r = client.post("/api/v1/counterfactual", json={
        "factors": factors, "overrides": {"forensic_evidence": False}
    })
    assert r.status_code == 200
    body = r.json()
    assert body["delta"] < 0  # removing an incriminating factor lowers P(conviction)
    assert body["changed"] == {"forensic_evidence": False}
    assert body["narrative"]


def test_search_returns_ranked_precedents(client):
    r = client.post("/api/v1/search", json={
        "text": "confesión y antecedentes penales", "top_k": 5
    })
    assert r.status_code == 200
    body = r.json()
    assert len(body["results"]) <= 5
    sims = [p["similarity"] for p in body["results"]]
    assert sims == sorted(sims, reverse=True)


def test_model_evaluation_reports_recovery(client):
    r = client.get("/api/v1/model/evaluation")
    assert r.status_code == 200
    body = r.json()
    assert "mean_abs_error" in body
    assert len(body["weights"]) == len(FACTOR_KEYS)
    assert "training_metrics" in body


def test_corpus_generate_and_retrain(client):
    r = client.post("/api/v1/corpus/generate", json={"size": 120, "seed": 3, "reset": True})
    assert r.status_code == 200
    body = r.json()
    assert body["synthetic"] == 120
    assert body["total"] == 120 + body["real"]
    r2 = client.post("/api/v1/model/train")
    assert r2.status_code == 200
    assert "metrics" in r2.json()


def test_analyze_pdf_detects_conviction(client):
    text = (
        "Antecedentes de hecho. Se hallo el arma del delito y un testigo presencial "
        "identifico al acusado, que confeso los hechos. "
        "F A L L O esta Sala ha decidido condenar y condenamos al acusado."
    )
    pdf = _make_pdf(text)
    r = client.post(
        "/api/v1/analyze/pdf",
        files={"file": ("sentencia.pdf", pdf, "application/pdf")},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["detected_outcome"] is True
    assert body["factors"]["weapon_present"] is True


def test_analyze_pdf_rejects_non_pdf(client):
    r = client.post(
        "/api/v1/analyze/pdf",
        files={"file": ("notes.txt", b"hello world", "text/plain")},
    )
    assert r.status_code == 415


def test_report_returns_pdf(client):
    factors = {k: False for k in FACTOR_KEYS}
    factors["confession"] = True
    r = client.post("/api/v1/report", json={"factors": factors, "overrides": {}, "lang": "es"})
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.content[:4] == b"%PDF"


def test_debate_degrades_gracefully_without_llm(client):
    factors = {k: False for k in FACTOR_KEYS}
    factors["confession"] = True
    r = client.post("/api/v1/debate", json={"factors": factors, "lang": "es"})
    assert r.status_code == 200
    body = r.json()
    # No LLM reachable → no turns, but the statistical consensus is still returned.
    assert body["llm_available"] is False
    assert body["consensus"]
    assert 0.0 <= body["probability"] <= 1.0
