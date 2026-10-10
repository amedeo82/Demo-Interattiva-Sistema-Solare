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
Any change that touches layout, the mobile sheet, `PlanetInfoPanel`, the sidebar, the service worker, or `index.css` mobile rules must be verified in a real browser at multiple viewports before opening the PR. Use the Playwright script in `/tmp/kilo/mobile-test.mjs` (or run an equivalent ad-hoc check) at:
- 393×852 (iPhone 15 Pro, DPR 3, touch)
- 375×667 (iPhone SE)
- 768×1024 (iPad)
- 1280×800 and 1440×900 (desktop)

Confirm: `elementFromPoint` at viewport center returns `CANVAS` (not a wrapper), the FAB opens the controls sheet, selecting a planet opens the info panel, the quiz modal opens, and there are no JS page errors.

### PWA / service-worker changes
Bump `CACHE_NAME` in `public/sw.js` whenever shipped assets change in a way that should invalidate returning PWA users.

### PR conventions
- One logical change per PR.
- Title: `type(scope): summary` (e.g. `fix(mobile): restore responsive layout`).
- Body: bug → root cause → fix → verification (with a table for cross-viewport checks when relevant).
- Don't commit dev-only tooling (e.g. `playwright`) into `package.json`; it was a mistake in the first iteration of PR #27.
