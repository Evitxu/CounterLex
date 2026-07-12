from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.application.commands import GenerateCorpusCommand, TrainModelCommand
from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger
from app.presentation.api import router
from app.presentation.dependencies import get_command_bus, get_repo, get_usage_repo

log = get_logger(__name__)

# Map a request path (under the /api/v1 router prefix) to a usage-counter event.
# Kept in sync with USAGE_EVENTS in app/application/queries.py.
_USAGE_EVENTS = {
    "/api/v1/analyze": "analyze_text",
    "/api/v1/analyze/pdf": "analyze_pdf",
    "/api/v1/search": "search",
    "/api/v1/counterfactual": "counterfactual",
    "/api/v1/debate": "debate",
    "/api/v1/report": "report",
    "/api/v1/contact": "contact",
}


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
    # Reject oversized PDF uploads by their declared Content-Length BEFORE the
    # body is buffered. This runs at the ASGI layer (earlier than route
    # dependencies, which only fire after Starlette has read the body), so a
    # huge upload is refused up front. The handler keeps a post-read size check
    # as defence in depth (for chunked requests with no Content-Length).
    @app.middleware("http")
    async def limit_pdf_upload(request: Request, call_next):
        if request.url.path.endswith("/analyze/pdf"):
            declared = request.headers.get("content-length")
            max_bytes = get_settings().max_pdf_bytes
            if declared and declared.isdigit() and int(declared) > max_bytes:
                mb = max_bytes // (1024 * 1024)
                return JSONResponse(status_code=413, content={"detail": f"PDF exceeds {mb} MB."})
        return await call_next(request)

    # Count successful POSTs to tracked endpoints (KPI dashboard usage stats).
    # Best-effort: a counter failure must never affect the response.
    @app.middleware("http")
    async def track_usage(request: Request, call_next):
        response = await call_next(request)
        try:
            if request.method == "POST" and 200 <= response.status_code < 300:
                event = _USAGE_EVENTS.get(request.url.path)
                if event:
                    get_usage_repo().increment(event)
        except Exception as exc:  # noqa: BLE001
            log.warning("usage tracking failed: %s", exc)
        return response

    # CORS added last → outermost, so even the 413 above carries CORS headers.
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
