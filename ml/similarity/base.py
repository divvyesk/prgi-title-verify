"""
ml/similarity/base.py — BaseScorer scaffold.

Every one of Jai's scorers (LexicalScorer, PhoneticScorer, CoreWordScorer)
inherits this class. It provides:

  • _clamp(value) — guarantee the output is always a float in [0.0, 100.0]
    rounded to 2 decimal places. Every scorer must pipe its raw result
    through _clamp before returning, so no scorer can ever silently return
    101 or a negative number (both of which would fail the Pydantic
    Field(ge=0, le=100) validation in contracts/contracts.py).

  • safe_score(query, candidate) — wraps score() in a try/except so that
    a single bad unicode pair can never raise out of a batch. On any
    exception it logs the truncated inputs and returns 0.0. Scorers call
    self.safe_score() rather than self.score() inside score_batch() so
    that batch failures are isolated.

  • score_batch(query, candidates) — a default one-at-a-time loop built on
    safe_score(). Every subclass SHOULD override this with a vectorised
    implementation (e.g. rapidfuzz.process.cdist) to meet the 2-second
    pipeline budget when scoring ~200 candidates; the fallback loop is just
    correct-by-default, not fast.

  • explain() — a default stub that returns "" so subclasses are not forced
    to implement it before the algorithm is ready, while still satisfying
    the SimilarityScorer protocol (which requires the method to exist).

This file is NOT a scorer itself — never import SCORER from base.py.
"""

from __future__ import annotations

import logging
from typing import Sequence

logger = logging.getLogger(__name__)


class BaseScorer:
    """
    Inherit this to get safe_score, _clamp, and a default score_batch loop.

    Subclass contract:
      1. Set class-level `name` (str) and `version` (str, semver).
      2. Override `score(self, query: str, candidate: str) -> float`.
         Return a raw float in any range — _clamp will normalise it.
      3. Override `score_batch` with a faster vectorised implementation
         whenever the underlying library supports it.
      4. Override `explain` to return a human-readable sentence.
      5. Expose a module-level SCORER = <YourClass>() constant.
    """

    name: str = "base"
    version: str = "0.0.0"

    # ------------------------------------------------------------------
    # Public interface (implements contracts/algo.py :: SimilarityScorer)
    # ------------------------------------------------------------------

    def score(self, query: str, candidate: str) -> float:
        """
        Override in subclass. Must return a float (any range); BaseScorer
        will not call _clamp here — the subclass does that just before
        returning so that intermediate arithmetic stays unbounded.
        Raising is OK inside score(); safe_score() catches everything.
        """
        raise NotImplementedError(
            f"{self.__class__.__name__}.score() is not implemented"
        )

    def score_batch(self, query: str, candidates: Sequence[str]) -> list[float]:
        """
        Default: one-at-a-time loop through safe_score.
        Subclasses SHOULD override this with a vectorised implementation.
        """
        return [self.safe_score(query, c) for c in candidates]

    def explain(self, query: str, candidate: str) -> str:
        """
        Override in subclass to return a human-readable explanation.
        Default returns "" so the method always exists on the protocol.
        """
        return ""

    # ------------------------------------------------------------------
    # Helpers for subclasses
    # ------------------------------------------------------------------

    def safe_score(self, query: str, candidate: str) -> float:
        """
        Thin wrapper around score() that:
          • catches every exception (never lets one bad pair crash a batch)
          • logs the truncated inputs so the offending pair is findable
          • returns 0.0 on failure (conservative: we under-penalise rather
            than over-penalise an applicant)

        Subclasses call self.safe_score() inside score_batch() to get
        isolation for free without writing their own try/except.
        """
        try:
            return self.score(query, candidate)
        except Exception as exc:  # noqa: BLE001
            q_short = repr(query[:40])
            c_short = repr(candidate[:40])
            logger.warning(
                "%s.score raised for query=%s candidate=%s: %s",
                self.__class__.__name__,
                q_short,
                c_short,
                exc,
            )
            return 0.0

    @staticmethod
    def _clamp(value: float) -> float:
        """
        Clamp to [0.0, 100.0] and round to 2 decimal places.
        All scorers must return _clamp(raw) as their final value.

        Why clamp rather than assert?
          Asserting would raise, which violates algo.py rule 4 (never
          raise from a public method). Clamping silently corrects a small
          out-of-range value (e.g. 100.0000001 due to floating-point) and
          logs nothing, while a wildly wrong value (e.g. 0.87 from an
          unscaled 0-1 result) is caught during golden-test runs.
        """
        return round(min(100.0, max(0.0, float(value))), 2)
