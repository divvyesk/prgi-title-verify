"""
Golden tests for ml/similarity/semantic.py — run directly against the
SCORER, no FastAPI server or database needed. First run downloads/loads
BGE-M3 (10-30s+); subsequent runs reuse the module-level singleton.

Run:
    backend/.venv/bin/python -m pytest tests/test_semantic.py -v
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ml.similarity.semantic import SCORER


def test_identical_pair_scores_above_95():
    score = SCORER.score("The Times of India", "The Times of India")
    assert score > 95, f"identical strings should score >95, got {score}"


def test_cross_language_pair_scores_above_60():
    # This is the whole reason the semantic dimension exists: lexical and
    # phonetic scorers see no shared characters or sounds here at all, but
    # "Daily News" and "Dainik Samachar" mean the same thing.
    score = SCORER.score("Daily News", "Dainik Samachar")
    assert score > 60, f"cross-language equivalent should score >60, got {score}"


def test_unrelated_titles_score_below_55():
    # Empirically calibrated, not guessed: BGE-M3 runs "warm" on short,
    # title-shaped strings — two clearly unrelated titles ("Mountain
    # Trekking Weekly" vs "Stock Market Analysis") share enough surface
    # register/genre signal (both read as short English media titles) to
    # land in the 30-51 range, never near 0. A <30 threshold here was an
    # untested guess that failed against the real model; six calibration
    # probes across unrelated title pairs topped out at 51.1, with clear
    # separation below the >60 bar the cross-language test above requires.
    # Genuinely nonsensical text (not title-shaped at all) does drop lower,
    # e.g. "The Times of India" vs "Random Gibberish Zzqx Blorp" ~28 — but
    # that is not the case this system actually needs to distinguish.
    #
    # Practical implication for Jai's composite scorer (ml/scoring.py): a
    # semantic score in the 30-50 range on its own is NOT evidence of a
    # real conflict — the composite weighting (ml/config/weights.yaml,
    # semantic=0.30) has to carry that distinction, not this dimension
    # alone.
    score = SCORER.score("Mountain Trekking Weekly", "Stock Market Analysis")
    assert score < 55, f"unrelated titles should score <55, got {score}"


def test_score_batch_matches_individual_scores():
    query = "Bharat Samay"
    candidates = ["Bharat Samay", "Daily News", "Mountain Trekking Weekly"]
    batch_scores = SCORER.score_batch(query, candidates)
    individual_scores = [SCORER.score(query, c) for c in candidates]
    assert len(batch_scores) == len(candidates)
    for b, i in zip(batch_scores, individual_scores):
        assert abs(b - i) < 0.5, f"batch ({b}) and individual ({i}) scores should agree"


def test_never_raises_on_empty_string():
    assert SCORER.score("", "") >= 0.0
    assert SCORER.score_batch("query", []) == []


def test_explain_returns_nonempty_string():
    explanation = SCORER.explain("Daily News", "Dainik Samachar")
    assert isinstance(explanation, str)
    assert len(explanation) > 0


if __name__ == "__main__":
    import time

    checks = [
        ("identical pair > 95", test_identical_pair_scores_above_95),
        ("cross-language pair > 60", test_cross_language_pair_scores_above_60),
        ("unrelated titles < 55", test_unrelated_titles_score_below_55),
        ("batch matches individual", test_score_batch_matches_individual_scores),
        ("never raises on empty string", test_never_raises_on_empty_string),
        ("explain returns non-empty string", test_explain_returns_nonempty_string),
    ]
    passed, failed = 0, 0
    t0 = time.time()
    for name, fn in checks:
        try:
            fn()
            print(f"  [PASS] {name}")
            passed += 1
        except AssertionError as e:
            print(f"  [FAIL] {name}: {e}")
            failed += 1
    print(f"\n{passed} passed, {failed} failed, in {time.time() - t0:.1f}s")
    raise SystemExit(1 if failed else 0)
