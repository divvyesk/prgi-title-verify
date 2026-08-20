import logging

from fastapi import APIRouter

from contracts.contracts import AlternativesRequest, AlternativesResponse

from app.services import stub

logger = logging.getLogger("app.routers.alternatives")
router = APIRouter(tags=["alternatives"])

# Real wiring point: Suhani's LangGraph 4-agent Title Studio (agents/).
# Interface: agents.studio.run_studio(details: dict, on_step=None)
# -> list[GeneratedCandidate]. Same resilience pattern as ml/registry.py —
# try once at import time, log a warning and stay on fixture data if it
# isn't there (or isn't finished) yet.
#
# This comment used to predict a five-positional-argument signature, written
# before agents/studio.py existed. It landed taking a single details dict,
# and nothing re-checked the call below, so every request raised TypeError
# and fell through to the fixture branch. Because that fallback returns 200
# with plausible-looking candidates, the endpoint looked fine — it just
# always answered with the same Maharashtra/Marathi fixtures, even for a
# Tamil Nadu request. The keys below are exactly the ones the graph's nodes
# read via details.get(...).
try:
    from agents.studio import run_studio as _run_studio
except Exception as exc:
    _run_studio = None
    logger.warning("agents.studio.run_studio not available (%s) — /v1/alternatives stays on fixture data", exc)


@router.post("/v1/alternatives", response_model=AlternativesResponse)
def alternatives(body: AlternativesRequest) -> AlternativesResponse:
    if _run_studio is not None:
        try:
            candidates = _run_studio({
                "genre": body.genre,
                "state": body.state,
                "language": body.language,
                "tone": body.tone,
                "audience": body.audience,
            })
            return AlternativesResponse(candidates=candidates)
        except Exception:
            logger.exception("run_studio() raised — falling back to fixture data for this request")
    return AlternativesResponse(candidates=stub.get_alternatives())
