from fastapi import APIRouter

from contracts.contracts import HealthResponse

from app.config import settings

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", engine="OFFLINE" if settings.stub_mode else "LIVE")
