from fastapi import APIRouter, HTTPException

from contracts.contracts import (
    DraftMemoRequest,
    DraftMemoResponse,
    OfficerCasesResponse,
)

from app.services import stub

router = APIRouter(tags=["officer"])


@router.get("/v1/cases", response_model=OfficerCasesResponse)
def cases() -> OfficerCasesResponse:
    return OfficerCasesResponse(cases=stub.get_officer_cases())


@router.post("/v1/officer/draft-memo", response_model=DraftMemoResponse)
def draft_memo(body: DraftMemoRequest) -> DraftMemoResponse:
    try:
        memo = stub.draft_memo(body.case_id)
    except KeyError:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "CASE_NOT_FOUND", "message": f"No officer case with id '{body.case_id}'."}},
        )
    return DraftMemoResponse(memo=memo)
