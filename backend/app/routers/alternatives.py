import logging

from fastapi import APIRouter

from contracts.contracts import AlternativesRequest, AlternativesResponse

from app.services import stub

logger = logging.getLogger("app.routers.alternatives")
router = APIRouter(tags=["alternatives"])

# Real wiring point: Suhani's LangGraph 4-agent Title Studio (agents/).
# Expected interface: agents.studio.run_studio(genre, state, language,
# tone, audience) -> list[GeneratedCandidate]. Same resilience pattern as
# ml/registry.py — try once at import time, log a warning and stay on
# fixture data if it isn't there (or isn't finished) yet.
try:
    from agents.studio import run_studio as _run_studio
except Exception as exc:
    _run_studio = None
    logger.warning("agents.studio.run_studio not available (%s) — /v1/alternatives stays on fixture data", exc)


@router.post("/v1/alternatives", response_model=AlternativesResponse)
def alternatives(body: AlternativesRequest) -> AlternativesResponse:
    if _run_studio is not None:
        try:
            candidates = _run_studio(body.genre, body.state, body.language, body.tone, body.audience)
            return AlternativesResponse(candidates=candidates)
        except Exception:
            logger.exception("run_studio() raised — falling back to fixture data for this request")
    return AlternativesResponse(candidates=stub.get_alternatives())
