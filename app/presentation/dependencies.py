"""Composition root — wires concrete infrastructure into the two buses."""

from __future__ import annotations

from functools import lru_cache

from app.application.buses import CommandBus, QueryBus
from app.application.commands import (
    GenerateCorpusCommand,
    GenerateCorpusHandler,
    SubmitContactHandler,
    SubmitContactMessageCommand,
    TrainModelCommand,
    TrainModelHandler,
)
from app.application.queries import (
    AnalyzeCaseHandler,
    AnalyzeCaseQuery,
    CounterfactualHandler,
    CounterfactualQuery,
    DebateHandler,
    DebateQuery,
    EvaluationHandler,
    EvaluationQuery,
    ListContactMessagesHandler,
    ListContactMessagesQuery,
    ListFactorsHandler,
    ListFactorsQuery,
    SearchJurisprudenceHandler,
    SearchJurisprudenceQuery,
    StatsHandler,
    StatsQuery,
)
from app.core.config import get_settings
from app.infrastructure.factor_extractor import FactorExtractor
from app.infrastructure.llm_client import build_llm_client
from app.infrastructure.mailer import SmtpMailer
from app.infrastructure.repository import ContactRepository, CorpusRepository, UsageRepository


@lru_cache
def get_repo() -> CorpusRepository:
    return CorpusRepository(get_settings().sqlite_path)


@lru_cache
def get_contact_repo() -> ContactRepository:
    return ContactRepository(get_settings().sqlite_path)


@lru_cache
def get_usage_repo() -> UsageRepository:
    return UsageRepository(get_settings().sqlite_path)


@lru_cache
def get_mailer() -> SmtpMailer:
    return SmtpMailer(get_settings())


@lru_cache
def _extractor() -> FactorExtractor:
    return FactorExtractor(build_llm_client())


@lru_cache
def get_command_bus() -> CommandBus:
    bus = CommandBus()
    repo = get_repo()
    bus.register(GenerateCorpusCommand, GenerateCorpusHandler(repo))
    bus.register(TrainModelCommand, TrainModelHandler(repo))
    bus.register(
        SubmitContactMessageCommand,
        SubmitContactHandler(get_contact_repo(), get_mailer()),
    )
    return bus


@lru_cache
def get_query_bus() -> QueryBus:
    bus = QueryBus()
    repo = get_repo()
    bus.register(ListFactorsQuery, ListFactorsHandler())
    bus.register(AnalyzeCaseQuery, AnalyzeCaseHandler(repo, _extractor()))
    bus.register(SearchJurisprudenceQuery, SearchJurisprudenceHandler(repo, _extractor()))
    bus.register(DebateQuery, DebateHandler(repo, build_llm_client()))
    bus.register(CounterfactualQuery, CounterfactualHandler(repo))
    bus.register(EvaluationQuery, EvaluationHandler(repo))
    bus.register(ListContactMessagesQuery, ListContactMessagesHandler(get_contact_repo()))
    bus.register(
        StatsQuery, StatsHandler(repo, get_contact_repo(), get_usage_repo())
    )
    return bus
