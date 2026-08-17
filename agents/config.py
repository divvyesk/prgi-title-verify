"""
Runtime settings for the Agentic Title Studio, read once from the
environment / .env. Never read os.environ directly anywhere else in
agents/ — import `settings` from here instead.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

AGENTS_DIR = Path(__file__).resolve().parent


def _load_dotenv(path: Path) -> None:
    """Tiny, dependency-free .env loader — avoids pulling in python-dotenv
    just for four lines. Existing environment variables always win, so
    `AGENTS_USE_FIXTURES=1 python foo.py` still overrides whatever is in
    the file."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())


_load_dotenv(AGENTS_DIR / ".env")


@dataclass(frozen=True)
class Settings:
    # Which LLM to call. Provider-agnostic on purpose — Prompt 1 scaffolds
    # the interface before Prompt 3 picks (and pins) a real vendor/model.
    # LLM_API_KEY is read straight from the environment wherever the actual
    # SDK client gets constructed (agents/nodes/*.py) — never stored here,
    # so it never accidentally ends up in a log line or a cached response.
    model_name: str = os.environ.get("AGENTS_MODEL_NAME", "PLACEHOLDER-pick-in-prompt-3")

    # Per-node temperatures (contracts/algo.py-style constants, not magic
    # numbers scattered through node files). Low for steps that must be
    # consistent (interviewer, ranker); high for the one step that should
    # actually be creative (generator).
    interviewer_temperature: float = 0.2
    generator_temperature: float = 0.85
    ranker_temperature: float = 0.2
    explain_temperature: float = 0.1  # ml/rag/explain.py, Prompt 5

    # Retry loop bounds (agents/graph.py's enough_survived condition).
    target_survivors: int = 5
    max_attempts: int = 3

    # HttpVerifyClient vs FixtureVerifyClient — see agents/clients.py.
    # Defaults to fixtures so `agents/` stays independently testable
    # without the real backend running; Prompt 6 flips the real default.
    use_fixtures: bool = os.environ.get("AGENTS_USE_FIXTURES", "1") == "1"
    backend_base_url: str = os.environ.get("BACKEND_BASE_URL", "http://localhost:8000")


settings = Settings()
