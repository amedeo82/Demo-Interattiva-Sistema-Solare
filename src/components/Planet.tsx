/**
 * Pianeta renderizzato con texture procedurale, rotazione assiale,
 * terminatore (ombra notturna), atmosfera e satelliti naturali.
 */
import { memo, useRef, type CSSProperties } from 'react';
import type { PlanetData } from '../data/planets';
import { usePlanetTexture } from '../utils/textures';

interface Props {
  planet: PlanetData;
  /** Longitudine corrente in gradi (dal motore orbitale). */
  angle: number;
  /** Raggio orbitale corrente in px (variabile per orbite ellittiche). */
  radius: number;
  isSelected: boolean;
  showLabel: boolean;
  /** Tempo simulato accumulato (per rotazione pianeti e orbite lune). */
  simTime: number;
  /** Attiva le texture procedurali (toggle "Materiali realistici"). */
  realistic: boolean;
  onSelect: (p: PlanetData) => void;
}

function Planet({
  planet,
  angle,
  radius,
  isSelected,
  showLabel,
  simTime,
  realistic,
  onSelect,
}: Props) {
  // Riferimento stabile alla callback: consente a memo() di ignorare il
  // prop `onSelect` (che in App è setSelectedPlanet, già stabile, ma la
  // protezione resta per qualunque futuro uso con closure inline).
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const handleSelect = () => onSelectRef.current(planet);
  const texture = usePlanetTexture(planet.name, planet.color);
  const rad = (angle * Math.PI) / 180;
  const px = radius + radius * Math.sin(rad);
  const py = radius - radius * Math.cos(rad);

  // Rotazione assiale: la texture scorre in funzione del periodo di rotazione.
  // Un giorno di simulazione = 10s / 365 * animationDuration... usiamo una
  // scala artistica: rotazione visibile proporzionale a 1/rotationHours.
  const spinDeg = ((simTime * 360) / Math.max(Math.abs(planet.rotationHours) / 2.4, 2)) % 360;
  const spinDir = planet.rotationHours < 0 ? -1 : 1;

  const size = planet.size;
  const layerStyle: CSSProperties = texture
    ? {
        backgroundImage: `url(${texture})`,
        backgroundSize: '200% 100%',
        backgroundPositionX: `${spinDir * spinDeg}%`,
      }
    : { background: planet.gradient };

  return (
    <div
      className="planet absolute rounded-full focus-visible:outline-none"
      role="button"
      tabIndex={0}
      aria-label={`Seleziona ${planet.nameIt}`}
      onClick={handleSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSelect();
        }
      }}
      style={{
        width: size,
        height: size,
        boxShadow: `0 0 ${size}px ${planet.color}66${
          isSelected ? ', 0 0 0 2px rgba(255,255,255,0.9)' : ''
        }`,
        transform: `translate(${px - size / 2}px, ${py - size / 2}px) rotate(${planet.axialTilt > 90 ? 180 - planet.axialTilt : -planet.axialTilt}deg)`,
        willChange: 'transform',
      }}
    >
      {/* Disco con texture o gradiente base */}
      <div
        className="planet-surface absolute inset-0 overflow-hidden rounded-full"
        style={layerStyle}
      />

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

      {/* Terminatore: metà notturna orientata verso il Sole (centro palco) */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background: `linear-gradient(${angle + 270}deg, rgba(0,0,0,0) 42%, rgba(0,0,10,0.55) 78%)`,
        }}
      />

      {planet.name === 'Saturn' && <div className="saturn-ring" />}
      {showLabel && <span className="planet-label">{planet.nameIt}</span>}

      {/* Satelliti naturali */}
      {realistic &&
        planet.moons.map((moon, i) => {
          const moonAngle = ((simTime * 360) / moon.period + i * 137) % 360;
          const m = (moonAngle * Math.PI) / 180;
          const mx = moon.orbitRadius * Math.sin(m);
          const my = -moon.orbitRadius * Math.cos(m);
          return (
            <span
              key={moon.name}
              className="moon absolute rounded-full"
              style={{
                width: moon.size,
                height: moon.size,
                background: `radial-gradient(circle at 35% 30%, #ffffffcc, ${moon.color} 55%, #00000088)`,
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${mx}px), calc(-50% + ${my}px))`,
              }}
              title={moon.name}
            />
          );
        })}
    </div>
  );
}

/*
 * memo(): con il motore orbitale che aggiorna `angles` a ogni frame, senza
 * questa protezione tutti gli 8 pianeti si riconderebbero sempre. Con il
 * confronto custom saltiamo il re-render quando la posizione (angle+radius)
 * e lo stato visivo sono invariati — tipicamente i pianeti non selezionati
 * mentre l'utente interagisce con pannello/sidebar.
 *
 * Nota sul campo `simTime`: è monotono durante la riproduzione, quindi in
 * play i pianeti si riconderano comunque (servono per rotazione assiale e
 * orbite delle lune). Il beneficio reale è a simulazione in pausa: toggle
 * di zoom/labels/selezione non più ricondanno l'intera scena.
 *
 * `onSelect` è escluso dal confronto perché richiamato tramite ref stabile
 * (handleSelect), quindi una callback inline del parent non invalida la memo.
 */
export default memo(Planet, (prev, next) => {
  return (
    prev.planet === next.planet &&
    prev.angle === next.angle &&
    prev.radius === next.radius &&
    prev.isSelected === next.isSelected &&
    prev.showLabel === next.showLabel &&
    prev.simTime === next.simTime &&
    prev.realistic === next.realistic
  );
});
