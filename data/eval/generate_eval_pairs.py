"""
data/eval/generate_eval_pairs.py
----------------------------------
Generates data/eval/eval_pairs.csv — the ground-truth evaluation set for
measuring shortlist recall@50 / recall@200 / recall@500.

Columns: query, expected_match_title_id, relation, note

Five sources, all derived from real Dataset 1 data:
  1. lexical   — real near-duplicates (RapidFuzz token_sort_ratio 80–98)
  2. benchmark — six hand-written scenarios from the product spec
  3. reorder   — programmatic word shuffles of real registered titles
  4. phonetic  — programmatic vowel substitutions on real registered titles
  5. semantic  — Hindi↔English meaning-equivalent pairs (uncertain ones flagged)

Run: python data/eval/generate_eval_pairs.py
"""

import csv
import random
import re
from pathlib import Path

from rapidfuzz import fuzz

REPO_ROOT = Path(__file__).parent.parent.parent
FEATURES = REPO_ROOT / "data" / "datasets" / "dataset1" / "data" / "processed" / "title_features.csv"
OUT_CSV  = REPO_ROOT / "data" / "eval" / "eval_pairs.csv"

random.seed(42)

# ─── load titles ─────────────────────────────────────────────────────────────
print("Loading titles...")
titles = []
by_id  = {}
with FEATURES.open(encoding="utf-8") as f:
    for row in csv.DictReader(f):
        if row["data_quality_status"] != "VALID":
            continue
        tid  = int(row["title_id"])
        norm = row["title_normalized"].strip()
        orig = (row.get("title_original") or row["Title"]).strip()
        lang = row["language_normalized"].strip()
        if len(norm) >= 3:
            titles.append({"id": tid, "norm": norm, "orig": orig, "lang": lang})
            by_id[tid] = {"norm": norm, "orig": orig}

print(f"Loaded {len(titles):,} valid titles.")

pairs = []  # (query, title_id, relation, note)

# ─── SOURCE 1: Lexical near-duplicates ───────────────────────────────────────
# Sort by title_normalized, walk neighbours, keep pairs with
# RapidFuzz token_sort_ratio between 80 and 98.
print("Mining lexical near-duplicates...")
sorted_titles = sorted(titles, key=lambda t: t["norm"])
seen_pairs = set()
lexical_found = 0

# Walk a sliding window of 60 around each title in sorted order
for i, t1 in enumerate(sorted_titles):
    if lexical_found >= 65:
        break
    window = sorted_titles[max(0, i-30): i] + sorted_titles[i+1: i+31]
    for t2 in window:
        if t1["id"] == t2["id"]:
            continue
        score = fuzz.token_sort_ratio(t1["norm"], t2["norm"])
        if 80 <= score <= 98:
            key = tuple(sorted([t1["id"], t2["id"]]))
            if key in seen_pairs:
                continue
            seen_pairs.add(key)
            # query = t2 (the "new proposed" variant), expected = t1 (the registered one)
            pairs.append((
                t2["orig"],
                t1["id"],
                "lexical",
                f"token_sort_ratio={score}; registered: '{t1['orig']}'"
            ))
            lexical_found += 1
            if lexical_found >= 65:
                break

print(f"  Found {lexical_found} lexical pairs.")

# ─── SOURCE 2: Benchmark scenarios from product spec ─────────────────────────
# IDs confirmed by reading title_features.csv directly.
print("Adding benchmark scenarios...")
benchmark = [
    ("Times India",
     47004,
     "benchmark",
     "Spec: word-order conflict; registered='NORTH INDIA TIMES'(id=47004)"),
    ("India Times",
     47004,
     "benchmark",
     "Spec: word-order conflict; registered='NORTH INDIA TIMES'(id=47004)"),
    ("Jaagran",
     82644,
     "benchmark",
     "Spec: phonetic conflict; registered='DAINIK JAGRAN'(id=82644)"),
    ("Jagran Daily",
     82644,
     "benchmark",
     "Spec: prefix conflict; registered='DAINIK JAGRAN'(id=82644)"),
    ("Dainik Samachar",
     46604,
     "benchmark",
     "Spec: cross-language conflict; registered='NISARGA SAARATHYA THE DAILY NEWS'(id=46604)"),
    ("The Vidarbha Daily Express",
     78464,
     "benchmark",
     "Spec: regional conflict; registered='VIDARBHA TIMES'(id=78464)"),
]
pairs.extend(benchmark)
print(f"  Added {len(benchmark)} benchmark pairs.")

# ─── SOURCE 3: Synthetic reorderings ─────────────────────────────────────────
# Take real multi-word titles, shuffle their words. Relation=reorder.
print("Generating reorder pairs...")
multi_word = [t for t in titles if len(t["norm"].split()) >= 3]
sample_mw  = random.sample(multi_word, min(60, len(multi_word)))
reorder_added = 0

for t in sample_mw:
    if reorder_added >= 30:
        break
    words = t["norm"].split()
    shuffled = words[:]
    random.shuffle(shuffled)
    if shuffled == words:  # skip if shuffle produced same order
        continue
    query = " ".join(w.capitalize() for w in shuffled)
    pairs.append((
        query,
        t["id"],
        "reorder",
        f"words shuffled from registered '{t['orig']}' (id={t['id']})"
    ))
    reorder_added += 1

print(f"  Generated {reorder_added} reorder pairs.")

