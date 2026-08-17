"""
Offline fallback for the Generator — a deterministic-per-attempt title
generator needing no API at all, built NOW rather than on Day 3.
Hackathon venue wifi fails; an untested fallback is not a fallback, so this
has its own test proving it produces 18 unique, non-empty candidates with
zero network access (agents/test_fallback.py).

Combines one word from each of three curated lists (agents/wordlists/) —
region, distinctive, category — across a few different word orders, so
output doesn't all look the same shape. Runs automatically from
agents/nodes/generator.py whenever the real LLM call raises, times out, or
returns nothing usable.
"""

from __future__ import annotations

import random
import zlib
from pathlib import Path

WORDLISTS_DIR = Path(__file__).resolve().parent / "wordlists"

_TEMPLATES = [
    "{region} {distinctive} {category}",
    "{distinctive} {category}",
    "{region} {category}",
    "{distinctive} {region} {category}",
    "{category} {region}",
]

_cache: dict[str, list[str]] = {}


def _load_wordlist(filename: str) -> list[str]:
    if filename not in _cache:
        path = WORDLISTS_DIR / filename
        _cache[filename] = [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    return _cache[filename]


def generate_offline_candidates(details: dict, attempt: int = 0, n: int = 18) -> list[str]:
    """Deterministic per (details, attempt) — a retry gets a DIFFERENT seed
    (attempt is part of it) so a rejected offline batch doesn't just
    reproduce itself, but re-running the exact same request+attempt twice
    reproduces the same output, same as the online path's fixture-backed
    determinism story."""
    regions = _load_wordlist("region_words.txt")
    distinctives = _load_wordlist("distinctive_words.txt")
    categories = _load_wordlist("category_words.txt")

    seed_source = f"{details.get('genre','')}:{details.get('state','')}:{details.get('language','')}:{attempt}"
    rnd = random.Random(zlib.crc32(seed_source.encode("utf-8")))

    candidates: list[str] = []
    seen: set[str] = set()
    attempts_left = n * 20  # generous cap — combinatorics make collisions rare, this just guards against a pathologically tiny wordlist
    while len(candidates) < n and attempts_left > 0:
        attempts_left -= 1
        template = rnd.choice(_TEMPLATES)
        title = template.format(
            region=rnd.choice(regions),
            distinctive=rnd.choice(distinctives),
            category=rnd.choice(categories),
        )
        if title not in seen:
            seen.add(title)
            candidates.append(title)
    return candidates
