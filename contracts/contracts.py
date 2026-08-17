"""
Shared request/response contracts for the PRGI TitleGuard API.

Single source of truth for every shape that crosses the frontend/backend
boundary. Mirrors frontend/src/types/index.ts field-for-field (same fields,
same optionality) and contracts/contracts.js (the Zod equivalent) exactly —
if you change a shape here, change it in both other files too, in the same
pull request, with a contracts/CHANGELOG.md entry.

Wire format is camelCase (matches the frontend, which was built first and
already ships camelCase JSON). Python code stays snake_case; the alias
generator below does the translation in both directions.

Every score in this file is a float from 0 to 100 — never 0 to 1. This is
enforced with Field(ge=0, le=100), not just documented, so a bug that
produces e.g. 0.87 instead of 87.0 fails fast in validation rather than
silently reaching the frontend.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class Base(BaseModel):
    """Every contract model inherits this. snake_case in Python, camelCase
    on the wire. populate_by_name=True means the model can also be built
    from snake_case kwargs (handy in tests and fixture-generation scripts)."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


Score = Field(ge=0.0, le=100.0, description="0-100, never 0-1")


# ---------------------------------------------------------------------------
# Stage 1 — NORMALIZE
# ---------------------------------------------------------------------------

class NormalizedTitle(Base):
    """Output of the normalize stage: what the pipeline understood the
    submitted title to be, before any comparison happens."""

    input_title: str
    normalized_title: str
    detected_language: str
    detected_script: str
    transliterated_title: str
    core_words: list[str]


# ---------------------------------------------------------------------------
# Stage 2 — SHORTLIST
# ---------------------------------------------------------------------------

class Candidate(Base):
    """One row surfaced by a CandidateRetriever (contracts/algo.py). raw_score
    is that retriever's own internal score (0-1, NOT the final 0-100 scale —
    it gets re-scored properly in stage 3) and source records which retriever
    found it, since a title can be found by more than one and get merged via
    reciprocal rank fusion."""

    title_id: int
    title: str
    reg_no: str
    language: str
    state: str
    raw_score: float = Field(ge=0.0, le=1.0)
    source: Literal["trigram", "bm25", "phonetic", "vector"]


# ---------------------------------------------------------------------------
# Stage 3 — SCORE
# ---------------------------------------------------------------------------

class SimilarityScores(Base):
    """The 4-dimensional similarity breakdown, always shown to the user as
    four separate numbers plus the blended composite — never collapsed
    silently into just the composite (PRD §6.3)."""

    lexical_score: float = Score
    phonetic_score: float = Score
    semantic_score: float = Score
    core_word_score: float = Score
    blended_score: float = Score


class CandidateScore(Base):
    """One candidate's full score breakdown, for batch scoring responses."""

    candidate: str
    scores: SimilarityScores


# ---------------------------------------------------------------------------
# Stage 4 — CHECK
# ---------------------------------------------------------------------------

class RuleViolation(Base):
    """One rule's outcome. clause must always be the verbatim guideline text
    (or explicitly marked unverified upstream in data/rules/rules.json) —
    never a fabricated citation. See AGENTS.md Known Problem #1."""

    rule_id: str
    rule_name: str
    severity: Literal["CRITICAL", "WARNING", "INFO"]
    description: str
    clause: str
    passed: bool
    trigger_phrase: Optional[str] = None
    requires_human_confirmation: bool = False


# ---------------------------------------------------------------------------
# Stage 5 — EXPLAIN / full verdict
# ---------------------------------------------------------------------------

class ClashingTitle(Base):
    title: str
    reg_no: str
    language: str
    state: str
    similarity: float = Score
    match_type: Literal["LEXICAL", "PHONETIC", "SEMANTIC", "CORE_WORD", "COMBINATION"]
    matched_core_word: Optional[str] = None
    reason: str


class VerificationResult(Base):
    """The full response of POST /v1/verify — Stages 1-5, orchestrated.
    stage_timings, engine and cached are the three fields the frontend does
    not have yet (frontend/src/types/index.ts predates the live backend)."""

    input_title: str
    normalized_title: str
    detected_language: str
    transliterated_title: str
    core_words: list[str]

    verdict: Literal["APPROVED", "MANUAL_REVIEW", "REJECTED"]
    verdict_score: float = Score
    similarity_breakdown: SimilarityScores
    clashing_titles: list[ClashingTitle]
    rule_violations: list[RuleViolation]

    explanation: str
    recommended_action: str
    guideline_citations: list[str]

    stage_timings: dict[str, float] = Field(
        description='Milliseconds per stage, e.g. {"normalize": 3.1, "shortlist": 42.0, '
        '"score": 310.4, "check": 8.2, "explain": 120.6}'
    )
    engine: Literal["LIVE", "OFFLINE"]
    cached: bool = False
    processing_time_ms: int
    timestamp: datetime


