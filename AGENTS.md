# AGENTS.md — instructions for AI agents working on this repo

## ⚠️ Pre-commit & pre-Push gate (OBBLIGATORIO)

La pipeline CI (`.github/workflows/ci.yml`) esegue 5 check su ogni PR.
**L'equivalente locale è un gate obbligatorio prima di `git commit` e `git
push`**: tutti i 5 devono passare, senza eccezioni. Saltare un check ha già
causato un push che ha rotto la CI (riformattazione Prettier sfuggita in
PR #27 e di nuovo in batch S9–S15). La procedura di recovery
(`amend + force-push`) non è un fix — è un sintomo.

**One-liner di gate** (eseguire nella shell dal working tree, PRIMA di
`git add` / `git commit`):

```bash
npm ci && \
  npx prettier --check "src/**/*.{ts,tsx,css}" "*.json" && \
  npm run lint && npm run typecheck && npm test && npm run build
```

Se uno qualsiasi dei check fallisce: **NON fare commit**, correggi
subito. Se l'unico fallimento è Prettier: `npm run format` (scrive su
`src/**/*.{ts,tsx,css}` **e `*.json`** — allineato al check CI),
poi `git add -A && git commit --amend --no-edit && git push --force-with-lease`.

### I 5 check nel dettaglio (ordine = ordine CI)

```bash
npm ci                                   # clean install (matches CI)
npx prettier --check "src/**/*.{ts,tsx,css}" "*.json"   # format gate
npm run lint                             # eslint
npm run typecheck                        # tsc --noEmit
npm test                                 # vitest run
npm run build                            # tsc --noEmit && vite build (+ postbuild)
```

Note operative:
- `npm run build` invoca anche `prebuild` (genera il manifest texture)
  e `postbuild` (inietta `CACHE_NAME` in `sw.js`): se lo salti, `sw.js`
  finisce con il placeholder `__BUILD_HASH__` letterale e la PWA non si
  invalida correttamente al deploy
- `npm run format` ora include `*.json` (allineato al check CI):
  un'eventuale dimenticanza di `*.json` viene fixata con un solo comando
- `prettier --check` deve passare su **tutti** i file elencati
  (`src/**` **e `*.json`): se resta almeno un file fuori formato il
  check ritorna exit code ≠ 0 e il commit/push successivo rompe CI

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
