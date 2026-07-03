"""HTTP routes. Thin: validate input, dispatch to a bus, return the result."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field, field_validator

from app.application.buses import CommandBus, QueryBus
from app.core.config import get_settings
from app.core.sanitize import sanitize_text
from app.infrastructure.pdf_extractor import extract_pdf_text
from app.application.commands import GenerateCorpusCommand, TrainModelCommand
from app.application.queries import (
    AnalyzeCaseQuery,
    CounterfactualQuery,
    EvaluationQuery,
    ListFactorsQuery,
    SearchJurisprudenceQuery,
)
from app.domain.entities import CaseAnalysis, CounterfactualResult, JurisprudenceSearch
from app.presentation.dependencies import get_command_bus, get_query_bus

router = APIRouter(prefix="/api/v1")


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
async def generate_corpus(body: GenerateCorpusBody, bus: CommandBus = Depends(get_command_bus)):
    return await bus.dispatch(
        GenerateCorpusCommand(size=body.size, seed=body.seed, reset=body.reset)
    )


@router.post("/model/train")
async def train_model(bus: CommandBus = Depends(get_command_bus)):
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

    text = sanitize_text(raw_text)[: settings.max_case_chars]
    if len(text) < 10:
        raise HTTPException(422, "Could not extract enough text (is it a scanned PDF?).")

    result = await bus.ask(AnalyzeCaseQuery(text=text))
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
