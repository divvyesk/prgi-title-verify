"""
One database access point for every retriever under search/retrievers/.

Why this exists (integration, not architecture astronomy): the retrievers get
imported from two completely different places, and before this file they only
worked in one of them.

  1. Inside the running FastAPI server, where backend/ is on sys.path, the
     psycopg3 pool from app/db.py is already open, and opening a second
     connection per query would waste the pool entirely.
  2. Standalone — ml/registry.py imported from the repo root, backfill
     scripts, tests, `python -c` checks. Here `app` is not importable at all
     and there is no pool, so anything doing `from app.db import get_pool` at
     module import time fails to load outright.

search/retrievers/vector.py hit case 2 (ModuleNotFoundError: No module named
'app', so the retriever silently never registered), while bm25.py and
phonetic.py sidestepped the problem by opening their own psycopg2 connections
to a hardcoded personal database — wrong driver (the project standardised on
psycopg3 via psycopg[binary,pool]) and wrong database. Both now go through
here instead.

connection() yields a psycopg3 connection either way: pooled when a pool is
available, standalone otherwise. Callers do not need to know which they got.
"""

from __future__ import annotations

import contextlib
import logging
import os
from pathlib import Path

logger = logging.getLogger("search.db")

_DEFAULT_URL = "postgresql://prgi:prgi@localhost:5432/prgi_titleguard"


def database_url() -> str:
    """
    Resolve the connection string the same way the backend does, so a
    standalone script never talks to a different database than the server.

    Order: DATABASE_URL env var, then backend/.env (the file the team
    actually edits), then the project default.
    """
    env_url = os.getenv("DATABASE_URL")
    if env_url:
        return env_url

    # backend/.env is the one the team edits; parse it directly rather than
    # importing app.config, which is not importable outside the server.
    env_file = Path(__file__).resolve().parent.parent / "backend" / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line.startswith("DATABASE_URL="):
                return line.split("=", 1)[1].strip()

    return _DEFAULT_URL


def _try_pool():
    """Return the backend's open pool, or None when running standalone."""
    try:
        from app.db import get_pool  # only importable inside the server
    except Exception:
        return None
    try:
        return get_pool()
    except Exception:
        # app.db imported but the pool is not open (STUB_MODE, or called
        # before startup) — fall back to a standalone connection.
        return None


@contextlib.contextmanager
def connection():
    """
    Yield a psycopg3 connection. Uses the server's shared pool when one is
    open, otherwise opens (and closes) a standalone connection.
    """
    pool = _try_pool()
    if pool is not None:
        with pool.connection() as conn:
            yield conn
        return

    import psycopg

    conn = psycopg.connect(database_url())
    try:
        yield conn
    finally:
        conn.close()
