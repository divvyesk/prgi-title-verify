from fastapi import APIRouter

from contracts.contracts import ScoreRequest, ScoreResponse, TitleScoreResult

from app.services import pipeline

router = APIRouter(tags=["score"])


@router.post("/v1/score", response_model=ScoreResponse)
def score(body: ScoreRequest) -> ScoreResponse:
    results = [
        TitleScoreResult(
            title=item.title,
            candidateScores=pipeline.run_score(item.title, item.candidates),
        )
        for item in body.items
    ]
    return ScoreResponse(results=results)
