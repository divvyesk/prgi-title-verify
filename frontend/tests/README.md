# PRGI TitleGuard — Automated E2E Testing Suite

This directory contains the Playwright end-to-end (E2E) browser verification test suite for **PRGI TitleGuard (Smart India Hackathon 2026, Problem Statement PSS06)**.

---

## 1. Quickstart

### Prerequisites
Make sure dependencies and the Playwright Chromium binary are installed:
```bash
cd frontend
npm install
npx playwright install chromium
```

### Running the Test Suite
```bash
# Run all 8 benchmark E2E test specs (headless)
npm run test:e2e

# Run with interactive Playwright UI runner
npx playwright test --ui

# Run a single spec file
npx playwright test times-india
npx playwright test officer-docket

# Generate and view the rich HTML execution report
npx playwright show-report
```

---

## 2. Test Suite Specs & Benchmark Coverage

Every test strictly uses accessible ARIA queries (`getByRole`, `getByPlaceholder`, `getByText`) with **zero hardcoded CSS selectors** and **zero arbitrary sleeps** (`waitForTimeout`):

| Spec File | Benchmark Scenario | Validation Scope |
|---|---|---|
| `times-india.spec.ts` | **Times India vs India Times** | Proves word-reordering / anagrammatic permutation detection, explicit `REJECTED` text verdict, and presence of `India Times` in the 160k clash table. |
| `jaagran.spec.ts` | **Jaagran vs Jagran** | Proves phonetic pronunciation clash detection against registered `Jagran`-family titles via Soundex / Double Metaphone. |
| `dainik-samachar.spec.ts` | **Dainik Samachar vs Daily News** | Proves cross-lingual semantic translation similarity detection (Hindi ⇄ English translation conflict). |
| `vidarbha-express.spec.ts` | **The Vidarbha Daily Express** | Proves core-word root token extraction (stripping media fillers `The`, `Daily`, `Express`) and root collision detection on `"vidarbha"`. |
| `matrimonial.spec.ts` | **Royal Matrimonial Classifieds** | Proves deterministic statutory rule violation under **PRGI Guidelines 2025, Section 4.1(a)** for commercial advertising/matrimonial catalog bans with verbatim legal citation. |
| `clean-approval.spec.ts` | **Clean Distinctive Title** | Proves clean statutory approval (`APPROVED • CLEAR FOR REGISTRATION`), 0 rulebook failures, and safe clearance score (0/100). |
| `offline-fallback.spec.ts` | **Offline Standalone Engine** | Proves the embedded client-side AI verification engine works autonomously when the FastAPI backend is disconnected or offline. |
| `officer-docket.spec.ts` | **Officer Docket & Decision Signing** | Proves borderline amber cases sort first by risk, AI decision memo editing, irreversible legal confirmation modal, and issuance of official PRGI decision token (`PRGI/2026/OFF/00042`). |

---

## 3. What To Do When a Test Fails

If any test fails during development or CI:

### Step 1: Check the HTML Report & Trace Viewer
Playwright automatically captures screenshots and tracing on failure:
```bash
npx playwright show-report
```
Inspect the step-by-step action log, DOM snapshot, and screenshot in `frontend/test-results/`.

### Step 2: Debug Interactively
Run Playwright in headed or UI mode with debug inspector:
```bash
npx playwright test --debug
```

### Step 3: Strict Mode Violations
If an error says `strict mode violation: resolved to 2 elements`:
- Refine locator using specific accessible roles or scope (e.g. `section.getByRole(...)` or `.first()`).
- Never use fragile CSS class selectors (`.bg-rose-100`); always use ARIA roles or exact visible text.

### Step 4: Timing & Asynchronous Scanning
Verification takes ~300ms to calculate 4-D similarity offline. Playwright automatically polls assertions up to the timeout. Do not add `waitForTimeout()` — instead, assert expected UI elements with `await expect(locator).toBeVisible()`.
