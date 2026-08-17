"""
The 5-stage orchestrator: NORMALIZE -> SHORTLIST -> SCORE -> CHECK -> EXPLAIN.

STUB is our demo-day insurance policy. Each ML-dependent stage checks its
own flag independently: True returns the fixture-equivalent answer, False
calls the real module. If a teammate's module breaks at 2 AM on Day 3, flip
that one flag back to True and the demo keeps running — nothing else in
this file changes.

NORMALIZE has no flag: it is plain string processing (no ML, no DB), so it
always runs for real.

As of Prompt 6, SHORTLIST and SCORE are real: they run whatever is
currently registered in ml/registry.py (today: just the semantic scorer
and vector retriever — Jai's and Pruthviraj's modules aren't merged into
this branch yet, and nothing here needs to change when they land, since
the registry picks them up automatically). RULES and EXPLAIN stay stubbed:
Pruthviraj's real rule engine (ml/rules/) and Suhani's RAG explainer
(ml/rag/) don't exist yet.

Important distinction for EXPLAIN: the STUB flag only governs the PROSE
(explanation / recommended_action / guideline_citations) — never the
verdict itself. The verdict, verdict_score, similarity_breakdown and
clashing_titles are now computed for real from stage 2-3 output and
ml/config/weights.yaml, regardless of the explain flag. Splitting it this
way means the numbers go real the moment the underlying scorer/retriever
does, without waiting for the (separate, harder) prose-generation problem.

ml/scoring.py (Jai's "composite scorer", per CODEOWNERS) is still empty.
The blending logic below is a bridge, living here because the pipeline
needs it working today — once ml/scoring.py exists, stage 3 should import
and delegate to it instead of computing weights inline.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import re
import uuid
from collections import OrderedDict
from datetime import datetime, timezone
from pathlib import Path

import yaml

from contracts.contracts import (
    Candidate,
    CandidateScore,
    ClashingTitle,
    RuleViolation,
    SimilarityScores,
    VerificationResult,
)

import importlib

from app.config import settings
from app.db import get_pool
from app.services import stub
from ml.fusion.rrf import rrf
from ml.registry import RETRIEVERS, SCORERS

logger = logging.getLogger("app.services.pipeline")


def _try_import(module_path: str, attr: str):
    """Same resilience pattern as ml/registry.py, applied to the four
    integration points below instead of scorers/retrievers: try to pick up
    a teammate's real module, log a warning and stay on stub if it isn't
    there (or isn't finished) yet. Returns None on any failure — an empty
    placeholder file (valid, no such attribute) and a module that doesn't
    exist at all both fail exactly the same safe way."""
    try:
        module = importlib.import_module(module_path)
        return getattr(module, attr)
    except Exception as exc:
        logger.warning("%s.%s not available (%s) — staying on stub for this stage", module_path, attr, exc)
        return None


# Expected interfaces (informal — none of these are frozen contracts/ shapes,
# since they're internal wiring points, not request/response boundaries):
#   ml.rules.engine.check(title: str) -> list[RuleViolation]              (Pruthviraj)
#   ml.rag.explain.explain(title, verdict, clashing_titles, rule_violations)
#       -> tuple[explanation: str, recommended_action: str, citations: list[str]]  (Suhani)
#       — matches stub.template_explanation()'s signature exactly, so it's a drop-in swap.
#   ml.scoring.score_candidates(title: str, candidates: list[str]) -> list[CandidateScore]  (Jai)
_real_rules_check = _try_import("ml.rules.engine", "check")
_real_explain = _try_import("ml.rag.explain", "explain")
_real_composite_scorer = _try_import("ml.scoring", "score_candidates")

# shortlist/score default to STUB_MODE's value, not a hardcoded False: with
# STUB_MODE=1 (the default — see backend/app/config.py), the whole point is
# that this process never touches the DB or loads the model, and these two
# stages are exactly what would otherwise do that. STUB_MODE=0 is what
# actually turns them real; from there, each can still be flipped back
# independently as the demo-day insurance policy the module docstring
# describes, without touching STUB_MODE itself.
#
# rules/explain are the inverse: independent of STUB_MODE entirely (a
# lightweight process still benefits from a real, already-loaded rule
# engine or explainer if one happens to be importable), gated only on
# whether the real module above actually imported.
STUB = {
    "shortlist": settings.stub_mode,       # real when STUB_MODE=0 — Prompt 6: ml.registry.RETRIEVERS + RRF fusion
    "score": settings.stub_mode,           # real when STUB_MODE=0 — Prompt 6: ml.registry.SCORERS
    "rules": _real_rules_check is None,    # real once ml/rules/engine.py lands (Pruthviraj)
    "explain": _real_explain is None,      # real once ml/rag/explain.py lands (Suhani) — prose only, NOT the verdict
}

_STOPWORDS_PATH = Path(__file__).resolve().parents[3] / "ml" / "config" / "stopwords.txt"
_WEIGHTS_PATH = Path(__file__).resolve().parents[3] / "ml" / "config" / "weights.yaml"

_DIMENSION_TO_MATCH_TYPE = {
    "lexical": "LEXICAL",
    "phonetic": "PHONETIC",
    "semantic": "SEMANTIC",
    "core_word": "CORE_WORD",
}

# The six titles we demo. Pre-warmed into the cache at startup (see
# warm_up() below) so they answer in single-digit milliseconds in front of
# judges on hotel wifi, regardless of what the rest of the pipeline costs.
DEMO_TITLES = [
    "Times India",
    "Jaagran",
    "Dainik Samachar",
    "The Vidarbha Daily Express",
    "Royal Matrimonial Classifieds",
    "Aditi National Strategy Review",
]

_CACHE_MAX_SIZE = 256
_verification_cache: "OrderedDict[str, VerificationResult]" = OrderedDict()


def _cache_get(key: str) -> VerificationResult | None:
    if key not in _verification_cache:
        return None
    _verification_cache.move_to_end(key)
    return _verification_cache[key]


def _cache_put(key: str, value: VerificationResult) -> None:
    _verification_cache[key] = value
    _verification_cache.move_to_end(key)
    if len(_verification_cache) > _CACHE_MAX_SIZE:
        _verification_cache.popitem(last=False)  # evict least-recently-used


def _title_fingerprint(title: str) -> str:
    """For logging only — never the raw title (privacy requirement, see
    run_verification). Short enough to eyeball-correlate log lines for the
    same title across a request without being reversible in practice."""
    return hashlib.sha256(title.encode("utf-8")).hexdigest()[:12]


def _stopwords() -> set[str]:
    if not _STOPWORDS_PATH.exists():
        return set()
    return {w.strip() for w in _STOPWORDS_PATH.read_text(encoding="utf-8").splitlines() if w.strip()}


_weights_cache: dict | None = None


def _weights_config() -> dict:
    global _weights_cache
    if _weights_cache is None:
        with open(_WEIGHTS_PATH, encoding="utf-8") as f:
            _weights_cache = yaml.safe_load(f)
    return _weights_cache


def _normalize(title: str, language: str | None) -> tuple[str, str, str, str, list[str]]:
    """Real, no flag: lowercase + whitespace-collapse + stopword-strip core
    words. Script detection and real transliteration (Indic -> Roman) are
    Pruthviraj's/Divvye's later work — until then, non-ASCII input is
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


# ---------------------------------------------------------------------------
# Stage 2 — SHORTLIST
# ---------------------------------------------------------------------------

def _hydrate(title_ids: list[int]) -> dict[int, dict]:
    """ONE query for canonical title/regNo/language/state, no matter how
    many retrievers found a given ID or what (possibly stale/partial) data
    they returned themselves. 200 separate queries would blow the 2-second
    budget on their own."""
    if not title_ids:
        return {}
    pool = get_pool()
    with pool.connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT title_id, title, registration_number, language, publication_state
            FROM titles
            WHERE title_id = ANY(%s)
            """,
            (title_ids,),
        )
        rows = cur.fetchall()
    return {
        row[0]: {"title": row[1] or "", "reg_no": row[2] or "", "language": row[3] or "", "state": row[4] or ""}
        for row in rows
    }


async def _real_shortlist(title: str, limit: int) -> list[Candidate]:
    if not RETRIEVERS:
        logger.warning("no retrievers registered — shortlist is empty")
        return []

    names = list(RETRIEVERS.keys())
    tasks = [asyncio.to_thread(RETRIEVERS[name].search, title, limit) for name in names]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    rankings: list[list[int]] = []
    best_raw_score: dict[int, float] = {}
    best_source: dict[int, str] = {}
    for name, result in zip(names, results):
        if isinstance(result, Exception):
            logger.warning("retriever '%s' raised, skipping (algo.py rule 5 says it shouldn't — logging anyway): %s", name, result)
            continue
        ranking = [c.title_id for c in result]
        rankings.append(ranking)
        for c in result:
            if c.title_id not in best_raw_score or c.raw_score > best_raw_score[c.title_id]:
                best_raw_score[c.title_id] = c.raw_score
                best_source[c.title_id] = c.source

    if not rankings:
        return []

    fused = rrf(rankings)
    top_ids = sorted(fused, key=lambda tid: fused[tid], reverse=True)[:limit]

    hydrated = _hydrate(top_ids)
    candidates = []
    for tid in top_ids:
        row = hydrated.get(tid)
        if row is None:
            continue  # id existed in the retriever's index at query time but not on re-fetch; skip rather than guess
        candidates.append(Candidate(
            titleId=tid, title=row["title"], regNo=row["reg_no"], language=row["language"], state=row["state"],
            rawScore=round(best_raw_score.get(tid, 0.0), 4), source=best_source.get(tid, names[0]),
        ))
    return candidates


async def run_shortlist(title: str, limit: int = 200) -> list[Candidate]:
    if STUB["shortlist"]:
        return stub.get_candidates(limit)
    return await _real_shortlist(title, limit)


# ---------------------------------------------------------------------------
# Stage 3 — SCORE
# ---------------------------------------------------------------------------

def _real_score(title: str, candidates: list[str]) -> list[CandidateScore]:
    """Bridge logic for ml/scoring.py (Jai's composite scorer, not built
    yet) — see module docstring. Calls SCORERS[name].score_batch() for
    every currently-registered dimension, then blends with
    ml/config/weights.yaml's weights RENORMALIZED across only the
    dimensions actually available today. This matters: if an unavailable
    dimension defaulted to 0.0 inside the weighted sum, that would silently
    drag every composite score down as if the system had positively
    measured "no similarity" on that axis, when really it just hasn't been
    built yet — a false negative baked into the math. Renormalizing means
    blended_score today equals semantic_score alone (the only dimension
    registered), and automatically starts using the configured weights for
    real the moment more dimensions register, with no code change here."""
    if not candidates:
        return []

    per_dimension: dict[str, list[float]] = {}
    for name, scorer in SCORERS.items():
        try:
            per_dimension[name] = scorer.score_batch(title, candidates)
        except Exception:
            logger.exception("scorer '%s' raised out of score_batch (should never happen per algo.py rule 4)", name)

    weights = _weights_config()["weights"]
    active_weight_sum = sum(weights.get(name, 0.0) for name in per_dimension) or 1.0

    results = []
    for i, candidate in enumerate(candidates):
        dim_scores = {name: scores[i] for name, scores in per_dimension.items()}
        blended = sum(dim_scores.get(name, 0.0) * weights.get(name, 0.0) for name in per_dimension) / active_weight_sum
        results.append(CandidateScore(
            candidate=candidate,
            scores=SimilarityScores(
                lexicalScore=dim_scores.get("lexical", 0.0),
                phoneticScore=dim_scores.get("phonetic", 0.0),
                semanticScore=dim_scores.get("semantic", 0.0),
                coreWordScore=dim_scores.get("core_word", 0.0),
                blendedScore=round(blended, 2),
            ),
        ))
    return results


def run_score(title: str, candidates: list[str]) -> list[CandidateScore]:
    if STUB["score"]:
        return stub.score_candidates(title, candidates)
    if _real_composite_scorer is not None:
        try:
            return _real_composite_scorer(title, candidates)
        except Exception:
            logger.exception("ml.scoring.score_candidates() raised — falling back to the bridge blending logic for this request")
    return _real_score(title, candidates)


# ---------------------------------------------------------------------------
# Stage 4 — CHECK
# ---------------------------------------------------------------------------

def run_rules(title: str) -> list[RuleViolation]:
    if STUB["rules"]:
        return stub.check_rules(title)
    try:
        raw_violations = _real_rules_check(title)
        violations: list[RuleViolation] = []
        for v in raw_violations:
            if isinstance(v, RuleViolation):
                violations.append(v)
            elif hasattr(v, "model_dump"):
                violations.append(RuleViolation.model_validate(v.model_dump()))
            elif hasattr(v, "dict"):
                violations.append(RuleViolation.model_validate(v.dict()))
            elif isinstance(v, dict):
                violations.append(RuleViolation.model_validate(v))
            else:
                violations.append(RuleViolation(
                    rule_id=getattr(v, "rule_id", "R-UNKNOWN"),
                    rule_name=getattr(v, "rule_name", "Unknown Rule"),
                    category=getattr(v, "category", "GENERAL"),
                    severity=getattr(v, "severity", "MEDIUM"),
                    passed=getattr(v, "passed", True),
                    description=getattr(v, "description", ""),
                    guideline_clause=getattr(v, "guideline_clause", None),
                    citation_verified=getattr(v, "citation_verified", False),
                    matched_text=getattr(v, "matched_text", None),
                ))
        return violations
    except Exception:
        logger.exception("ml.rules.engine.check() raised — falling back to stub rule check for this request")
        return stub.check_rules(title)


# ---------------------------------------------------------------------------
# Stage 5 — EXPLAIN (verdict is always real; prose is stub-gated — see docstring)
# ---------------------------------------------------------------------------

def _build_verdict(
    candidates: list[Candidate], candidate_scores: list[CandidateScore]
) -> tuple[str, float, SimilarityScores, list[ClashingTitle]]:
    thresholds = _weights_config()["thresholds"]
    max_override = _weights_config()["max_signal_override"]

    if not candidate_scores:
        empty = SimilarityScores(lexicalScore=0.0, phoneticScore=0.0, semanticScore=0.0, coreWordScore=0.0, blendedScore=0.0)
        return "APPROVED", 0.0, empty, []

    by_title = {c.title: c for c in candidates}
    ranked = sorted(candidate_scores, key=lambda cs: cs.scores.blended_score, reverse=True)

    top = ranked[0]
    blended = top.scores.blended_score
    single_dims = [top.scores.lexical_score, top.scores.phonetic_score, top.scores.semantic_score, top.scores.core_word_score]
    if max(single_dims) >= max_override:
        blended = max(blended, 85.0)

    if blended >= thresholds["reject"]:
        verdict = "REJECTED"
    elif blended >= thresholds["review"]:
        verdict = "MANUAL_REVIEW"
    else:
        verdict = "APPROVED"

    clashing_titles = []
    for cs in ranked[:5]:
        if cs.scores.blended_score < thresholds["review"]:
            break  # below review threshold isn't a real clash worth surfacing
        cand = by_title.get(cs.candidate)
        if cand is None:
            continue
        dims = {
            "lexical": cs.scores.lexical_score, "phonetic": cs.scores.phonetic_score,
            "semantic": cs.scores.semantic_score, "core_word": cs.scores.core_word_score,
        }
        winning_dim = max(dims, key=dims.get)
        # Deliberately NOT calling SCORERS[winning_dim].explain() here: that
        # would re-run the model on this pair from scratch, duplicating a
        # score we already paid for in stage 3's batch call. Measured cost
        # of doing that for the top 5 clashes: ~630ms added to every
        # request, entirely avoidable. The generic templated line is free.
        reason = f"{dims[winning_dim]:.0f}% {winning_dim} similarity."
        clashing_titles.append(ClashingTitle(
            title=cand.title, regNo=cand.reg_no, language=cand.language, state=cand.state,
            similarity=cs.scores.blended_score, matchType=_DIMENSION_TO_MATCH_TYPE[winning_dim],
            reason=reason,
        ))

    return verdict, round(blended, 2), top.scores, clashing_titles


async def run_verification(
    title: str, language: str | None = None, state: str | None = None, request_id: str | None = None
) -> VerificationResult:
    request_id = request_id or str(uuid.uuid4())
    fp = _title_fingerprint(title)  # never log `title` itself below — length + hash only, privacy requirement
    t_start = stub.now_ms()
    timings: dict[str, float] = {}

    logger.info("[%s] verify start len=%d fp=%s", request_id, len(title), fp)

    t0 = stub.now_ms()
    normalized, detected_language, detected_script, transliterated, core_words = _normalize(title, language)
    timings["normalize"] = round(stub.now_ms() - t0, 2)
    logger.info("[%s] stage=normalize done %.2fms", request_id, timings["normalize"])

    cached_result = _cache_get(normalized)
    if cached_result is not None:
        logger.info("[%s] cache hit fp=%s", request_id, fp)
        data = cached_result.model_dump(by_alias=True, mode="json")
        data["inputTitle"] = title
        data["cached"] = True
        data["processingTimeMs"] = int(round(stub.now_ms() - t_start))
        data["timestamp"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        return VerificationResult(**data)

    t1 = stub.now_ms()
    candidates = await run_shortlist(title)
    timings["shortlist"] = round(stub.now_ms() - t1, 2)
    logger.info("[%s] stage=shortlist done %.2fms candidates=%d", request_id, timings["shortlist"], len(candidates))

    t2 = stub.now_ms()
    candidate_scores = run_score(title, [c.title for c in candidates])
    timings["score"] = round(stub.now_ms() - t2, 2)
    logger.info("[%s] stage=score done %.2fms", request_id, timings["score"])

    t3 = stub.now_ms()
    rule_violations = run_rules(title)
    timings["check"] = round(stub.now_ms() - t3, 2)
    logger.info("[%s] stage=check done %.2fms violations=%d", request_id, timings["check"], len(rule_violations))

    t4 = stub.now_ms()
    if STUB["shortlist"] and STUB["score"]:
        # Both upstream stages are stubbed — this is the full offline/demo
        # baseline (STUB_MODE=1's default state), not a partial real run.
        # Use the curated fixture path (exact-match lookup for the three
        # benchmark titles + hash-bucketed fallback) rather than
        # _build_verdict() over fake hash-based candidate scores, which
        # would NOT reproduce the demo-critical "Jaagran" -> MANUAL_REVIEW
        # /"Royal Matrimonial Classifieds" -> REJECTED behavior every
        # other prompt pack's tests and the demo script depend on.
        result = stub.get_verification_result(title)
        verdict = result.verdict
        verdict_score = result.verdict_score
        similarity_breakdown = result.similarity_breakdown
        clashing_titles = result.clashing_titles
        explanation = result.explanation
        recommended_action = result.recommended_action
        guideline_citations = result.guideline_citations
        engine = "OFFLINE"
    else:
        # At least one of shortlist/score is real (the Prompt 6 target
        # state is both real) — assemble the verdict for real from
        # whatever stage 2/3 actually produced.
        verdict, verdict_score, similarity_breakdown, clashing_titles = _build_verdict(candidates, candidate_scores)
        if rule_violations and any(v.severity == "CRITICAL" and not v.passed for v in rule_violations):
            verdict = "REJECTED"
            verdict_score = max(verdict_score, 90.0)

        if STUB["explain"]:
            explanation, recommended_action, guideline_citations = stub.template_explanation(
                title, verdict, clashing_titles, rule_violations
            )
        else:
            try:
                explanation, recommended_action, guideline_citations = _real_explain(
                    title, verdict, clashing_titles, rule_violations
                )
            except Exception:
                logger.exception("ml.rag.explain.explain() raised — falling back to templated prose for this request")
                explanation, recommended_action, guideline_citations = stub.template_explanation(
                    title, verdict, clashing_titles, rule_violations
                )
        engine = "LIVE"
    timings["explain"] = round(stub.now_ms() - t4, 2)
    logger.info("[%s] stage=explain done %.2fms verdict=%s", request_id, timings["explain"], verdict)

    result = VerificationResult(
        inputTitle=title,
        normalizedTitle=normalized,
        detectedLanguage=detected_language,
        transliteratedTitle=transliterated,
        coreWords=core_words,
        verdict=verdict,
        verdictScore=verdict_score,
        similarityBreakdown=similarity_breakdown,
        clashingTitles=clashing_titles,
        ruleViolations=rule_violations,
        explanation=explanation,
        recommendedAction=recommended_action,
        guidelineCitations=guideline_citations,
        stageTimings=timings,
        engine=engine,
        cached=False,
        processingTimeMs=int(round(stub.now_ms() - t_start)),
        timestamp=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    )
    _cache_put(normalized, result)
    logger.info("[%s] verify done %dms fp=%s", request_id, result.processing_time_ms, fp)
    return result


async def warm_up() -> None:
    """Called once from the lifespan handler, after the model loads: runs a
    complete verification for each of the six demo titles so (a) the model,
    connection pool and every code path are hot before the first real
    request, and (b) those exact six titles answer from cache in
    single-digit milliseconds in front of judges, regardless of what the
    rest of the pipeline costs. One function satisfies both asks in Prompt 7
    rather than a throwaway dummy call plus a separate pre-warm loop."""
    for demo_title in DEMO_TITLES:
        t0 = stub.now_ms()
        try:
            await run_verification(demo_title)
            # Same "never log the raw title" rule as everywhere else, even
            # though these particular six are Divvye's own hardcoded demo
            # constants, not user input — keeping one rule with no
            # exceptions is easier to trust than a rule with a footnote.
            logger.info("warm-up: len=%d fp=%s ready in %.0fms", len(demo_title), _title_fingerprint(demo_title), stub.now_ms() - t0)
        except Exception:
            logger.exception("warm-up failed for %r — that title will compute on first real request instead", demo_title)
