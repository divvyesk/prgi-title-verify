"""
data/eval/eval_recall.py
------------------------
Measures recall@50, recall@200, recall@500 for the shortlisting stage,
broken down by relation type.

For each row in eval_pairs.csv:
  1. Run the shortlisting pipeline on `query`
  2. Check whether `expected_match_title_id` appears in top K candidates
  3. Record hit/miss per K per relation type

Writes results to data/eval/RESULTS.md.

Prerequisites:
  - PostgreSQL running with titles loaded (run data/datasets/dataset1/scripts/load_data.py)
  - backend/.env with DATABASE_URL set
  - STUB_MODE=0 in env (or override below)

Run:
  cd <repo-root>
  python data/eval/eval_recall.py
"""

from __future__ import annotations

import asyncio
import csv
import os
import subprocess
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

# ─── paths ───────────────────────────────────────────────────────────────────
REPO_ROOT  = Path(__file__).parent.parent.parent
EVAL_CSV   = REPO_ROOT / "data" / "eval" / "eval_pairs.csv"
RESULTS_MD = REPO_ROOT / "data" / "eval" / "RESULTS.md"

# Add repo root to PYTHONPATH so backend imports resolve
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(REPO_ROOT / "backend"))

# Load .env before importing backend modules
def _load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    with path.open() as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())

_load_dotenv(REPO_ROOT / "backend" / ".env")

# Override STUB_MODE so we hit the real retrieval, not fixture data
os.environ["STUB_MODE"] = "0"

from app.services.pipeline import _real_shortlist  # noqa: E402
from app.db import open_pool, close_pool

KS = [50, 200, 500]

async def _run_shortlist(query: str, limit: int = 500):
    """Run real shortlisting; return list of (title_id, score)."""
    try:
        candidates = await _real_shortlist(query, limit=limit)
        return [(c.title_id, c.raw_score if hasattr(c, 'raw_score') else 0.0) for c in candidates]
    except Exception as exc:
        print(f"  ⚠️  shortlist error for '{query}': {exc}", flush=True)
        return []

def get_git_sha() -> str:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=REPO_ROOT, text=True
        ).strip()
    except Exception:
        return "unknown"

async def _async_run_eval():
    open_pool()
    try:
        print(f"Loading eval pairs from {EVAL_CSV}...")
        rows = []
        with EVAL_CSV.open(encoding="utf-8") as f:
            for row in csv.DictReader(f):
                rows.append(row)
        print(f"  {len(rows)} rows loaded.")

        # Stats: per-relation, per-K
        # hits[relation][K] = count of hits
        # total[relation]   = total rows of this relation
        hits  = defaultdict(lambda: defaultdict(int))
        total = defaultdict(int)
        errors = 0

        for i, row in enumerate(rows):
            query    = row["query"]
            expected = int(row["expected_match_title_id"])
            relation = row["relation"]

            print(f"[{i+1:>3}/{len(rows)}] {relation:<12} query='{query}' expected_id={expected}", end=" ", flush=True)

            candidates = await _run_shortlist(query, limit=max(KS))

            if not candidates:
                errors += 1
                print("→ NO RESULTS")
                total[relation] += 1
                continue

            candidate_ids = [cid for cid, _ in candidates]
            total[relation] += 1

            found_at = None
            for k in KS:
                if expected in candidate_ids[:k]:
                    hits[relation][k] += 1
                    if found_at is None:
                        found_at = k

            if found_at:
                print(f"→ HIT @{found_at}")
            else:
                rank = next((r+1 for r, cid in enumerate(candidate_ids) if cid == expected), None)
                print(f"→ MISS (rank={rank or '>'+str(max(KS))})")
    finally:
        close_pool()

    # ─── Build results table ──────────────────────────────────────────────────
    relations = sorted(total.keys())
    all_rows_total = sum(total.values())

    lines = []
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    sha = get_git_sha()

    lines.append(f"# Eval Results\n")
    lines.append(f"- **Date:** {now}")
    lines.append(f"- **Git commit:** `{sha}`")
    lines.append(f"- **Eval set:** `data/eval/eval_pairs.csv` ({all_rows_total} rows)")
    lines.append(f"- **Errors / no-result rows:** {errors}")
    lines.append(f"- **STUB_MODE:** 0 (real retrieval)\n")

    lines.append("## Recall by relation type\n")
    header = f"| Relation     | N  | Recall@50 | Recall@200 | Recall@500 |"
    lines.append(header)
    lines.append("|---|---|---|---|---|")

    overall_hits  = defaultdict(int)
    overall_total = 0

    for rel in relations:
        n = total[rel]
        overall_total += n
        row_parts = [f"| {rel:<12} | {n:>2} |"]
        for k in KS:
            h = hits[rel][k]
            overall_hits[k] += h
            pct = h / n * 100 if n else 0
            row_parts.append(f" {pct:>5.1f}% ({h}/{n}) |")
        lines.append("".join(row_parts))

    # Overall row
    row_parts = [f"| **Overall**  | {overall_total:>2} |"]
    for k in KS:
        h = overall_hits[k]
        pct = h / overall_total * 100 if overall_total else 0
        row_parts.append(f" **{pct:.1f}%** ({h}/{overall_total}) |")
    lines.append("".join(row_parts))

    lines.append("\n## Notes\n")
    lines.append("- `lexical`: Real near-duplicate pairs from Dataset 1 (RapidFuzz token_sort_ratio 80–98).")
    lines.append("- `benchmark`: Six hand-written scenarios from the product spec.")
    lines.append("- `reorder`: Word-shuffled variants of real registered titles.")
    lines.append("- `phonetic`: Vowel-substituted variants (a→aa, i→ee, u→oo). Substitution rule in eval_pairs.csv note column.")
    lines.append("- `semantic`: Hindi↔English cross-language pairs. 16/20 flagged UNCERTAIN — human review needed.")
    lines.append("- Any recall below 80% on lexical/benchmark/reorder indicates the retrieval index needs tuning.")
    lines.append("- Semantic recall is expected to be lower (cross-language is harder); below 50% warrants a model upgrade.")

    md = "\n".join(lines) + "\n"
    RESULTS_MD.write_text(md, encoding="utf-8")
    print(f"\n✅ Results written to {RESULTS_MD}")
    print(md)

def run_eval() -> None:
    asyncio.run(_async_run_eval())

if __name__ == "__main__":
    run_eval()
