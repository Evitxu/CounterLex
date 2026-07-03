from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.application.commands import GenerateCorpusCommand, TrainModelCommand
from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger
from app.presentation.api import router
from app.presentation.dependencies import get_command_bus, get_repo

log = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    settings = get_settings()
    # For a friction-free demo: if the corpus is empty, generate + train once.
    if settings.bootstrap_on_startup and get_repo().count() == 0:
        log.info("bootstrapping corpus + model (empty database)")
        bus = get_command_bus()
        await bus.dispatch(GenerateCorpusCommand())
        await bus.dispatch(TrainModelCommand())
        log.info("bootstrap complete")
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="CounterLex",
        version="0.1.0",
        description="Counterfactual legal precedent explorer (CQRS + interpretable outcome model).",
        lifespan=lifespan,
    )
    # FRONTEND_ORIGIN may be a comma-separated list (e.g. the Railway HTTPS URL
    # plus http://localhost:3000 for local dev).
    origins = [o.strip() for o in settings.frontend_origin.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
