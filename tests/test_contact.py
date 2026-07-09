"""Contact module: HTTP route validation/sanitization, persistence, and the
SMTP mailer's dev-mode (no credentials → no send, message still stored).

No real SMTP is exercised (the suite is offline): with no SMTP_* env the mailer
is disabled, so `email_sent` is always False and delivery is a no-op.
"""

from __future__ import annotations

from app.core.config import Settings
from app.domain.entities import ContactMessage
from app.infrastructure.mailer import SmtpMailer
from app.infrastructure.repository import ContactRepository

VALID = {
    "name": "Ana",
    "surname": "García López",
    "email": "ana@example.com",
    "observations": "Hola, me gustaría más información sobre el proyecto.",
}


def test_contact_valid_submission_persists_dev_mode(client, tmp_path):
    r = client.post("/api/v1/contact", json=VALID)
    assert r.status_code == 200
    body = r.json()
    assert body["id"]
    assert body["email_sent"] is False  # no SMTP configured in tests

    # Same on-disk DB the app wrote to (conftest sets SQLITE_PATH to tmp_path/api.db).
    repo = ContactRepository(str(tmp_path / "api.db"))
    msgs = repo.all_messages()
    assert len(msgs) == 1
    assert msgs[0].reply_email == "ana@example.com"
    assert msgs[0].surname == "García López"
    assert msgs[0].email_sent is False


def test_contact_sanitizes_html_in_fields(client, tmp_path):
    r = client.post(
        "/api/v1/contact",
        json={**VALID, "name": "<script>alert(1)</script>Ana", "observations": "<b>Hola</b> mundo"},
    )
    assert r.status_code == 200
    repo = ContactRepository(str(tmp_path / "api.db"))
    msg = repo.all_messages()[0]
    assert "<" not in msg.name and ">" not in msg.name
    assert msg.name == "alert(1)Ana"
    assert msg.observations == "Hola mundo"


def test_contact_rejects_missing_and_empty_fields(client):
    # Missing key → 422 (pydantic).
    assert client.post("/api/v1/contact", json={k: v for k, v in VALID.items() if k != "name"}).status_code == 422
    # Present but blank/whitespace → 422 (sanitize → empty → required).
    assert client.post("/api/v1/contact", json={**VALID, "surname": "   "}).status_code == 422


def test_contact_rejects_invalid_email(client):
    for bad in ["not-an-email", "a@b", "a@@b.com", "a b@c.com"]:
        assert client.post("/api/v1/contact", json={**VALID, "email": bad}).status_code == 422


def test_contact_enforces_length_limits(client):
    over = {
        "name": "n" * 61,          # > 60
        "surname": "s" * 151,      # > 150
        "email": "e" * 250 + "@example.com",  # > 255
        "observations": "o" * 1001,  # > 1000
    }
    for field, value in over.items():
        r = client.post("/api/v1/contact", json={**VALID, field: value})
        assert r.status_code == 422, field
    # Exactly at the limit is accepted.
    ok = client.post(
        "/api/v1/contact",
        json={**VALID, "name": "n" * 60, "surname": "s" * 150, "observations": "o" * 1000},
    )
    assert ok.status_code == 200


def test_mailer_dev_mode_when_unconfigured():
    mailer = SmtpMailer(Settings(smtp_host=None, smtp_user=None, smtp_password=None))
    assert mailer.enabled is False
    assert mailer.send(subject="s", body="b", reply_to="a@b.com") is False


def test_mailer_reports_enabled_when_fully_configured():
    mailer = SmtpMailer(
        Settings(
            smtp_host="smtp.gmail.com",
            smtp_user="me@gmail.com",
            smtp_password="app-password",
        )
    )
    assert mailer.enabled is True


def test_contact_messages_listed_newest_first(client):
    client.post("/api/v1/contact", json={**VALID, "name": "First"})
    client.post("/api/v1/contact", json={**VALID, "name": "Second"})
    r = client.get("/api/v1/contact/messages")
    assert r.status_code == 200  # open when no ADMIN_API_KEY configured
    body = r.json()
    assert [m["name"] for m in body] == ["Second", "First"]  # newest first
    assert {"id", "reply_email", "observations", "created_at", "email_sent"} <= set(body[0])


def test_contact_messages_admin_gated_when_key_set(secured_client):
    secured_client.post("/api/v1/contact", json=VALID)
    # No / wrong key → 401.
    assert secured_client.get("/api/v1/contact/messages").status_code == 401
    assert secured_client.get(
        "/api/v1/contact/messages", headers={"X-Admin-Key": "wrong"}
    ).status_code == 401
    # Correct key → 200 with the message.
    r = secured_client.get("/api/v1/contact/messages", headers={"X-Admin-Key": "s3cret-key"})
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_contact_repository_roundtrip(tmp_path):
    repo = ContactRepository(str(tmp_path / "contact.db"))
    assert repo.count() == 0
    repo.add(
        ContactMessage(
            name="Ana", surname="García", reply_email="ana@example.com",
            observations="hola", created_at="2026-01-01T00:00:00+00:00", email_sent=True,
        )
    )
    assert repo.count() == 1
    back = repo.all_messages()[0]
    assert back.name == "Ana"
    assert back.email_sent is True
