"""
FastAPI entrypoint. Prompt 4's whole point: every route below returns real,
contract-valid JSON today (from contracts/fixtures/ via services/stub.py),
so the frontend has a real HTTP server to integrate against on Day 1
evening instead of waiting for every ML module to land on Day 3.

Run it (from the repo root):
    uvicorn backend.app.main:app --reload --port 8000
Or from backend/:
    uvicorn app.main:app --reload --port 8000
Either works — the sys.path bootstrap below makes both `app.*` and
`contracts.*` resolve regardless of which directory uvicorn was started
from, since different teammates will inevitably invoke it differently.
"""

import sys
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parents[1]
_REPO_ROOT = _BACKEND_DIR.parent
for _p in (str(_REPO_ROOT), str(_BACKEND_DIR)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app import db
from app.config import settings
from ml.similarity import semantic
from app.routers import (
    alternatives,
    candidates,
    health,
    officer,
    registry,
    rules,
    score,
    verify,
)

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger("app.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    start = time.perf_counter()
    db.open_pool()

    # BGE-M3 loads once, here, before the first request — loading it inside
    # a request costs 10-30s and would sink the demo. Skipped in STUB_MODE
    # (nothing calls the real semantic scorer yet, and the ~2GB model would
    # only slow down every teammate's `uvicorn --reload` for no benefit) —
    # same gate db.open_pool() above already uses, so STUB_MODE is the one
    # switch that decides whether this process touches anything heavy.
    if not settings.stub_mode:
        load_s = semantic.preload()
        logger.info("BGE-M3 loaded in %.1fs", load_s)

    logger.info("startup complete in %.1f ms (stub_mode=%s)", (time.perf_counter() - start) * 1000, settings.stub_mode)
    yield
    db.close_pool()


app = FastAPI(title="PRGI TitleGuard API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (verify, candidates, score, rules, alternatives, registry, officer, health):
    app.include_router(router.router)


def _error_body(code: str, message: str) -> dict:
    return {"error": {"code": code, "message": message}}


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    # Registered on Starlette's base HTTPException, not fastapi.HTTPException
    # (a subclass) — Starlette's own routing layer raises the BASE class
    # directly for things like an unmatched route (404), and a handler
    # registered only on the subclass would miss those, leaving FastAPI's
    # default {"detail": "Not Found"} shape instead of ours. Routers that
    # raise fastapi.HTTPException(detail={"error": {...}}) (see
    # routers/officer.py) still land here too, since the subclass carries
    # the base class in its MRO.
    detail = exc.detail
    if isinstance(detail, dict) and "error" in detail:
        body = detail
    else:
        body = _error_body("HTTP_ERROR", str(detail))
    return JSONResponse(status_code=exc.status_code, content=body)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    first = exc.errors()[0] if exc.errors() else {}
    field = ".".join(str(p) for p in first.get("loc", [])) or "request"
    message = f"{field}: {first.get('msg', 'invalid request body')}"
    return JSONResponse(status_code=422, content=_error_body("VALIDATION_ERROR", message))


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content=_error_body("INTERNAL", "An unexpected error occurred."))
