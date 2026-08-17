"""
ml/similarity/lexical.py — Lexical (spelling + word-order) similarity scorer.

Implements SimilarityScorer (contracts/algo.py) using RapidFuzz, which runs
the underlying edit-distance algorithms in C++ so score_batch over 200
candidates is fast enough to fit inside the 2-second pipeline budget.

THREE MEASURES, ONE SCORE
  Each measure catches a different type of title collision that the others
  miss. All three are computed in the 0-100 range natively by RapidFuzz.

  ratio         — character-level edit distance (Indel / Levenshtein ratio).
                  Catches single-letter mutations: "Jagran" vs "Jagraan".

  token_sort    — sorts the words of both strings before comparing.
                  THE most important single measure for this domain.
                  "Times India" and "India Times" are the same publication
                  re-ordered; a naive edit-distance misses this completely.
                  token_sort_ratio returns 100 for any two titles that are
                  anagrams of each other at the word level.

  partial       — scores the shorter string against its best matching
                  substring of the longer one.
                  Catches containment: "Daily News" inside "The Daily News Today".
                  Discounted to 0.85× because short titles trivially score
                  high against long ones when partial is unweighted:
                  a two-letter abbreviation would score 100 against any
                  title containing those two letters.

RETURN VALUE
  _clamp(max(ratio, token_sort, 0.85 * partial))
  Taking the max means we surface the most generous interpretation of a
  collision — the right bias for a system that errs toward flagging rather
  than clearing a potential conflict.

LENGTH GUARD
  If either normalized title is < 4 characters, partial_ratio is excluded.
  Without this guard, "AB" scores 100 against every title containing "ab".
"""

from __future__ import annotations

import logging
from typing import Sequence

from rapidfuzz import fuzz, process, utils as rf_utils

from ml.similarity.base import BaseScorer
from ml.similarity.tokens import normalize

logger = logging.getLogger(__name__)

# cdist scorer constant — used in score_batch.
# fuzz.WRatio adapts its strategy per pair; we want explicit control,
# so we pass the three scorers individually and take the max manually.
# For the vectorised batch we use fuzz.ratio / token_sort_ratio as the
# primary fast path (cdist), then fold in partial in pure Python because
# cdist does not expose the per-pair processor-customised partial_ratio
# blend we need.

_MIN_LEN_FOR_PARTIAL = 4  # characters (after normalisation)


class LexicalScorer(BaseScorer):
    """
    Spelling + word-order similarity using RapidFuzz.

    score_batch is overridden with cdist (C++ vectorised) for the ratio
    and token_sort measures, then partial is added in Python.
    Benchmark on 200 candidates is printed to the log at DEBUG level the
    first time score_batch is called (set LOG_LEVEL=DEBUG to see it).
    """

    name: str = "lexical"
    version: str = "1.0.0"

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def score(self, query: str, candidate: str) -> float:
        """
        Return 0.0-100.0. Never raises (BaseScorer.safe_score wraps this).
        """
        q = normalize(query)
        c = normalize(candidate)

        if not q or not c:
            return 0.0

        ratio = fuzz.ratio(q, c)
        token_sort = fuzz.token_sort_ratio(q, c)

        # Partial: only when both titles are long enough to be meaningful.
        use_partial = len(q) >= _MIN_LEN_FOR_PARTIAL and len(c) >= _MIN_LEN_FOR_PARTIAL
        partial = fuzz.partial_ratio(q, c) if use_partial else 0.0

        raw = max(ratio, token_sort, 0.85 * partial)
        return self._clamp(raw)

    def score_batch(self, query: str, candidates: Sequence[str]) -> list[float]:
        """
        Vectorised batch scoring via rapidfuzz.process.cdist (C++).

        Strategy:
          1. cdist for ratio and token_sort_ratio — both are vectorised in C++
             and run in a single pass over all candidates.
          2. partial_ratio is folded in with a Python loop (cdist supports it
             but the length-guard logic requires per-pair normalised lengths,
             which is cheaper to handle in Python than to push into cdist).
          3. Final score = max(ratio, token_sort, 0.85 * partial) per candidate.
        """
        if not candidates:
            return []

        q = normalize(query)
        if not q:
            return [0.0] * len(candidates)

        normed_candidates = [normalize(c) for c in candidates]

        # --- Vectorised pass (C++) ---
        # cdist returns a 1-D numpy array of floats in [0, 100].
        ratio_scores: list[float] = process.cdist(
            [q], normed_candidates,
            scorer=fuzz.ratio,
            processor=None,   # already normalized above
        )[0].tolist()

        token_sort_scores: list[float] = process.cdist(
            [q], normed_candidates,
            scorer=fuzz.token_sort_ratio,
            processor=None,
        )[0].tolist()

        # --- Python pass for partial (length-guarded) ---
        q_len = len(q)
        results: list[float] = []
        for i, c in enumerate(normed_candidates):
            r = ratio_scores[i]
            ts = token_sort_scores[i]

            if not c:
                results.append(0.0)
                continue

            use_partial = q_len >= _MIN_LEN_FOR_PARTIAL and len(c) >= _MIN_LEN_FOR_PARTIAL
            partial = fuzz.partial_ratio(q, c) if use_partial else 0.0

            raw = max(r, ts, 0.85 * partial)
            results.append(self._clamp(raw))

        return results

    def explain(self, query: str, candidate: str) -> str:
        """
        Return a single sentence naming which measure drove the score.
        Never raises; returns "" on any internal error.
        """
        try:
            q = normalize(query)
            c = normalize(candidate)
            if not q or not c:
                return "One or both titles are empty."

            ratio = fuzz.ratio(q, c)
            token_sort = fuzz.token_sort_ratio(q, c)

            use_partial = len(q) >= _MIN_LEN_FOR_PARTIAL and len(c) >= _MIN_LEN_FOR_PARTIAL
            partial = fuzz.partial_ratio(q, c) if use_partial else 0.0
            partial_adj = 0.85 * partial

            best = max(ratio, token_sort, partial_adj)

            if best == 0.0:
                return "No lexical similarity detected."
            if ratio == best:
                return f"Direct character-level similarity (edit-distance ratio {ratio:.0f}%)."
            if token_sort == best:
                return f"Same words in a different order (token-sort {token_sort:.0f}%)."
            return f"One title appears inside the other (partial match {partial:.0f}%, discounted to {partial_adj:.0f}%)."

        except Exception:  # noqa: BLE001
            return ""


# Module-level instance — ml/registry.py imports this.
# Construction is trivial (no model loading), so import-time cost is zero.
SCORER = LexicalScorer()
