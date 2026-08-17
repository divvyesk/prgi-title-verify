"""
Everything the pipeline needs when a stage's STUB flag is True. Every
function here returns a real, contract-valid Pydantic model — never a bare
dict — so a router never has to know whether the data it's holding came
from a fixture or from a real algorithm.

This is Prompt 4's entire point: a real HTTP server the frontend can
integrate against today, one honest response at a time, instead of waiting
for every ML module to land.
"""

from __future__ import annotations

import csv
import functools
import json
import time
import zlib
from pathlib import Path

from contracts.contracts import (
    Candidate,
    CandidateScore,
    GeneratedCandidate,
    OfficerCase,
    RuleViolation,
    SimilarityScores,
    TitleRecord,
    VerificationResult,
)

REPO_ROOT = Path(__file__).resolve().parents[3]
FIXTURES_DIR = REPO_ROOT / "contracts" / "fixtures"
TITLE_MASTER_CSV = REPO_ROOT / "data" / "datasets" / "dataset1" / "data" / "processed" / "title_master.csv"


def _load_fixture(name: str) -> dict | list:
    with open(FIXTURES_DIR / name, encoding="utf-8") as f:
        return json.load(f)


@functools.lru_cache(maxsize=1)
def _verify_fixtures() -> dict[str, VerificationResult]:
    return {
        "APPROVED": VerificationResult(**_load_fixture("verify_approved.json")),
        "MANUAL_REVIEW": VerificationResult(**_load_fixture("verify_review.json")),
        "REJECTED": VerificationResult(**_load_fixture("verify_rejected.json")),
    }


@functools.lru_cache(maxsize=1)
def _candidates_fixture() -> list[Candidate]:
    return [Candidate(**c) for c in _load_fixture("candidates_200.json")]


@functools.lru_cache(maxsize=1)
def _officer_cases_fixture() -> list[OfficerCase]:
    return [OfficerCase(**c) for c in _load_fixture("officer_cases.json")]


@functools.lru_cache(maxsize=1)
def _alternatives_fixture() -> list[GeneratedCandidate]:
    return [GeneratedCandidate(**c) for c in _load_fixture("alternatives.json")]


def get_verification_result(title: str) -> VerificationResult:
    """Three canned VerificationResults, picked deterministically. An exact
    (case-insensitive) match against one of the three fixture input titles
    returns that fixture untouched — that's what Darsh's Playwright tests and
    the demo script rely on. Anything else still gets a full, valid response:
    a stable hash of the normalized title picks one of the three verdicts, so
    typing arbitrary titles during integration testing exercises all three UI
    states instead of always looking APPROVED. The title-specific fields are
    then overwritten so the response is honestly about what was submitted,
    not silently still about "Aditi National Strategy Review"."""
    normalized = " ".join(title.strip().lower().split())
    fixtures = _verify_fixtures()

    exact = {
        "aditi national strategy review": "APPROVED",
        "jaagran": "MANUAL_REVIEW",
        "royal matrimonial classifieds": "REJECTED",
    }
    verdict = exact.get(normalized)
    if verdict is None:
        bucket = zlib.crc32(normalized.encode("utf-8")) % 3
        verdict = ["APPROVED", "MANUAL_REVIEW", "REJECTED"][bucket]

    base = fixtures[verdict]
    data = base.model_dump(by_alias=True, mode="json")
    data["inputTitle"] = title
    data["normalizedTitle"] = normalized
    data["transliteratedTitle"] = normalized
    data["engine"] = "OFFLINE"
    data["cached"] = False

    # The fixture's own explanation prose names ITS title verbatim (e.g.
    # "Aditi National Strategy Review is distinct..."). For an exact-match
    # lookup that's correct; for a hash-bucketed arbitrary title it would
    # contradict inputTitle above, which is confusing in a very avoidable
    # way — re-template it around the actual submitted title instead.
    if normalized not in exact:
        if verdict == "APPROVED":
            data["explanation"] = (
                f"Title \"{title}\" is distinct and fully compliant. No conflicting "
                "registered titles found within the similarity threshold, and all "
                "PRGI statutory rules passed."
            )
        elif verdict == "MANUAL_REVIEW":
            top = base.clashing_titles[0]
            data["explanation"] = (
                f"The proposed title \"{title}\" has moderate phonetic proximity "
                f"({top.similarity:.0f}%) with existing registered title "
                f"\"{top.title}\". Requires scrutiny by the District Magistrate / "
                "PRGI reviewing officer."
            )
        else:  # REJECTED
            violation = base.rule_violations[0]
            data["explanation"] = (
                f"The title \"{title}\" is rejected due to violation of the "
                f"{violation.rule_name}. {violation.description}"
            )

    return VerificationResult(**data)


