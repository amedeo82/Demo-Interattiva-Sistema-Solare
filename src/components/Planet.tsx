/**
 * Pianeta renderizzato con texture procedurale, rotazione assiale,
 * terminatore (ombra notturna), atmosfera e satelliti naturali.
 *
 * Architettura (rev. 2 — ottimizzazione 60fps): il componente renderizza una
 * VOLTA SOLA la sua struttura DOM; le animazioni per-frame (posizione
 * orbitale, rotazione della texture, orbite delle lune) sono scritte
 * direttamente negli elementi tramite ref nel callback del motore
 * (`onFrame`), senza passare dal reconciler React. Il re-render React
 * avviene solo quando cambiano proprietà "strutturali" (selezione, etichette,
 * realismo).
 */
import { memo, useCallback, useRef, type CSSProperties } from 'react';
import type { PlanetData } from '../data/planets';
import { usePlanetTexture, usePlanetBump } from '../utils/textures';
import { useFrameSubscription } from '../hooks/useOrbitEngine';
import type { SimPlanetState } from '../hooks/useOrbitEngine';

export interface PlanetProps {
  planet: PlanetData;
  isSelected: boolean;
  showLabel: boolean;
  /** Attiva le texture procedurali (toggle "Materiali realistici"). */
  realistic: boolean;
  onSelect: (p: PlanetData) => void;
  /** Abbonamento al flusso di frame del motore orbitale (vedi useOrbitEngine). */
  subscribeFrames: (
    l: (positions: Record<string, SimPlanetState>, t: number) => void
  ) => () => void;
}

/** Posizione cartesiana sul palco a partire da angolo/raggio polari. */
function polarToXY(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: radius * Math.sin(rad), y: -radius * Math.cos(rad) };
}

