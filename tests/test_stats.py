"""KPI dashboard stats: GET /api/v1/stats structure, and that usage counters
increment on tracked endpoints."""

from __future__ import annotations

from app.domain.factors import FACTOR_KEYS


def test_stats_structure_and_corpus(client):
    r = client.get("/api/v1/stats")
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"model", "corpus", "contact", "usage"}

    # Corpus: bootstrapped in the test app (200 synthetic + real seeds).
    corpus = body["corpus"]
    assert corpus["factors"] == len(FACTOR_KEYS)
    assert corpus["total"] == corpus["synthetic"] + corpus["real"]
    assert corpus["real"] >= 1

    # Model was trained by the lifespan bootstrap.
    assert body["model"]["trained"] is True
    assert 0.0 <= body["model"]["mae"] <= 5.0

    # Contact starts empty.
    assert body["contact"] == {"total": 0, "emailed": 0, "saved_only": 0}


def test_stats_usage_counters_increment(client):
    before = client.get("/api/v1/stats").json()["usage"]

    client.post("/api/v1/analyze", json={"text": "Se halló el arma y un testigo presencial."})
    client.post("/api/v1/search", json={"text": "confesión y antecedentes", "top_k": 3})
    client.post("/api/v1/contact", json={
        "name": "Ana", "surname": "García", "email": "ana@example.com",
        "observations": "Hola, me interesa el proyecto.",
    })

    after = client.get("/api/v1/stats").json()["usage"]
    assert after["analyze_text"] == before["analyze_text"] + 1
    assert after["search"] == before["search"] + 1
    assert after["contact"] == before["contact"] + 1
    assert after["total"] == before["total"] + 3


def test_stats_contact_counts_track_submissions(client):
    client.post("/api/v1/contact", json={
        "name": "Ana", "surname": "García", "email": "ana@example.com",
        "observations": "Mensaje de prueba.",
    })
    contact = client.get("/api/v1/stats").json()["contact"]
    assert contact["total"] == 1
    assert contact["emailed"] == 0        # no SMTP configured in tests → dev mode
    assert contact["saved_only"] == 1


def test_stats_rejected_requests_do_not_increment(client):
    before = client.get("/api/v1/stats").json()["usage"]
    # Invalid (too short) → 422, must not count.
    client.post("/api/v1/analyze", json={"text": "no"})
    after = client.get("/api/v1/stats").json()["usage"]
    assert after["analyze_text"] == before["analyze_text"]
