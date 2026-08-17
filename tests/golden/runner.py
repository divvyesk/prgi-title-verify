"""
tests/golden/runner.py — Golden-test harness for all similarity scorers.

CONTRACT (from contracts/algo.py):
  Every scorer ships a tests/golden/<name>_cases.csv with columns:
    query, candidate, expected_min, expected_max, note

  This runner discovers every such CSV automatically, looks up the scorer
  by the filename prefix (e.g. "lexical_cases.csv" → "lexical"), imports
  SCORER from ml.similarity.<name>, and asserts that
    expected_min <= SCORER.score(query, candidate) <= expected_max

  On failure, the note column is printed so you immediately know which
  real-world case broke and why it matters.

HOW TO RUN
  # All scorers at once:
  pytest tests/golden/runner.py -v

  # One scorer only:
  pytest tests/golden/runner.py -v -k lexical

  # Stop on first failure:
  pytest tests/golden/runner.py -x

ADDING CASES
  Add a row to tests/golden/<name>_cases.csv. You do NOT need to touch
  this file. The runner auto-discovers new rows on the next test run.

ADDING A NEW SCORER
  1. Create ml/similarity/<name>.py with SCORER = <NameScorer>()
  2. Create tests/golden/<name>_cases.csv with the header row
  3. Add real cases. Done — the runner picks them up automatically.
"""

from __future__ import annotations

import csv
import importlib
import sys
from pathlib import Path
from typing import NamedTuple

import pytest

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

GOLDEN_DIR = Path(__file__).parent  # tests/golden/
# Add repo root to sys.path so `import ml.similarity.lexical` works when
# pytest is run from any directory.
REPO_ROOT = GOLDEN_DIR.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))


# ---------------------------------------------------------------------------
# Case discovery
# ---------------------------------------------------------------------------

class GoldenCase(NamedTuple):
    scorer_name: str
    query: str
    candidate: str
    expected_min: float
    expected_max: float
    note: str


def _discover_cases() -> list[GoldenCase]:
    """
    Walk tests/golden/ for *_cases.csv files and parse every data row.
    Returns an empty list (not an error) if no CSV files exist yet —
    the runner is not a failure until cases are added.
    """
    cases: list[GoldenCase] = []
    for csv_path in sorted(GOLDEN_DIR.glob("*_cases.csv")):
        scorer_name = csv_path.stem.replace("_cases", "")
        with csv_path.open(newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            # Validate header early so a typo gives a clear error.
            required = {"query", "candidate", "expected_min", "expected_max", "note"}
            if reader.fieldnames is None or not required.issubset(reader.fieldnames):
                raise ValueError(
                    f"{csv_path} must have columns: {required}. "
                    f"Got: {reader.fieldnames}"
                )
            for row in reader:
                cases.append(
                    GoldenCase(
                        scorer_name=scorer_name,
                        query=row["query"],
                        candidate=row["candidate"],
                        expected_min=float(row["expected_min"]),
                        expected_max=float(row["expected_max"]),
                        note=row["note"],
                    )
                )
    return cases


def _load_scorer(name: str):
    """
    Import SCORER from ml.similarity.<name>.
    Raises ImportError with a clear message if the module or SCORER is missing.
    """
    module_path = f"ml.similarity.{name}"
    try:
        module = importlib.import_module(module_path)
    except ModuleNotFoundError as exc:
        raise ImportError(
            f"Cannot find module '{module_path}'. "
            f"Create ml/similarity/{name}.py with a module-level SCORER constant."
        ) from exc
    if not hasattr(module, "SCORER"):
        raise ImportError(
            f"'{module_path}' has no module-level SCORER constant. "
            "Add: SCORER = <YourClass>()"
        )
    return module.SCORER


# ---------------------------------------------------------------------------
# Pytest parametrize
# ---------------------------------------------------------------------------

_ALL_CASES = _discover_cases()

# pytest.mark.parametrize requires at least one item, so we guard with an
# empty-skip marker rather than letting the collection fail.
if _ALL_CASES:
    @pytest.mark.parametrize(
        "case",
        _ALL_CASES,
        ids=[
            f"{c.scorer_name}::{c.query!r}_vs_{c.candidate!r}"
            for c in _ALL_CASES
        ],
    )
    def test_golden(case: GoldenCase) -> None:
        """Assert that SCORER.score(query, candidate) is within [min, max]."""
        scorer = _load_scorer(case.scorer_name)
        actual = scorer.score(case.query, case.candidate)

        assert isinstance(actual, float), (
            f"{case.scorer_name}.score() must return float, got {type(actual).__name__}"
        )
        assert 0.0 <= actual <= 100.0, (
            f"{case.scorer_name}.score() returned {actual} which is outside [0, 100]. "
            f"Case: {case.note!r}"
        )
        assert case.expected_min <= actual <= case.expected_max, (
            f"\n"
            f"  Scorer   : {case.scorer_name}\n"
            f"  Query    : {case.query!r}\n"
            f"  Candidate: {case.candidate!r}\n"
            f"  Expected : [{case.expected_min}, {case.expected_max}]\n"
            f"  Got      : {actual}\n"
            f"  Note     : {case.note}\n"
        )
else:
    def test_golden_placeholder() -> None:
        """Placeholder — no golden cases found yet. Add rows to *_cases.csv files."""
        pytest.skip("No golden cases found in tests/golden/. Add rows to the CSVs.")
