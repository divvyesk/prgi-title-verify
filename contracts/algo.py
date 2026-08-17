"""
The interface every similarity algorithm and every candidate retriever
implements. This is what lets ml/registry.py call any scorer or retriever
without knowing which one it is calling — Jai's lexical/phonetic/core_word
scorers, Divvye's semantic scorer, and whatever gets added later, all speak
the same shape.

FIVE RULES EVERY SimilarityScorer OBEYS — these are load-bearing, not style
preferences. A scorer that breaks one of these can silently corrupt a
verdict, and because scoring runs inside a 5-stage pipeline under a 2-second
budget with no per-candidate error surfacing back to the user, a violation
here is very easy to ship unnoticed:

  1. ONE ALGORITHM PER FILE. Each scorer lives in the existing empty file at
     ml/similarity/<name>.py (lexical.py, phonetic.py, semantic.py,
     core_word.py) — never split across files, never two scorers in one
     file.

  2. ONE CLASS PLUS ONE MODULE-LEVEL INSTANCE. Each file defines a class
     named <Name>Scorer (e.g. LexicalScorer) implementing SimilarityScorer
     below, and exposes a single ready-to-use instance as a module-level
     `SCORER` constant:

         class LexicalScorer:
             name = "lexical"
             version = "1.0.0"
             def score(self, query, candidate): ...
             def score_batch(self, query, candidates): ...
             def explain(self, query, candidate): ...

         SCORER = LexicalScorer()

     ml/registry.py imports SCORER from each module — it never instantiates
     a scorer class itself, so construction-time state (e.g. a loaded model)
     happens exactly once, at import time.

  3. ALWAYS RETURN A FLOAT 0.0-100.0, ROUNDED TO 2 DECIMALS. Higher always
     means more similar. Never 0.0-1.0 — see contracts/contracts.py, every
     score field there is validated with Field(ge=0, le=100), and a scorer
     returning e.g. 0.87 instead of 87.0 will fail that validation loudly
     the moment it reaches the API boundary, rather than silently rendering
     a broken score bar on the frontend.

  4. NEVER RAISE. Every public method catches its own exceptions internally,
     logs them, and returns 0.0 (or an empty explanation string). One
     candidate with a weird unicode edge case must never take down an entire
     verification request — scoring 200 candidates means 200 chances to hit
     something unexpected, and the pipeline has no per-candidate try/except
     of its own to fall back on. See ml/similarity/base.py (Jai's scaffold)
     for the shared `safe_score` wrapper that enforces this.

  5. NO DATABASE ACCESS INSIDE score() OR score_batch(). A scorer takes
     strings in and returns numbers out — nothing else. Fetching candidate
     rows is the CandidateRetriever's job (below), fetching guideline text
     is ml/rag/'s job. Mixing data access into a scorer makes it untestable
     in isolation (see tests/golden/) and makes the 2-second performance
     budget impossible to reason about, since a scorer call would carry a
     variable, un-budgeted network round trip.

Golden-test contract: every scorer ships tests/golden/<name>_cases.csv with
columns query,candidate,expected_min,expected_max,note (see
tests/golden/runner.py). A scorer is not done until its golden tests pass.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Protocol, Sequence, runtime_checkable

if TYPE_CHECKING:
    # Only imported for type checkers (mypy/pyright), never at runtime, so
    # this file has no import-time dependency on how `contracts` is laid out
    # on sys.path — it works whether it's run as a package, a script, or
    # imported from ml/registry.py at the repo root.
    from contracts.contracts import Candidate


@runtime_checkable
class SimilarityScorer(Protocol):
    """One of the four dimensions in the 4-D similarity engine (PRD §6.3):
    lexical, phonetic, semantic, core_word. See the five rules above —
    every implementation must obey all five."""

    name: str
    """One of: "lexical" | "phonetic" | "semantic" | "core_word" """

    version: str
    """Semver-style string, e.g. "1.0.0". Bump this when the scoring logic
    changes meaningfully, so a shift in results can be traced to a specific
    version rather than looking like unexplained drift."""

    def score(self, query: str, candidate: str) -> float:
        """Return 0.0-100.0. Never raises. Never returns None."""
        ...

    def score_batch(self, query: str, candidates: Sequence[str]) -> list[float]:
        """Same as score(), for many candidates against one query at once.
        Implementations should override the default one-at-a-time loop with
        something faster where the underlying library supports it (e.g.
        rapidfuzz.process.cdist for the lexical scorer, a single batched
        model.encode() call for the semantic scorer) — this is what keeps
        200-candidate scoring inside the performance budget (PRD §11.1)."""
        ...

    def explain(self, query: str, candidate: str) -> str:
        """One short human sentence saying why the score is what it is,
        e.g. "Same words in a different order (token-sort 96%)". Shown to
        applicants and officers as part of the evidence for a clash — never
        raises; on any internal failure, return an empty string rather than
        letting the exception propagate."""
        ...


@runtime_checkable
class CandidateRetriever(Protocol):
    """Stage 2 (SHORTLIST) runs several of these concurrently and merges
    their ranked results via reciprocal rank fusion (ml/fusion/rrf.py) into
    one ~200-candidate shortlist. Each retriever is a different way of
    finding plausible conflicts fast, over the full ~82,713-title registry:
    trigram (lexical), bm25 (rare-word-weighted keyword), phonetic
    (sounds-alike), vector (semantic/cross-lingual)."""

    name: str
    """One of: "trigram" | "bm25" | "phonetic" | "vector" """

    def search(self, query: str, limit: int = 200) -> "list[Candidate]":
        """Return candidates ranked best-first. Each Candidate's raw_score
        is 0.0-1.0 (that retriever's own internal scale, NOT the final
        0-100 similarity score — stage 3 re-scores every shortlisted title
        properly). Never raises: on failure, return an empty list and log,
        so one broken retriever degrades recall rather than failing the
        whole request."""
        ...
