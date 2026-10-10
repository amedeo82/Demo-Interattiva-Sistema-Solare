# 🌌 Sistema Solare Interattivo

Una simulazione interattiva del sistema solare costruita con **React 18**, **TypeScript**, **Vite** e **Tailwind CSS**: otto pianeti in orbita attorno al Sole con fisica keplariana, texture procedurali, satelliti naturali, fascia degli asteroidi e modalità educative (quiz e confronto).

## 📸 Screenshot

| Vista principale | Modalità "Realismo" |
|:---:|:---:|
| ![Vista principale](docs/images/01-home.png) | ![Modalità realismo](docs/images/02-realism-mode.png) |
| Orbite animate, Sole con corona e brillanzi, sfondo stellato | Texture procedurali, lune, fascia degli asteroidi |

| Pannello informativo | Confronto pianeti |
|:---:|:---:|
| ![Pannello informativo](docs/images/03-planet-info.png) | ![Confronto pianeti](docs/images/04-compare.png) |
| Sezioni espandibili: atmosfera, temperatura, lune, missioni, curiosità | Metriche a barra e rapporti dimensionali tra due pianeti |

| Quiz mode | Layout mobile |
|:---:|:---:|
| ![Quiz mode](docs/images/05-quiz.png) | ![Mobile](docs/images/06-mobile.png) |
| Domande a risposta multipla generate dai dati del dataset | Interfaccia responsive su schermi piccoli |

> Gli screenshot sono generati automaticamente con Playwright: [`scripts/screenshots.mjs`](scripts/screenshots.mjs). Per rigenerarli: `npm run build && npm run preview` in un terminale, poi `node scripts/screenshots.mjs` in un altro.

## ✨ Funzionalità

### Simulazione orbitale
- **Fisica di Keplero**: orbite ellittiche con eccentricità reale, equazione di Keplero risolta per iterazione di Newton (`src/utils/kepler.ts`)
- **Velocità variabile**: preset 0.25x–10x + slider continuo 0,1x–20x
- **Posizioni per data**: picker per calcolare dove si trovavano i pianeti in una data specifica (epoca J2000)
- **Scie orbitali**: trail dietro ai pianeti selezionati (96 punti, 60s di sim, vertex colors sfumati)
- **Timeline interattiva**: scrubber drag/touch/keyboard ±2 anni, pausa automatica durante drag
- **Fascia asteroidi** (~350) e **Fascia di Kuiper** (~120 TNO) come `THREE.Points` con rotazione propria e inclinazione orbitale
- **Cometa decorativa** con orbita eccentrica e coda orientata dinamicamente opposta al Sole

### Grafica 3D
- **Texture NASA 2K** per albedo + **bump map procedurali** (crateri, continenti, polvere, fasce) per dare rilievo
- **Atmosfere Fresnel** (sphere BackSide + shader) su Venere, Terra, Giove, Saturno, Urano, Nettuno
- **Rotazione assiale** con inclinazione reale (es. Urano 97,77°)
- **Anelli di Saturno** con ombra anelli-pianeta e pianeta-anelli che si proietta dinamicamente in base alla fase
- **Congiunzioni**: rilevamento automatico della coppia di pianeti più stretta, banner DOM e marker 3D con isteresi (5°/3°)
- **Sole** con limb darkening, plasma, macule, doppia corona
- **Nubi terrestri** con layer separato che ruota a velocità propria

### Interattività
- **Zoom & pan**: rotellina, drag, Shift+drag
- **Free Cam mode**: chip dedicato per orbita illimitata
- **Modalità follow 🛰**: la camera insegue il pianeta selezionato
- **Pannello informativo espandibile**: composizione atmosferica, temperature, lune, missioni, curiosità
- **⚖️ Confronto**: seleziona due pianeti e confronta diametro, distanza, periodo, lune, temperatura
- **🧠 Quiz**: domande a risposta multipla generate dai dati reali
- **🔊 Audio**: drone spaziale sintetizzato via Web Audio API (no download)
- **📍 Oggi**: torna alla data corrente dopo aver scelto una data
- **📏 Scala reale**: toggle 1:1 con disclaimer
- Etichette pianeti attivabili/disattivabili

