"""
Reciprocal Rank Fusion — merges several ranked candidate-ID lists (trigram,
BM25, phonetic, vector) into one fused ranking, for Stage 2 (SHORTLIST).

WHY RANK FUSION, NOT AVERAGING SCORES
A pg_trgm similarity, a BM25 score and a cosine similarity sit on
completely different, non-comparable scales — pg_trgm and cosine both
happen to land in roughly [0, 1], but a BM25 score is an unbounded
relevance weight that can be 2, 8, or 40 depending on term rarity. Averaging
0.9 (trigram) with 12.4 (BM25) with 0.7 (cosine) produces a number with no
real meaning; a title that's merely decent on all three would average out
ahead of a title that's a near-exact match on just one. What IS comparable
across every retriever, no matter its internal scale, is a title's
*position* in that retriever's ranked list: 1st place means the same thing
(this retriever's best guess) whether the underlying score was 0.99 or 40.
RRF sums 1/(k + rank) across every list a title appears in, so a title
ranked near the top of two different lists outranks a title that was only
first in one — exactly the signal we want ("multiple independent methods
agree this is a likely match") without ever comparing raw scores directly.
data/datasets/dataset1/embeddings/hybrid_search.py already does this by
hand for two lists (lexical + semantic); this generalises the same idea to
however many retrievers are actually registered (today: just vector, since
Jai's and Pruthviraj's retrievers haven't landed on this branch yet —
ml/registry.py picks them up automatically once they do, no changes here).

k=60 is the standard RRF constant from the original paper (Cormack et al.,
2009) — large enough that rank 1 (1/61) and rank 2 (1/62) aren't wildly
different, so one retriever's noisy top pick doesn't dominate the fused
list on its own.
"""

from __future__ import annotations

from collections import defaultdict


def rrf(rankings: list[list[int]], k: int = 60) -> dict[int, float]:
    """rankings: one list of title_ids per retriever, each already ordered
    best-first. Returns {title_id: fused_score}, higher = more likely a
    real conflict. Not sorted — callers sort by score themselves (e.g.
    dict(sorted(scores.items(), key=lambda kv: kv[1], reverse=True))."""
    scores: dict[int, float] = defaultdict(float)
    for ranking in rankings:
        for rank, title_id in enumerate(ranking, start=1):
            scores[title_id] += 1.0 / (k + rank)
    return dict(scores)
