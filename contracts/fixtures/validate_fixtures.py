"""
Validates every fixture in contracts/fixtures/ against the matching
Pydantic model in contracts/contracts.py. A fixture that does not match the
contract is worse than no fixture at all — everyone else on the team builds
against these files believing they are contract-valid.

Usage:
    python3 contracts/fixtures/validate_fixtures.py
Exit code is non-zero if any fixture fails, so this can be wired into CI
later without changes.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from contracts import (  # noqa: E402
    Candidate,
    GeneratedCandidate,
    OfficerCase,
    VerificationResult,
)

FIXTURES_DIR = Path(__file__).resolve().parent

# filename -> (pydantic model, "single object" | "list of objects")
CHECKS = {
    "verify_approved.json": (VerificationResult, "single"),
    "verify_review.json": (VerificationResult, "single"),
    "verify_rejected.json": (VerificationResult, "single"),
    "candidates_200.json": (Candidate, "list"),
    "officer_cases.json": (OfficerCase, "list"),
    "alternatives.json": (GeneratedCandidate, "list"),
}

# Not part of the API contract layer (it's Pruthviraj's internal rule-corpus
# data format, not something served over the wire) — checked only for valid,
# non-empty JSON if and when it exists, not against a Pydantic model.
NO_MODEL_CHECKS = {"rules_seed.json"}


def check_modeled(name: str, model, shape: str) -> tuple[bool, str]:
    path = FIXTURES_DIR / name
    if not path.exists():
        return False, "file does not exist"
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        return False, f"invalid JSON: {e}"

    try:
        if shape == "single":
            model(**data)
            count = 1
        else:
            if not isinstance(data, list):
                return False, f"expected a JSON array, got {type(data).__name__}"
            for item in data:
                model(**item)
            count = len(data)
    except Exception as e:
        return False, f"{type(e).__name__}: {e}"

    return True, f"{count} object(s) validated against {model.__name__}"


def check_unmodeled(name: str) -> tuple[bool, str]:
    path = FIXTURES_DIR / name
    if not path.exists():
        return True, "not present yet (owned by Pruthviraj) — skipped"
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        return False, f"invalid JSON: {e}"
    if not isinstance(data, list) or len(data) == 0:
        return False, "expected a non-empty JSON array"
    return True, f"{len(data)} object(s), valid JSON (no contract model — not our shape)"


def main() -> int:
    all_ok = True
    print("Validating contracts/fixtures/ ...\n")

    for name, (model, shape) in CHECKS.items():
        ok, detail = check_modeled(name, model, shape)
        print(f"  [{'PASS' if ok else 'FAIL'}] {name:<24} {detail}")
        all_ok = all_ok and ok

    for name in NO_MODEL_CHECKS:
        ok, detail = check_unmodeled(name)
        print(f"  [{'PASS' if ok else 'FAIL'}] {name:<24} {detail}")
        all_ok = all_ok and ok

    print()
    print("ALL FIXTURES VALID" if all_ok else "ONE OR MORE FIXTURES INVALID — fix before anyone builds against them")
    return 0 if all_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
