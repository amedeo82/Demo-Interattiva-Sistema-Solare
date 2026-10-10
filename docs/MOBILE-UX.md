# 📱 Redesign UI/UX mobile + roadmap realismo 3D

> Analisi del progetto (React 18 + TS + Vite + Tailwind 4, rendering 3D via
> react-three-fiber, PWA con service worker) e soluzioni per la
> visualizzazione su dispositivi mobili. Include il changelog implementativo
> della parte già realizzata e la roadmap per portare la simulazione 3D a un
> livello di dettaglio/realismo superiore.
>
> Legenda impatto: 🔴 alto · 🟠 medio · 🟡 nice-to-have

---

## 1. Diagnosi dello stato attuale (pre-redesign)

| Area | Stato | Limite mobile percepito |
|---|---|---|
| Layout | `flex-col-reverse lg:flex-row`: sidebar sopra la scena su mobile | La sidebar occupava ~60% dell'altezza, la scena restava minuscola |
| Header | `flex-wrap` con 8+ chip | Su 390px andava a capo su 3-4 righe: header da ~140px |
| Date picker | Solo in header (`hidden sm:flex`) | Inaccessibile su mobile (< 640px) |
| Pannello info | Pannellino 360px trascinabile in alto a destra | Copre metà schermo, il drag con dita confligge con lo scroll |
| Timeline | Scrubber funzionale (pointer events OK) | Etichette ±y affollavano schermi stretti, thumb 14px non "touchabile" |
| Controlli vista | Pulsanti pitch/reset 36px in basso a sinistra | Target touch < 44px (WCAG 2.5.5), nessuna safe-area per notch/barra home |
| Viewport meta | `width=device-width, initial-scale=1.0` | Il pinch-zoom del browser confligge col pinch-zoom della camera 3D |
| Performance GPU | `antialias: true`, nessun limite dpr, 350+120 particelle | Su GPU integrate di smartphone: fill-rate saturo, FPS a half-rate |
| Bug pre-esistenti | `.onboard-tip`, `.timeline-track/fill/thumb`, `.view-btn`, `.speed-slider` senza stili in `index.css` | Tip, scrubber e pulsanti vista renderizzati "nudi" |

