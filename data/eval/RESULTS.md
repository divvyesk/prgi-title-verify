# Eval Results

- **Date:** 2026-08-17T16:05:41Z
- **Git commit:** `532b69b`
- **Eval set:** `data/eval/eval_pairs.csv` (146 rows)
- **Errors / no-result rows:** 0
- **STUB_MODE:** 0 (real retrieval)

## Recall by relation type

| Relation     | N  | Recall@50 | Recall@200 | Recall@500 |
|---|---|---|---|---|
| benchmark    |  6 |  16.7% (1/6) |  16.7% (1/6) |  16.7% (1/6) |
| lexical      | 65 |  89.2% (58/65) |  92.3% (60/65) |  92.3% (60/65) |
| phonetic     | 25 |  96.0% (24/25) |  96.0% (24/25) |  96.0% (24/25) |
| reorder      | 30 |  96.7% (29/30) |  96.7% (29/30) |  96.7% (29/30) |
| semantic     | 20 |   5.0% (1/20) |  10.0% (2/20) |  10.0% (2/20) |
| **Overall**  | 146 | **77.4%** (113/146) | **79.5%** (116/146) | **79.5%** (116/146) |

## Notes

- `lexical`: Real near-duplicate pairs from Dataset 1 (RapidFuzz token_sort_ratio 80–98).
- `benchmark`: Six hand-written scenarios from the product spec.
- `reorder`: Word-shuffled variants of real registered titles.
- `phonetic`: Vowel-substituted variants (a→aa, i→ee, u→oo). Substitution rule in eval_pairs.csv note column.
- `semantic`: Hindi↔English cross-language pairs. 16/20 flagged UNCERTAIN — human review needed.
- Any recall below 80% on lexical/benchmark/reorder indicates the retrieval index needs tuning.
- Semantic recall is expected to be lower (cross-language is harder); below 50% warrants a model upgrade.