### PWA & offline
- **Manifest** + icone SVG (192/512)
- **Service worker** con strategia network-first per HTML e cache-first per asset
- Installabile su desktop e mobile

### Accessibilità & UX
- Navigazione da tastiera: `Spazio` pausa · `←`/`→` velocità · `↑`/`↓` tilt · `+`/`−` tilt · `R` reset · `T` reset tilt · `Esc` chiudi · `Home` reset timeline
- Ruoli ARIA (`dialog`, `button`, `aria-pressed`) e focus management
- `prefers-reduced-motion` rispettato
- **Design system** centralizzato (`src/index.css`): token CSS, superficie `glass` condivisa, slider/chip coerenti
- Onboarding tip al primo avvio (persistito)
- Cinematic transitions: fly-to 1.2s, intro flythrough 3s, slow-mo 0.25× automatico su select
- Bloom + Vignette post-processing (toggle "FX")

## 🛠️ Stack tecnologico

| | |
|---|---|
| Framework | React 18 + TypeScript 5 |
| Build | Vite 6 |
| 3D | Three.js + @react-three/fiber + @react-three/drei + postprocessing |
| Styling | Tailwind CSS 4 + CSS custom (animazioni, shader) |
| State | Zustand + custom hooks |
| PWA | Service worker + manifest |
| Test | Vitest + Testing Library + jsdom |
| Qualità | ESLint 10, Prettier, GitHub Actions CI |
| Screenshot docs | Playwright (script `scripts/screenshots.mjs`) |

## 📦 Avvio rapido

```bash
npm install        # installa le dipendenze
npm run dev        # server di sviluppo (http://localhost:5173)
npm run build      # typecheck + build di produzione in dist/
npm run preview    # anteprima della build di produzione
```

### Script utili

```bash
npm test              # suite Vitest (unit + integrazione)
npm run test:coverage # coverage dei test
npm run lint          # ESLint
npm run format        # Prettier --write
npm run typecheck     # tsc --noEmit
```

### Rigenerare gli screenshot

```bash
npm i -D playwright && npx playwright install chromium --with-deps
npm run build && npm run preview &   # serve dist/ su :4173
node scripts/screenshots.mjs         # scrive docs/images/*.png
```

## 🔄 CI/CD

Ogni push/PR esegue il workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml): **Prettier check → Typecheck → ESLint → Vitest → Build**, con caricamento dell'artifact `dist/`.

## 🚀 Deploy su Vercel

### Opzione 1: Deploy diretto da GitHub (consigliata)

