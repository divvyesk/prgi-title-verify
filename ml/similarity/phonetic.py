"""
ml/similarity/phonetic.py — Phonetic (sounds-alike) similarity scorer.

Implements SimilarityScorer (contracts/algo.py).

PURPOSE
  Catch titles that sound the same even when their spelling differs.
  Indian newspaper titles are overwhelmingly transliterated proper nouns,
  and transliteration varies almost entirely in the vowels:

      jagran / jaagran / jagaran  → all sound like JGRN
      dainik / daynik             → both sound like DNK

  A purely lexical comparison would miss these because the character-level
  edit distances are non-trivial.

ALGORITHM — THREE LAYERS, TAKE THE MAX

  Layer 1: Double Metaphone code overlap (0–100)
    For each token in a title, compute doublemetaphone(token) → (primary,
    secondary). The secondary code is non-empty when the pronunciation is
    ambiguous (e.g. the J in "jagran"). Sort the per-token code-sets so
    word reordering doesn't matter ("Dainik Jagran" == "Jagran Dainik").
    Greedy one-to-one matching: each query code-set is matched to the
    first unmatched candidate code-set with overlapping codes.
    dm_score = matched_count / max(len_q, len_c) × 100.

  Layer 2: Consonant skeleton + fuzz.token_sort_ratio (0–100)
    This is the Indic fallback. Double Metaphone was tuned for English
    surnames and fails on many Indic transliterations. consonant_skeleton()
    strips all vowels, leaving only the consonant structure, which is
    almost always stable across transliteration variants. Comparing the
    joined skeletons with fuzz.token_sort_ratio handles word reordering.

  Layer 3: Token-count penalty
    A one-word title should not score 100 against a four-word title that
    happens to contain it phonetically. Penalty:
      penalty = 1.0 - abs(nq - nc) / max(nq, nc) * 0.15
    Applied to both DM and skeleton scores before taking the max.

  Final:
    _clamp(max(dm_score * penalty, skeleton_score * penalty))

SCORE_BATCH OVERRIDE
  Pre-computes the query's DM codes and skeleton string once, then reuses
  them across all candidates. Each candidate is scored with safe_score-
  style isolation (one bad candidate cannot crash the batch).

PERFORMANCE
  No vectorised library exists for Double Metaphone batch computation.
  The query-side pre-computation avoids redundant work across 200
  candidates, and fuzz.token_sort_ratio runs in C++ under the hood, so
  the inner loop is fast.
"""

from __future__ import annotations

import logging
from typing import Sequence

from metaphone import doublemetaphone
from rapidfuzz import fuzz

from ml.similarity.base import BaseScorer
from ml.similarity.tokens import consonant_skeleton, tokens

logger = logging.getLogger(__name__)

# Token-count penalty constant.
# See implementation plan §Clarification 2 for justification.
_TOKEN_PENALTY_K = 0.15


# ------------------------------------------------------------------
# Internal helpers
# ------------------------------------------------------------------

def _dm_codes(word: str) -> set[str]:
    """Return the set of non-empty Double Metaphone codes for *word*."""
    primary, secondary = doublemetaphone(word)
    codes: set[str] = set()
    if primary:
        codes.add(primary)
    if secondary:
        codes.add(secondary)
    return codes


def _dm_overlap_score(
    codes_q: list[set[str]],
    codes_c: list[set[str]],
) -> float:
    """
    Greedy one-to-one matching of DM code sets.

    Each query code-set is matched to the first unmatched candidate
    code-set whose codes overlap. Each candidate is consumed at most once.
    Both lists should already be sorted for determinism.

    Returns: matched_count / max(len_q, len_c) × 100.
    """
    if not codes_q or not codes_c:
        return 0.0

    matched = 0
    used: set[int] = set()

    for ca in codes_q:
        for j, cb in enumerate(codes_c):
            if j in used:
                continue
            if ca & cb:
                matched += 1
                used.add(j)
                break

    denom = max(len(codes_q), len(codes_c))
    return (matched / denom) * 100.0


def _skeleton_string(toks: list[str]) -> str:
    """Join per-token consonant skeletons with spaces."""
    return " ".join(consonant_skeleton(t) for t in toks)


def _token_penalty(nq: int, nc: int) -> float:
    """
    Small penalty when the two titles differ in token count.

    penalty = 1.0 - abs(nq - nc) / max(nq, nc) * K

    Same token count → 1.0 (no effect).
    1 vs 2 → 0.925.  1 vs 4 → 0.8875.
    """
    mx = max(nq, nc)
    if mx == 0:
        return 1.0
    return 1.0 - abs(nq - nc) / mx * _TOKEN_PENALTY_K