# ---------------------------------------------------------------------------
# Agentic Title Studio
# ---------------------------------------------------------------------------

class GeneratedCandidate(Base):
    """A candidate title from the Agentic Studio. verification_passed is
    always true for anything actually returned to the user — the Verifier
    agent discards failures before the Ranker ever sees them (PRD §6.6)."""

    id: str
    title: str
    meaning: str
    uniqueness_score: float = Score
    verification_passed: bool
    risk_score: float = Score
    category: str
    rationale: str


# ---------------------------------------------------------------------------
# Officer Review Docket
# ---------------------------------------------------------------------------

class OfficerCase(Base):
    id: str
    applicant_name: str
    proposed_title: str
    language: str
    state: str
    periodicity: str
    submission_date: date
    risk_score: float = Score
    verdict: Literal["APPROVED", "MANUAL_REVIEW", "REJECTED"]
    primary_conflict: Optional[str] = None
    status: Literal["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"]
    copilot_decision_note: Optional[str] = None


# ---------------------------------------------------------------------------
# Title Master Registry Explorer
# ---------------------------------------------------------------------------

class TitleRecord(Base):
    """One row as shown by the registry explorer — display-facing, so dates
    stay plain strings rather than a strict date type (the underlying DB
    column is a real date; this is the read-only browse view of it)."""

    id: str
    title: str
    language: str
    state: str
    reg_no: str
    reg_date: str
    publisher: Optional[str] = None
    owner: Optional[str] = None
    periodicity: Optional[str] = None


# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------

class ApiErrorDetail(Base):
    code: str
    message: str


class ApiError(Base):
    """Every error response takes this shape. Never a raw stack trace."""

    error: ApiErrorDetail


# ---------------------------------------------------------------------------
# Per-endpoint request / response envelopes
# ---------------------------------------------------------------------------

class VerifyRequest(Base):
    """POST /v1/verify"""

    title: str
    language: Optional[str] = None
    state: Optional[str] = None


class CandidatesRequest(Base):
    """POST /v1/candidates — Stage 2 only."""

    title: str
    limit: int = Field(default=200, ge=1, le=1000)


class CandidatesResponse(Base):
    candidates: list[Candidate]


class ScoreRequestItem(Base):
    title: str
    candidates: list[str]


class ScoreRequest(Base):
    """POST /v1/score — Stage 3 only. `items` is a list so this endpoint can
    score ONE title against its candidates (the normal verify path) or MANY
    titles in a single round trip (the Agentic Studio scoring 15-20 generated
    candidates at once — PRD §11.1 requires this be batched, not one
    request per candidate)."""

    items: list[ScoreRequestItem]


class TitleScoreResult(Base):
    title: str
    candidate_scores: list[CandidateScore]


class ScoreResponse(Base):
    results: list[TitleScoreResult]


class RuleCheckRequest(Base):
    """POST /v1/rules/check — Stage 4 only."""

    title: str


class RuleCheckResponse(Base):
    rule_violations: list[RuleViolation]


class AlternativesRequest(Base):
    """POST /v1/alternatives — the Agentic Title Studio (PRD §6.6, §7.3)."""

    genre: str
    state: str
    language: str
    tone: Optional[str] = None
    audience: Optional[str] = None


class AlternativesResponse(Base):
    candidates: list[GeneratedCandidate]


class RegistrySearchResponse(Base):
    """GET /v1/registry/search"""

    results: list[TitleRecord]
    total: int
    page: int
    size: int


class OfficerCasesResponse(Base):
    """GET /v1/cases"""

    cases: list[OfficerCase]


class DraftMemoRequest(Base):
    """POST /v1/officer/draft-memo"""

    case_id: str


class DraftMemoResponse(Base):
    memo: str


class HealthResponse(Base):
    """GET /health"""

    status: Literal["ok"]
    engine: Optional[Literal["LIVE", "OFFLINE"]] = None