1. Carica il progetto su GitHub
2. Su [vercel.com](https://vercel.com) → **Add New Project** → importa il repository
3. Vercel rileva automaticamente Vite (config in `vercel.json`)
4. Clicca **Deploy**

### Opzione 2: Vercel CLI

```bash
npm install -g vercel
vercel          # preview
vercel --prod   # produzione
```

## 📁 Struttura del progetto

```
├── index.html                 # HTML entry point + PWA bootstrap
├── public/
│   ├── sw.js                  # Service worker (network-first HTML, cache-first asset)
│   ├── manifest.webmanifest   # PWA manifest
│   └── icon-*.svg             # Icone PWA
├── src/
│   ├── main.tsx               # React entry point
│   ├── App.tsx                # Composizione scena + header + timeline + onboarding
│   ├── index.css              # Design tokens, glass, timeline, chip, slider
│   ├── components/
│   │   ├── Planet.tsx         # Pianeti DOM (texture, bump, atmosfera, ombre Saturno)
│   │   ├── PlanetInfoPanel.tsx# Pannello sezioni espandibili
│   │   ├── ControlsSidebar.tsx# Play/pausa, velocità, data, pannello info
│   │   ├── CompareModal.tsx   # Confronto tra due pianeti
│   │   ├── QuizModal.tsx      # Quiz a risposta multipla
│   │   ├── IntroOverlay.tsx   # Title sequence con progress bar reale
│   │   ├── Timeline.tsx       # Scrubber interattivo del tempo di simulazione
│   │   ├── OnboardingTip.tsx  # Tip primo avvio (persistito)
│   │   ├── ConjunctionBanner.tsx # Banner DOM per congiunzioni
│   │   └── AmbientAudio.tsx   # Drone spaziale via Web Audio API
│   ├── scene/
│   │   ├── SolarScene.tsx     # Wrapper <Canvas> + loading provider
│   │   ├── Bodies.tsx         # Pianeti 3D, atmosfere Fresnel, materiali
│   │   ├── Sun3D.tsx          # Sole 3D con corona
│   │   ├── SaturnRings.tsx    # Anelli procedurali
│   │   ├── AsteroidBelt3D.tsx # ~350 asteroidi come THREE.Points
│   │   ├── KuiperBelt3D.tsx   # ~120 TNO come THREE.Points
│   │   ├── Comet3D.tsx        # Cometa con coda orientata dal Sole
│   │   ├── OrbitTrails.tsx    # Scie orbitali pianeti selezionati
│   │   ├── Conjunctions.tsx   # Rilevamento + marker 3D
│   │   ├── Orbits.tsx         # Orbite ellittiche
│   │   ├── CameraRig.tsx      # OrbitControls + tilt
│   │   ├── CameraAnimator.tsx # Cinematic fly-to + intro flythrough
│   │   ├── TourController.tsx # Tour guidato
│   │   ├── HoverRaycaster.tsx # Raycast mouse per hover/selezione
│   │   ├── PostProcessing.tsx # Bloom + Vignette
│   │   ├── LoadingProvider.tsx# Ponte Canvas↔DOM per useProgress
│   │   └── bodies3d.ts        # Manifest texture/distanze NASA + atmosfere
│   ├── hooks/
│   │   ├── useOrbitEngine.ts  # Motore rAF + seekTo
│   │   └── useOrbitCounters.ts# Contatore orbite completate
│   ├── utils/
│   │   ├── kepler.ts          # Equazione di Keplero, anomalie, effemeridi
│   │   ├── textures.ts        # Texture + bump map procedurali
│   │   ├── simDate.ts         # Coerenza data → sim
│   │   ├── format.ts          # Formattazione numeri/date it-IT
│   │   ├── prefs.ts           # usePersistentState + PREFS_KEYS
│   │   └── random.ts          # PRNG mulberry32
│   └── data/
│       └── planets.ts         # Dataset pianeti
├── scripts/screenshots.mjs    # Generazione screenshot per la documentazione
├── docs/images/               # Screenshot del README
├── .github/workflows/ci.yml   # Pipeline CI
└── vercel.json                # Configurazione Vercel (incluso service worker)
```

## 🪐 Dataset dei pianeti

| Pianeta | Diametro | Distanza dal Sole | Periodo orbitale | Lune | Eccentricità | Inclinazione assiale |
|---------|----------|-------------------|------------------|------|--------------|----------------------|
| Mercurio | 4.879 km | 57,9 mln km | 88 giorni | 0 | 0,2056 | 0,03° |
| Venere | 12.104 km | 108,2 mln km | 225 giorni | 0 | 0,0068 | 177,4° |
| Terra | 12.756 km | 149,6 mln km | 365 giorni | 1 | 0,0167 | 23,44° |
| Marte | 6.792 km | 227,9 mln km | 687 giorni | 2 | 0,093 | 25,19° |
| Giove | 142.984 km | 778,6 mln km | 4.333 giorni | 95 | 0,0489 | 3,13° |
| Saturno | 120.536 km | 1.433,5 mln km | 10.759 giorni | 146 | 0,0565 | 26,73° |
| Urano | 51.118 km | 2.872,5 mln km | 30.687 giorni | 28 | 0,0457 | 97,77° |
| Nettuno | 49.528 km | 4.495,1 mln km | 60.190 giorni | 16 | 0,0113 | 28,32° |

I dati completi (composizione atmosferica, temperature, missioni spaziali, curiosità) vivono in `src/data/planets.ts` e alimentano sia il pannello informativo sia il quiz.

## 📄 Licenza

Uso dimostrativo/educativo.
