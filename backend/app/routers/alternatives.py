from fastapi import APIRouter

from contracts.contracts import AlternativesRequest, AlternativesResponse

from app.services import stub

router = APIRouter(tags=["alternatives"])


@router.post("/v1/alternatives", response_model=AlternativesResponse)
def alternatives(body: AlternativesRequest) -> AlternativesResponse:
    # Real wiring point: Suhani's LangGraph 4-agent Title Studio (agents/),
    # driven by body.genre/state/language/tone/audience. Not a pipeline
    # stage, so it has no STUB flag of its own — it's always fixture data
    # until agents/ lands.
    return AlternativesResponse(candidates=stub.get_alternatives())
