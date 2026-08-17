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
import logging
import re
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

from app.config import settings
from app.db import get_pool
from app.services import stub
from ml.fusion.rrf import rrf
from ml.registry import RETRIEVERS, SCORERS

logger = logging.getLogger("app.services.pipeline")

# shortlist/score default to STUB_MODE's value, not a hardcoded False: with
# STUB_MODE=1 (the default — see backend/app/config.py), the whole point is
# that this process never touches the DB or loads the model, and these two
# stages are exactly what would otherwise do that. STUB_MODE=0 is what
# actually turns them real; from there, each can still be flipped back
# independently as the demo-day insurance policy the module docstring
# describes, without touching STUB_MODE itself.
STUB = {
    "shortlist": settings.stub_mode,  # real when STUB_MODE=0 — Prompt 6: ml.registry.RETRIEVERS + RRF fusion
    "score": settings.stub_mode,      # real when STUB_MODE=0 — Prompt 6: ml.registry.SCORERS
    "rules": True,       # Pruthviraj's real rule engine not wired yet, regardless of STUB_MODE
    "explain": True,     # Suhani's RAG explainer not wired yet — prose only,
                          # NOT the verdict (see module docstring)
}

_STOPWORDS_PATH = Path(__file__).resolve().parents[3] / "ml" / "config" / "stopwords.txt"
_WEIGHTS_PATH = Path(__file__).resolve().parents[3] / "ml" / "config" / "weights.yaml"

_DIMENSION_TO_MATCH_TYPE = {
    "lexical": "LEXICAL",
    "phonetic": "PHONETIC",
    "semantic": "SEMANTIC",
    "core_word": "CORE_WORD",
}


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
    return _real_score(title, candidates)


# ---------------------------------------------------------------------------
# Stage 4 — CHECK
# ---------------------------------------------------------------------------

def run_rules(title: str) -> list[RuleViolation]:
    if STUB["rules"]:
        return stub.check_rules(title)
    raise NotImplementedError(
        "real deterministic rule engine (ml/rules/) lands Day 2-3 — flip "
        "STUB['rules'] back to True until then"
    )


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


async def run_verification(title: str, language: str | None = None, state: str | None = None) -> VerificationResult:
    t_start = stub.now_ms()
    timings: dict[str, float] = {}

    t0 = stub.now_ms()
    normalized, detected_language, detected_script, transliterated, core_words = _normalize(title, language)
    timings["normalize"] = round(stub.now_ms() - t0, 2)

    t1 = stub.now_ms()
    candidates = await run_shortlist(title)
    timings["shortlist"] = round(stub.now_ms() - t1, 2)

    t2 = stub.now_ms()
    candidate_scores = run_score(title, [c.title for c in candidates])
    timings["score"] = round(stub.now_ms() - t2, 2)

    t3 = stub.now_ms()
    rule_violations = run_rules(title)
    timings["check"] = round(stub.now_ms() - t3, 2)

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
            raise NotImplementedError(
                "real RAG-retrieved explanation prose (ml/rag/) lands later "
                "— flip STUB['explain'] back to True until then"
            )
        engine = "LIVE"
    timings["explain"] = round(stub.now_ms() - t4, 2)

    return VerificationResult(
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
