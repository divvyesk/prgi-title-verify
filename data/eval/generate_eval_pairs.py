"""
data/eval/generate_eval_pairs.py
----------------------------------
Generates data/eval/eval_pairs.csv from the real Dataset 1 titles.

STRATEGY — three types of pairs, all grounded in real data:

1. POSITIVE (is_match=1): Near-duplicate pairs mined from the real title list.
   We find titles that are phonetically/lexically very close to each other —
   these are *real conflicts* that a PRGI officer would have to review.
   Method: Compare every title against every other within a small Levenshtein
   distance (≤2 edits on the normalized title), after stripping common fillers.

2. HARD NEGATIVES (is_match=0): Titles that share one word but are not
   conflicts — e.g. "Delhi News" vs "Delhi Sports". These test whether the
   scorer correctly ignores surface-level word overlap.

3. EASY NEGATIVES (is_match=0): Random title pairs from different languages
   and scripts. These make the eval set robust.

OUTPUT FORMAT (as expected by the tuning pipeline):
   query_title, candidate_title, is_match

All titles used are taken verbatim from title_features.csv.
"""

import csv
import random
from pathlib import Path

# ─── paths ───────────────────────────────────────────────────────────────────
REPO_ROOT = Path(__file__).parent.parent.parent
FEATURES_CSV = REPO_ROOT / "data" / "datasets" / "dataset1" / "data" / "processed" / "title_features.csv"
OUT_CSV = REPO_ROOT / "data" / "eval" / "eval_pairs.csv"

random.seed(42)  # reproducible

# ─── helper: simple levenshtein distance ─────────────────────────────────────
def levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    if len(a) < len(b):
        a, b = b, a
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a):
        curr = [i + 1]
        for j, cb in enumerate(b):
            curr.append(min(prev[j + 1] + 1, curr[j] + 1, prev[j] + (ca != cb)))
        prev = curr
    return prev[-1]

# ─── load titles ─────────────────────────────────────────────────────────────
print(f"Loading titles from {FEATURES_CSV}...")
titles = []
with FEATURES_CSV.open(encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        norm = row.get("title_normalized", "").strip()
        orig = row.get("title_original", row.get("Title", "")).strip()
        lang = row.get("language_normalized", "").strip()
        if norm and len(norm) >= 3:
            titles.append({"norm": norm, "orig": orig, "lang": lang})

print(f"Loaded {len(titles):,} titles.")

# ─── mine positive pairs (near-duplicates via levenshtein on title_normalized) ─
print("Mining positive pairs (near-duplicates)...")
positives = []

# Sample a representative subset to keep runtime manageable
# Focus on titles with 4-12 chars (most likely to have near-duplicates)
mid_titles = [t for t in titles if 4 <= len(t["norm"]) <= 15]
sample = random.sample(mid_titles, min(3000, len(mid_titles)))

seen = set()
for i, t1 in enumerate(sample):
    for t2 in sample[i+1:]:
        if t1["norm"] == t2["norm"]:
            continue
        dist = levenshtein(t1["norm"], t2["norm"])
        if 1 <= dist <= 2:
            key = tuple(sorted([t1["norm"], t2["norm"]]))
            if key not in seen:
                seen.add(key)
                positives.append((t1["orig"] or t1["norm"], t2["orig"] or t2["norm"], 1))

print(f"  Found {len(positives)} positive pairs.")

# Cap at 150 to keep the CSV balanced
random.shuffle(positives)
positives = positives[:150]

# ─── mine hard negatives (same first word, clearly different topics) ──────────
print("Mining hard negatives (shared word, different meaning)...")
hard_negatives = []

# Group titles by their first word
from collections import defaultdict
by_first_word = defaultdict(list)
for t in titles:
    words = t["norm"].split()
    if words:
        by_first_word[words[0]].append(t)

# For each common first word, take pairs where the full titles are very different
for word, group in by_first_word.items():
    if len(group) < 2:
        continue
    # Only use common first words (>3 titles share it)
    if len(group) < 4:
        continue
    # Take 2 random pairs from this group
    sample_group = random.sample(group, min(4, len(group)))
    for i in range(0, len(sample_group)-1, 2):
        t1, t2 = sample_group[i], sample_group[i+1]
        # Confirm they're actually different (levenshtein > 3)
        if levenshtein(t1["norm"], t2["norm"]) > 3:
            hard_negatives.append((t1["orig"] or t1["norm"], t2["orig"] or t2["norm"], 0))

    if len(hard_negatives) >= 100:
        break

print(f"  Found {len(hard_negatives)} hard negative pairs.")
random.shuffle(hard_negatives)
hard_negatives = hard_negatives[:100]

# ─── easy negatives (random pairs from different languages) ───────────────────
print("Mining easy negatives (random cross-language pairs)...")
lang_groups = defaultdict(list)
for t in titles:
    lang_groups[t["lang"]].append(t)

easy_negatives = []
lang_keys = [l for l in lang_groups if len(lang_groups[l]) >= 10]
for _ in range(100):
    if len(lang_keys) < 2:
        break
    l1, l2 = random.sample(lang_keys, 2)
    t1 = random.choice(lang_groups[l1])
    t2 = random.choice(lang_groups[l2])
    if t1["norm"] != t2["norm"] and levenshtein(t1["norm"], t2["norm"]) > 5:
        easy_negatives.append((t1["orig"] or t1["norm"], t2["orig"] or t2["norm"], 0))

print(f"  Found {len(easy_negatives)} easy negative pairs.")

# ─── combine and write ────────────────────────────────────────────────────────
all_pairs = positives + hard_negatives + easy_negatives
random.shuffle(all_pairs)

OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
with OUT_CSV.open("w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["query_title", "candidate_title", "is_match"])
    writer.writerows(all_pairs)

total_pos = sum(1 for p in all_pairs if p[2] == 1)
total_neg = sum(1 for p in all_pairs if p[2] == 0)
print(f"\n✅ Written {len(all_pairs)} pairs to {OUT_CSV}")
print(f"   Positives (is_match=1): {total_pos}")
print(f"   Negatives (is_match=0): {total_neg}")
print(f"   Class balance: {total_pos/len(all_pairs)*100:.1f}% positive")
