"""
Composite scoring and verdict resolver.
Blends the four similarity dimensions (lexical, phonetic, semantic, core_word)
into a single final score, and evaluates deterministic rules to reach a verdict.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Literal

import yaml

from contracts.contracts import RuleViolation, SimilarityScores

logger = logging.getLogger(__name__)

# Module-level cache for the configuration.
_CFG_CACHE: dict | None = None


def _get_cfg() -> dict:
    global _CFG_CACHE
    if _CFG_CACHE is None:
        cfg_path = Path(__file__).parent / "config" / "weights.yaml"
        try:
            with open(cfg_path, "r", encoding="utf-8") as f:
                _CFG_CACHE = yaml.safe_load(f)
        except Exception as exc:
            logger.error("Failed to load weights.yaml: %s", exc)
            raise
    return _CFG_CACHE


def composite(scores: SimilarityScores, cfg: dict | None = None) -> float:
    """
    Blends four dimensions into one verdict number.

    The override exists because one perfect clash on a single dimension is
    disqualifying on its own: a title that sounds exactly like a registered one is
    a conflict even if it is spelled completely differently and means something
    else.
    """
    if cfg is None:
        cfg = _get_cfg()

    w = cfg["weights"]

    blended = (
        w["lexical"] * scores.lexical_score
        + w["phonetic"] * scores.phonetic_score
        + w["semantic"] * scores.semantic_score
        + w["core_word"] * scores.core_word_score
    )

    peak = max(
        scores.lexical_score,
        scores.phonetic_score,
        scores.semantic_score,
        scores.core_word_score,
    )

    if peak >= cfg.get("max_signal_override", 90):
        blended = max(blended, 85.0)

    return round(blended, 2)


def verdict(
    composite_score: float, rule_violations: list[RuleViolation], cfg: dict | None = None
) -> Literal["REJECTED", "MANUAL_REVIEW", "APPROVED"]:
    """
    Determines the final PRGI verdict based on deterministic rules and the composite score.
    """
    if cfg is None:
        cfg = _get_cfg()

    # Any CRITICAL rule violation forces REJECTED regardless of score
    if any(rv.severity == "CRITICAL" and not rv.passed for rv in rule_violations):
        return "REJECTED"

    # Score-based rejection
    if composite_score >= cfg["thresholds"]["reject"]:
        return "REJECTED"

    # Any WARNING violation forces at least MANUAL_REVIEW
    if any(rv.severity == "WARNING" and not rv.passed for rv in rule_violations):
        return "MANUAL_REVIEW"

    # Score-based manual review
    if composite_score >= cfg["thresholds"]["review"]:
        return "MANUAL_REVIEW"

    return "APPROVED"
