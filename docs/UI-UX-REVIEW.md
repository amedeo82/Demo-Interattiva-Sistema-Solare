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

### 📂 File toccati
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
- `npm test` → 139/139 ✅
- `npm run build` → ✅ (181 kB JS, 32 kB CSS)

### 🎮 Come provare
1. `npm run dev`
2. Apri http://localhost:5173
3. **Tieni premuto il tasto destro** del mouse sulla scena e trascina → la camera ruota in 3D
4. **Shift+trascina** col tasto sinist per la stessa cosa (alternativa)
6. Le stelle sullo sfondo si muovono in parallasse rispetto alla rotazione
5. Premi `R` per resettare tutto, `T` per resettare solo il tilt
6. Osserva: il terminatore dei pianeti ora segue la posizione reale del Sole (più sfumato del precedente) e il lato giorno ha un bagliore speculare