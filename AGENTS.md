# AGENTS.md — instructions for AI agents working on this repo

## Pre-commit & pre-PR checklist

The CI pipeline (`.github/workflows/ci.yml`) runs the following checks on every PR. **Run them locally before committing or opening a PR** to avoid the kind of failure that cost PR #27 its first run (a Prettier formatting diff in `src/App.tsx`).

Run them in this order — each step is the exact command CI uses:

```bash
npm ci                                   # clean install (matches CI)
npx prettier --check "src/**/*.{ts,tsx,css}" "*.json"   # format gate
npm run lint                             # eslint
npm run typecheck                        # tsc --noEmit
npm test                                 # vitest run
npm run build                            # tsc --noEmit && vite build
```

### If `prettier --check` fails
Fix formatting (do NOT bypass the check):
```bash
npm run format                           # prettier --write on src/**/*.{ts,tsx,css}
git add -A && git commit --amend --no-edit
```

### Mobile / responsive changes
Any change that touches layout, the mobile sheet, `PlanetInfoPanel`, the sidebar, the service worker, or `index.css` mobile rules must be verified in a real browser at multiple viewports before opening the PR. **The E2E suite (`e2e/smoke.spec.ts`, lanciata da `npm run e2e` o dal workflow `.github/workflows/e2e.yml`) automatizza i 5 viewport richiesti**:
- 393×852 (iPhone 15 Pro, DPR 3, touch)
- 375×667 (iPhone SE)
- 768×1024 (iPad)
- 1280×800 and 1440×900 (desktop)

Gli assert chiave della smoke suite:
- `elementFromPoint` al centro viewport ritorna `CANVAS` (non un wrapper)
- il FAB apre la controls sheet (mobile)
- selezionare un pianeta apre il pannello info
- il quiz si apre
- nessun errore JS in `pageerror` / `console.error`

Per debug locale: `npm run e2e:install` (una volta) + `npm run build && npm run e2e`.

### PWA / service-worker changes
Bump `CACHE_NAME` in `public/sw.js` whenever shipped assets change in a way that should invalidate returning PWA users.

### PR conventions
- One logical change per PR.
- Title: `type(scope): summary` (e.g. `fix(mobile): restore responsive layout`).
- Body: bug → root cause → fix → verification (with a table for cross-viewport checks when relevant).
- `@playwright/test` è ammesso come `devDependency` (introdotto in S10a · M6c, workflow `.github/workflows/e2e.yml`). I soli file di output locali da ignorare: `playwright-report/`, `test-results/`, `blob-report/`, `.playwright/` (vedi `.gitignore`).
