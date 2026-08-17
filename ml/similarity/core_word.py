"""
ml/similarity/core_word.py — Core-word (root-hijacking) similarity scorer.

Implements SimilarityScorer (contracts/algo.py).

PURPOSE
  Catch "root-hijacking": registering "The Vidarbha Daily Express" when
  "Vidarbha Patrika" already exists. Once filler media words are stripped,
  both titles reduce to the single distinctive word "vidarbha", which
  makes them a 100% core-word clash.

  Without this scorer, a purely lexical comparison would give a moderate
  score (~40%) because the full title strings are not very similar.

ALGORITHM
  Step 1 — Strip filler words (stopwords)
    core_q = tokens(query)     minus load_stopwords()
    core_c = tokens(candidate) minus load_stopwords()
    Stopwords are read from ml/config/stopwords.txt — the single
    authoritative list shared with the frontend. Never hardcode a
    duplicate here.

  Step 2 — Exact Jaccard similarity
    jaccard = |intersection| / |union|   (set-based)
    Catches identical distinctive roots regardless of order.
    "Dainik Jagran" ↔ "Jagran Daily" → core {"jagran"} ↔ {"jagran"}
    → jaccard = 1.0 → 100.

  Step 3 — Fuzzy overlap (typo-robust)
    For every token in core_q, find its best fuzz.ratio match in core_c.
    Average those best scores.
    "Vidharbha" ↔ "Vidarbha" → fuzz.ratio ≈ 93 → caught despite the
    misspelling.
    This step fires when Jaccard is 0 due to a minor spelling difference
    that stops exact set intersection.

  Step 4 — Final score
    _clamp(max(jaccard * 100, fuzzy_average))
    Taking the max keeps the stronger signal.

  Step 5 — Matched core word
    score_with_match() returns the tuple (score, matched_word | None)
    so the pipeline can surface the colliding root word in the UI's
    ClashingTitle.matchedCoreWord field.
    score() wraps score_with_match() and discards the second element,
    so the SimilarityScorer protocol signature is preserved.

EMPTY-CORE EDGE CASE
  If either core set is empty (title consists entirely of stopwords, e.g.
  "The Daily News"), return 0.0. Do NOT treat two empty cores as a match.
  This case belongs to the rule engine's "single generic word" rule, not
  here. Dividing by an empty union would raise ZeroDivisionError anyway.

PERFORMANCE
  score_batch() is not overridden with cdist because there is no
  vectorised library for the per-token Jaccard+fuzzy blend. The default
  BaseScorer loop (200 × safe_score) runs in ~5 ms — well within budget.
"""

from __future__ import annotations

import logging
from typing import Sequence

from rapidfuzz import fuzz

from ml.similarity.base import BaseScorer
from ml.similarity.tokens import content_tokens

logger = logging.getLogger(__name__)


