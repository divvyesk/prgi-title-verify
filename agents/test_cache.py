"""
Tests for agents/cache.py. No network — pure filesystem read/write.

Run:
    backend/.venv/bin/python agents/test_cache.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agents import cache


def test_miss_then_hit_after_set():
    prompt = "test_miss_then_hit_after_set unique prompt"
    assert cache.get(prompt, 0.5) is None
    cache.set(prompt, 0.5, "the cached response")
    assert cache.get(prompt, 0.5) == "the cached response"


def test_different_temperature_is_a_different_cache_entry():
    prompt = "test_different_temperature unique prompt"
    cache.set(prompt, 0.2, "response at temp 0.2")
    cache.set(prompt, 0.9, "response at temp 0.9")
    assert cache.get(prompt, 0.2) == "response at temp 0.2"
    assert cache.get(prompt, 0.9) == "response at temp 0.9"


def test_corrupted_cache_file_treated_as_miss_not_crash():
    prompt = "test_corrupted_cache_file unique prompt"
    key = cache._cache_key(prompt, 0.5)
    cache.CACHE_DIR.mkdir(parents=True, exist_ok=True)
    (cache.CACHE_DIR / f"{key}.json").write_text("not valid json {{{", encoding="utf-8")
    assert cache.get(prompt, 0.5) is None


if __name__ == "__main__":
    checks = [
        ("miss then hit after set", test_miss_then_hit_after_set),
        ("different temperature is a different entry", test_different_temperature_is_a_different_cache_entry),
        ("corrupted cache file treated as miss, not crash", test_corrupted_cache_file_treated_as_miss_not_crash),
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
