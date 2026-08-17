from fastapi import APIRouter

from contracts.contracts import VerificationResult, VerifyRequest

from app.services import pipeline

router = APIRouter(tags=["verify"])


@router.post("/v1/verify", response_model=VerificationResult)
async def verify(body: VerifyRequest) -> VerificationResult:
    return await pipeline.run_verification(body.title, body.language, body.state)