function Planet({
  planet,
  isSelected,
  showLabel,
  realistic,
  onSelect,
  subscribeFrames,
}: PlanetProps) {
  const texture = usePlanetTexture(planet.name, planet.color);
  const bump = usePlanetBump(planet.name, planet.color);
  const rootRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const bumpRef = useRef<HTMLDivElement>(null);
  const terminatorRef = useRef<HTMLDivElement>(null);
  const ringShadowOnPlanetRef = useRef<HTMLDivElement>(null);
  const planetShadowOnRingsRef = useRef<HTMLDivElement>(null);
  // S2.2 — layer per il riflesso speculare: stessa logica imperativa del
  //  terminatore, ma gradiente più stretto e opacità bassa → "bagliore" del
  //  Sole sul lato giorno del pianeta.
  const specularRef = useRef<HTMLDivElement>(null);
  const moonRefs = useRef<(HTMLSpanElement | null)[]>([]);

  /* Ref stabile per `onSelect`: il click usa sempre l'ultima callback anche
   * quando memo() salta il re-render (il DOM montato conserva il closure
   * della prima render). Trucco "latest ref" classico: nessun setState in
   * render (che causerebbe un loop) e nessuna invalidazione del bail-out —
   * i test sulla memo restano validi. */
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Scrittura imperativa per-frame: nessun setState → nessun re-render React.
  const onFrame = useCallback(
    (positions: Record<string, SimPlanetState>, simTime: number) => {
      const pos = positions[planet.name];
      if (!pos) return;
      const { x, y } = polarToXY(pos.angle, pos.radius);
      if (rootRef.current) {
        rootRef.current.style.transform = `translate(${x}px, ${y}px) rotate(${
          planet.axialTilt > 90 ? 180 - planet.axialTilt : -planet.axialTilt
        }deg)`;
      }
      // S2.1 — calcola la posizione del Sole rispetto al pianeta. pos.angle
      // è la longitudine eliocentrica (0° = in alto, senso orario) e il
      // pianeta è in posizione (sin*rad, -cos*rad) sul palco. Il Sole è
      // nell'origine, quindi dal pianeta "guarda verso (0,0)".
      // → lightX%, lightY% sono le coordinate CSS del centro del Sole
      // proiettate sul disco del pianeta (sempre all'interno del 100%×100%).
      const angleRad = (pos.angle * Math.PI) / 180;
      const lightX = 50 - Math.sin(angleRad) * 50;
      const lightY = 50 + Math.cos(angleRad) * 50;      const nightOp = isSelected ? 0.72 : 0.6;
      // Terminatore radiale: la luce entra dal Sole, il lato opno è in ombra.
      // Il gradiente crea una transizione morbida (più realistica della
      // vecchia line-gradient che "tagliava" il pianeta in due).
      if (terminatorRef.current) {
        terminatorRef.current.style.background = `radial-gradient(circle at ${lightX.toFixed(
          1
        )}% ${lightY.toFixed(1)}%, rgba(0,0,0,0) 38%, rgba(0,0,8,${nightOp.toFixed(2)}) 88%)`;
      }
      // S2.2 — highlight speculare: stessa posizione del Sole ma con
      //  gradiente molto stretto e colorato (bianco caldo). Crea l'effetto
      //  del "riverbero" del Sole sul lato giorno.
      if (specularRef.current) {
        specularRef.current.style.background = `radial-gradient(circle at ${lightX.toFixed(
          1
        )}% ${lightY.toFixed(1)}%, rgba(255,250,235,0.32) 0%, rgba(255,240,200,0.08) 18%, transparent 35%)`;
      }
      // Rotazione assiale: scala artistica proporzionale a 1/rotationHours
      if (surfaceRef.current) {
        const spinDeg = ((simTime * 360) / Math.max(Math.abs(planet.rotationHours) / 2.4, 2)) % 360;
        const spinDir = planet.rotationHours < 0 ? -1 : 1;
        if (texture) {
          surfaceRef.current.style.backgroundPositionX = `${spinDir * spinDeg}%`;
        } else {
          surfaceRef.current.style.transform = `rotate(${spinDir * spinDeg}deg)`;
        }
      }
      // Bump map: stessa rotazione della texture albedo, in modo che il
      // rilievo segua i crateri/continenti durante lo spin.
      if (bumpRef.current && bump) {
        const spinDeg = ((simTime * 360) / Math.max(Math.abs(planet.rotationHours) / 2.4, 2)) % 360;
        const spinDir = planet.rotationHours < 0 ? -1 : 1;
        bumpRef.current.style.backgroundPositionX = `${spinDir * spinDeg}%`;
      }
      if (realistic) {
        for (let i = 0; i < planet.moons.length; i++) {
          const el = moonRefs.current[i];
          const moon = planet.moons[i];
          if (!el || !moon) continue;
          const m = (((simTime * 360) / moon.period + i * 137) % 360) * (Math.PI / 180);
          el.style.transform = `translate(calc(-50% + ${moon.orbitRadius * Math.sin(m)}px), calc(-50% + ${
            -moon.orbitRadius * Math.cos(m)
          }px))`;
        }
      }
      // Saturno: ombra degli anelli sul disco + ombra del pianeta sugli anelli.
      // L'angolo pos.angle è la longitudine eliocentrica (0°=in alto, orario).
      // Sole = origine, quindi il lato opposto al Sole (lato notte) è a
      // angle+180° in coordinate del pianeta.
      if (planet.name === 'Saturn') {
        // Ombra anelli → disco: una sottile striscia scura che si sposta
        // sopra/sotto il centro disco a seconda della fase orbitale.
        // Quando pos.angle è in alto (Sole sopra il piano), l'ombra degli
        // anelli cade sulla metà superiore del disco, e viceversa.
        if (ringShadowOnPlanetRef.current) {
          const yOffset = Math.cos(angleRad) * 35; // -35..+35 px
          const xOffset = Math.sin(angleRad) * 18; // leggera asimmetria
          ringShadowOnPlanetRef.current.style.transform = `translate(${xOffset}%, ${yOffset}%)`;
          ringShadowOnPlanetRef.current.style.opacity = String(0.45 + Math.abs(Math.cos(angleRad)) * 0.35);
        }
        // Ombra pianeta → anelli: il "lato Sole" degli anelli è illuminato,
        // il lato opposto è in ombra. Disegnamo un radial gradient con centro
        // luce dal lato del Sole, scuro al bordo opposto.
        if (planetShadowOnRingsRef.current) {
          // L'anello è in coordinate locali: l'asse lungo è orizzontale.
          // Il Sole, in coordinate del pianeta, è alla posizione (lightX, lightY)
          // espressa come % del bounding box del disco; per l'anello (190%×60%)
          // il Sole è FUORI dal bounding box (è lontano), quindi l'effetto è
          // una sfumatura lineare: la metà verso il Sole è chiara, opposta
          // scura. Usiamo un linear gradient in base all'angolo.
          const sunDirX = -Math.sin(angleRad); // -1..+1, direzione "verso il Sole" lungo X
          const sunDirY = Math.cos(angleRad); // -1..+1, direzione "verso il Sole" lungo Y
          // L'anello è ruotato di -20°: consideriamo la correzione.
          const ringRot = (-20 * Math.PI) / 180;
          const sx = sunDirX * Math.cos(-ringRot) - sunDirY * Math.sin(-ringRot);
          const sy = sunDirX * Math.sin(-ringRot) + sunDirY * Math.cos(-ringRot);
          // Angolo del gradient 0..360° (CSS): 0° = su, 90° = dx.
          const gradAngle = ((Math.atan2(sx, -sy) * 180) / Math.PI + 360) % 360;
          planetShadowOnRingsRef.current.style.background = `linear-gradient(${gradAngle.toFixed(
            0
          )}deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 35%, transparent 60%, transparent 100%)`;
        }
      }
    },
    [planet, texture, bump, realistic, isSelected]
  );
  useFrameSubscription(subscribeFrames, onFrame);

  const size = planet.size;
  const layerStyle: CSSProperties = texture
    ? {
        backgroundImage: `url(${texture})`,
        backgroundSize: '200% 100%',
      }
    : { background: planet.gradient };

  // Posizione iniziale (primo frame prima dell'abbonamento rAF): centrata in
  // alto sull'orbita; il motore sovrascrive immediatamente via transform.
  return (
    <div
      ref={rootRef}
      className="planet absolute rounded-full focus-visible:outline-none"
      role="button"
      tabIndex={0}
      aria-label={`Seleziona ${planet.nameIt}`}
      onClick={() => onSelectRef.current(planet)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectRef.current(planet);
        }
      }}
      style={{
        width: size,
        height: size,
        left: '50%',
        top: '50%',
        boxShadow: `0 0 ${size}px ${planet.color}66${
          isSelected ? ', 0 0 0 2px rgba(255,255,255,0.9)' : ''
        }`,
        willChange: 'transform',
      }}
    >
      {/* Disco con texture o gradiente base */}
      <div
        ref={surfaceRef}
        className="planet-surface absolute inset-0 overflow-hidden rounded-full"
        style={layerStyle}
      />

      {/* Bump map: layer in scala di grigi che simula il rilievo via
          mix-blend-mode overlay + filter contrast. Ruota in sync con la
          texture albedo per allineare crateri/continenti. */}
      {bump && (
        <div
          ref={bumpRef}
          className="planet-bump absolute inset-0 overflow-hidden rounded-full"
          style={{
            backgroundImage: `url(${bump})`,
            backgroundSize: '200% 100%',
            mixBlendMode: 'overlay',
            filter: 'contrast(1.8) brightness(1.05)',
            opacity: 0.55,
          }}
        />
      )}

      {/* S2.2 — riflesso speculare (sopra il disco, sotto l'atmosfera).
           Posizione aggiornata via ref in `onFrame`. */}
      <div ref={specularRef} className="planet-specular" />

      {/* S2.3 — atmosfera: scattering a doppio anello con mix-blend-mode
          "screen" (vedi .planet-atmo in index.css). L'opacità del bordo
          esterno sale sui pianeti dotati di atmosfera rilevante. */}
      {['Venus', 'Earth', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'].includes(planet.name) && (
        <div
          className="planet-atmo pointer-events-none absolute rounded-full"
          style={{
            inset: -Math.max(2, size * 0.18),
            background: `radial-gradient(circle, transparent 55%, ${planet.color}66 64%, transparent 72%, ${planet.color}33 80%, transparent 92%)`,
          }}
        />
      )}

      {/* S2.1 — terminatore radiale (sopra il disco, sotto l'atmosfera) */}
      <div ref={terminatorRef} className="planet-terminator" />

      {planet.name === 'Saturn' && (
        <>
          {/* Anello principale: bordo ellittico colorato (vedi .saturn-ring) */}
          <div className="saturn-ring" />
          {/* Ombra del pianeta sugli anelli: layer scuro opposto al Sole.
              Posizione luce aggiornata imperativamente in onFrame. */}
          <div
            ref={planetShadowOnRingsRef}
            className="planet-shadow-on-rings pointer-events-none absolute"
            aria-hidden
          />
        </>
      )}
      {/* Ombra degli anelli sul disco (solo Saturno): sottile striscia
          scura orizzontale che si sposta con la fase orbitale. */}
      {planet.name === 'Saturn' && (
        <div
          ref={ringShadowOnPlanetRef}
          className="ring-shadow-on-planet pointer-events-none"
          aria-hidden
        />
      )}
      {showLabel && <span className="planet-label">{planet.nameIt}</span>}

      {/* Satelliti naturali: posizione scritta dal motore via ref */}
      {realistic &&
        planet.moons.map((moon, i) => (
          <span
            key={moon.name}
            ref={(el) => {
              moonRefs.current[i] = el;
            }}
            className="moon absolute rounded-full"
            style={{
              width: moon.size,
              height: moon.size,
              background: `radial-gradient(circle at 35% 30%, #ffffffcc, ${moon.color} 55%, #00000088)`,
              left: '50%',
              top: '50%',
            }}
            title={moon.name}
          />
        ))}
    </div>
  );
}

/*
 * memo(): dalla rev. 2 il prop `simTime` non esiste più — le animazioni
 * per-frame passano dai ref imperativi. Quindi durante la riproduzione questo
 * componente NON si ricondera mai: solo toggle strutturali (etichette,
 * realismo, selezione) invalidano la memo.
 */
export default memo(Planet);
