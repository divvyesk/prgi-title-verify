from fastapi import APIRouter, Query

from contracts.contracts import RegistrySearchResponse

from app.services import stub

router = APIRouter(tags=["registry"])


@router.get("/v1/registry/search", response_model=RegistrySearchResponse)
def search(
    q: str = "",
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=200),
    language: str | None = None,
    state: str | None = None,
) -> RegistrySearchResponse:
    # Real rows straight from title_master.csv (82,713 titles) — see
    # services/stub.py:search_registry. A real trigram/full-text query
    # replaces this in-process filter once search/ lands; the response
    # shape does not change either way.
    results, total = stub.search_registry(q, page, size, language, state)
    return RegistrySearchResponse(results=results, total=total, page=page, size=size)
