"""SMTP mailer for the contact module.

Provider-agnostic (stdlib ``smtplib``): point the SMTP_* settings at any server.
For free real delivery, Gmail with an App Password is the simplest path.

When SMTP is not configured, :attr:`SmtpMailer.enabled` is ``False`` and
:meth:`send` is a no-op that returns ``False``, so the contact form still works
in a zero-config demo — the message is persisted and logged by the caller. A
delivery failure is swallowed (logged, returns ``False``) and must never lose
the stored message.
"""

from __future__ import annotations

import smtplib
from email.message import EmailMessage

from app.core.config import Settings
from app.core.logging import get_logger

_log = get_logger(__name__)


class SmtpMailer:
    def __init__(self, settings: Settings) -> None:
        self._s = settings

    @property
    def enabled(self) -> bool:
        s = self._s
        return bool(s.smtp_host and s.smtp_user and s.smtp_password)

    def send(self, *, subject: str, body: str, reply_to: str | None = None) -> bool:
        """Send a plain-text email to the configured recipient.

        Returns ``True`` on success, ``False`` if SMTP isn't configured or
        delivery failed. Never raises.
        """
        s = self._s
        if not self.enabled:
            _log.info("smtp disabled (no credentials) — contact email not sent")
            return False

        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = s.smtp_from or s.smtp_user or ""
        msg["To"] = s.contact_recipient
        if reply_to:
            msg["Reply-To"] = reply_to
        msg.set_content(body)

        try:
            with smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=s.smtp_timeout_seconds) as smtp:
                if s.smtp_starttls:
                    smtp.starttls()
                smtp.login(s.smtp_user, s.smtp_password)  # type: ignore[arg-type]
                smtp.send_message(msg)
            _log.info("contact email delivered to %s", s.contact_recipient)
            return True
        except Exception as exc:  # noqa: BLE001 — a mail failure must not lose the message
            _log.warning("smtp send failed: %s", exc)
            return False
