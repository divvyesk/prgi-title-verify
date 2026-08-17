# Git Workflow — PRGI TitleGuard

## Branch model

- `main` is the **only** permanent branch. There is no `dev`, and nobody creates one.
- Each person has **one topic branch for the whole hackathon**, named after their
  area — matching the `data` / `frontend` naming already visible in this repo's
  history:

  | Person | Branch |
  |---|---|
  | Divvye | `contracts-backend` |
  | Jai | `algorithms` |
  | Pruthviraj | `rules` |
  | Suhani | `agents` |
  | Gurpreet | `frontend-integration` |
  | Darsh | `officer-ui` |

  Do not create a new branch per task — commit to your one topic branch and open
  PRs from it repeatedly.
- Never commit directly to `main`.

## Commit message format

```
<area>(<module>): <what changed>
```

Examples:
```
contracts(algo): define ScorerProtocol interface
backend(main): wire /v1/verify endpoint to pipeline stages
ml(semantic): query BGE-M3 HNSW index for top-k candidates
```

## Pull requests

- PRs go from your feature (topic) branch into `main`.
- Divvye reviews every PR.
- Merges are **squash-merged** into `main`, so `main`'s history stays one commit
  per PR.
- Keep each PR under **~400 changed lines**. Split larger work into several
  smaller PRs off the same topic branch rather than one huge PR.
- After a PR merges, your topic branch stays alive locally (you keep committing
  to it for the next PR) — you do **not** delete the branch after every merge,
  since you're reusing the same branch for all three days. What "delete after
  merge" applies to is any stray one-off branch: if you ever accidentally create
  an extra branch, delete it once merged so the permanent branch list stays
  `main` + the six topic branches.

## Checkpoints and tags

`main` is also the demo branch, so it must always be in a runnable state. We tag
a known-good commit at each checkpoint:

| Tag | When |
|---|---|
| `checkpoint-1` | End of day 1 |
| `checkpoint-2` | End of day 2 |
| `v1.0-demo` | Feature freeze (19 Aug 2026, 15:00) |

If `main` ever breaks, check out the last tag rather than trying to bisect live:

```bash
git checkout checkpoint-2
```

## Daily commands (run these in order)

**Start of day — sync your branch with the latest `main`:**

```bash
git checkout main
git pull origin main
git checkout <your-topic-branch>
git merge main
```

**While working — commit in small chunks, naming files explicitly (never `git add .`):**

```bash
git status
git add path/to/file1.py path/to/file2.py
git commit -m "contracts(algo): define ScorerProtocol interface"
```

**Push your branch:**

```bash
git push origin <your-topic-branch>
```

**Open a pull request into `main`:**

```bash
gh pr create --base main --head <your-topic-branch> \
  --title "contracts: define ScorerProtocol interface" \
  --body "What changed and why, in 2-3 lines."
```

**After Divvye squash-merges your PR, resync before your next chunk of work:**

```bash
git checkout main
git pull origin main
git checkout <your-topic-branch>
git merge main
```

**End of day 1 and day 2 (Divvye only) — tag the checkpoint on `main`:**

```bash
git checkout main
git pull origin main
git tag checkpoint-1        # or checkpoint-2
git push origin checkpoint-1
```

**At feature freeze (Divvye only):**

```bash
git checkout main
git pull origin main
git tag v1.0-demo
git push origin v1.0-demo
```

**If `main` breaks and you need the last known-good state:**

```bash
git fetch --tags
git checkout checkpoint-2
```
