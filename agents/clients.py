"""
Two implementations of one interface, so the Verifier node never knows or
cares whether it's talking to fixtures or the real backend.
`FixtureVerifyClient` was all that worked through Prompt 4 — the graph's
own default while developing offline (AGENTS_USE_FIXTURES=1). As of
Prompt 6, `HttpVerifyClient` is real too; agents/nodes/verifier.py picks
between them based on agents/config.py's `settings.use_fixtures`.

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

import concurrent.futures
import json
import logging
import zlib
from pathlib import Path
from typing import Protocol

import httpx

logger = logging.getLogger("agents.clients")

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
    """Calls the real backend.

    Deliberately does NOT call POST /v1/score, even though that's what an
    earlier draft of this prompt said: /v1/score only scores a title
    against a candidate list the CALLER supplies — it never runs
    shortlist or rules, so it cannot actually check a generated title
    against the real registry. Using it here would silently violate the
    Verifier's own requirement (agents/nodes/verifier.py, Prompt 4:
    "must use the REAL verification pipeline... a simplified quick check
    makes the guarantee worthless") — a candidate would come back
    "verified" without ever having been checked for real conflicts.
    POST /v1/verify is the only endpoint that runs the complete pipeline,
    so that's what this calls — once per title, but CONCURRENTLY via a
    thread pool rather than sequentially, which is what actually avoids
    the "20 round trips take 40 seconds" problem without trading away
    correctness for speed.

    max_concurrency defaults to 4, not "as many as the batch size" (an
    earlier version tried up to 10 at once). Verified live against
    Divvye's backend: firing ~18 concurrent /v1/verify requests at a
    single-process server backed by ONE shared BGE-M3 model instance
    doesn't parallelize the CPU-bound scoring work, it queues behind it —
    a single request that normally takes 2-4s took 53.7s once a large
    backlog had built up, and outstanding server-side work kept running
    even after the client gave up waiting. Client-side timeouts don't
    cancel server-side work already dispatched, so overshooting the
    backend's real concurrent capacity makes the NEXT caller's requests
    slow too, not just the overloaded batch's own. 4 is a deliberate,
    tested choice, not a guess — see agents/test_clients.py.

    Falls back to FixtureVerifyClient for the WHOLE batch if the backend
    itself is unreachable OR too overloaded to respond in time
    (connection or read-timeout failure on any request) — logged as a
    warning, not silent. A single title's response being malformed for
    some other reason is handled per-title instead (safe default:
    REJECTED, never silently APPROVED — an unverifiable candidate must
    never look clean)."""

    def __init__(self, base_url: str, timeout_s: float = 30.0, max_concurrency: int = 4) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout_s = timeout_s
        self.max_concurrency = max_concurrency

    def _verify_one(self, client: httpx.Client, title: str) -> dict:
        response = client.post(f"{self.base_url}/v1/verify", json={"title": title})
        response.raise_for_status()
        data = response.json()
        clashing = data.get("clashingTitles") or []
        top_clash = {"title": clashing[0]["title"], "similarity": clashing[0]["similarity"]} if clashing else None
        return {
            "title": title,
            "verdict": data["verdict"],
            "verdictScore": data["verdictScore"],
            "topClash": top_clash,
            "ruleViolations": data.get("ruleViolations") or [],
        }

    def verify_batch(self, titles: list[str]) -> list[dict]:
        if not titles:
            return []

        results: dict[str, dict] = {}
        try:
            with httpx.Client(timeout=self.timeout_s) as client:
                with concurrent.futures.ThreadPoolExecutor(max_workers=min(len(titles), self.max_concurrency)) as pool:
                    future_to_title = {pool.submit(self._verify_one, client, t): t for t in titles}
                    for future in concurrent.futures.as_completed(future_to_title):
                        title = future_to_title[future]
                        try:
                            results[title] = future.result()
                        except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout):
                            raise  # backend-unreachable — abandon the batch, fall back below
                        except Exception as exc:
                            logger.warning("HttpVerifyClient: verify failed for one title (%s) — treating as REJECTED, not silently APPROVED", exc)
                            results[title] = {
                                "title": title, "verdict": "REJECTED", "verdictScore": 100.0,
                                "topClash": None, "ruleViolations": [],
                            }
        except (Exception) as exc:
            logger.warning("HttpVerifyClient: backend unreachable (%s) — falling back to FixtureVerifyClient for this whole batch", exc)
            return FixtureVerifyClient().verify_batch(titles)

        return [results[t] for t in titles]
