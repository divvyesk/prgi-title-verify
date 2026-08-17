"""
ml/similarity/tokens.py — shared text pre-processing helpers.

Used by every one of Jai's similarity algorithms (lexical, phonetic,
core_word). Centralised here so there is exactly one copy of every
text-cleaning decision. Change the normalisation logic here and all
three scorers pick it up automatically.

STOPWORD LIST
  Read from ml/config/stopwords.txt — the single authoritative copy for
  the Python backend. Never duplicate or hardcode a list in any scorer.
  The frontend reads the same file (via the Vite build) so the two sides
  stay in sync automatically.

THREAD SAFETY
  load_stopwords() is decorated with @functools.lru_cache(maxsize=1) so
  the file is read exactly once per process. The returned frozenset is
  immutable, so concurrent requests cannot corrupt it.
"""

from __future__ import annotations

import functools
import re
import unicodedata
from pathlib import Path

# Relative to this file: ml/similarity/ → ml/ → repo root → ml/config/
_STOPWORDS_PATH = Path(__file__).parent.parent / "config" / "stopwords.txt"

# Pre-compiled regex for punctuation removal (everything that is not a
# letter, digit, or whitespace).  Compiled once at import time.
_PUNCT_RE = re.compile(r"[^\w\s]", re.UNICODE)
_SPACE_RE = re.compile(r"\s+")

# Vowel set used by consonant_skeleton.  Covers ASCII vowels only; Indic
# vowels are transliterated to Roman before this function is called.
_VOWELS = frozenset("aeiouAEIOU")


def normalize(text: str) -> str:
    """
    Return a canonical, comparable form of *text*:
      1. NFKC unicode normalisation (ﬁ → fi, ½ → 1/2, full-width → ASCII…)
      2. Lowercase
      3. Strip punctuation (everything that is not \\w or whitespace)
      4. Collapse runs of whitespace to a single space
      5. Strip leading/trailing whitespace

    This is the entry-point for every similarity computation. Apply it to
    both query and candidate before passing them to any scorer so that
    cosmetic differences (punctuation, case, diacritics, unicode variants)
    never affect the score.
    """
    if not text:
        return ""
    text = unicodedata.normalize("NFKC", text)
    text = text.lower()
    text = _PUNCT_RE.sub(" ", text)
    text = _SPACE_RE.sub(" ", text)
    return text.strip()


def tokens(text: str) -> list[str]:
    """
    Normalize *text* and split on whitespace.
    Returns an empty list for empty/whitespace-only input.
    """
    normed = normalize(text)
    if not normed:
        return []
    return normed.split()


@functools.lru_cache(maxsize=1)
def load_stopwords() -> frozenset[str]:
    """
    Read ml/config/stopwords.txt and return a frozenset of lowercase words.

    The file is expected to contain one word per line (blank lines and
    lines starting with '#' are ignored). The result is cached for the
    lifetime of the process — call load_stopwords.cache_clear() in tests
    that swap the file.

    Raises FileNotFoundError if the file is missing so the misconfiguration
    is caught at startup rather than silently skipping all stopword
    stripping (which would corrupt core-word scores).
    """
    path = _STOPWORDS_PATH
    if not path.exists():
        raise FileNotFoundError(
            f"Stopword list not found at {path}. "
            "Create ml/config/stopwords.txt or update _STOPWORDS_PATH."
        )
    words: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            words.append(line.lower())
    return frozenset(words)


def content_tokens(text: str) -> list[str]:
    """
    Return the tokens of *text* with stopwords removed.
    Used by CoreWordScorer to isolate the distinctive root of a title.

    Example:
        "The Daily Tribune" → ["tribune"]
        "Rajasthan Patrika"  → ["rajasthan"]   # "patrika" is a stopword
    """
    stops = load_stopwords()
    return [t for t in tokens(text) if t not in stops]


def consonant_skeleton(word: str) -> str:
    """
    Strip all vowels from *word* (after normalising) to produce a
    language-agnostic consonant skeleton.

    Used by the phonetic scorer as a fast first-pass heuristic: two titles
    with the same consonant skeleton are likely to sound the same even if
    one adds or drops a vowel (jAgran / jagran / jagaran → jgrn).

    Only ASCII vowels are stripped. Indic-script titles are expected to be
    transliterated to Roman before this function is called (the
    title_transliterated column in the DB holds the Roman form).

    Example:
        "jagran"   → "jgrn"
        "jagaran"  → "jgrn"
        "tribune"  → "trbn"
    """
    normed = normalize(word)
    return "".join(ch for ch in normed if ch not in _VOWELS and ch != " ")
