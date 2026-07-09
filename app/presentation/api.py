"""HTTP routes. Thin: validate input, dispatch to a bus, return the result."""

from __future__ import annotations

import hmac
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Header, HTTPException, Response, UploadFile
from pydantic import BaseModel, Field, field_validator

from app.application.buses import CommandBus, QueryBus
from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.sanitize import sanitize_text
from app.domain.entities import CounterfactualResult
from app.infrastructure.ocr import ocr_pdf
from app.infrastructure.pdf_extractor import extract_pdf_text
from app.infrastructure.report import build_report_pdf
from app.application.commands import (
    GenerateCorpusCommand,
    SubmitContactMessageCommand,
    SubmitContactResult,
    TrainModelCommand,
)
from app.application.queries import (
    AnalyzeCaseQuery,
    CounterfactualQuery,
    DebateQuery,
    EvaluationQuery,
    ListContactMessagesQuery,
    ListFactorsQuery,
    SearchJurisprudenceQuery,
)
from app.domain.entities import (
    CaseAnalysis,
    ContactMessage,
    CounterfactualResult,
    DebateResult,
    JurisprudenceSearch,
)
from app.presentation.dependencies import get_command_bus, get_query_bus

router = APIRouter(prefix="/api/v1")
_log = get_logger(__name__)


def require_admin(x_admin_key: str | None = Header(default=None)) -> None:
    """Guard for state-mutating admin endpoints. No-op unless `admin_api_key` is
    configured; when it is, requires a matching `X-Admin-Key` header (compared in
    constant time to avoid a timing side-channel)."""
    key = get_settings().admin_api_key
    if key and not (x_admin_key and hmac.compare_digest(x_admin_key, key)):
        raise HTTPException(status_code=401, detail="Invalid or missing admin key.")


# ---- factor catalog ----
@router.get("/factors")
async def list_factors(bus: QueryBus = Depends(get_query_bus)):
    return await bus.ask(ListFactorsQuery())


# ---- corpus + model (setup / admin) ----
class GenerateCorpusBody(BaseModel):
    size: int = Field(default=0, ge=0, le=10000)
    seed: int | None = None
    reset: bool = True


@router.post("/corpus/generate")
async def generate_corpus(
    body: GenerateCorpusBody,
    bus: CommandBus = Depends(get_command_bus),
    _: None = Depends(require_admin),
):
    return await bus.dispatch(
        GenerateCorpusCommand(size=body.size, seed=body.seed, reset=body.reset)
    )


@router.post("/model/train")
async def train_model(
    bus: CommandBus = Depends(get_command_bus),
    _: None = Depends(require_admin),
):
    try:
        return await bus.dispatch(TrainModelCommand())
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


@router.get("/model/evaluation")
async def evaluation(bus: QueryBus = Depends(get_query_bus)):
    try:
        return await bus.ask(EvaluationQuery())
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


# ---- analyze a case ----
class AnalyzeBody(BaseModel):
    text: str

    @field_validator("text")
    @classmethod
    def _clean(cls, v: str) -> str:
        cleaned = sanitize_text(v)
        if len(cleaned) < 10:
            raise ValueError("Case description is too short.")
        return cleaned[: get_settings().max_case_chars]


@router.post("/analyze", response_model=CaseAnalysis)
async def analyze(body: AnalyzeBody, bus: QueryBus = Depends(get_query_bus)) -> CaseAnalysis:
    try:
        result = await bus.ask(AnalyzeCaseQuery(text=body.text))
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    assert isinstance(result, CaseAnalysis)
    return result


@router.post("/analyze/pdf", response_model=CaseAnalysis)
async def analyze_pdf(
    file: UploadFile = File(...), bus: QueryBus = Depends(get_query_bus)
) -> CaseAnalysis:
    settings = get_settings()
    is_pdf = (file.content_type == "application/pdf") or (
        file.filename or ""
    ).lower().endswith(".pdf")
    if not is_pdf:
        raise HTTPException(415, "Only PDF files are supported.")

    data = await file.read()
    if not data:
        raise HTTPException(400, "Empty file.")
    if len(data) > settings.max_pdf_bytes:
        mb = settings.max_pdf_bytes // (1024 * 1024)
        raise HTTPException(413, f"PDF exceeds {mb} MB.")

    try:
        raw_text = extract_pdf_text(data, settings.max_pdf_pages)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc

    clean = sanitize_text(raw_text)
    pypdf_chars = len(clean)
    ocr_used = False

    # Scanned/image PDF (little embedded text) → try OCR (needs Tesseract).
    if len(clean) < 40 and settings.ocr_enabled:
        ocr_text = ocr_pdf(
            data,
            settings.ocr_max_pages,
            settings.ocr_languages,
            settings.tesseract_cmd,
            settings.tessdata_dir,
        )
        if len(ocr_text) > len(clean):
            clean = sanitize_text(ocr_text)
            ocr_used = True

    if len(clean) < 10:
        raise HTTPException(
            422, "Could not extract text. If it's a scanned PDF, install Tesseract for OCR."
        )

    _low = clean.lower()
    _log.info(
        "pdf_upload file=%r size=%d pypdf_chars=%d ocr_used=%s final_chars=%d has_conden=%s has_absuel=%s",
        file.filename, len(data), pypdf_chars, ocr_used, len(clean),
        "conden" in _low, ("absuel" in _low or "absolu" in _low),
    )

    # Keep the beginning (facts/reasoning → factors) AND the end (the "fallo" →
    # verdict), since the operative part sits at the end of long judgments.
    limit = settings.max_case_chars
    if len(clean) > limit:
        head_len = limit * 2 // 3
        tail_len = limit - head_len
        text = clean[:head_len] + "\n[...]\n" + clean[-tail_len:]
    else:
        text = clean

    result = await bus.ask(AnalyzeCaseQuery(text=text, full_text=clean))
    assert isinstance(result, CaseAnalysis)
    return result


