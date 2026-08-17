from fastapi import APIRouter

from contracts.contracts import CandidatesRequest, CandidatesResponse

from app.services import pipeline

router = APIRouter(tags=["candidates"])


@router.post("/v1/candidates", response_model=CandidatesResponse)
def candidates(body: CandidatesRequest) -> CandidatesResponse:
    return CandidatesResponse(candidates=pipeline.run_shortlist(body.title, body.limit))
