"""Composition root — wires concrete infrastructure into the two buses."""

from __future__ import annotations

from functools import lru_cache

from app.application.buses import CommandBus, QueryBus
from app.application.commands import (
    GenerateCorpusCommand,
    GenerateCorpusHandler,
    TrainModelCommand,
    TrainModelHandler,
)
from app.application.queries import (
    AnalyzeCaseHandler,
    AnalyzeCaseQuery,
    CounterfactualHandler,
    CounterfactualQuery,
    EvaluationHandler,
    EvaluationQuery,
    ListFactorsHandler,
    ListFactorsQuery,
    SearchJurisprudenceHandler,
    SearchJurisprudenceQuery,
)
from app.core.config import get_settings
from app.infrastructure.factor_extractor import FactorExtractor
from app.infrastructure.ollama_client import OllamaClient
from app.infrastructure.repository import CorpusRepository


@lru_cache
def get_repo() -> CorpusRepository:
    return CorpusRepository(get_settings().sqlite_path)


@lru_cache
def _extractor() -> FactorExtractor:
    return FactorExtractor(OllamaClient())


@lru_cache
def get_command_bus() -> CommandBus:
    bus = CommandBus()
    repo = get_repo()
    bus.register(GenerateCorpusCommand, GenerateCorpusHandler(repo))
    bus.register(TrainModelCommand, TrainModelHandler(repo))
    return bus


@lru_cache
def get_query_bus() -> QueryBus:
    bus = QueryBus()
    repo = get_repo()
    bus.register(ListFactorsQuery, ListFactorsHandler())
    bus.register(AnalyzeCaseQuery, AnalyzeCaseHandler(repo, _extractor()))
    bus.register(SearchJurisprudenceQuery, SearchJurisprudenceHandler(repo, _extractor()))
    bus.register(CounterfactualQuery, CounterfactualHandler(repo))
    bus.register(EvaluationQuery, EvaluationHandler(repo))
    return bus
