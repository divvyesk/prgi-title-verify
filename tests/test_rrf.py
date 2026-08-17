"""
Unit tests for ml/fusion/rrf.py. Pure function, no server/DB/model needed.

Run:
    backend/.venv/bin/python tests/test_rrf.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ml.fusion.rrf import rrf


def test_rank_3_in_two_lists_beats_rank_1_in_one_list():
    # Title 101 is 1st in list1 only. Title 202 is 3rd in both lists.
    # At k=60: 101 scores 1/61 ≈ 0.0164; 202 scores 2 * 1/63 ≈ 0.0317.
    # This is the exact example from the Prompt 6 spec — multiple
    # independent retrievers agreeing beats one retriever's top pick.
    list1 = [101, 555, 202]
    list2 = [777, 888, 202]
    scores = rrf([list1, list2])
    assert scores[202] > scores[101], (
        f"rank-3-in-two-lists ({scores[202]}) should beat rank-1-in-one-list ({scores[101]})"
    )


def test_title_absent_from_all_lists_is_absent_from_result():
    scores = rrf([[1, 2, 3], [4, 5, 6]])
    assert 999 not in scores


def test_empty_rankings_returns_empty_dict():
    assert rrf([]) == {}
    assert rrf([[], []]) == {}


def test_single_list_preserves_relative_order():
    scores = rrf([[1, 2, 3]])
    assert scores[1] > scores[2] > scores[3]


def test_k_parameter_changes_score_magnitude_not_ranking():
    list1 = [1, 2, 3]
    default_scores = rrf([list1])
    tight_scores = rrf([list1], k=1)
    # Smaller k spreads scores further apart, but the ranking order among
    # candidates that only appear in one list should not flip.
    assert default_scores[1] > default_scores[2] > default_scores[3]
    assert tight_scores[1] > tight_scores[2] > tight_scores[3]
    assert tight_scores[1] > default_scores[1]


def test_title_found_by_more_retrievers_scores_higher_even_at_worse_ranks():
    # 4 retrievers, title 42 is last place (rank 5) in every single one;
    # title 7 is 1st place but only in one retriever, and never appears
    # in the other four lists at all. Broad agreement across many
    # independent methods should still be able to win.
    many_lists = [[100, 101, 102, 103, 42] for _ in range(4)]
    one_list = [[7, 201, 202, 203, 204]]
    scores = rrf(many_lists + one_list)
    assert scores[42] > scores[7], "found by 4 retrievers (even at rank 5) should beat found by 1 retriever at rank 1"


if __name__ == "__main__":
    checks = [
        ("rank-3-in-two-lists beats rank-1-in-one-list", test_rank_3_in_two_lists_beats_rank_1_in_one_list),
        ("absent title stays absent from result", test_title_absent_from_all_lists_is_absent_from_result),
        ("empty rankings return empty dict", test_empty_rankings_returns_empty_dict),
        ("single list preserves relative order", test_single_list_preserves_relative_order),
        ("k parameter changes magnitude not ranking", test_k_parameter_changes_score_magnitude_not_ranking),
        ("broad agreement across retrievers can win", test_title_found_by_more_retrievers_scores_higher_even_at_worse_ranks),
    ]
    passed, failed = 0, 0
    for name, fn in checks:
        try:
            fn()
            print(f"  [PASS] {name}")
            passed += 1
        except AssertionError as e:
            print(f"  [FAIL] {name}: {e}")
            failed += 1
    print(f"\n{passed} passed, {failed} failed")
    raise SystemExit(1 if failed else 0)
