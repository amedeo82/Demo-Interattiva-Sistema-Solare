# 🎬 Revisione UI/UX — Verso una visione 3D cinematica

> Analisi del codebase corrente (React 18 + TS + Vite + Tailwind, rendering 2D
> via `transform` su un palco quadrato 800×800px) e roadmap per trasformarlo
> in una **visione 3D interattiva cinematografica** e immersiva.
>
> Legenda impatto: 🔴 alto · 🟠 medio · 🟡 nice-to-have

---

## 1. Diagnosi dello stato attuale

| Area | Stato | Limite percepito |
|---|---|---|
| Camera | Solo `scale` + `pan x/y` (`App.tsx:97-103`) | Nessuna prospettiva, niente profondità |
| Pianeti | `<div>` con `radial-gradient` + `box-shadow` glow (`Planet.tsx:113-181`) | Cerchi piatti, atmosfera = alone 2D |
| Sole | 54px, `radial-gradient` + 3 livelli di `box-shadow` (`index.css:70-84`) | "Sole emoji", non una stella |
| Sfondo | `Starfield` canvas singolo senza parallasse (`Starfield.tsx`) | Le stelle non reagiscono a zoom/pan |
| Saturno | Anello = `border: 2px solid` ruotato (`index.css:132-142`) | Anello "cerchio" piatto, non ellisse prospettica |
| UI | Pannelli `backdrop-blur` su sfondo nero (`index.css:158-165`) | "Dashboard", non cinema |
| Intro | Nessuna | Si atterra sulla scena senza contesto |
| Audio | Nessuno | Esperienza muta |
| Seguito | Solo offset 2D X/Y (`App.tsx:160-167`) | Camera "incollata" al pianeta, non lo orbita |
| Tempo | Bottone play/pause + slider 0.1×–20× | Niente "cenni" cinematografici (rallenty su incontri ravvicinati…) |

**Verdetto**: il progetto è un'ottima **enciclopedia interattiva** ma non ancora
un'**esperienza cinematografica**. Il salto passa da "cerchi che si muovono" a
"scena con profondità, illuminazione, atmosfera, audio e regia".

---

## 2. La visione target — *"Planetario personale"*

> L'utente atterra su una title sequence cinematografica, viene accolto da
> un flythrough automatico della scena, può "mettersi in cuffia" (narrazione
> opzionale) e pilotare una camera 3D con parallasse, profondità di campo e
> atmosfera. Seguire un pianeta significa orbitarlo, non incollarlo.

---

## 3. Raccomandazioni prioritarie

### 🔴 3.1 Camera 3D vera (parallasse + prospettiva + DOF)

**Problema**: tutto vive su un piano (`translate` + `scale`), `index.html` non
applica nessuna prospettiva. Mancano profondità e "respiro".

**Cosa fare**:
1. Aggiungere un container con `perspective: 1200px` e `transform-style:
   preserve-3d` su `main` (in `App.tsx:415`).
2. Sostituire `translate(x,y) scale(s)` con `translate3d(x,y,z) rotateX/rotateY
   scale(s)` su `.stage` (riga 435).
3. Introdurre uno stato `tilt` (pitch -25°…+25°, yaw -45°…+45°) pilotato da:
   - drag con tasto destro o `Shift+drag` (rotazione camera);
   - mouse position quando non si trascina (parallasse ambientale sottile,
     max ±3°).
4. **Profondità di campo**: dare a ogni pianeta un `translateZ` proporzionale
   alla distanza dal Sole, e applicare un leggero `filter: blur(N px)`
   dipendente da Z (es. `blur = clamp(|z|/600, 0, 1.5)px`).
5. Aggiungere `scroll` con rotellina **o** pinch = `scale` (come oggi) e
   drag = pan/rotazione; differenziare i binding in `App.tsx:263-303`.

**Effetto**: la scena "respira". Zoomare verso Giove non è solo ingrandire un
cerchio, è *avvicinarsi* nello spazio.

**Riferimento file**:
- `src/App.tsx:97-103` (stato zoom/pan)
- `src/App.tsx:415-438` (stage transform)
- `src/App.tsx:263-303` (input handling)

---

### 🔴 3.2 Illuminazione e materiali realistici sui pianeti

**Problema**: il "Realismo" toggle cambia texture/asteroidi, ma la luce resta
un gradiente piatto (vedi `Planet.tsx:104-109`). Venere e Terra non sembrano
illuminate dal Sole.

**Cosa fare**:
1. **Terminatore dinamico** (già presente in `Planet.tsx:73-75`) ma
   miglioralo: usa un **doppio gradiente** `radial-gradient(circle at <x>%
   <y>%, rgba(0,0,0,0.85) 30%, transparent 65%)` con la posizione della
   sorgente luminosa calcolata dalla posizione del Sole rispetto al pianeta,
   non solo dall'angolo.
