"""
Tests for agents/llm.py. Makes REAL calls to the Groq API — needs
GROQ_API_KEY set (agents/.env, gitignored, never committed).

Run:
    backend/.venv/bin/python agents/test_llm.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import agents.config  # noqa: F401 — loads agents/.env as a side effect
import agents.llm as llm_module
from agents.llm import MODELS, call_llm, strip_markdown


def test_strip_markdown_removes_headers_and_emphasis():
    raw = "# Heading\n\nThis is **bold** and *italic* and `code` and\n- a bullet\n- another"
    cleaned = strip_markdown(raw)
    assert "#" not in cleaned, f"header marker leaked: {cleaned!r}"
    assert "*" not in cleaned, f"asterisk leaked: {cleaned!r}"
    assert "`" not in cleaned, f"backtick leaked: {cleaned!r}"
    assert "bold" in cleaned and "italic" in cleaned and "code" in cleaned
    assert "a bullet" in cleaned


def test_strip_markdown_removes_closed_and_unclosed_think_tags():
    # Found live in agents/cache/: qwen/qwen3.6-27b sometimes puts its
    # chain-of-thought inline in `content` as <think>...</think>, and a
    # response truncated by max_tokens can leave the tag UNCLOSED with
    # everything after it being raw, often mid-sentence, reasoning text —
    # not a hypothetical, an actual cached response consisted entirely of
    # this with no real answer at all.
    closed = strip_markdown("<think>reasoning about the answer</think>The actual answer.")
    assert closed == "The actual answer."

    unclosed = strip_markdown("Some text <think>this reasoning trace never closes because")
    assert "<think>" not in unclosed and "reasoning trace" not in unclosed
    assert unclosed == "Some text"


def test_real_call_returns_clean_text():
    # gpt-oss models spend part of max_tokens on an internal reasoning
    # trace before any `content` — too small a budget here starves the
    # actual answer (verified live: max_tokens=20 produced empty content
    # with finish_reason="length"). 200 leaves enough room for both.
    out = call_llm("Reply with exactly the word: hello", temperature=0.0, max_tokens=200)
    assert isinstance(out, str) and len(out) > 0, f"got empty response: {out!r}"
    assert "#" not in out and "**" not in out


def test_real_call_with_markdown_prone_prompt_still_comes_out_clean():
    # Deliberately asks for a formatted list — the kind of prompt most
    # likely to make a model reach for headers/bullets/bold.
    out = call_llm(
        "List 3 fruits with a bold name and a one-line description each, "
        "as a markdown bulleted list with a heading.",
        temperature=0.3, max_tokens=200,
    )
    assert "#" not in out, f"header leaked through: {out!r}"
    assert "**" not in out, f"bold marker leaked through: {out!r}"


def test_fallback_chain_actually_falls_back():
    # Break the primary model's name so the real API rejects it, and
    # confirm call_llm silently recovers via the next model in the list —
    # proving the fallback logic works, not just that it's written.
    # Distinct prompt text from other tests in this file: agents/cache.py
    # (wired into call_llm after this test was first written) would
    # otherwise serve a cache hit for an identical prompt+temperature seen
    # earlier in this same run, which would make this test pass without
    # ever touching the fallback logic it exists to prove.
    original = llm_module.MODELS[:]
    llm_module.MODELS[:] = ["definitely-not-a-real-model-xyz"] + original[1:]
    try:
        out = call_llm("Reply with exactly the word: fallback-test-unique-prompt", temperature=0.0, max_tokens=200)
        assert isinstance(out, str) and len(out) > 0, f"got empty response: {out!r}"
    finally:
        llm_module.MODELS[:] = original


def test_all_models_failing_raises_with_clear_message():
    original = llm_module.MODELS[:]
    llm_module.MODELS[:] = ["nope-1", "nope-2"]
    try:
        try:
            call_llm("hi", temperature=0.0)
            assert False, "should have raised"
        except RuntimeError as e:
            assert "all 2 models failed" in str(e)
    finally:
        llm_module.MODELS[:] = original


if __name__ == "__main__":
    print(f"Configured fallback chain: {MODELS}\n")
    checks = [
        ("strip_markdown removes headers/emphasis/code", test_strip_markdown_removes_headers_and_emphasis),
        ("strip_markdown removes closed and unclosed think tags", test_strip_markdown_removes_closed_and_unclosed_think_tags),
        ("real call returns clean text", test_real_call_returns_clean_text),
        ("real call with markdown-prone prompt stays clean", test_real_call_with_markdown_prone_prompt_still_comes_out_clean),
        ("fallback chain actually falls back", test_fallback_chain_actually_falls_back),
        ("all models failing raises clearly", test_all_models_failing_raises_with_clear_message),
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
        except Exception as e:
            print(f"  [FAIL] {name}: unexpected {type(e).__name__}: {e}")
            failed += 1
    print(f"\n{passed} passed, {failed} failed")
    raise SystemExit(1 if failed else 0)