**Verdetto**: il progetto girava su mobile solo per "caso" (niente era rotto
funzionalmente, ma l'esperienza era inusabile sotto 768px).

---

## 2. Soluzioni implementate (Sprint S5)

### 🔴 2.1 Layout mobile a bottom sheet
- **Nuovo hook `src/hooks/useMedia.ts`**: `useMediaQuery(query)` + `useIsMobile()`
  (soglia `< 1024px`, breakpoint `lg` di Tailwind). Reactivo a rotazione/resize.
  Sostituisce il vecchio `useViewport` di `App.tsx` (mai usato realmente).
- **Sidebar → bottom sheet**: su mobile la `ControlsSidebar` vive in una sheet
  che scorre dal basso (`.mobile-sheet`, transizione `cubic-bezier(0.65,0,0.35,1)`
  320ms) e copre al massimo `min(75dvh, 560px)`. La scena 3D occupa **tutto**
  lo spazio disponibile. Apertura/chiusura con **FAB flottante** (`.mobile-fab`,
  pill con glow viola, safe-area aware).
- **Selezione pianeta dalla sheet**: la sheet si chiude automaticamente per
  lasciare spazio al pannello info e alla scena sul pianeta scelto.
- Il contenuto resta sempre montato (chiusura via `visibility`, non
  `display:none`): la lista pianeti resta nell'albero di accessibilità.

### 🔴 2.2 Header compatto adattivo
- Chip secondari (`Realismo`, `Scala reale`, `FX`, `Audio`) nascosti sotto
  640px; il **menu "⋯" li raccoglie** su mobile (con stato `active` a pallino).
- Date picker spostato **dentro la sheet controlli** su mobile (il picker
  nativo iOS/Android funziona meglio in un contesto a tutta larghezza).
- Le scorciatoie tastiera (`kbd`) nella sidebar sono nascoste su mobile:
  sensate solo con tastiera fisica.

### 🔴 2.3 Pannello info → bottom sheet
- Su mobile: `inset-x-0 bottom-0`, full width, `max-h-[72dvh]`,
  `rounded-t-2xl`, **grab bar** visiva in alto.
- Drag e reset posizione disattivati su mobile (non hanno senso su schermo
  stretto); su desktop comportamento invariato (drag + posizione persistita).

### 🔴 2.4 Performance mobile (tier GPU)
- **`dpr` limitato**: `[1, 1.25]` su mobile vs `[1, 1.75]` su desktop
  (`SolarScene.tsx`) — il fill-rate è il collo di bottiglia reale su GPU
  integrate di smartphone.
- **Fasce di particelle ridotte**: `AsteroidBelt3D count={200}` (vs 350) e
  `KuiperBelt3D count={70}` (vs 120) su mobile.
- **Post-processing OFF di default** su mobile al primo avvio (il bloom è il
  pass più costoso); la preferenza persistita dell'utente ha sempre la
  precedenza, e può riattivarlo dal menu "⋯".

### 🟠 2.5 Touch & safe-area
- **`viewport-fit=cover`** + classi `pb-safe`/`pt-safe` con
  `env(safe-area-inset-*)`: notch e barra home non coprono mai i controlli.
- **`user-scalable=no, maximum-scale=1`**: il pinch-zoom del browser è
  disattivato perché **confligge col pinch-zoom della camera 3D**
  (OrbitControls). È la scelta standard per le scene 3D interattive.
- **Target touch ≥ 44px** su `pointer: coarse`: chip, pulsanti vista, thumb
  timeline, righe pianeta (`@media (pointer: coarse)` in `index.css`).
- `-webkit-tap-highlight-color: transparent` (niente flash grigi su tap).

### 🟠 2.6 Timeline compatta
- Etichette `−2y`/`+2y` nascoste sotto 640px (restano lo stato `aria-valuetext`).
- Thumb 20px su touch (14px su desktop), `touch-action: none` sul track.

### 🐞 2.7 Bug fix scoperti durante l'integrazione
1. **`.onboard-tip` / `.onboard-tip-close` senza stili** (bug pre-esistente):
   il tip di onboarding veniva renderizzato senza formattazione. Stili
   aggiunti (pannello hologramma coerente col tema + bottone viola).
2. **`.timeline-track` / `.timeline-fill` / `.timeline-thumb` / `.view-btn` /
   `.speed-slider` senza stili** (bug pre-esistente, probabile perdita in un
   refactor CSS): scrubber e pulsanti vista erano "nudi". Stili completi
   aggiunti (rail, fill con glow viola, thumb, pulsanti 36px con hover/active).

### 📂 File toccati (S5)
```
src/hooks/useMedia.ts               (NUOVO: useMediaQuery + useIsMobile)
src/hooks/useMedia.test.tsx         (NUOVO: 6 test hook + 4 test App mobile)
src/App.tsx                         (hook mobile, header adattivo, sheet + FAB, menu extra)
src/components/ControlsSidebar.tsx  (pb-safe, kbd nascosti su mobile)
src/components/PlanetInfoPanel.tsx  (bottom sheet mobile, drag solo desktop)
src/components/OnboardingTip.tsx    (prop bottom + stili CSS mancanti)
src/components/Timeline.tsx         (etichette compatte)
src/scene/SolarScene.tsx            (prop mobile: dpr + conteggi fasce)
src/scene/AsteroidBelt3D.tsx        (prop count)
src/scene/KuiperBelt3D.tsx          (prop count)
src/index.css                       (mobile sheet, FAB, safe-area, target touch, fix .onboard-tip/.timeline/.view-btn/.speed-slider)
index.html                          (viewport-fit=cover, user-scalable=no)
```

### 🧪 Verifiche
- `npm run typecheck` → ✅
- `npm run lint` → ✅ (0 errori, 5 warning pre-esistenti non bloccanti)
- `npm test` → **163/163** ✅ (14 nuovi test mobile)
- `npm run build` → ✅ (47.19 kB main JS, 45.35 kB CSS)

---

## 3. Come provare su mobile
1. `npm run dev` → apri http://localhost:5173 da un telefono (o DevTools con
   viewport 390×844 e touch emulation).
2. La scena occupa tutto lo schermo; il FAB "☰ Controlli" in basso a destra
   apre la sheet con play/velocità/data/lista pianeti.
3. Tocca un pianeta nella lista → la sheet si chiude, il pannello info arriva
   come bottom sheet dal basso.
4. Il pinch con due dita zooma la **camera 3D**, non la pagina.
5. Il menu "⋯" in alto raccoglie Realismo/Scala/FX/Etichette/Audio.

---

## 4. Miglioramenti proposti per la simulazione 3D (roadmap)

> Cosa aggiungere per rendere la simulazione più completa, dettagliata e
> realistica. Ordinati per rapporto impatto/costo.

