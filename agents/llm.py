"""
The one shared LLM call every node (interviewer, generator, ranker, and
ml/rag/explain.py) goes through. Two jobs:

1. Fall back across models when one fails. Groq model IDs verified live
   against client.models.list() on 2026-08-17, not guessed — a few names
   that would have been reasonable guesses (llama-3.3-70b-versatile,
   mixtral) are NOT actually available on this account, so checking first
   mattered.
2. Strip markdown formatting artifacts (#, *, _, backticks) out of every
   response before it's used anywhere else in the pipeline. These are
   titles, briefs and rationales displayed as plain text (or parsed as
   JSON) — not documents rendered through a markdown engine — so a model
   that decides to bold a title with **asterisks** or prefix a line with
   "## " produces literal garbage characters in the UI if not cleaned
   here, once, centrally, rather than ad hoc in every node.
"""

from __future__ import annotations

import logging
import re

from groq import Groq

from agents import cache

logger = logging.getLogger("agents.llm")

# Primary first, then fallbacks in order. openai/gpt-oss-120b is the
# explicit choice; the rest are what's actually active on this account,
# picked for text-generation suitability (excludes whisper-* (audio) and
# the prompt-guard/safeguard classifiers, which aren't general-purpose
# generation models).
MODELS = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.6-27b",
    "groq/compound",
]

_client: Groq | None = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq()  # reads GROQ_API_KEY from the environment itself
    return _client


_MD_HEADER = re.compile(r"^\s{0,3}#{1,6}\s+", re.MULTILINE)
_MD_BOLD_ITALIC = re.compile(r"(\*\*\*|\*\*|\*|___|__|_)(.+?)\1")
_MD_BULLET = re.compile(r"^\s*[-*+]\s+", re.MULTILINE)
_MD_CODE_FENCE = re.compile(r"```[a-zA-Z]*\n?|```")
_MD_INLINE_CODE = re.compile(r"`([^`]*)`")

# Some models (verified live: qwen/qwen3.6-27b) put their chain-of-thought
# inline in `content` itself as <think>...</think>, rather than in a
# separate `reasoning` field the way gpt-oss does (see call_llm's
# empty-content handling below — a different failure mode of the same
# underlying "budget spent on reasoning" problem). CLOSED first: a matched
# pair anywhere in the text. UNCLOSED second, for a response truncated
# mid-thought — verified live that this happens (max_tokens hit before the
# model ever got to close the tag or start the real answer), and without
# this second pattern the entire "response" would just be raw, often
# mid-sentence, reasoning text with no closing tag to anchor a match on.
_THINK_CLOSED = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)
_THINK_UNCLOSED = re.compile(r"<think>.*\Z", re.DOTALL | re.IGNORECASE)


def strip_markdown(text: str) -> str:
    """Removes markdown syntax and inline reasoning-trace tags, keeps the
    content. Order matters: think-tags first (their content is a paragraph
    of prose that could otherwise trip the header/bullet regexes), then
    bold/italic markers (so a bulleted, bolded line doesn't leave a stray
    leading `*` behind once the bullet regex also runs), then headers and
    bullets, then code fences/backticks."""
    text = _THINK_CLOSED.sub("", text)
    text = _THINK_UNCLOSED.sub("", text)
    text = _MD_BOLD_ITALIC.sub(r"\2", text)
    text = _MD_HEADER.sub("", text)
    text = _MD_BULLET.sub("", text)
    text = _MD_CODE_FENCE.sub("", text)
    text = _MD_INLINE_CODE.sub(r"\1", text)
    return text.strip()


def call_llm(prompt: str, temperature: float, max_tokens: int = 1024) -> str:
    """Tries each model in MODELS in order; returns the first one that
    responds with real content. Raises only if every single model fails —
    callers (nodes) are responsible for their OWN fallback behavior on top
    of that (e.g. the Generator falling back to agents/fallback.py's
    offline wordlist generator), this function's job is only "get a real
    response from SOME model," not "never fail.".

    Verified live against Groq: the gpt-oss models emit an internal
    `reasoning` trace in a separate field before `content`, spent out of
    the SAME max_tokens budget. At a low max_tokens this can consume the
    whole budget on reasoning and leave `content` empty with
    finish_reason="length" — that is a failure, not a valid empty answer,
    so it's treated as one here and falls through to the next model
    rather than returning "" silently.

    Checks agents/cache/ before calling any model at all, and writes a
    successful response there before returning — repeated demo runs of the
    same prompt+temperature become instant and free, and a mid-demo rate
    limit is survivable for anything already asked once this session (or
    committed ahead of time, see agents/cache/README.md)."""
    cached = cache.get(prompt, temperature)
    if cached is not None:
        logger.info("call_llm: cache hit")
        return cached

    last_error: Exception | None = None
    for model in MODELS:
        try:
            response = _get_client().chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=max_tokens,
            )
            text = strip_markdown(response.choices[0].message.content or "")
            if not text:
                raise ValueError(
                    f"empty content (finish_reason={response.choices[0].finish_reason!r}) — "
                    "likely max_tokens exhausted by the model's internal reasoning trace "
                    "before any output content; raise max_tokens if this recurs"
                )
            if model != MODELS[0]:
                logger.warning("call_llm: primary model(s) failed, served by fallback %s", model)
            cache.set(prompt, temperature, text)
            return text
        except Exception as exc:
            logger.warning("call_llm: model %s failed (%s), trying next", model, exc)
            last_error = exc
    raise RuntimeError(f"all {len(MODELS)} models failed, last error: {last_error}") from last_error
