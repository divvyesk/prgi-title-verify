# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Automated End-to-End Testing (Playwright)

PRGI TitleGuard includes an automated browser test suite powered by **Playwright**:

```bash
# Run all benchmark scenarios and officer docket workflow tests
npm run test:e2e

# Run with interactive UI mode
npx playwright test --ui

# View HTML test execution report & traces
npx playwright show-report
```

### Test Suite Coverage (`frontend/tests/e2e/`)
- `times-india.spec.ts`: Anagram / word-reordering detection and conflict table assertions (`Times India` vs `India Times`).
- `jaagran.spec.ts`: Phonetic Soundex similarity detection (`Jaagran` vs `Jagran`).
- `dainik-samachar.spec.ts`: Cross-language semantic translation similarity (`Dainik Samachar` vs `Daily News`).
- `vidarbha-express.spec.ts`: Core-word root token extraction and collision detection (`The Vidarbha Daily Express`).
- `matrimonial.spec.ts`: Commercial catalogue & matrimonial ban deterministic statutory check (`Section 4.1` / `R-COM-01`).
- `clean-approval.spec.ts`: Clean statutory clearance pass with 0 rule violations (`Aditi National Strategy Review`).
- `offline-fallback.spec.ts`: Autonomous embedded client AI verification without backend server dependency.
- `officer-docket.spec.ts`: Officer Review Docket queue ordering, AI Copilot memo drafting, and irreversible decision signing workflow.