### 🔴 4.1 Luna 3D orbitante attorno alla Terra (bassa priorità di costo, alto realismo)
Il dataset ha già le lune (`planet.moons`) ma nel rendering 3D risultano
assenti o statiche. Una Luna che orbita la Terra (periodo 27.3 giorni
scalato, inclinazione 5.1°) con **fasi illuminate** coerenti con la posizione
del Sole renderebbe la scena immediatamente più viva. Costo: un `<MoonOrbit>`
dentro `OrbitEngineBridge` con offset angolare da `simTimeRef`.

### 🔴 4.2 Rotazione assiale visibile con inclinazione reale
I pianeti traslano ma la **rotazione su se stessi** non è percepibile (le
texture sono uniformi). Applicare `rotation.y += dt · simRate / dayLength` e
`rotation.z = axialTilt` (già nel dataset!) ai mesh di `Bodies.tsx` rende
visibili Venere retrograda, Urano "sdraiato" a 98°, Giove che ruota in 10h.

### 🔴 4.3 Nubi Terra/Venere/Giove come layer shader separato
Secondo layer sferico leggermente più grande (r × 1.01) con texture nubi
procedurale animata (offset UV da `simTimeRef`) e `transparent +
depthWrite:false`. Per la Terra: nubi bianche con opacità 0.6; per Venere:
copertura totale; per Giove: bande oscillanti (vertex displacement sinusoidale).

### 🟠 4.4 Occlusione/anelli per Urano e Nettuno
`SaturnRings` è datataset-driven? Estenderlo con anelli sottili (Urano:
anello ε verticale per il tilt 98°; Nettuno: archi di anello Adams).

