"""
Two implementations of one interface, so the Verifier node never knows or
cares whether it's talking to fixtures or the real backend. Today (Day 1)
`FixtureVerifyClient` is all that works — the backend's real shortlist/score
isn't wired to accept a batch-of-arbitrary-titles shape this cleanly yet.
`HttpVerifyClient` becomes real in Prompt 6, one line in agents/config.py.

Every implementation returns the SAME dict shape per title, camelCase (this
isn't a frozen contracts/ shape — it's internal to agents/ — but matching
the wire convention the rest of the system already uses means
HttpVerifyClient's real JSON response and FixtureVerifyClient's fixture data
need zero translation between them):

    {
        "title": str,
        "verdict": "APPROVED" | "MANUAL_REVIEW" | "REJECTED",
        "verdictScore": float,          # 0-100
        "topClash": {"title": str, "similarity": float} | None,
        "ruleViolations": [ {"ruleId": str, "ruleName": str, ...}, ... ],
    }

This is deliberately a trimmed-down VerificationResult, not the full thing —
the Verifier only needs enough to (a) decide survived vs rejected and
(b) build a human-readable rejection reason for the retry prompt.
"""

from __future__ import annotations

import json
import zlib
from pathlib import Path
from typing import Protocol

REPO_ROOT = Path(__file__).resolve().parents[1]
FIXTURES_DIR = REPO_ROOT / "contracts" / "fixtures"


class VerifyClient(Protocol):
    def verify_batch(self, titles: list[str]) -> list[dict]: ...


def _normalize(title: str) -> str:
    return " ".join(title.strip().lower().split())


def _to_verify_result(fixture: dict, title: str) -> dict:
    """Trims one contracts/fixtures/verify_*.json fixture down to the
    verify_batch dict shape, honestly relabelling the title-specific fields
    around whatever was actually asked for — the fixture's own title stays
    correct only for the three exact-match benchmark titles."""
    clashing = fixture.get("clashingTitles") or []
    top_clash = None
    if clashing:
        top = clashing[0]
        top_clash = {"title": top["title"], "similarity": top["similarity"]}
    return {
        "title": title,
        "verdict": fixture["verdict"],
        "verdictScore": fixture["verdictScore"],
        "topClash": top_clash,
        "ruleViolations": fixture.get("ruleViolations") or [],
    }


class FixtureVerifyClient:
    """Reads contracts/fixtures/verify_*.json. Picks a fixture
    deterministically per title using a hash, so tests are repeatable —
    the same title always gets the same fixture, and re-running a test
    doesn't flip a candidate from rejected to approved between runs.
    Deliberately returns some REJECTED results (roughly 1/3, from the
    hash bucketing) so the Generator's retry loop gets exercised during
    development instead of only being tested once real scoring exists."""

    _EXACT = {
        "aditi national strategy review": "verify_approved.json",
        "jaagran": "verify_review.json",
        "royal matrimonial classifieds": "verify_rejected.json",
    }
    _BUCKETS = ["verify_approved.json", "verify_review.json", "verify_rejected.json"]

    def __init__(self) -> None:
        self._cache: dict[str, dict] = {}

    def _load(self, filename: str) -> dict:
        if filename not in self._cache:
            with open(FIXTURES_DIR / filename, encoding="utf-8") as f:
                self._cache[filename] = json.load(f)
        return self._cache[filename]

    def verify_batch(self, titles: list[str]) -> list[dict]:
        results = []
        for title in titles:
            normalized = _normalize(title)
            filename = self._EXACT.get(normalized)
            if filename is None:
                bucket = zlib.crc32(normalized.encode("utf-8")) % 3
                filename = self._BUCKETS[bucket]
            fixture = self._load(filename)
            results.append(_to_verify_result(fixture, title))
        return results


class HttpVerifyClient:
    """Calls the real backend with all titles in ONE request. Implemented
    in Prompt 6 (Day 3) — until then this is a clear placeholder, not a
    silent no-op, so nothing accidentally ships pointing at an endpoint
    that doesn't do what this class claims yet."""

    def __init__(self, base_url: str, timeout_s: float = 10.0) -> None:
        self.base_url = base_url
        self.timeout_s = timeout_s

    def verify_batch(self, titles: list[str]) -> list[dict]:
        raise NotImplementedError(
            "HttpVerifyClient lands in Prompt 6 (Day 3) — until then, use "
            "FixtureVerifyClient (the default while AGENTS_USE_FIXTURES=1)"
        )