# ------------------------------------------------------------------
# Pre-computed query representation (reused across score_batch)
# ------------------------------------------------------------------

class _QueryRep:
    """Pre-computed phonetic representation of the query title."""

    __slots__ = ("toks", "dm_codes", "skel", "n")

    def __init__(self, title: str) -> None:
        self.toks: list[str] = tokens(title)
        self.n: int = len(self.toks)
        # Sort DM code-sets for deterministic, order-independent matching
        self.dm_codes: list[set[str]] = sorted(
            [_dm_codes(t) for t in self.toks],
            key=lambda s: sorted(s),
        )
        self.skel: str = _skeleton_string(self.toks)


# ------------------------------------------------------------------
# Scorer
# ------------------------------------------------------------------

class PhoneticScorer(BaseScorer):
    """
    Sounds-alike similarity using Double Metaphone + consonant skeleton.

    score_batch is overridden to pre-compute the query's phonetic
    representation once and reuse it across all candidates.
    """

    name: str = "phonetic"
    version: str = "1.0.0"

    # ------------------------------------------------------------------
    # Internal scoring from pre-computed parts
    # ------------------------------------------------------------------

    @staticmethod
    def _score_from_query_rep(qr: _QueryRep, candidate: str) -> float:
        """
        Score a single candidate against a pre-computed query.
        May raise; caller wraps with try/except.
        """
        toks_c = tokens(candidate)

        if not qr.toks or not toks_c:
            return 0.0

        # Layer 1: Double Metaphone code overlap
        codes_c = sorted(
            [_dm_codes(t) for t in toks_c],
            key=lambda s: sorted(s),
        )
        dm_sc = _dm_overlap_score(qr.dm_codes, codes_c)

        # Layer 2: Consonant skeleton
        skel_c = _skeleton_string(toks_c)
        if qr.skel and skel_c:
            sk_sc = float(fuzz.token_sort_ratio(qr.skel, skel_c))
        else:
            sk_sc = 0.0

        # Layer 3: Token-count penalty
        pen = _token_penalty(qr.n, len(toks_c))

        # Final: max of penalised layers, clamped
        raw = max(dm_sc * pen, sk_sc * pen)
        return BaseScorer._clamp(raw)

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def score(self, query: str, candidate: str) -> float:
        """Return 0.0–100.0. Never raises (BaseScorer.safe_score wraps this)."""
        qr = _QueryRep(query)
        return self._score_from_query_rep(qr, candidate)

    def score_batch(self, query: str, candidates: Sequence[str]) -> list[float]:
        """
        Pre-compute the query's DM codes and skeleton once, then score
        every candidate against the pre-computed representation.

        Each candidate is wrapped in try/except for isolation.
        """
        if not candidates:
            return []

        qr = _QueryRep(query)

        if not qr.toks:
            return [0.0] * len(candidates)

        results: list[float] = []
        for c in candidates:
            try:
                results.append(self._score_from_query_rep(qr, c))
            except Exception as exc:  # noqa: BLE001
                c_short = repr(c[:40])
                logger.warning(
                    "PhoneticScorer.score_batch raised for candidate=%s: %s",
                    c_short,
                    exc,
                )
                results.append(0.0)
        return results

    def explain(self, query: str, candidate: str) -> str:
        """
        Return a single sentence naming which layer drove the score.
        Never raises; returns "" on any internal error.
        """
        try:
            qr = _QueryRep(query)
            toks_c = tokens(candidate)

            if not qr.toks or not toks_c:
                return "One or both titles are empty."

            # Recompute both layers to identify the winner
            codes_c = sorted(
                [_dm_codes(t) for t in toks_c],
                key=lambda s: sorted(s),
            )
            dm_sc = _dm_overlap_score(qr.dm_codes, codes_c)

            skel_c = _skeleton_string(toks_c)
            if qr.skel and skel_c:
                sk_sc = float(fuzz.token_sort_ratio(qr.skel, skel_c))
            else:
                sk_sc = 0.0

            pen = _token_penalty(qr.n, len(toks_c))
            dm_penalised = dm_sc * pen
            sk_penalised = sk_sc * pen
            best = max(dm_penalised, sk_penalised)

            if best == 0.0:
                return "No phonetic similarity detected."

            if dm_penalised >= sk_penalised:
                return (
                    f"Phonetic match via Double Metaphone — both titles "
                    f"encode to the same sound pattern (DM {dm_sc:.0f}%)."
                )
            return (
                f"Consonant skeleton match — same consonant structure "
                f"after stripping vowels (skeleton {sk_sc:.0f}%)."
            )

        except Exception:  # noqa: BLE001
            return ""


# Module-level instance — ml/registry.py imports this.
SCORER = PhoneticScorer()