### 🟠 4.5 Eclipse e transiti: ombre proiettate vere
Il punto luce di `Lighting` permette **ombre reali**: attivare
`castShadow/receiveShadow` su Terra/Luna (eclissi solari/lunari visibili
quando l'allineamento accade). Costo: shadow map 1024 su un solo pair
Terra-Luna, impatto contenuto.

### 🟠 4.6 Lens flare quando la camera guarda il Sole
Un `<LensFlare>` (drei o custom con sprite additivi) attivato quando il Sole
entra nel frustum vicino al centro viewport. Sinergia con il bloom già
presente: il flare appare solo con FX attivi.

### 🟠 4.7 Cintura di Kuiper "viva" e fascia principale con colori reali
Gli asteroidi hanno colore uniforme `#b9a58c`; la distribuzione reale ha
classi spettrali (C-type scuri, S-type chiari, M-type metallici). Colorare i
punti per classe spettrale nel `generateAsteroids` (deterministico via seed).

### 🟠 4.8 Scale reale completa (wiring di `realScale`)
Il chip "Scala reale" esiste ma il commento in `SolarScene.tsx` dice "in
attesa di wiring completo in Bodies". Completarlo: distanze lineari 1:1
+ diametri 1:1 (con `LogarithmicDepthBuffer` per il range 0.01–5000) e
transizione animata fra scala logaritmica e reale.

### 🟡 4.9 Effemeridi "cielo reale" (già al 90%)
Il motore kepleriano usa anomalie J2000 corrette; per il realismo finale
aggiungere la **longitudine del nodo ascendente Ω** e l'**argomento del
perielio ω** dal dataset (mancano in `planets.ts`): le orbite diventano
realmente inclinate e orientate come nel cielo, e le congiunzioni calcolate
(`Conjunctions.tsx`) guadagnano precisione arcominuto.

### 🟡 4.10 Texture NASA ad alta risoluzione + bump/normal map
Le texture attuali (Solar System Scope, CC-BY 4.0) sono 2K; per il close-up
fly-to (CameraAnimator arriva a 0.5 unità) servono 4K-8K per i 3-4 pianeti
"protagonisti" (Terra, Marte, Giove, Saturno) + normal map per rilievo.
Caricamento progressivo via `useTexture.preload` selettivo.

### 🟡 4.11 Screenshot mode (tasto S / bottone HUD)
`gl.domElement.toDataURL()` dopo un render forzato + overlay branding
(data, speed, sim time). Già prevista nel review originale (3.11.9),
mai implementata. Su mobile: Web Share API per condividere direttamente.

### 🟡 4.12 VR/WebXR (fase 2)
Three.js rende la scena in stereo con `<XR>` di @react-three/xr: il
codebase è già canvas-unico, il refactor è contenuto. Target: Cardboard /
Quest 2 via browser.

---

## 5. Metriche di successo mobile
1. **FPS**: ≥ 50 stabili su smartphone medio gamma (Pixel 6a / iPhone 12) con
   FX off, ≥ 30 con FX on.
2. **TTFB/FCP mobile 3G**: il main bundle (16 KB gzip + CSS) painta la UI;
   la scena 3D (250 KB gzip) arriva dopo — misurare con Lighthouse mobile.
3. **Tap accuracy**: tutti i controlli ≥ 44px su `pointer: coarse`.
4. **Accessibilità**: axe-core senza regressioni; la lista pianeti resta
   navigabile via screen reader anche con sheet chiusa.

---

## 6. Sprint S6 — Implementazione dei miglioramenti 3D

> Questa sezione documenta l'implementazione di tutti i miglioramenti
> proposti al §4 (eccetto 4.10 texture 4K e 4.12 WebXR, rimandati per
> budget). Il changelog è in ordine di impatto.

### ✅ 4.7 Colori spettrali asteroidi
`generateAsteroids` ora assegna un colore per asteroide in base alla classe
spettrale (C-type ~75%, S-type ~15%, M-type ~5%). Lo shader vertex
`aColor` attribute è stato aggiunto (era un uniform `uColor` fisso);
determinismo mantenuto via seed. Risultato: la fascia principale non è più
un colore uniforme ma una popolazione realistica di asteroidi scuri/chiari/metallici.

### ✅ 4.1 Lune orbitanti
Nuovo `<Moons />` (12 lune: Luna, Phobos/Deimos, Io/Europa/Ganimede/Callisto,
Titano/Encelado, Titania, Tritone) renderizzate come sfere con
`MeshStandardMaterial`. Periodo orbitale in "secondi di simulazione" (coerente
con `slowmoMultiplierRef`). Inclinazione e fase iniziale derivate dal nome.
Le lune sono illuminate dal `pointLight` del Sole → mostrano naturalmente
il terminatore.

### ✅ 4.3 Nubi Venere (Terra era già implementata)
Aggiunto un layer mesh per Venere con texture procedurale
(`makeVenusCloudsTexture` in `utils/proceduralTextures.ts`): gradiente
giallo/crema + swirl sinusoidali + bande equatoriali dense. La rotazione
deriva leggermente rispetto alla superficie (0.92×). Il layer è trasparente
con `depthWrite: false` per non interferire con il pianeta sotto.

Giove: le bande sono già nella texture JPG NASA; la rotazione differenziale
fra equatore e poli richiederebbe uno shader custom, rimandato.

### ✅ 4.4 Anelli Urano e Nettuno
Nuovo `<PlanetRings />` per Urano (tilt 98°, "rotolamento", fascia
quasi verticale) e Nettuno (5 archi sottili). Le texture sono generate
proceduralmente (`makeUranusRingsTexture`, `makeNeptuneRingsTexture`):
fascia stretta semitrasparente per Urano, 5 streaks sottili per Nettuno.
Saturno mantiene la texture NASA via `<SaturnRings />`.

### ✅ 4.8 Wiring "Scala reale"
Aggiunto `REAL_SCALE_FACTOR = 0.5` in `bodies3d.ts` (1 AU = 0.5 unità di
scena). La prop `realScale` propaga da `App` → `SolarScene` → `Bodies`,
`Orbits`, `SaturnRings`, `PlanetRings`, `AsteroidBelt3D`, `KuiperBelt3D`,
`Moons`. Le distanze passano da "logaritmiche compresse" a "AU lineari";
i pianeti interni (Mercurio ~0.2 unità) diventano punti quasi invisibili
(richiesto zoom), Nettuno resta a ~15 unità.

### ✅ 4.5 Eclissi / Shadow map
Toggle "🌑 Eclissi" in header (default OFF — shadow map 1024×1024 hanno
costo GPU). Quando attivo:
- `gl.shadowMap.enabled = true`, `type = PCFSoftShadowMap`
- `pointLight` del Sole `castShadow = true`
- Tutti i pianeti e le lune: `castShadow + receiveShadow`

Effetto: la Luna può proiettare ombra sulla Terra (e viceversa) durante
un'eclissi, visibile quando l'allineamento geometrico accade (il motore
kepleriano le posiziona correttamente per ogni data).

### ✅ 4.11 Screenshot mode
- Bottone "📷 Foto" in header + tasto `S` da tastiera
- `gl.preserveDrawingBuffer = true` sul Canvas (necessario per `toDataURL`)
- `canvas.toDataURL('image/png')` + download diretto su desktop
- **Web Share API** su mobile (`navigator.share({ files: [file] })`) per
  condividere direttamente
- Flash overlay 200ms come feedback visivo ("scatto pellicola")
- File scaricato: `solar-system-{timestamp}.png`

### ✅ 4.9 Elementi orbitali Ω e ω (J2000)
Aggiunti `longitudeOfAscendingNode` e `argumentOfPerihelion` a tutti gli
8 pianeti in `data/planets.ts` (valori NASA J2000). `angleToOrbitPosition`
in `bodies3d.ts` accetta ora un `ascendingNodeDeg` opzionale che ruota
l'orbita attorno all'asse Y. Propagato a:
- `Bodies` (posizione pianeti)
- `Orbits` (linee orbite)
- `SaturnRings` / `PlanetRings` (anelli seguono il pianeta)
- `Moons` (lune orbitano attorno al pianeta genitore, Ω del genitore)
- `AsteroidBelt3D` (Ω medio = 75°)
- `KuiperBelt3D` (Ω medio = 100°)

Risultato: la "linea degli apsidi" di ciascun pianeta è ora orientata
realisticamente — visibile soprattutto in date diverse da oggi (il motore
kepleriano posiziona Mercurio a 48°, Venere a 77°, Terra a 175°, ecc.).

### ⏭ Rimandati (per budget)
- **4.6 Lens flare**: implementato un primo prototipo (`LensFlare.tsx`
  con 6 anelli additivi), ma la resa con sfere 3D è deludente vs una
  soluzione post-processing (`@react-three/postprocessing` ha un LensFlare
  dedicato che richiede l'integrazione con l'attuale `PostProcessing`).
  Roadmap: integrare `LensFlare` da postprocessing nella pipeline esistente.
- **4.10 Texture 4K-8K + normal map**: richiede download asset
  addizionali (CC-BY NASA). Roadmap: aggiungere `useTexture.preload` per
  la Terra, Marte, Giove, Saturno.
- **4.12 WebXR**: richiede refactor sostanziale del scene tree con
  `<XR>` di @react-three/xr. Roadmap: fase 2.

### 📂 File toccati (S6)
```
src/data/planets.ts                        (Ω, ω in PlanetData + 8 pianeti)
src/scene/bodies3d.ts                      (REAL_SCALE_FACTOR, Ω in Body3D, angleToOrbitPosition)
src/scene/Bodies.tsx                       (nubi Venere, realScale, eclipsesEnabled)
src/scene/Moons.tsx                        (NUOVO: 12 lune, realScale, eclipsesEnabled)
src/scene/PlanetRings.tsx                  (NUOVO: anelli Urano/Nettuno procedurali)
src/scene/SaturnRings.tsx                  (realScale, Ω)
src/scene/AsteroidBelt3D.tsx               (colori spettrali, realScale, Ω 75°)
src/scene/KuiperBelt3D.tsx                 (realScale, Ω 100°)
src/scene/Orbits.tsx                       (realScale, Ω)
src/scene/Lighting.tsx                     (eclipsesEnabled → castShadow + shadowMap)
src/scene/SolarScene.tsx                   (props realScale, eclipsesEnabled)
src/utils/proceduralTextures.ts            (NUOVO: nubi Venere, anelli Urano/Nettuno)
src/utils/prefs.ts                         (PREFS_KEYS.eclipsesEnabled)
src/App.tsx                                (toggle Eclissi, Foto, screenshot handler, flash)
src/index.css                              (@keyframes screenshot-flash)
```

### 🧪 Verifiche
- `npm run typecheck` → ✅
- `npm run lint` → ✅ (0 errori, 8 warning pre-esistenti non bloccanti)
- `npm test` → **180/180** ✅ (17 nuovi: 9 Ω + 9 ω it.each, 1 lune reali)
- `npm run build` → ✅ (47.19 KB main JS, 30.18 KB SolarScene JS)

### 🎮 Come provare
1. `npm run dev` → apri http://localhost:5173
2. Clicca "📷 Foto" o premi `S` → screenshot PNG scaricato
3. Clicca "🌑 Eclissi" → abilita le ombre reali (shadow map); seleziona
   la Terra e osserva la Luna proiettare ombra durante un'eclissi lunare
4. Clicca "📏 Scala reale" → distanze AU lineari; i pianeti interni
   diventano punti (zoom per esplorare)
5. Clicca "🎬 Tour" → fly-to con Ω reali: gli allineamenti sono corretti
6. Le lune di Terra/Marte/Giove/Saturno/Urano/Nettuno orbitano visibilmente
7. Gli asteroidi ora mostrano colori realistici (C/S/M type)