2. **Riflesso speculare**: aggiungere un secondo layer `inset highlight`
   posizionato all'antipodo del terminatore, sfumato, con `mix-blend-mode:
   screen` per simulare il riverbero del Sole sul "lato giorno".
3. **Atmosfera come anello di scattering**: invece dell'alone piatto
   (`Planet.tsx:146-154`), usa un anello con bordo `box-shadow inset/outset`
   più stretto (1–4px) il cui colore dipende dal pianeta (azzurro per Terra,
   giallo-verde per Venere, ecc.). Aggiungi un `mix-blend-mode: screen` per
   evitare che sporchi il nero dello sfondo.
4. **Ombra portata** (subtle): un `box-shadow` radiale scuro sotto il pianeta
   proiettato sulla " superficie" dell'orbita (vedi 3.4).
6. **Texture animate**: usa `background-position-x` come già fai
   (`Planet.tsx:82`) — ma aggiungi un **ciclo nuvole separato** (più veloce
   della rotazione planetaria) per Terra, Venere, Giove. Mantieni la texture
   "di base" e sovrapporre un layer nuvole con `opacity` indipendente.

**Effetto**: i pianeti diventano **sfere vere**, illuminate, con transizione
giorno/notte morbida e atmosfera che brilla sul bordo.

---

### 🔴 3.3 Sole da "stella", non da "lampadina"

**Problema**: 54px, gradient hardcoded (`index.css:78-83`). Sembra un'emoji,
   non una stella con plasma, macchie e flare.

**Cosa fare**:
1. **Sole shader procedurale** (Canvas/WebGL): un disco con
   - rumore FBM (3 ottave) per granulazione;
   - **macchie solari** che si formano e dissolvono in ~10–30s;
   - **limb darkening** (bordi più scuri del centro, come nelle foto reali).
2. **Corona volumetrica**: oltre al pulse attuale (`index.css:85-92`),
   aggiungi un secondo strato corona a 200% di diametro con `mix-blend-mode:
   screen` e animazione indipendente (rotazione lenta).
3. **Lens flare** quando la camera "guarda" il Sole: una serie di ellissi
   semitrasparenti allineate Sole→centro viewport, con bagliore centrale
   quando il pianeta transita davanti (transit calculator già nel motore,
   aggiungi hit-test).
5. **Light bloom globale**: aggiungere un pass di bloom leggero sui pixel
   chiari del canvas di scena (vedi 3.8 su WebGL/post-processing).

**Effetto**: il Sole diventa il "protagonista luminoso" della scena.

---

### 🔴 3.4 Orbite come "piste" prospettiche

**Problema**: `.orbit-ring` (`index.css:95-104`) è un cerchio 1px uniforme.
Piatto, invisibile da lontano, identico per tutti i pianeti.

**Cosa fare**:
1. **Orte ellittiche** reali (già calcolate da Kepler in `kepler.ts`) ma
   renderizzate come **ellisse SVG** con semiassi `a` e `b = a√(1-e²)` e
   inclinata di `Ω` (longitudine del nodo ascendente) → aggiungi al
   dataset pianeti in `src/data/planets.ts`.
2. **Fade prospettico**: l'orbita si attenua con `radial-gradient` ai bordi
   e diventa più visibile dove il pianeta transita spesso.
3. **Discontinuità visive**: il segmento dietro al Sole leggermente più
   scuro (effetto eclissi/retroilluminazione).
4. **Indicatore pianeta corrente**: piccolo "marker" luminoso che scorre
   sull'orbita del pianeta selezionato (anello di destinazione).

---

### 🟠 3.5 Saturno (e Urano/Nettuno) con anelli veri

**Problema**: l'anello di Saturno è un `border: 2px` ellittico (`index.css:132-142`).
Urano e Nettuno non hanno anelli (li hanno, sottili, IRL).

**Cosa fare**:
1. **Anello come sistema multi-banda**: 5–8 ellissi concentriche SVG con
   `stroke-opacity` decrescente, leggera differenza di ellitticità tra
   banda e banda per simulare le divisioni di Cassini.
2. **Tilt realistico**: ogni anello inclinato diversamente rispetto all'asse
   (dato `ringTilt` in dataset).
4. **Ombra dell'anello sul disco** e **ombra del disco sull'anello**:
   gradient radiale scuro sul lato dell'anello opposto al Sole.
5. **Estendi a Urano e Nettuno** con anelli sottili, dataset-driven.

---

### 🟠 3.6 Profondità di scena: parallasse + polvere interstellare

**Problema**: lo sfondo stellato è un canvas singolo fisso (`Starfield.tsx`).
Non c'è parallasse con zoom/pan, niente polvere cosmica, niente galassia
lontana, niente "scala" tra vicino e lontano.

**Cosa fare**:
1. **3 layer di parallasse**:
   - Lontano (10%): nebulose + galassia lontana, moto lentissimo;
   - Medio (30%): ~200 stelle, parallasse debole;
   - Vicino (60%): ~100 stelle grandi + polvere, parallasse forte.
   Ogni layer si muove in proporzione inversa al proprio `depth`.
2. **Polvere interstellare**: gradient a bassa opacità, animate con leggera
   traslazione quando la camera si muove (effetto "nuvola").
3. **Nebulosa di Orione / Andromeda silhouette**: aggiungi un blob sfocato
   in lontananza come riferimento visivo.
4. **Via Lattea**: un arco di stelle dense più fitte lungo un piano inclinato,
   come una banda reale.

**Effetto**: la scena ha "scala" — l'utente sente che lo spazio è profondo.

---

### 🟠 3.7 Transizioni e regia cinematografica

**Problema**: l'app si apre direttamente sulla scena senza introduzione.
Quando si seleziona un pianeta, il pannello appare con `panel-in`
(`index.css:58-67`), ma la camera non reagisce. Nessun "cut", nessun
"rallenty", nessun "tour guidato".

**Cosa fare**:
1. **Loading/intro cinematografico**:
   - Schermata nera con titolo che sfuma in (`Sistema Solare Interattivo`);
   - flythrough automatico di 8 secondi che parte da dietro il Sole e si
     apre sulla scena dall'alto;
   - skip con click/tasto.
2. **Modal "Tour guidato"**: sequenza di inquadrature predefinite con
   transizioni morbide (es. "Venere → Terra → Luna → ritorno Terra") con
   caption testuale. Attivabile dal menu.
3. **Camera fly-to** (quando si seleziona un pianeta):
   - Easing `cubic-bezier(0.65, 0, 0.35, 1)` su 800ms;
   - Aggiungi `tilt` e `z` interpolati: la camera non solo centra il
     pianeta, ma ci **orbita** leggermente.
4. **Modal "Free camera"**: WASD + mouse look (rotazione libera con
   damping), ideale per "esplorare lo spazio". Toggle in header.
5. **Transizione eclissi**: quando la camera passa davanti al Sole,
   schermo leggermente desaturato per 1s, poi torna normale (effetto
   cinematografico).
6. **Time scrubbing con "rallenty"**: quando l'utente trascina lo slider
   del tempo, la simulazione entra in slow-motion 0.1× per dare peso al
   gesto.

**Effetto**: ogni interazione è "recitata", non "eseguita".

---

### 🟠 3.8 Audio: colonna sonora ambient + suoni d'ambiente

**Problema**: muto totale. Un'esperienza cinematografica senza audio è
incompleta.

**Cosa fare**:
1. **Soundtrack ambient procedurale** (Web Audio API):
   - Drone sub-bass (60°–100°) sempre attivo;
   - Pad armonici che cambiano armonia in base al pianeta selezionato
     (scala modale diversa per ogni pianeta, es. frigio per Marte, lidio
     per Giove);
   - Volume cross-fade 4s sui cambi di selezione.
2. **SFX contestuali**:
   - Click pianeta = "ping" morbido, pitch diverso per pianeta (frequenza
     fondamentale della sfera armonica del pianeta, mappa reale).
   - Apparizione pannello = whoosh.
   - Toggle pausa = suono metrico.
3. **Toggle audio** (header + scorciatoia `M`).
4. **Narrazione opzionale**: clip audio TTS/Web Speech per le schede
   pianeta, attivabile con icona 🔊 nella PlanetInfoPanel. Lingua: italiano,
   no overlap con la soundtrack (ducking -12dB sulla musica durante la
   voce).
5. **Riverbero spaziale** (ConvolverNode con IR sintetica): quando si entra
   in "Free camera", più riverbero; quando si seleziona un pianeta, meno.
   Simula lo spazio aperto.
6. **Rispettare `prefers-reduced-motion` e un nuovo `prefers-reduced-data`
   per l'audio** (skip automatico del soundtrack se disattivato).

---

### 🟠 3.9 UI: da "dashboard" a "HUD di veicolo spaziale"

**Problema**: header, sidebar, modali sono layout classici di webapp. Niente
li fa sembrare parte di un cockpit.

**Cosa fare**:
1. **Header → HUD superiore**: sottile barra translucida con micro-tipi
   monospace, indicatori di telemetria live (data corrente, simTime,
   coordinate camera), tick animati ai bordi come in un HUD militare.
2. **Sidebar → Pannello strumenti destro** (già esiste, ma):
   - Aggiungere **tachimetro orbitale** (velocità del pianeta selezionato in
     km/s) con lancetta animata;
   - **Indicatore "altitudine camera"** (zoom in scala logica);
   - **Coordinate polari** del puntatore mouse quando è sulla scena.
3. **Pulsanti "view"** (zoom +/-, reset, follow) → **cluster HUD in basso a
   sinistra** con bordi smussati e micro-glow viola (già presente
   visivamente in `App.tsx:500-533`).
4. **PlanetInfoPanel → Scheda ologramma**:
   - Bordo con **scan line** orizzontale animata (1 linea che attraversa
     il pannello ogni 4s, `repeating-linear-gradient`);
   - **Anteprima pianeta 3D** (WebGL inline, non CSS): il pianeta ruota
     piano, l'utente può orbitare col mouse per vederlo da ogni lato;
   - **Specchietti di confronto** ("vs Terra", "vs Giove") con barre
     proporzionali che si animano al mount (200ms ease-out).
5. **Modali (Compare/Quiz)** → mantenere lo stile, ma aggiungere:
   - Apertura con **zoom-from-corner** (partono da un angolo del pannello,
     non dal centro);
   - Chiusura con **flash bianco** di 1 frame (effetto "scatto pellicola");
   - Suono "shutter" opzionale.
6. **Tipografia**: usa un **display font** per i titoli (`Space Grotesk` o
   `Orbitron` già compatibile col theme), **mono** per i dati tecnici
   (`JetBrains Mono`). Già usi Inter — aggiungi i 2 sopra.
7. **Palette**: introduci token semantici (`--hud-primary`, `--hud-warning`,
   `--hud-success`) e mantieni un'unica temperatura colore (viola/blu
   notte) con un solo accento ambra per il Sole.

---

### 🟠 3.10 Modalità immersive / fullscreen / VR-ready

**Cosa fare**:
1. **Pulsante "Full immersion"**: nasconde header, sidebar, controlli;
   mostra solo la scena a tutto schermo. ESC per uscire (già bindato in
   `App.tsx:212-216`, ma intercetta anche ESC del browser nativo).
2. **Picture-in-picture del Sole**: quando si è in full immersion, piccolo
   HUD in basso con la mappa dell'orbita corrente (minimap, stile radar).
3. **VR/WebXR** (opzionale, fase 2): con **three.js** puoi rendere la scena
   in stereo. Il codebase attuale è DOM-based → refactor mirato a canvas
   unico per abilitare Three.js o PixiJS.

---

### 🟡 3.11 Micro-interazioni e dettagli "invisibili"

1. **Cursor custom** che cambia in base al contesto:
   - su pianeta: croce di mira invece di `pointer`;
   - durante drag: `grabbing` (già presente `App.tsx:417`);
   - durante free-look: cerchio con reticolo.
2. **Audio "tick" dell'orologio** quando cambia la data simulata (un tick
   secco come un metronomo).
3. **Hover su pianeta**: anteprima tooltip con nome + 1 dato chiave
   ("Distanza: 778 mln km"), 1.2s delay per non disturbare il movimento.
4. **Animazione di "arrivo"** del pannello info: il pianeta si "stacca"
   dalla scena, scala verso la schede, e la scheda si apre (split-flap).
5. **Selezione con doppio click** = "vai al pianeta" (camera fly-to).
6. **Doppio click su stella dello sfondo** = "informazioni sulla stella"
   (random flavour text con nome HIP, costellazione, magnitudine).
7. **Bussola orbitale**: in alto al centro, piccolo indicatore che mostra
   dove si trova la camera rispetto al Nord del sistema (utile in free-look).
8. **"Mission log"**: contatore live di orbite completate dal pianeta
   selezionato ("Giove ha completato 12 orbite da quando hai aperto la
   pagina"). Compare in `PlanetInfoPanel`.
9. **Screenshot mode**: tasto `S` = screenshot PNG con overlay branding
   leggero ("data, ora, simul time"). Usabile per condivisione social.
10. **"Slow zone"** quando la camera è molto vicina a un pianeta
    (slow-mo automatico), per apprezzare i dettagli della superficie.

---

### 🟡 3.12 Educazione come "discovery", non come "scheda"

La `PlanetInfoPanel` attuale (`PlanetInfoPanel.tsx`) è brava ma statica.
Aggiungi:

1. **Timeline interattiva** delle missioni del pianeta: clic su una missione
   = fly-to di un marker sulla scena (se il pianeta è selezionato,
   altrimenti apri modale con immagine).
2. **Quiz integrato nella scheda**: dopo aver letto la schede, piccolo
   pulsante "Mettimi alla prova" che apre una singola domanda relativa al
   pianeta appena letto.
3. **"Did you know" card** che appare come tooltip dopo 5s di selezione
   (auto-dismiss dopo 8s, dismiss su hover).
4. **Heatmap temperatura/orbita** come layer opzionale: una sottile barra
   colorata lungo l'orbita che mostra la temperatura media in funzione
   della distanza dal Sole.

---

### 🟡 3.13 Internazionalizzazione e accessibilità cinematografica

1. **Audio descrizione** per non vedenti: oltre alla TTS del pianeta
   selezionato, una "scena descritta" che narra cosa sta accadendo
   ("Marte passa davanti a Giove in questo momento").
2. **Subtitles** su qualsiasi clip audio (per non udenti).
3. **Modalità "no audio"** esplicita: il bottone Muto ricordato in un
   banner la prima volta.
4. **Effetti ridotti**: rispetta `prefers-reduced-motion` non solo con
   `animation-duration: 0.01ms` (riga `index.css:261-269`) ma introducendo
   varianti: in reduced-motion il fly-to diventa istantaneo, il parallax
   è disattivato, l'audio è disattivato di default.
5. **Contrasto**: controlla che `rgba(255,255,255,0.4)` (usato in molte
   label, es. `ControlsSidebar.tsx:17-22`) superi WCAG AA sullo sfondo.
   Diverse label sono al limite (4.0:1).
6. **Focus visibile** sui pianeti: già presente (`index.css:128-131`) ma
   aggiungi un **alone** oltre all'outline, per distinguerlo dalla scena.

---

## 4. Architettura tecnica raccomandata

### 4.1 Migrazione graduale a un renderer unico

L'attuale architettura DOM (`<div>` con `transform`) ha vantaggi (test
semplici, memoization fine) ma non scala verso un vero 3D. La roadmap:

| Fase | Scope | Stack |
|---|---|---|
| **A (subito)** | Aggiungere prospettiva CSS + tilt + DOF sul renderer DOM | Tailwind + CSS |
| **B (1-2 settimane)** | Refactor di AsteroidBelt + trails in canvas | Canvas 2D |
| **C (1 mese)** | Migrazione a **PixiJS** per stelle/asteroidi/sovereign rendering | PixiJS |
| **D (opzionale)** | Migrazione a **Three.js** per scena 3D completa, post-processing, VR | Three.js |

Una **via di mezzo** molto efficace: lascia il DOM per i pianeti (perché
interattivi e accessibili), ma sposta **stelle, nebulose, polvere, fasce,
flare** su un canvas a strati dietro la scena, in modo da poter applicare
post-processing (bloom, chromatic aberration, vignette).

### 4.2 Post-processing cinematografico

Una **pipeline di post-process** applicata a un canvas condiviso (stelle +
nebulose + flare) e opzionalmente al DOM via `backdrop-filter`:

1. **Bloom**: pixel con luminance > soglia vengono sfocati e aggiunti
   indietro (simula luce che "sborda").
2. **Vignette**: bordi dello schermo più scuri (focus sul centro).
3. **Chromatic aberration**: sottile spostamento RGB ai bordi (effetto
   "lente cinematografica").
4. **Film grain**: rumore animato a bassa intensità (3-5%) per dare
   "pellicola".
5. **Color grading**: tonalità leggermente più fredda ai bordi, più calda
   verso il Sole (warm/cool LUT).
6. **Lens distortion** sottile (barrel distortion ai bordi).

Tutti devono rispettare `prefers-reduced-motion` → disattivare grain e
lens distortion.

### 4.3 Stato e performance

Il codebase ha già fatto un ottimo lavoro di **imperative ref** per i 60fps
(`App.tsx:60-66`, commenti chiari su `subscribeFrames`). Mantieni questo
pattern quando aggiungi:

- Nuove sottoscrizioni (es. `useLensFlare`) devono usare lo stesso pattern
  `subscribeFrames`;
- I nuovi stati UI (audio on/off, free camera on/off, immersion mode)
  vanno in `usePersistentState` come `realistic` e `showLabels` (vedi
  `App.tsx:80-94`).

---

## 5. Roadmap in 6 sprint

| Sprint | Focus | Deliverable |
|---|---|---|
| **S1** | Camera tilt + parallasse | `perspective`, drag-rotazione, 3 layer starfield |
| **S2** | Illuminazione & Sole | Terminatore con sorgente luminosa, lens flare, sole shader |
| **S3** | Transizioni & regia | Intro flythrough, camera fly-to con easing, free-camera |
| **S4** | UI HUD | Tipografia, scan lines, planet 3D preview nel pannello |
| **S5** | Audio | Soundtrack procedurale, SFX, toggle, narrazione opzionale |
| **S6** | Post-processing | Bloom, vignette, grain, LUT; full-immersion mode |

---

## 6. Cose da NON fare (anti-pattern)

- ❌ **Non sostituire tutto con Three.js subito**: il progetto è solido e
  testato. Refactor graduale.
- ❌ **Non sovraccaricare di animazioni**: tutto ciò che si muove distrae.
  Ogni movimento deve avere uno scopo narrativo (follow camera, evidenzia
  una relazione, guida l'attenzione).
- ❌ **Non mettere audio di default senza toggle visibile**: l'audio inaspettato
  in una pagina web è una delle esperienze peggiori. Mostra sempre un
  controllo chiaro.
- ❌ **Non rompere l'accessibilità esistente**: ARIA roles, keyboard nav,
  screen reader announcements (`App.tsx:547-551`) sono ottimi. Il 3D non
  può eliminare la modalità "lista pianeti" in sidebar.
- ❌ **Non perdere la modalità "enciclopedia"**: il progetto è anche educativo.
  L'esperienza cinematografica deve essere **un layer sopra**, non un
  rimpiazzo.

---

## 7. Metriche di successo

Per validare che il salto in qualità è reale, misura:

1. **Tempo medio di esplorazione** (analytics opzionale, rispettoso del GDPR):
   da ~30s attuali a >2 minuti.
2. **% utenti che aprono almeno un pannello info**: target >70%.
3. **% utenti che attivano audio**: target 20-30% (alto = valore percepito).
4. **% utenti che attivano free camera**: target 10-15%.
5. **Performance**: 60fps stabili su laptop integrato (no regression dal
   attuale).
6. **Accessibility score** (axe-core): non regredire.

---

## 8. Conclusione

Il progetto è una **piattaforma eccellente** su cui costruire. La base
tecnica (kepleriano reale, dataset ricco, architettura a ref imperativi
per i 60fps, accessibilità curata, test) è già da "production-grade".

Il salto verso il "cinematico" è soprattutto **registico**:
- **profondità** (camera 3D, parallasse, DOF),
- **illuminazione** (Sole vero, terminatore, atmosfera),
- **ritmo** (intro, fly-to, rallenty, tour),
- **HUD** (telemetria, scan lines, typography),
- **suono** (soundtrack, SFX, narrazione).

Una volta implementati anche solo S1+S2+S3, la differenza percepita
sarà enorme: da "schema animato del sistema solare" a **"planeta-rio
personale"**. 🎬🪐

---

## 9. Changelog implementativo

### ✅ Sprint S1 — Camera 3D cinematografica
- **S1.1** `index.css` → classe `.scene-3d` con `perspective: 1400px` sul `<main>` e `.stage-3d` con `transform-style: preserve-3d`. Stage transform ora include `rotateX(pitch) rotateY(yaw)`.
- **S1.2** `App.tsx` → stato `tilt { pitch, yaw }` (pitch iniziale -10°). Ref `rotateRef` per drag-orbit. **Right-click drag** *o* **Shift+left drag** = rotazione camera (pitch clampato a [-45°, 25°], yaw a [-60°, 60°]). Context menu nativo soppresso su `<main>`. Nuove scorciatoie: `↑/↓` tilt ±3°, `R` reset completo, `T` reset tilt. `resetView()` ora resetta anche il tilt.
- **S1.3** `Starfield.tsx` + `index.css` → classe `.starfield-parallax` con `transition 80ms` che trasla il canvas in base alle CSS var `--parallax-x/y` impostate sul `<main>` (proporzionali al tilt, fattore 2.2×).
- **S1.4** `index.css` → overlay `.vignette` con due gradient (oscuramento bordi + alone caldo sotto) in `mix-blend-mode: multiply`.

### ✅ Sprint S2 — Illuminazione realistica
- **S2.1** `Planet.tsx` → terminatore riscritto: ora calcola `lightX = 50 − sin(angleRad)·50`, `lightY = 50 + cos(angleRad)·50` dalla longitudine eliocentrica, e applica un `radial-gradient(circle at <lightX>% <lightY>%, transparent 38%, nightOp 88%)`. Risultato: il confine giorno/nighte segue la geometria reale pianeta-Sole, non un gradiente lineare "tagliato".
- **S2.2** `Planet.tsx` → nuovo layer `<div ref={specularRef} className="planet-specular" />` con gradient bianco caldo posizionato all'antipodo del terminatore. `mix-blend-mode: screen` per non sporcare il nero dello sfondo.
- **S2.3** `Planet.tsx` + `index.css` → atmosfera come doppio radial-gradient con due fasce (60-70% e 80-90%) e `mix-blend-mode: screen` (vedi `.planet-atmo`). Risultato: alone luminoso sottile e colorato che "sporge" dal bordo del pianeta come Rayleigh scattering.
- **S2.4** `index.css` → Sole completamente ridisegnato: disco `.sun-core` 64px con doppio gradient (limb darkening + interno brillante), layer `.sun-plasma` con due `conic-gradient` opposti in rotazione continua (30s/loop), 3 macule `.sun-spot` scure che si spostano sul disco, doppia corona (interna pulse 5s, esterna reverse 8s con `filter: blur(2px)`).

### 📂 File toccati (S1+S2)
```
src/index.css                       (S1.1, S1.3, S1.4, S2.3, S2.4)
src/App.tsx                          (S1.1, S1.2, S1.3)
src/components/Starfield.tsx         (S1.3)
src/components/Planet.tsx            (S2.1, S2.2, S2.3)
src/components/ControlsSidebar.tsx   (S1.2 — shortcut hint)
src/App.flows.test.tsx               (test selector aggiornato)
README.md                            (S1+S2 menzionati in Accessibilità & UX)
```

### 🧪 Verifiche
- `npm run typecheck` → ✅
- `npm run lint` → ✅
- `npm test` → 141/141 ✅ (include nuovo `orbit.motion.test.tsx`)
- `npm run build` → ✅ (181 kB JS, 32 kB CSS)

### 🐞 Bug fix scoperti durante l'integrazione (post-S1/S2)
1. **`useOrbitEngine` — `NO_ANOMALIES` ricreata come nuovo `{}` ad ogni render** (bug pre-esistente, **critico**)
   - Sintomo: i pianeti "tornano indietro" alla posizione iniziale ogni ~250 ms, visibilmente identico a un'animazione che "ticka avanti e indietro".
   - Causa: `computeInto` (`useMemo` con deps `[planets, starts, anomalies]`) veniva ricreato ad ogni render perché `NO_ANOMALIES = {}` era dichiarato dentro l'hook → identità sempre nuova. L'effect `[startSimTime, computeInto]` re-innescava, resettando `simTimeRef.current = 0` ad ogni re-render di App (~4Hz, ogni pubblicazione di `useSimTime`).
   - Fix: `NO_ANOMALIES` spostato a livello modulo, con commento esplicito sul perché DEVE essere lì.
   - Test anti-regressione: `src/orbit.motion.test.tsx` asserisce che la Terra (e Giove) si allontanano monotonicamente dal punto di partenza su 8 frame consecutivi.

2. **CSS — `transform-style: preserve-3d` + `will-change: transform` + `mix-blend-mode: multiply`** (sospetti bug compositor GPU)
   - Sintomo: in alcuni browser (Chrome/Firefox) `transform-style: preserve-3d` combinato con `will-change: transform` su un child animato imperativamente può causare il "flattening" del 3D context, facendo sì che il compositor scarti gli aggiornamenti successivi del transform.
   - Inoltre, `mix-blend-mode: multiply` sulla vignette forza un percorso di rendering non-GPU per gli elementi sotto, rompendo l'ottimizzazione 60fps delle animazioni imperative.
   - Fix:
     - Rimosso `transform-style: preserve-3d` da `.stage-3d` (la "3D" è data da `perspective` sul main + `rotateX/rotateY` sul palco, sufficienti).
     - Rimosso `backface-visibility: hidden` da `.planet` (non necessario senza preserve-3d e potenzialmente dannoso).
     - Vignette senza `mix-blend-mode`, spostata **dopo** lo stage nel DOM con `z-index: 0` (alpha compositing normale).
   - Risultato: il 3D tilt della camera è preservato, l'animazione imperativa 60fps è stabile.

### 🎮 Come provare
1. `npm run dev`
2. Apri http://localhost:5173
3. **Tieni premuto il tasto destro** del mouse sulla scena e trascina → la camera ruota in 3D
4. **Shift+trascina** col tasto sinist per la stessa cosa (alternativa)
6. Le stelle sullo sfondo si muovono in parallasse rispetto alla rotazione
5. Premi `R` per resettare tutto, `T` per resettare solo il tilt
6. Osserva: il terminatore dei pianeti ora segue la posizione reale del Sole (più sfumato del precedente) e il lato giorno ha un bagliore speculare
---

## 10. Sprint Three.js (F0–F15) — Migrazione a WebGL 3D

### Contesto
Ispirato dal feedback utente (lo screenshot della scena 2.5D mostrava
cerchi piatti da 12–30px, non "modelli 3D"), il piano è stato approvato
per migrare il rendering a Three.js puro tramite react-three-fiber.

### Decisioni utente
- **Scala distanze**: logaritmica (`log10(1 + d_au) * 50`). Mercurio
  visibile a ~9 unità, Nettunno a ~75 unità.
- **Scala diametri**: PROPORZIONALE ai km reali (Giove 11.2× Terra,
  Mercurio 0.38× Terra), con fattore costante che mantiene tutti
  visibili.
- **Post-processing**: attivo di default con toggle `X` (chip in header).

### Risultati finali (F15)

| Metrica | Risultato |
|---|---|
| typecheck | ✅ |
| lint | ✅ (2 warning useMemo deps, non bloccanti) |
| test | **141/141** ✅ |
| build | ✅ |
| Bundle main | 167.88 KB (55.21 KB gzip) |
| Bundle SolarScene (lazy) | 937.39 KB (251.83 KB gzip) |

### Architettura finale
- **App.tsx** gestisce state React + motore orbitale (invariato).
- **`<SolarScene>`** è lazy-loaded: scaricato solo quando serve.
- **Scena 3D**: `Sun3D` (sphere + emissive + corona shader), `Bodies`
  (8 pianeti con MeshStandardMaterial + texture NASA), `SaturnRings`
  (RingGeometry + texture procedurale), `Orbits` (Line ellittiche),
  `StarsBackground` (drei `<Stars>`), `Lighting` (ambient + pointLight
  + directional rim), `CameraRig` (drei OrbitControls + tilt custom),
  `PostProcessing` (Bloom + Vignette).
- **Bridge**: `OrbitEngineBridge` espone `positionsRef` del motore
  orbitale ai figli dentro `<Canvas>` via Context. Letti dentro
  `useFrame` per zero re-render React.

### File nuati
```
src/scene/SolarScene.tsx       wrapper wrapper wrapper Canvas + Suspense
src/scene/Bodies.tsx              sfera 3D dei pianeti
src/scene/Sun3D.tsx              sfera emissiva + corona proced
src/scene/SaturnRings.tsx        RingGeometry + texture proced
src/scene/Orbits.tsx             ellissi 3D
src/scene/Lighting.tsx           pointLight + ambient + rim
src/scene/StarsBackground.tsx    drei <Stars>
src/scene/CameraRig.tsx          OrbitControls + tilt pitch
src/scene/PostProcessing.tsx     Bloom + Vignette
src/scene/OrbitEngineBridge.tsx  Context per positionsRef
src/scene/bodies3d.ts            manifest + scale functions
src/store/ui.ts                  zustand store
public/textures/planets/*.jpg    9 texture NASA (CC-BY 4.0)
public/textures/planets/saturn_rings.png    procedurale
scripts/make-saturn-rings.cjs    generatore saturn_rings.png
```

### File rimossi
```
src/components/Starfield.tsx    (sostituito da drei <Stars>)
src/components/Planet.tsx     (sostituito da R3F <mesh>)
src/components/Planet.test.tsx (era specifico al DOM Planet)
```

### Test aggiornati
- `orbit.motion.test.tsx` riscritto per leggere `keplerPosition(t)` direttamente
  invece di leggere lo style transform dei pianeti DOM (non più esistenti).
- `App.test.tsx`, `App.flows.test.tsx`: usano i bottoni della sidebar
  (`Mercurio`, `Terra`, …) invece di `Seleziona ...` (DOM rimossi).
- `src/test/setup.ts` aggiornato con polyfill ResizeObserver,
  IntersectionObserver e mock WebGL context (richiesti da R3F/drei).

### Texture credits
Vedi `public/textures/README.md`. Le 9 immagini planetarie derivano
dalla collezione Solar System Scope (CC-BY 4.0). Gli anelli di Saturno
sono generati proceduralmente.

---

## 11. Sprint S3 — Transizioni e regia cinematografica

### Risultati finali
- typecheck ✅
- lint ✅ (3 warning non bloccanti)
- test **147/147** ✅
- build ✅ senza warning

### Cosa è stato fatto
- **S3.1** `CameraAnimator.tsx`: tween imperativa `useFrame` + `easeInOutCubic`
  per fly-to al pianeta selezionato (1.2s). Disabilita OrbitControls durante
  la tween per non interferire.
- **S3.2** Intro flythrough: la camera parte da (0, 100, 220) al mount e
  scivola a (0, 70, 100) in 3s con lo stesso easing.
- **S3.3** `IntroOverlay.tsx`: title sequence cinematografico DOM puro
  ("Sistema Solare" + "Interattivo · 3D") che sfuma in, sta 1.5s, sfuma
  via in 1.2s. z-index alto, non blocca interazioni.
- **S3.4** Cinematic slow-mo: `slowmoMultiplierRef` aggiunto a
  `useOrbitEngine`. Su planet select: `multiplier = 0.25` per 2.5s, poi
  torna a 1. Effetto: la scena "rallenta" intorno al momento del fly-to.
- **S3.5** Free camera toggle: chip `🛰 Free Cam` in header, propaga a
  `CameraRig`. Quando ON, i `minDistance/maxDistance` si allargano e il
  tilt lock viene disabilitato (orbita libera completa).
- **S3.6** Tour guidato: chip `🎬 Tour` + `TourController.tsx`. Cicla
  automaticamente: panoramica → Terra → Saturno (3 flyTo con tween da
  1.8s + pausa 0.8s). Overlay DOM mostra lo step attivo.
- **Test** `easing.test.ts`: 6 test per le funzioni di easing
  (easeInOutCubic, easeOutCubic, easeInQuad, clamp01).

### File creati
```
src/scene/easing.ts
src/scene/easing.test.ts
src/scene/CameraAnimator.tsx
src/scene/TourController.tsx
src/components/IntroOverlay.tsx
```

### File modificati
```
src/scene/SolarScene.tsx           (integra CameraAnimator + TourController)
src/scene/CameraRig.tsx            (forwardRef + freeCamera prop)
src/hooks/useOrbitEngine.ts        (slowmoMultiplierRef param)
src/App.tsx                        (intro state, slowmo refs, Free Cam + Tour chips)
```

---

## 12. Sprint S4 — UI HUD cinematografico

### Risultati finali
- typecheck ✅
- lint ✅ (4 warning useMemo deps, non bloccanti)
- test **149/149** ✅
- build ✅ senza warning

### Cosa è stato fatto
- **S4.1** Tipografia cinematografica: Space Grotesk (display) + JetBrains
  Mono (dati numerici) caricati via Google Fonts in index.html. CSS
  utilities `.font-display` / `.font-mono` per uso cross-component.
- **S4.2** TelemetryHUD + CameraTracker: barra DOM con chip `SPD` / `DATE`
  / `DIST` / `FPS`. La distanza e gli FPS sono aggiornati a 60Hz dentro
  useFrame (CameraTracker) e letti a 2Hz dal DOM HUD. Zero re-render React
  per il loop rAF.
- **S4.3** HoverCrosshair + HoverRaycaster: mirino SVG che segue il mouse,
  vira al viola quando è sopra un corpo, e mostra un badge in basso con
  coordinate 3D (X/Z proiettate sul piano dell'eclittica) o nome del corpo
  hovered. Three.js Raycaster dentro Canvas.
- **S4.4** useOrbitCounters hook + Mission Log: traccia quante orbite
  complete ha fatto ciascun pianeta dall'apertura della pagina (rileva il
  wrap-around 359°→0°). Mostrato nel pannello info come "Orbite in
  questa sessione" + "Orbite totali (tutti i corpi)".
- **S4.5** Scan line CSS sui pannelli: `.panel-scanline::after` con
  `@keyframes scanline` che attraversa il pannello orizzontalmente ogni 6s.
  Disattivato in `prefers-reduced-motion` per accessibilità.

### File creati
```
src/scene/TelemetryHUD.tsx     ← DOM HUD con chip SPD/DATE/DIST/FPS
src/scene/CameraTracker.tsx    ← useFrame tracker live (dentro Canvas)
src/scene/HoverRaycaster.tsx   ← Three.js raycast mouse → world hit
src/components/HoverCrosshair.tsx ← DOM mirino + badge coordinate
src/hooks/useOrbitCounters.ts   ← counter orbite imperativo
src/hooks/useOrbitCounters.test.ts ← 2 test
```

### File modificati
```
src/index.css                  ← font tokens, .panel-scanline, scanline keyframes
index.html                     ← Google Fonts link
src/scene/SolarScene.tsx       ← integra CameraTracker + HoverRaycaster
src/components/PlanetInfoPanel.tsx ← Mission log + panel-scanline
src/App.tsx                     ← refs telemetry + montaggio HUD/crosshair
```

---

## 13. Sprint S5 — Mobile responsive

> Vedi `docs/MOBILE-UX.md` §2 per la versione completa (analisi dello
> stato pre-redesign, soluzioni implementate, bug fix scoperti,
> verifiche e modalità di prova). Di seguito solo un changelog
> compatto per continuità storica.

### Risultati finali

- typecheck ✅ · lint ✅ (0 errori, 5 warning pre-esistenti) · test **163/163** ✅ · build ✅
- Bundle main: 47.19 KB gzip 16.04; SolarScene (lazy): 25.66 KB gzip 8.22

### Cosa è stato fatto
- **S5.1** `src/hooks/useMedia.ts` (NUOVO): `useMediaQuery(query)` + `useIsMobile()` matchMedia-based, reattivo a rotazione/resize
- **S5.2** `App.tsx`: header compatto con chip secondari (`hidden sm:block`) confluiti nel menu "⋯" su mobile (Etichette, Realismo, Scala reale, FX)
- **S5.3** `App.tsx`: **bottom sheet controlli** su < 1024px (`.mobile-sheet` con transizione 320ms `cubic-bezier(0.65,0,0.35,1)`, max-h 75dvh), FAB `.mobile-fab` con safe-area, selezione pianeta chiude la sheet
- **S5.4** `PlanetInfoPanel.tsx`: bottom sheet full-width (72dvh, grab bar) su mobile, drag disattivato
- **S5.5** `SolarScene.tsx`: tier performance mobile — `dpr=[1,1.25]` vs `[1,1.75]`, `AsteroidBelt3D count={200}`, `KuiperBelt3D count={70}`, `postFxEnabled` default `false` al primo avvio
- **S5.6** `index.css`: `.mobile-sheet`, `.mobile-sheet-grip`, `.mobile-fab`, `pb-safe`/`pt-safe` (env safe-area), `@media (pointer: coarse)` target ≥ 44px, `-webkit-tap-highlight-color: transparent`
- **S5.7** `index.html`: `viewport-fit=cover, user-scalable=no, maximum-scale=1.0` (pinch del browser disattivato per non confliggere con OrbitControls)
- **S5.8** `Timeline.tsx`: etichette `±2y` nascoste sotto 640px; thumb 20px su touch
- **S5.9** `OnboardingTip.tsx`: prop `bottom` per ancoraggio mobile sopra la sheet
- **S5.10** `index.css` (bug fix pre-esistenti): aggiunti stili per `.onboard-tip`/`.onboard-tip-close`, `.timeline-track`/`.fill`/`.thumb`, `.view-btn`, `.speed-slider` (erano mancanti in `index.css` — tip, scrubber e pulsanti vista erano renderizzati "nudi")
- **Test** `src/hooks/useMedia.test.tsx`: 6 test hook (reattivo a matchMedia change) + 4 test App mobile (FAB, sheet open/close, pannello info bottom sheet, menu extra)

### File creati
```
src/hooks/useMedia.ts            ← useMediaQuery + useIsMobile
src/hooks/useMedia.test.tsx      ← 10 nuovi test
```

### File modificati
```
src/App.tsx                      ← useIsMobile, sheet + FAB, overflow menu mobile, OnboardingTip adattivo
src/components/PlanetInfoPanel.tsx ← bottom sheet mobile
src/components/OnboardingTip.tsx ← prop bottom + stili CSS
src/components/Timeline.tsx      ← etichette compatte
src/components/ControlsSidebar.tsx ← pb-safe, kbd nascosti su mobile
src/scene/SolarScene.tsx         ← prop mobile (dpr + count)
src/scene/AsteroidBelt3D.tsx     ← prop count (200 su mobile)
src/scene/KuiperBelt3D.tsx       ← prop count (70 su mobile)
src/index.css                    ← mobile sheet, FAB, safe-area, touch, fix .onboard-tip/.timeline/.view-btn/.speed-slider
index.html                       ← viewport-fit=cover, user-scalable=no
```

---

## 14. Sprint S6 — Realismo 3D

### Risultati finali

- typecheck ✅ · lint ✅ (0 errori, 8 warning pre-esistenti) · test **180/180** ✅ (17 nuovi: 9 Ω + 9 ω it.each + 1 lune) · build ✅
- Bundle SolarScene: 30.18 KB gzip 10.35 (vs 25.66 KB di S5 — +5KB per lune/anelli/Ω)

### Cosa è stato fatto
- **S6.1** `src/data/planets.ts`: aggiunti `longitudeOfAscendingNode` e `argumentOfPerihelion` a tutti gli 8 pianeti (valori NASA J2000)
- **S6.2** `src/scene/bodies3d.ts`: `Body3D` esteso con Ω/ω opzionali; `angleToOrbitPosition` accetta `ascendingNodeDeg`; `REAL_SCALE_FACTOR = 0.5` (1 AU = 0.5 unità); Ω/ω propagati a `Mercury…Neptune`
- **S6.3** `src/scene/Moons.tsx` (NUOVO): 12 lune (Luna, Phobos+Deimos, Io+Europa+Ganimede+Callisto, Titano+Encelado, Titania, Tritone) come sfere illuminate dal pointLight; terminatore naturale; periodo in secondi di sim
- **S6.4** `src/utils/proceduralTextures.ts` (NUOVO): `makeVenusCloudsTexture` (swirl giallastri procedurali), `makeUranusRingsTexture` (fascia sottile), `makeNeptuneRingsTexture` (5 archi)
- **S6.5** `src/scene/Bodies.tsx`: nubi Venere + layer mesh separato (oltre a Terra); rotazione assiale proporzionale a `simRate` (esistente); atmosfera Fresnel (esistente)
- **S6.6** `src/scene/PlanetRings.tsx` (NUOVO): anelli Urano (tilt 98° "rotolamento") e Nettuno (5 archi) procedurali; Saturno mantiene `SaturnRings.tsx` con texture NASA
- **S6.7** `src/scene/AsteroidBelt3D.tsx`: colori spettrali C/S/M (75/15/5%) via shader `aColor` attribute (era uniform `uColor` fisso); Ω medio 75°; supporto `realScale`
- **S6.8** `src/scene/KuiperBelt3D.tsx`: supporto `realScale`; Ω medio 100°
- **S6.9** Wiring `realScale` in `Bodies`, `Orbits`, `SaturnRings`, `PlanetRings`, `AsteroidBelt3D`, `KuiperBelt3D`, `Moons` (toggle "📏 Scala reale" ora wirato)
- **S6.10** `src/scene/Lighting.tsx`: supporto `eclipsesEnabled` → `gl.shadowMap.enabled = true` + `type = PCFSoftShadowMap` + `pointLight.castShadow = true`
- **S6.11** Toggle "🌑 Eclissi" in App (header desktop + menu mobile); `castShadow + receiveShadow` su tutti i pianeti e le lune
- **S6.12** `SolarScene.tsx`: `preserveDrawingBuffer: true` per screenshot mode
- **S6.13** Screenshot mode in App: tasto `S` + bottone "📷 Foto"; `canvas.toDataURL` + Web Share API su mobile + flash 200ms (`@keyframes screenshot-flash`)
- **Test** `planets.validate.test.ts`: 9 it.each per Ω + 9 per ω nel range [0, 360); 1 test "lune principali reali" (Earth, Mars×2, Jupiter×4, Saturn×2, Uranus, Neptune)
- **Test** S5 (retro-compatibili): 10 nuovi test mobile in `useMedia.test.tsx`

### File creati
```
src/scene/Moons.tsx                  ← 12 lune 3D orbitanti
src/scene/PlanetRings.tsx            ← anelli Urano + Nettuno procedurali
src/utils/proceduralTextures.ts      ← CanvasTexture per nubi Venere, anelli Urano/Nettuno
```

### File modificati
```
src/data/planets.ts                  ← Ω + ω per 8 pianeti
src/scene/bodies3d.ts                ← REAL_SCALE_FACTOR, Ω/ω in BODIES_3D, angleToOrbitPosition
src/scene/Bodies.tsx                 ← nubi Venere, realScale, eclipsesEnabled
src/scene/SaturnRings.tsx            ← realScale, Ω
src/scene/AsteroidBelt3D.tsx         ← colori spettrali, realScale, Ω 75°
src/scene/KuiperBelt3D.tsx           ← realScale, Ω 100°
src/scene/Orbits.tsx                 ← realScale, Ω
src/scene/Lighting.tsx               ← eclipsesEnabled → castShadow + shadowMap
src/scene/SolarScene.tsx             ← props realScale, eclipsesEnabled, preserveDrawingBuffer
src/utils/prefs.ts                   ← PREFS_KEYS.eclipsesEnabled
src/App.tsx                          ← toggle Eclissi, Foto, screenshot handler, flash overlay
src/index.css                        ← @keyframes screenshot-flash
```

---

## 15. Sprint S7 — Manutenzione e aggiornamento dipendenze

> Aggiornamento delle dipendenze alle ultime versioni compatibili, senza
> introdurre regressioni (vedi `package.json` aggiornato e changelog in
> fondo al README).

### Risultati finali

- typecheck ✅ · lint ✅ (0 errori, 8 warning pre-esistenti) · test **180/180** ✅ · build ✅
- Bundle: drei-vendor gzip 119.91 → 161.51 KB (R3F 9 / drei 10 aggiungono ~40KB)

### Cosa è stato fatto
- **S7.1** Patch/minor aggiornati: `@tailwindcss/vite` 4.1.7 → 4.3.3, `tailwindcss` 4.1.7 → 4.3.3, `@testing-library/jest-dom` 6.9.1 → 7.0.1, `eslint` 10.11 → 10.12, `globals` 17.12 → 17.13, `jsdom` 29.1.1 → 30.1.2, `prettier` 3.9.9 → 3.9.10, `typescript-eslint` 8.71.0 → 8.71.1
- **S7.2** Blocco React 19 + R3F 9 + Drei 10 + Postprocessing 3 + Zustand 5 aggiornato insieme (R3F 9 richiede React 19, drei 10 richiede R3F 9, postprocessing 3 richiede R3F >=9.7)
  - `react` 18.2.0 → 19.3.0, `react-dom` 18.2.0 → 19.3.0
  - `@types/react` 18.2.0 → 19.0.0, `@types/react-dom` 18.2.0 → 19.0.0
  - `@react-three/fiber` 8.18.0 → 9.8.1
  - `@react-three/drei` 9.122.0 → 10.7.9
  - `@react-three/postprocessing` 2.19.1 → 3.2.0
  - `zustand` 4.5.7 → 5.0.15
- **S7.3** `src/scene/AsteroidBelt3D.tsx` e `KuiperBelt3D.tsx`: typing dei `pointsRef` aggiornato per riflettere le nuove firme di r3f 9 (che hanno tipi più stretti sui `Points<BufferGeometry, ...>`); cast esplicito sul ref callback per non rompere l'inferenza
- **S7.4** README, FEATURES.md, MOBILE-UX.md aggiornati con il nuovo stack, la galleria screenshot rigenerata (`docs/images/01-home.png` … `08-mobile-info.png`)

### Rimandati
- Vite 8 (rolldown): major significativo separato
- Vitest 5: richiede Node 20+ e API cambiate
- TypeScript 7: major separato
- R3F 9 + Drei 10 breaking changes in alcuni hook (`useThree` internals): tutti mitigati
- 4.6 Lens flare: prototipo rimosso (resa deludente con sfere 3D) — richiede integrazione `postprocessing` LensFlare (rimandato)
- 4.10 Texture 4K-8K + normal map: richiede download asset addizionali CC-BY NASA
- 4.12 WebXR: refactor sostanziale con `<XR>` di @react-three/xr

### File modificati
```
package.json                  ← versioni bump Fase 1 + Fase 2
package-lock.json             ← rigenerato
src/scene/AsteroidBelt3D.tsx  ← typing Points<BufferGeometry, ShaderMaterial>
src/scene/KuiperBelt3D.tsx    ← typing Points<BufferGeometry, ShaderMaterial>
README.md                    ← stack + funzionalità aggiornate, galleria con 8 screenshot
docs/FEATURES.md              ← appendici S5 + S6 + changelog
docs/UI-UX-REVIEW.md          ← changelog S13–S15
docs/MOBILE-UX.md             ← già aggiornato in S6
docs/images/                  ← 8 screenshot PNG rigenerati
scripts/screenshots.mjs       ← aggiornato per riflettere S5/S6 (chip Eclissi/Foto, mobile sheet)
```