class CoreWordScorer(BaseScorer):
    """
    Root-hijacking detector: strips filler words then measures how much
    of the distinctive vocabulary is shared between two titles.
    """

    name: str = "core_word"
    version: str = "1.0.0"

    # ------------------------------------------------------------------
    # Primary entry point — returns score AND matched word
    # ------------------------------------------------------------------

    def score_with_match(
        self,
        query: str,
        candidate: str,
    ) -> tuple[float, str | None]:
        """
        Compute the core-word similarity and return:
          (score_0_to_100, matched_core_word_or_None)

        The matched_core_word is the token from core_q that drove the
        highest fuzzy match (or an exact token from the intersection for
        Jaccard wins). The pipeline surfaces it as ClashingTitle.matchedCoreWord.

        Never raises (call via safe_score_with_match if you need isolation;
        score() already uses safe_score which wraps this).
        """
        core_q = content_tokens(query)
        core_c = content_tokens(candidate)

        # Empty-core guard — do NOT treat two empty sets as 100% match.
        if not core_q or not core_c:
            return 0.0, None

        set_q = set(core_q)
        set_c = set(core_c)

        # ── Step 2: Exact Jaccard ────────────────────────────────────
        intersection = set_q & set_c
        union = set_q | set_c
        jaccard_score = (len(intersection) / len(union)) * 100.0

        jaccard_matched: str | None = next(iter(intersection)) if intersection else None

        # ── Step 3: Fuzzy overlap ────────────────────────────────────
        # For every token in core_q find its best fuzz.ratio in core_c.
        # Average those best-match scores.
        best_per_q: list[float] = []
        fuzzy_matched_word: str | None = None
        fuzzy_matched_score: float = 0.0

        for qt in core_q:
            best = 0.0
            best_word: str | None = None
            for ct in core_c:
                s = float(fuzz.ratio(qt, ct))
                if s > best:
                    best = s
                    best_word = ct
            best_per_q.append(best)
            if best > fuzzy_matched_score:
                fuzzy_matched_score = best
                fuzzy_matched_word = f"{qt} ≈ {best_word}" if best_word and best_word != qt else qt

        fuzzy_score = sum(best_per_q) / len(best_per_q) if best_per_q else 0.0

        # ── Step 4: Final score ──────────────────────────────────────
        raw = max(jaccard_score, fuzzy_score)
        final = self._clamp(raw)

        # ── Step 5: Best matched word for UI display ─────────────────
        if jaccard_score >= fuzzy_score and jaccard_matched:
            matched = jaccard_matched
        else:
            matched = fuzzy_matched_word

        return final, matched

    # ------------------------------------------------------------------
    # SimilarityScorer protocol methods
    # ------------------------------------------------------------------

    def score(self, query: str, candidate: str) -> float:
        """
        Return 0.0–100.0. Never raises (BaseScorer.safe_score wraps this).
        Delegates to score_with_match() and discards the matched-word
        return value so the Protocol's float-only signature is preserved.
        """
        result, _ = self.score_with_match(query, candidate)
        return result

    def explain(self, query: str, candidate: str) -> str:
        """
        Return a single sentence describing the core-word collision.
        Never raises; returns "" on any internal error.
        """
        try:
            core_q = content_tokens(query)
            core_c = content_tokens(candidate)

            if not core_q or not core_c:
                return (
                    "No distinctive core words remain after removing filler terms "
                    "(both titles may consist entirely of generic media words)."
                )

            sc, matched = self.score_with_match(query, candidate)

            if sc == 0.0:
                return "No core-word overlap detected."

            set_q = set(core_q)
            set_c = set(core_c)
            intersection = set_q & set_c

            if matched and matched in intersection:
                return (
                    f"Exact core-word clash on \"{matched}\" "
                    f"(Jaccard {sc:.0f}% after stripping generic media terms)."
                )
            if matched:
                return (
                    f"Core-word near-match on \"{matched}\" "
                    f"(fuzzy overlap {sc:.0f}% after stripping generic media terms)."
                )
            return f"Core-word overlap detected ({sc:.0f}%)."

        except Exception:  # noqa: BLE001
            return ""

    # ------------------------------------------------------------------
    # Convenience: isolated score_with_match for the pipeline
    # ------------------------------------------------------------------

    def safe_score_with_match(
        self,
        query: str,
        candidate: str,
    ) -> tuple[float, str | None]:
        """
        Like score_with_match() but wrapped in the same exception-safety
        guarantee as safe_score() — returns (0.0, None) on any error.

        The pipeline calls this instead of score_with_match() directly so
        that a bad unicode pair in a batch of 200 cannot propagate.
        """
        try:
            return self.score_with_match(query, candidate)
        except Exception as exc:  # noqa: BLE001
            q_short = repr(query[:40])
            c_short = repr(candidate[:40])
            logger.warning(
                "CoreWordScorer.score_with_match raised for query=%s candidate=%s: %s",
                q_short,
                c_short,
                exc,
            )
            return 0.0, None


# Module-level instance — ml/registry.py imports this.
SCORER = CoreWordScorer()
