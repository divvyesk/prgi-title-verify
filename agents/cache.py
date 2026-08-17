"""
Response cache for agents/llm.py: hash(prompt, temperature) -> response,
stored as JSON files in agents/cache/. Checked before every LLM call.

Two jobs: repeated demo runs become instant and free (no re-generation,
no token spend), and a mid-demo rate limit or network blip is survivable
for anything already asked once. agents/cache/ is gitignored in general —
teammates' local development caches shouldn't pollute the repo — but a
small, deliberately curated set for the canonical demo scenario IS
committed (see agents/cache/README.md), so a fresh clone can demo the
Agentic Studio fully offline.
"""

from __future__ import annotations

import hashlib
import json
import logging
from pathlib import Path

logger = logging.getLogger("agents.cache")

CACHE_DIR = Path(__file__).resolve().parent / "cache"
# Committed to git (unlike the rest of agents/cache/, which is session-
# local and gitignored) — the "small cached set for the canonical demo
# scenario" this module's docstring promises. get() checks here as a
# fallback so a fresh clone with zero session cache and zero network can
# still demo the Agentic Studio. set() never writes here — this directory
# is populated deliberately, not overwritten by every session's calls.
SEED_CACHE_DIR = CACHE_DIR / "seed"


def _cache_key(prompt: str, temperature: float) -> str:
    digest = hashlib.sha256(f"{temperature}:{prompt}".encode("utf-8")).hexdigest()
    return digest[:24]


def _read(path: Path) -> str | None:
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data["response"]
    except (json.JSONDecodeError, KeyError, OSError):
        logger.warning("cache: unreadable cache file %s, ignoring", path.name)
        return None


def get(prompt: str, temperature: float) -> str | None:
    key = _cache_key(prompt, temperature)
    hit = _read(CACHE_DIR / f"{key}.json")
    if hit is not None:
        return hit
    return _read(SEED_CACHE_DIR / f"{key}.json")


def set(prompt: str, temperature: float, response: str) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = CACHE_DIR / f"{_cache_key(prompt, temperature)}.json"
    try:
        path.write_text(
            json.dumps({"temperature": temperature, "prompt": prompt, "response": response}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except OSError:
        logger.warning("cache: failed to write %s — continuing without caching this response", path.name)
