"""
The 5-stage orchestrator: NORMALIZE -> SHORTLIST -> SCORE -> CHECK -> EXPLAIN.

STUB is our demo-day insurance policy. Each of the four ML-dependent stages
checks its own flag independently: True returns the fixture-equivalent
answer, False calls the real module. If a teammate's module breaks at 2 AM
on Day 3, flip that one flag back to True and the demo keeps running —
nothing else in this file changes.

NORMALIZE has no flag: it is plain string processing (no ML, no DB), so it
always runs for real, even today.

Right now every ML-dependent stage's real branch is a NotImplementedError
placeholder, because the real modules genuinely do not exist yet — Jai's
retrievers and scorers land Day 1-2, Divvye's fusion lands Day 2 (Prompt 6),
Pruthviraj's rule engine lands Day 2-3. Wiring the placeholders is exactly
what those later prompts do; this file's job today is the stub path working
end to end, so the frontend has a real server to integrate against.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import Path

from contracts.contracts import (
    Candidate,
    CandidateScore,
    RuleViolation,
    VerificationResult,
)

from app.services import stub

STUB = {
    "shortlist": True,
    "score": True,
    "rules": True,
    "explain": True,
}

_STOPWORDS_PATH = Path(__file__).resolve().parents[3] / "ml" / "config" / "stopwords.txt"


def _stopwords() -> set[str]:
    if not _STOPWORDS_PATH.exists():
        return set()
    return {w.strip() for w in _STOPWORDS_PATH.read_text(encoding="utf-8").splitlines() if w.strip()}


def _normalize(title: str, language: str | None) -> tuple[str, str, str, str, list[str]]:
    """Real today, no flag: lowercase + whitespace-collapse + stopword-strip
    core words. Script detection and real transliteration (Indic -> Roman)
    are Pruthviraj's/Divvye's later work — until then, non-ASCII input is
    honestly labelled "Unknown" rather than silently mis-tagged "English"."""
    normalized = " ".join(title.strip().lower().split())
    is_ascii = all(ord(ch) < 128 for ch in normalized)
    detected_language = language or ("English" if is_ascii else "Unknown")
    detected_script = "Latin" if is_ascii else "Unknown"
    transliterated = normalized  # identity until real transliteration lands
    tokens = re.findall(r"[a-z0-9]+", normalized)
    stopwords = _stopwords()
    core = [t for t in tokens if t not in stopwords and len(t) > 2]
    core_words = core or tokens
    return normalized, detected_language, detected_script, transliterated, core_words


def run_shortlist(title: str, limit: int = 200) -> list[Candidate]:
    if STUB["shortlist"]:
        return stub.get_candidates(limit)
    raise NotImplementedError(
        "real shortlist (trigram/bm25/phonetic/vector retrievers + RRF fusion) "
        "lands in Prompt 6 — flip STUB['shortlist'] back to True until then"
    )


def run_score(title: str, candidates: list[str]) -> list[CandidateScore]:
    if STUB["score"]:
        return stub.score_candidates(title, candidates)
    raise NotImplementedError(
        "real composite scoring (ml/scoring.py + ml/similarity/*.py) lands "
        "Day 2 — flip STUB['score'] back to True until then"
    )


def run_rules(title: str) -> list[RuleViolation]:
    if STUB["rules"]:
        return stub.check_rules(title)
    raise NotImplementedError(
        "real deterministic rule engine (ml/rules/) lands Day 2-3 — flip "
        "STUB['rules'] back to True until then"
    )


def run_verification(title: str, language: str | None = None, state: str | None = None) -> VerificationResult:
    t_start = stub.now_ms()
    timings: dict[str, float] = {}

    t0 = stub.now_ms()
    normalized, detected_language, detected_script, transliterated, core_words = _normalize(title, language)
    timings["normalize"] = round(stub.now_ms() - t0, 2)

    # Stages 2-4 run so their timings are real and their code paths get
    # exercised even in full-stub mode — but while STUB["explain"] is True,
    # their outputs are not what decides the response (see module docstring).
    t1 = stub.now_ms()
    candidates = run_shortlist(title)
    timings["shortlist"] = round(stub.now_ms() - t1, 2)

    t2 = stub.now_ms()
    run_score(title, [c.title for c in candidates[:50]])
    timings["score"] = round(stub.now_ms() - t2, 2)

    t3 = stub.now_ms()
    run_rules(title)
    timings["check"] = round(stub.now_ms() - t3, 2)

    t4 = stub.now_ms()
    if STUB["explain"]:
        result = stub.get_verification_result(title)
    else:
        raise NotImplementedError(
            "real verdict assembly from stage 2-4 outputs lands in Prompt 6/7 "
            "— flip STUB['explain'] back to True until then"
        )
    timings["explain"] = round(stub.now_ms() - t4, 2)

    data = result.model_dump(by_alias=True, mode="json")
    data["normalizedTitle"] = normalized
    data["detectedLanguage"] = detected_language
    data["transliteratedTitle"] = transliterated
    data["coreWords"] = core_words
    data["stageTimings"] = timings
    data["processingTimeMs"] = int(round(stub.now_ms() - t_start))
    data["timestamp"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    return VerificationResult(**data)
