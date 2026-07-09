"""Command side (writes): build the synthetic corpus and train the model."""

from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.domain.entities import Case, ContactMessage
from app.infrastructure.mailer import SmtpMailer
from app.infrastructure.outcome_model import OutcomeModel
from app.infrastructure.repository import ContactRepository, CorpusRepository
from app.infrastructure.synthetic import generate_corpus

# A few hand-authored "real" seed cases (Spanish). They give the corpus some
# genuine text and let the demo show real→factor extraction alongside synthetic.
REAL_SEED: list[Case] = [
    Case(
        text=(
            "El acusado fue identificado por un testigo presencial y se halló el arma "
            "del delito con sus huellas. Empleó violencia sobre la víctima."
        ),
        factors={"forensic_evidence": True, "eyewitness": True, "weapon_present": True, "violence_used": True},
        convicted=True, is_real=True, reference="Caso de ejemplo 1",
    ),
    Case(
        text=(
            "La principal prueba de cargo fue declarada nula por haberse obtenido sin "
            "autorización judicial. El acusado presentó además una coartada verificable."
        ),
        factors={"evidence_inadmissible": True, "alibi": True},
        convicted=False, is_real=True, reference="Caso de ejemplo 2",
    ),
    Case(
        text=(
            "El acusado confesó los hechos y presentaba antecedentes penales. "
            "Existió premeditación."
        ),
        factors={"confession": True, "prior_convictions": True, "premeditation": True},
        convicted=True, is_real=True, reference="Caso de ejemplo 3",
    ),
    Case(
        text=(
            "El único testigo mostró contradicciones graves y su credibilidad quedó "
            "cuestionada. El acusado alegó legítima defensa."
        ),
        factors={"witness_unreliable": True, "self_defense": True},
        convicted=False, is_real=True, reference="Caso de ejemplo 4",
    ),
]


class GenerateCorpusCommand(BaseModel):
    size: int = Field(default=0, ge=0, le=10000)  # 0 → use config default
    seed: int | None = None
    reset: bool = True


class GenerateCorpusResult(BaseModel):
    total: int
    synthetic: int
    real: int


class TrainModelCommand(BaseModel):
    pass


class TrainModelResult(BaseModel):
    coef: dict[str, float]
    intercept: float
    metrics: dict


class GenerateCorpusHandler:
    def __init__(self, repo: CorpusRepository) -> None:
        self._repo = repo

    async def __call__(self, cmd: GenerateCorpusCommand) -> GenerateCorpusResult:
        s = get_settings()
        size = cmd.size or s.default_corpus_size
        seed = s.synthetic_seed if cmd.seed is None else cmd.seed
        if cmd.reset:
            self._repo.clear()
        synthetic = generate_corpus(size, seed)
        self._repo.add_cases(synthetic)
        self._repo.add_cases(REAL_SEED)
        return GenerateCorpusResult(
            total=self._repo.count(), synthetic=len(synthetic), real=len(REAL_SEED)
        )


class TrainModelHandler:
    def __init__(self, repo: CorpusRepository) -> None:
        self._repo = repo

    async def __call__(self, cmd: TrainModelCommand) -> TrainModelResult:
        cases = self._repo.all_cases()
        if not cases:
            raise ValueError("Corpus is empty — generate it before training.")
        model, metrics = OutcomeModel.train(cases, seed=get_settings().synthetic_seed)
        self._repo.save_model(
            model.coef, model.intercept, metrics, datetime.now(timezone.utc).isoformat()
        )
        return TrainModelResult(coef=model.coef, intercept=model.intercept, metrics=metrics)


# ---- contact form -------------------------------------------------------
class SubmitContactMessageCommand(BaseModel):
    """Fields are already sanitized and length-checked by the route."""

    name: str
    surname: str
    reply_email: str
    observations: str


class SubmitContactResult(BaseModel):
    id: str
    email_sent: bool  # False when SMTP isn't configured (dev mode) or delivery failed


class SubmitContactHandler:
    """Persist the submission (always) and email it to the site owner (best effort)."""

    def __init__(self, repo: ContactRepository, mailer: SmtpMailer) -> None:
        self._repo = repo
        self._mailer = mailer

    async def __call__(self, cmd: SubmitContactMessageCommand) -> SubmitContactResult:
        msg = ContactMessage(
            name=cmd.name,
            surname=cmd.surname,
            reply_email=cmd.reply_email,
            observations=cmd.observations,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        subject = f"CounterLex — nuevo mensaje de {msg.name} {msg.surname}"
        body = (
            f"Nombre: {msg.name} {msg.surname}\n"
            f"Email de respuesta: {msg.reply_email}\n"
            f"Fecha (UTC): {msg.created_at}\n\n"
            f"Observaciones:\n{msg.observations}\n"
        )
        # Email is best-effort; persistence must succeed regardless.
        msg.email_sent = self._mailer.send(
            subject=subject, body=body, reply_to=msg.reply_email
        )
        self._repo.add(msg)
        return SubmitContactResult(id=str(msg.id), email_sent=msg.email_sent)
