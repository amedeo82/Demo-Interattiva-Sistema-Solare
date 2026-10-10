# 📚 Documentazione delle feature

Questo documento descrive in dettaglio le feature implementate, con riferimenti al codice.

## Indice

- [Simulazione orbitale](#simulazione-orbitale)
- [Timeline interattiva](#timeline-interattiva)
- [Realismo 3D](#realismo-3d)
- [Atmosfere Fresnel](#atmosfere-fresnel)
- [Saturno: anelli e ombre](#saturno-anelli-e-ombre)
- [Fascia asteroidi e Kuiper](#fascia-asteroidi-e-kuiper)
- [Cometa](#cometa)
- [Scie orbitali](#scie-orbitali)
- [Congiunzioni](#congiunzioni)
- [Bump map procedurali](#bump-map-procedurali)
- [HUD e Telemetria](#hud-e-telemetria)
- [Cinematica](#cinematica)
- [Quiz e Confronto](#quiz-e-confronto)
- [PWA e offline](#pwa-e-offline)
- [Audio ambientale](#audio-ambientale)
- [Accessibilità](#accessibilità)
- [Design system](#design-system)

---

## Simulazione orbitale

**File**: `src/utils/kepler.ts`, `src/hooks/useOrbitEngine.ts`

Ogni pianeta segue un'orbita ellittica kepleriana. La posizione è calcolata con:

1. **Anomalia media**: avanza linearmente con il tempo di simulazione
   `M(t) = M₀ + 360·t/P_anim` (dove `P_anim` è specifico per pianeta).
2. **Anomalia eccentrica**: risolta iterativamente con l'equazione di Keplero
   `M = E − e·sin(E)` via Newton.
3. **Anomalia vera**: derivata dall'anomalia eccentrica `ν = 2·atan2(√(1+e)·sin(E/2), √(1-e)·cos(E/2))`.
4. **Raggio ellittico**: `r = a(1−e²)/(1+e·cos(ν))`.

Il motore gira in `requestAnimationFrame` con throttling del tempo simulato pubblicato a ~4Hz (per evitare re-render a 60fps dei consumatori React).

### Coerenza data → simulazione

`src/utils/simDate.ts` gestisce la transizione fra data picker e simulazione: usando il PPCM dei periodi animativi, la scena si riposiziona esattamente alla configurazione reale del giorno scelto, anche per epoche lontane da J2000.

## Timeline interattiva

**File**: `src/components/Timeline.tsx`

Barra scrubber ±2 anni con:

- **Drag** (mouse/touch) per spostare il tempo
- **Tastiera**: ←/→ per step di 0,1 anni, Home per il presente
- **Pausa automatica** del motore durante il drag
- **aria-valuenow/valuetext** per screen reader
- Pointer events unificati (no librerie esterne)

Il motore espone `seekTo(t)` per spostamenti imperativi senza re-render.

## Realismo 3D

**File**: `src/scene/Bodies.tsx`, `src/scene/Sun3D.tsx`, `src/scene/SaturnRings.tsx`

- **Texture NASA 2K** per albedo, caricate con `useTexture` di drei (colorSpace sRGB, anisotropia massima)
- **Nubi terrestri** su layer separato che ruota a velocità propria (0.92× rispetto alla superficie)
- **Limiti zoom** logarithmic/distance e diametri proporzionali ai km reali
- **Limb darkening solare** con gradient radiale e plasma rotante

## Atmosfere Fresnel

**File**: `src/scene/Bodies.tsx`, `src/scene/bodies3d.ts`

Per i pianeti con atmosfera significativa (Venere, Terra, Giove, Saturno, Urano, Nettuno), un `ShaderMaterial` Fresnel è applicato a una sfera `BackSide` leggermente più grande (1.06× raggio).

```glsl
float fres = 1.0 - max(dot(vNormalW, vViewDirW), 0.0);
fres = pow(fres, 2.5);
gl_FragColor = vec4(uColor, fres * uIntensity);
```

Ogni pianeta ha `atmosphereColor` e `atmosphereIntensity` configurati in `bodies3d.ts` (Venere oro pieno, Terra azzurro, Nettuno blu elettrico…).

## Saturno: anelli e ombre

**File**: `src/components/Planet.tsx`, `src/index.css`

Il rendering DOM 2D di Saturno (usato come fallback se la scena 3D non fosse disponibile) include:

- **Anelli** via `border-radius: 50%` su un div ruotato di -20°
- **Ombra anelli→pianeta**: layer lineare scuro che si sposta sopra/sotto il centro disco in base all'angolo eliocentrico
- **Ombra pianeta→anelli**: layer `linear-gradient` con angolo che dipende dalla posizione del Sole (calcolata via `keplerPosition`)

Nella versione 3D (`src/scene/SaturnRings.tsx`) gli anelli sono `RingGeometry` con texture procedurale.

## Fascia asteroidi e Kuiper

**File**: `src/scene/AsteroidBelt3D.tsx`, `src/scene/KuiperBelt3D.tsx`

`THREE.Points` con `ShaderMaterial` custom (`size + sizeAttenuation`):

- **Asteroidi (~350)** tra Marte e Giove (raggio 26–32 unità 3D, 5 unità = 1 UA)
- **Kuiper (~120)** oltre Nettuno (raggio 66–88 unità), addensamento verso il bordo interno (`pow(0.7)`)
- Velocità angolare: `3ª legge di Keplero` (`period ∝ a^1.5`)
- Inclinazione orbitale casuale (asteroidi ±5°, Kuiper ±11°)
- Per la fascia principale: rotazione propria simulata via modulazione di `r = baseSize * |cos(spin·t)|`

## Cometa

**File**: `src/scene/Comet3D.tsx`

Orbita ellittica molto eccentrica (`e=0.92`), risolta con Newton a ogni frame. La coda è un `THREE.Line` con vertex colors (testa bianca calda → coda ciano) la cui geometria è aggiornata imperativamente per seguire la posizione del nucleo.

La coda è **sempre orientata opposta al Sole** (modello "vento solare"): il calcolo `sunToComet = normalize(cometPos)` dà la direzione, e la coda si estende in `-sunToComet`.

## Scie orbitali

**File**: `src/scene/OrbitTrails.tsx`

Per il pianeta selezionato (escluso il Sole), 96 punti che ripercorrono la traiettoria kepleriana indietro di 60s di sim. Polyline 3D con `vertexColors` (testa viola chiaro → coda viola scuro), `AdditiveBlending`.

Le posizioni sono ricalcolate ogni frame da `keplerPosition(planet, tNow - backOffset)`: questo garantisce che la scia resti allineata anche durante pause e seek della timeline.

## Congiunzioni

**File**: `src/scene/Conjunctions.tsx`, `src/components/ConjunctionBanner.tsx`

A ogni frame:

1. Calcola la separazione angolare (longitudine eliocentrica vista dal Sole) per ogni coppia
2. Trova la coppia più stretta
3. Con isteresi 5°/3°: entra/esce dallo stato "in congiunzione"

Quando una congiunzione è attiva:

- **3D**: `RingGeometry` viola con `AdditiveBlending` posizionata a metà strada fra i due pianeti, con pulsazione di opacità
- **DOM**: banner overlay in alto con nomi, simboli, separazione angolare corrente

Auto-dismiss 4s dopo la fine della congiunzione.

## Bump map procedurali

**File**: `src/utils/textures.ts`, `src/components/Planet.tsx`

Oltre all'albedo, ogni pianeta ha una **bump map in scala di grigi** generata proceduralmente:

| Pianeta | Pattern |
|---------|---------|
| Mercurio/Luna | crateri con bordi rialzati e ombra interna |
| Terra | continenti emergenti con gradient morbidi |
| Marte | polvere + canyon + calotte polari rilevate |
| Giove/Saturno | ondulazioni di nubi + depressione Grande Macchia Rossa |
| Venere/Urano/Nettuno | micro-velature |

Applicata come layer `mix-blend-mode: overlay` con `filter: contrast(1.8)`, ruota in sync con la texture albedo.

## HUD e Telemetria

**File**: `src/scene/TelemetryHUD.tsx`, `src/components/HoverCrosshair.tsx`

- **Speed** corrente
- **Data** simulata (con locale it-IT)
- **Distanza camera** dal target
- **FPS** (calcolato a 60Hz, throttled a 2Hz per il DOM)
- **Coordinate mouse NDC** + world hit sul piano orbitale per hover
- **Crosshair** visivo in overlay

Tutti i dati viaggiano via ref imperativi per non causare re-render a 60fps.

## Cinematica

**File**: `src/scene/CameraAnimator.tsx`, `src/scene/CameraRig.tsx`, `src/components/IntroOverlay.tsx`

- **Intro flythrough**: camera si avvicina al sistema nei primi 3s, con titolo "Sistema Solare · Interattivo · 3D" e barra di progresso reale del caricamento (`useProgress` di drei via `LoadingProvider`)
- **Fly-to su select**: transizione `easeInOutCubic` di 1.2s verso il pianeta cliccato
- **Cinematic slow-mo**: la simulazione rallenta a 0.25× per 2.5s dopo una selezione
- **Tour guidato**: panoramica → Terra → Saturno con fly-to automatici

## Quiz e Confronto

**File**: `src/components/QuizModal.tsx`, `src/components/CompareModal.tsx`

**Quiz**:
- Domande generate in parte dai dati del dataset (es. "Quale pianeta è il più grande?", "Chi ha la Grande Macchia Rossa?")
- RNG iniettabile per test deterministici
- Shuffle risposte
- Score finale con giudizio

**Confronto**:
- 2 selettori pianeta (A e B)
- Tabella comparativa: diametro, distanza, periodo, lune
- Valore maggiore per riga in verde
- Rapporto dimensionale ("Giove è 11,2× più grande della Terra")

## PWA e offline

**File**: `public/manifest.webmanifest`, `public/sw.js`, `public/icon-*.svg`

- Manifest con icone 192/512 (SVG con Sole e anelli di Saturno stilizzati)
- Service worker con strategia:
  - **HTML**: network-first, fallback cache
  - **Asset**: cache-first con revalidate
- `vercel.json` configurato con `Service-Worker-Allowed: /` e `Content-Type: application/manifest+json`

L'utente può installare l'app su desktop/mobile come PWA standalone.

## Audio ambientale

**File**: `src/components/AmbientAudio.tsx`

Drone spaziale sintetizzato via Web Audio API (no asset da scaricare):

- 2 oscillatori sinusoidali (80Hz drone, 120Hz armonica)
- 1 oscillatore triangolare per "shimmer" (480Hz)
- LFO 0.06Hz per modulazione di ampiezza lenta
- Filtro lowpass (700Hz, Q=0.6)
- Delay feedback per riverbero sintetico
- Fade-in 1.2s, fade-out 0.6s
- Persistito in localStorage (`solarsys.ambient`)

## Accessibilità

- Ruoli ARIA (`dialog`, `button`, `aria-pressed`, `aria-valuenow`)
- Focus management (chiusura pannello focusata, focus-visible su tutti i controlli)
- `prefers-reduced-motion` rispettato (animazioni disabilitate, scanline ferma)
- Navigazione tastiera: `Spazio` pausa, `←/→` velocità, `↑/↓` tilt, `+/-` tilt, `R` reset, `T` reset tilt, `Home` timeline home, `Esc` chiudi
- Screen reader: `aria-live="polite"` per selezione pianeta, tip di onboarding, banner congiunzione
- Contrasto: chip attivi con bordo luminoso, label secondarie con `text-white/60` minimo

## Design system

**File**: `src/index.css`

Token centralizzati in `:root`:

```css
--bg-deep: #060614;
--accent-purple: rgba(168, 85, 247, 0.5);
--text-secondary: rgba(255, 255, 255, 0.7);
--radius-sm/md/lg/xl: 8/12/18/24px;
--shadow-panel: 0 12px 48px rgba(0, 0, 0, 0.55);
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
```

Classi riusate:

- `.surface` / `.glass` — sfondo condiviso per header, sidebar, modali
- `.chip` / `.chip.active` — bottoni pillola piccoli
- `.planet-row` — riga della lista pianeti
- `.btn-play` / `.btn-play.playing` — play/pausa principale
- `.view-btn` — bottoni freccia tilt
- `.kbd` — tasti scorciatoia
- `.timeline` / `.timeline-track` / `.timeline-fill` / `.timeline-thumb` — scrubber
- `.onboard-tip` — tip di onboarding
- `.font-display` / `.font-mono` — typography