# ─── SOURCE 4: Synthetic phonetic variants ────────────────────────────────────
# Apply vowel substitutions: a→aa, i→ee, u→oo (one substitution per title).
# Keep the substitution rule in note so the set is reproducible.
SUBSTITUTIONS = [
    (r'\ba\b',  'aa',  'a→aa'),
    (r'(?<!\w)i(?!\w)', 'ee', 'i→ee'),
    (r'(?<!\w)u(?!\w)', 'oo', 'u→oo'),
    (r'ar\b',   'aar', 'ar→aar'),
    (r'an\b',   'aan', 'an→aan'),
]
print("Generating phonetic variants...")
single_word = [t for t in titles if 5 <= len(t["norm"]) <= 20]
sample_sw   = random.sample(single_word, min(120, len(single_word)))
phonetic_added = 0

for t in sample_sw:
    if phonetic_added >= 30:
        break
    for pattern, replacement, label in SUBSTITUTIONS:
        new_norm = re.sub(pattern, replacement, t["norm"], count=1)
        if new_norm != t["norm"]:
            query = new_norm.title()
            pairs.append((
                query,
                t["id"],
                "phonetic",
                f"substitution={label}; registered='{t['orig']}' (id={t['id']})"
            ))
            phonetic_added += 1
            break  # one substitution per title is enough

print(f"  Generated {phonetic_added} phonetic pairs.")

# ─── SOURCE 5: Cross-language semantic pairs (Hindi↔English) ─────────────────
# Manually curated. Uncertain pairs are flagged with UNCERTAIN in note.
# These need a human to verify — do NOT add more without checking.
print("Adding semantic cross-language pairs...")
semantic = [
    ("Samachar",        46604, "semantic",
     "UNCERTAIN: 'samachar'=news(Hindi); registered='NISARGA SAARATHYA THE DAILY NEWS'"),
    ("Naya Zamana",     47004, "semantic",
     "UNCERTAIN: 'naya zamana'≈new era(Hindi); checking against NORTH INDIA TIMES"),
    ("Rashtriya Khabar", 82644, "semantic",
     "UNCERTAIN: 'rashtriya khabar'=national news(Hindi); checking against DAINIK JAGRAN"),
    ("Jan Sandesh",     60704, "semantic",
     "UNCERTAIN: 'jan sandesh'=people's message; checking against SAMPURNA JAGRAN(id=60704)"),
    ("Lok Awaz",        78411, "semantic",
     "UNCERTAIN: 'lok awaz'=people's voice; checking against VIDARBHA KI AWAZ(id=78411)"),
    ("Desh Samachar",   46604, "semantic",
     "UNCERTAIN: 'desh samachar'=national news; checking NISARGA SAARATHYA THE DAILY NEWS"),
    ("Saptahik Khabar",  62023, "semantic",
     "'saptahik'=weekly(Hindi); registered='Saptahik Siddhi Jagran'(id=62023)"),
    ("Bal Jagran",       82644, "semantic",
     "UNCERTAIN: 'bal jagran'=children's awakening; checking DAINIK JAGRAN"),
    ("Gramin Awaaz",     78411, "semantic",
     "UNCERTAIN: 'gramin awaaz'=rural voice; checking VIDARBHA KI AWAZ(id=78411)"),
    ("Prajatantra",      50905, "semantic",
     "'prajatantra'=democracy(Hindi/Sanskrit); checking PRADESH JAGRAN(id=50905)"),
    ("Nayi Subah",       47004, "semantic",
     "UNCERTAIN: 'nayi subah'=new morning; checking NORTH INDIA TIMES"),
    ("Rashtra Deepika",  82644, "semantic",
     "UNCERTAIN: 'rashtra deepika'=national lamp; checking DAINIK JAGRAN"),
    ("Janmat",           78405, "semantic",
     "'janmat'=public opinion; registered='VIDARBHA JANMAT'(id=78405)"),
    ("Swadesh Samachar", 82644, "semantic",
     "UNCERTAIN: 'swadesh samachar'=homeland news; checking DAINIK JAGRAN"),
    ("Vikas Ki Baat",    78413, "semantic",
     "UNCERTAIN: 'vikas ki baat'=talk of progress; checking VIDARBHA KI BAAT(id=78413)"),
    ("Rashtriya Patrika", 82644, "semantic",
     "UNCERTAIN: 'rashtriya patrika'=national journal; checking DAINIK JAGRAN"),
    ("Nagrik Suraksha",  78390, "semantic",
     "UNCERTAIN: 'nagrik suraksha'=citizen safety; checking VIDARBHA BULLETIN(id=78390)"),
    ("Pradesh Ki Baat",  82644, "semantic",
     "UNCERTAIN: 'pradesh ki baat'=state talk; checking DAINIK JAGRAN"),
    ("Kisan Jagran",     82644, "semantic",
     "'kisan jagran'=farmer awakening; checking DAINIK JAGRAN(id=82644)"),
    ("Nagrik Awaaz",     78411, "semantic",
     "UNCERTAIN: 'nagrik awaaz'=citizen voice; checking VIDARBHA KI AWAZ(id=78411)"),
]
pairs.extend(semantic)
print(f"  Added {len(semantic)} semantic pairs ({sum(1 for p in semantic if 'UNCERTAIN' in p[3])} flagged UNCERTAIN).")

# ─── Write CSV ────────────────────────────────────────────────────────────────
random.shuffle(pairs)
OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
with OUT_CSV.open("w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["query", "expected_match_title_id", "relation", "note"])
    writer.writerows(pairs)

print(f"\n✅ Written {len(pairs)} pairs to {OUT_CSV}")
by_rel = {}
for _, _, rel, _ in pairs:
    by_rel[rel] = by_rel.get(rel, 0) + 1
for rel, count in sorted(by_rel.items()):
    print(f"   {rel:<12} {count:>3} rows")
