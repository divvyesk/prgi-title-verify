#!/usr/bin/env python3
"""
False-positive audit: run all CRITICAL rules across 500 random real titles
from title_master.csv and report how many trigger each rule.
If > 2% of real titles trigger a CRITICAL rule, the rule is too broad.
"""
import csv
import random
import sys
from collections import defaultdict
from ml.rules.engine import check_all, RuleViolation
from ml.rules.types import RuleContext

random.seed(42)

with open("data/datasets/dataset1/data/processed/title_master.csv", encoding="utf-8") as f:
    all_rows = list(csv.DictReader(f))

sample = random.sample(all_rows, min(500, len(all_rows)))

false_positives = defaultdict(list)  # rule_id → list of triggering titles

for row in sample:
    title = row["Title"]
    normalized = title.strip().lower()
    tokens = normalized.split()
    ctx = RuleContext(normalized=normalized, tokens=tokens)
    violations = check_all(title, ctx)
    for v in violations:
        if not v.passed and v.severity == "CRITICAL" and not v.requires_human_confirmation:
            false_positives[v.rule_id].append(title)

print(f"\n{'='*60}")
print(f"FALSE-POSITIVE AUDIT — 500 random real registered titles")
print(f"{'='*60}")
print(f"{'Rule ID':<14} {'FP Count':>8} {'FP Rate':>8}  {'Status'}")
print(f"{'-'*60}")

has_problem = False
for rule_id in sorted(false_positives):
    titles = false_positives[rule_id]
    rate = len(titles) / 500 * 100
    status = "✅ OK" if rate <= 2.0 else "❌ TOO BROAD (>2%)"
    if rate > 2.0:
        has_problem = True
    print(f"{rule_id:<14} {len(titles):>8} {rate:>7.1f}%  {status}")
    if rate > 2.0:
        print(f"  Sample triggering titles: {titles[:5]}")

print(f"\nRules with zero false positives: {sum(1 for r in false_positives if not false_positives[r])}")
print(f"Rules not appearing (no FP): {set()}")

sys.exit(1 if has_problem else 0)
