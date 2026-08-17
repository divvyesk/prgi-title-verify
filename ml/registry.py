"""
The central registry the orchestrator (backend/app/services/pipeline.py)
reads. Nothing outside this file should import a scorer or retriever module
directly — always go through SCORERS / RETRIEVERS, so the pipeline never
needs to know or care which algorithms happen to be finished yet.

Every module below is imported inside its own try/except. This is
deliberate, not defensive-programming paranoia: six people are writing
files in this repo at once, and a teammate's half-finished or currently-
broken module must never be able to crash the whole server at import time.
An empty placeholder file (0 bytes, valid but has no SCORER attribute) and
a module that doesn't exist yet both fail exactly the same safe way here —
this file logs which ones loaded and moves on. As each real algorithm
lands, it is picked up automatically the next time the process starts; no
change to this file is needed.
"""

from __future__ import annotations

import importlib
import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from contracts.algo import CandidateRetriever, SimilarityScorer

logger = logging.getLogger("ml.registry")

# (registry key, module path, attribute name on that module)
_SCORER_MODULES = [
    ("lexical", "ml.similarity.lexical", "SCORER"),
    ("phonetic", "ml.similarity.phonetic", "SCORER"),
    ("semantic", "ml.similarity.semantic", "SCORER"),
    ("core_word", "ml.similarity.core_word", "SCORER"),
]

_RETRIEVER_MODULES = [
    ("trigram", "search.retrievers.trigram", "RETRIEVER"),
    ("bm25", "search.retrievers.bm25", "RETRIEVER"),
    ("phonetic", "search.retrievers.phonetic", "RETRIEVER"),
    ("vector", "search.retrievers.vector", "RETRIEVER"),
]


def _load_all(modules: list[tuple[str, str, str]], kind: str) -> dict:
    loaded = {}
    for key, module_path, attr in modules:
        try:
            module = importlib.import_module(module_path)
            instance = getattr(module, attr)
            loaded[key] = instance
            logger.info("%s '%s' loaded from %s", kind, key, module_path)
        except Exception as exc:
            logger.warning("%s '%s' not available (%s): %s", kind, key, module_path, exc)
    return loaded


SCORERS: dict[str, "SimilarityScorer"] = _load_all(_SCORER_MODULES, "scorer")
RETRIEVERS: dict[str, "CandidateRetriever"] = _load_all(_RETRIEVER_MODULES, "retriever")

logger.info(
    "registry ready: %d/%d scorers, %d/%d retrievers",
    len(SCORERS), len(_SCORER_MODULES), len(RETRIEVERS), len(_RETRIEVER_MODULES),
)
