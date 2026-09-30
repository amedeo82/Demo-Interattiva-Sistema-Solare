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
import { usePlanetTexture } from '../utils/textures';
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
  subscribeFrames: (l: (positions: Record<string, SimPlanetState>, t: number) => void) => () => void;
}

/** Posizione cartesiana sul palco a partire da angolo/raggio polari. */
function polarToXY(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: radius * Math.sin(rad), y: -radius * Math.cos(rad) };
}

function Planet({ planet, isSelected, showLabel, realistic, onSelect, subscribeFrames }: PlanetProps) {
  const texture = usePlanetTexture(planet.name, planet.color);
  const rootRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const terminatorRef = useRef<HTMLDivElement>(null);
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
      // Terminatore: metà notturna orientata verso il Sole (centro palco)
      if (terminatorRef.current) {
        terminatorRef.current.style.background = `linear-gradient(${
          pos.angle + 270
        }deg, rgba(0,0,0,0) 42%, rgba(0,0,10,0.55) 78%)`;
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
    },
    [planet, texture, realistic]
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
      <div ref={surfaceRef} className="planet-surface absolute inset-0 overflow-hidden rounded-full" style={layerStyle} />

      {/* Atmosfera (alone luminoso per i pianeti dotati di atmosfera densa) */}
      {['Venus', 'Earth', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'].includes(planet.name) && (
        <div
          className="planet-atmo pointer-events-none absolute rounded-full"
          style={{
            inset: -Math.max(2, size * 0.12),
            background: `radial-gradient(circle, transparent 58%, ${planet.color}55 70%, transparent 82%)`,
          }}
        />
      )}

      {/* Terminatore (orientato dal motore a ogni frame) */}
      <div ref={terminatorRef} className="pointer-events-none absolute inset-0 rounded-full" />

      {planet.name === 'Saturn' && <div className="saturn-ring" />}
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
