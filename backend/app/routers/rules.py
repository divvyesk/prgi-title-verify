from fastapi import APIRouter

from contracts.contracts import RuleCheckRequest, RuleCheckResponse

from app.services import pipeline

router = APIRouter(tags=["rules"])


@router.post("/v1/rules/check", response_model=RuleCheckResponse)
def check(body: RuleCheckRequest) -> RuleCheckResponse:
    return RuleCheckResponse(ruleViolations=pipeline.run_rules(body.title))