def get_candidates(limit: int) -> list[Candidate]:
    return _candidates_fixture()[:limit]


def _fake_score(a: str, b: str, salt: str) -> float:
    """A stable, deterministic pseudo-score in [0, 100] for stub mode only —
    just enough signal that two very different strings score low and two
    near-identical ones score high, so UI work built against this doesn't
    look nonsensical before Jai's and Divvye's real scorers land."""
    h = zlib.crc32(f"{salt}:{a.lower()}:{b.lower()}".encode("utf-8"))
    jitter = h % 40
    overlap = len(set(a.lower().split()) & set(b.lower().split()))
    base = min(60, overlap * 30)
    return round(min(100.0, base + jitter), 2)


def score_candidates(title: str, candidates: list[str]) -> list[CandidateScore]:
    out = []
    for c in candidates:
        lexical = _fake_score(title, c, "lex")
        phonetic = _fake_score(title, c, "phon")
        semantic = _fake_score(title, c, "sem")
        core = _fake_score(title, c, "core")
        blended = round((lexical + phonetic + semantic + core) / 4, 2)
        out.append(CandidateScore(
            candidate=c,
            scores=SimilarityScores(
                lexicalScore=lexical, phoneticScore=phonetic,
                semanticScore=semantic, coreWordScore=core, blendedScore=blended,
            ),
        ))
    return out


def check_rules(title: str) -> list[RuleViolation]:
    """The one rule the rejected fixture demonstrates, fired on keyword
    presence. Placeholder logic — Pruthviraj's real deterministic rule
    engine (ml/rules/) replaces this in Prompt 6/7; this only exists so the
    /v1/rules/check endpoint returns something contract-shaped today."""
    lowered = title.lower()
    if "matrimonial" in lowered or "classified" in lowered:
        violation = _verify_fixtures()["REJECTED"].rule_violations[0]
        return [violation]
    return []


def get_alternatives() -> list[GeneratedCandidate]:
    return _alternatives_fixture()


def get_officer_cases() -> list[OfficerCase]:
    return _officer_cases_fixture()


def draft_memo(case_id: str) -> str:
    for case in _officer_cases_fixture():
        if case.id == case_id:
            if case.copilot_decision_note:
                return case.copilot_decision_note
            return (
                f"Application {case.id}: \"{case.proposed_title}\" "
                f"({case.language}, {case.state}) — verdict {case.verdict}, "
                f"risk score {case.risk_score:.0f}. No additional conflict notes."
            )
    raise KeyError(case_id)


@functools.lru_cache(maxsize=1)
def _title_master_rows() -> list[dict]:
    with open(TITLE_MASTER_CSV, encoding="utf-8", newline="") as f:
        return [r for r in csv.DictReader(f) if r["data_quality_status"] == "VALID"]


def search_registry(
    q: str, page: int, size: int, language: str | None, state: str | None
) -> tuple[list[TitleRecord], int]:
    """Real registry rows straight from title_master.csv — 82,713 actual
    PRGI titles — filtered in-process. Fine for a stub server; a real
    trigram/full-text query replaces this once search/ lands."""
    rows = _title_master_rows()
    q_lower = q.strip().lower()

    def matches(r: dict) -> bool:
        if q_lower and q_lower not in r["Title"].lower():
            return False
        if language and language.lower() not in r["Language"].lower():
            return False
        if state and state.lower() not in r["Publication State"].lower():
            return False
        return True

    filtered = [r for r in rows if matches(r)]
    total = len(filtered)
    start = (page - 1) * size
    page_rows = filtered[start:start + size]

    records = [
        TitleRecord(
            id=str(r["title_id"]),
            title=r["Title"].strip(),
            language=r["Language"].split(",")[0].strip(),
            state=r["Publication State"].strip(),
            regNo=r["Registration Number"].strip(),
            regDate=r["Registration Date"].strip(),
            publisher=r["Publisher"].strip() or None,
            owner=r["Owner"].strip() or None,
            periodicity=r["Periodicity"].strip() or None,
        )
        for r in page_rows
    ]
    return records, total


def now_ms() -> float:
    return time.perf_counter() * 1000
