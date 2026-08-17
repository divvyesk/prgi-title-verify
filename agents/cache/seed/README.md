# Seed cache

Committed to git (everything else in `agents/cache/` is gitignored —
session-local, not shared). `agents/cache.py`'s `get()` checks the regular
cache first, then falls back to this folder — so a fresh clone with zero
session cache and zero network can still demo the Agentic Studio fully
offline.

## What's here

Real, live-captured responses (not hand-written) for the canonical demo
scenario — a Marathi regional daily for Maharashtra — the same scenario
Prompt 6 runs against the live backend and Prompt 8's backup demo uses for
the Agentic Studio walkthrough:

```json
{"genre": "Regional daily", "state": "Maharashtra", "language": "Marathi", "tone": "formal", "audience": "general public"}
```

4 files: 1 interviewer brief, 2 generator batches (this run naturally
triggered one retry — attempt 0 produced too few survivors, attempt 1's
rejection-aware retry produced enough), and 1 ranker response, captured by
running ONLY this scenario through `agents/graph.py` in isolation against
the real Groq API and letting `agents/cache.py` write them. (The verifier
makes no LLM call, so it has nothing to cache here — see
`agents/nodes/verifier.py`.)

Deliberately run in isolation, not via the full `agents/test_graph.py`
suite: that suite's termination test also exercises the real interviewer/
generator with a nonsense "Test" state, and the model's creative
interpretation of a fake state polluted an earlier version of this seed set
with unrelated content. Regenerate the same way if you touch this again.

Every response here was scanned for markdown/think-tag leakage
(`agents/llm.py`'s `strip_markdown()`) before being committed — none found.

## Regenerating this set

If the Interviewer/Generator/Ranker prompts change, these go stale (the
cache key is a hash of the exact prompt text + temperature, so a changed
prompt just won't match anymore — stale entries are harmless dead weight,
not a correctness risk, but worth cleaning up):

```bash
rm -f agents/cache/seed/*.json    # NOT rm -rf agents/cache — that deletes this README too
backend/.venv/bin/python -c "
import sys; sys.path.insert(0, '.')
from agents.graph import build_graph
g = build_graph()
g.invoke({
    'details': {'genre': 'Regional daily', 'state': 'Maharashtra', 'language': 'Marathi', 'tone': 'formal', 'audience': 'general public'},
    'brief': '', 'candidates': [], 'verified': [], 'rejected': [], 'attempt': 0,
})
"
mv agents/cache/*.json agents/cache/seed/
```

Then scan for leakage before committing:

```bash
python3 -c "
import json, glob
for f in glob.glob('agents/cache/seed/*.json'):
    r = json.load(open(f))['response']
    if '<think>' in r or '#' in r or '**' in r:
        print('SUSPECT:', f)
"
```