# ---- jurisprudence search ----
class SearchBody(BaseModel):
    text: str
    top_k: int = Field(default=10, ge=1, le=50)

    @field_validator("text")
    @classmethod
    def _clean(cls, v: str) -> str:
        cleaned = sanitize_text(v)
        if len(cleaned) < 3:
            raise ValueError("Search query is too short.")
        return cleaned[: get_settings().max_case_chars]


@router.post("/search", response_model=JurisprudenceSearch)
async def search(body: SearchBody, bus: QueryBus = Depends(get_query_bus)) -> JurisprudenceSearch:
    result = await bus.ask(SearchJurisprudenceQuery(text=body.text, top_k=body.top_k))
    assert isinstance(result, JurisprudenceSearch)
    return result


# ---- counterfactual ----
class CounterfactualBody(BaseModel):
    factors: dict[str, bool]
    overrides: dict[str, bool]


@router.post("/counterfactual", response_model=CounterfactualResult)
async def counterfactual(
    body: CounterfactualBody, bus: QueryBus = Depends(get_query_bus)
) -> CounterfactualResult:
    try:
        result = await bus.ask(
            CounterfactualQuery(factors=body.factors, overrides=body.overrides)
        )
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    assert isinstance(result, CounterfactualResult)
    return result


# ---- multi-agent debate ----
class DebateBody(BaseModel):
    factors: dict[str, bool]
    lang: str = "es"


@router.post("/debate", response_model=DebateResult)
async def debate(body: DebateBody, bus: QueryBus = Depends(get_query_bus)) -> DebateResult:
    try:
        result = await bus.ask(DebateQuery(factors=body.factors, lang=body.lang))
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    assert isinstance(result, DebateResult)
    return result


# ---- PDF report ----
class ReportBody(BaseModel):
    factors: dict[str, bool]
    overrides: dict[str, bool] = {}
    lang: str = "es"


@router.post("/report")
async def report(body: ReportBody, bus: QueryBus = Depends(get_query_bus)) -> Response:
    result = await bus.ask(
        CounterfactualQuery(factors=body.factors, overrides=body.overrides)
    )
    assert isinstance(result, CounterfactualResult)
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    pdf = build_report_pdf(result, body.factors, body.lang, stamp)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="counterlex-report.pdf"'},
    )


# ---- contact form ----
# A pragmatic email check (no external dependency): one @, a dot in the domain,
# no whitespace. The frontend applies the same limits + a native email input.
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _clean_required(value: str, max_len: int, field: str) -> str:
    """Sanitize (XSS/control-char strip), require non-empty, enforce max length."""
    cleaned = sanitize_text(value)
    if not cleaned:
        raise ValueError(f"{field} is required.")
    if len(cleaned) > max_len:
        raise ValueError(f"{field} exceeds {max_len} characters.")
    return cleaned


class ContactBody(BaseModel):
    name: str
    surname: str
    email: str          # reply-to address
    observations: str

    @field_validator("name")
    @classmethod
    def _v_name(cls, v: str) -> str:
        return _clean_required(v, get_settings().contact_max_name, "Name")

    @field_validator("surname")
    @classmethod
    def _v_surname(cls, v: str) -> str:
        return _clean_required(v, get_settings().contact_max_surname, "Surname")

    @field_validator("email")
    @classmethod
    def _v_email(cls, v: str) -> str:
        cleaned = _clean_required(v, get_settings().contact_max_email, "Email")
        if not _EMAIL_RE.match(cleaned):
            raise ValueError("A valid email address is required.")
        return cleaned

    @field_validator("observations")
    @classmethod
    def _v_observations(cls, v: str) -> str:
        return _clean_required(v, get_settings().contact_max_observations, "Observations")


class ContactResult(BaseModel):
    id: str
    email_sent: bool


@router.post("/contact", response_model=ContactResult)
async def contact(
    body: ContactBody, bus: CommandBus = Depends(get_command_bus)
) -> ContactResult:
    result = await bus.dispatch(
        SubmitContactMessageCommand(
            name=body.name,
            surname=body.surname,
            reply_email=body.email,
            observations=body.observations,
        )
    )
    assert isinstance(result, SubmitContactResult)
    return ContactResult(id=result.id, email_sent=result.email_sent)


@router.get("/contact/messages", response_model=list[ContactMessage])
async def list_contact_messages(
    bus: QueryBus = Depends(get_query_bus),
    _: None = Depends(require_admin),
) -> list[ContactMessage]:
    """Admin: list submissions (newest first). Gated by `X-Admin-Key` when
    `ADMIN_API_KEY` is configured; open otherwise (same policy as the other
    admin endpoints)."""
    result = await bus.ask(ListContactMessagesQuery())
    assert isinstance(result, list)
    return result
