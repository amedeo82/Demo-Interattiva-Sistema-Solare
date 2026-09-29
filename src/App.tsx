import React, { useEffect, useState } from 'react';
import { planets, type PlanetData } from './data/planets';
import Starfield from './components/Starfield';
import PlanetInfoPanel from './components/PlanetInfoPanel';
import ControlsSidebar from './components/ControlsSidebar';

const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 5, 10];
const STAGE = 800; // lato del "palco" quadrato del sistema solare (px)

/** Fissa l'angolo iniziale di ogni pianeta: orbitRadius e periodo sono
 *  correlati (3ª legge di Keplero), quindi tutti partirebbero allineati in
 *  cima. Un offset sfalsato rende la scena più naturale. */
const START_ANGLES: Record<string, number> = {
  Mercury: 40,
  Venus: 160,
  Earth: 300,
  Mars: 95,
  Jupiter: 220,
  Saturn: 15,
  Uranus: 135,
  Neptune: 260,
};

function useSystemScale() {
  const [scale, setScale] = useState(0.7);
  useEffect(() => {
    const update = () => {
      const availW = window.innerWidth - (window.innerWidth >= 1024 ? 272 : 32);
      const availH = window.innerHeight - 110;
      const s = Math.min(availW / STAGE, availH / STAGE, 1);
      setScale(Math.max(s, 0.3));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return scale;
}

export default function App() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetData | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const scale = useSystemScale();

  // Scorciatoie da tastiera
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const idx = SPEED_OPTIONS.indexOf(speed);
      switch (e.key) {
        case ' ':
          e.preventDefault();
          setIsPlaying((p) => !p);
          break;
        case 'ArrowRight':
          setSpeed(SPEED_OPTIONS[Math.min(idx + 1, SPEED_OPTIONS.length - 1)]);
          break;
        case 'ArrowLeft':
          setSpeed(SPEED_OPTIONS[Math.max(idx - 1, 0)]);
          break;
        case 'Escape':
          setSelectedPlanet(null);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [speed]);

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden text-white">
      <Starfield />

      {/* Header */}
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-gradient-to-r from-[#0d1b3e]/90 to-[#1a0a3e]/90 px-4 py-3 backdrop-blur-md">
        <h1 className="text-lg font-bold tracking-wide md:text-xl">
          <span aria-hidden>🌌</span> Sistema Solare Interattivo
        </h1>
        <button
          onClick={() => setShowLabels((v) => !v)}
          aria-pressed={showLabels}
          className={`chip hidden sm:block ${showLabels ? 'active' : ''}`}
        >
          Etichette
        </button>
      </header>

      {/* Contenuto principale */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col-reverse lg:flex-row">
        {/* Visualizzazione */}
        <main
          className="relative flex min-h-0 flex-1 items-center justify-center"
          aria-label="Simulazione del sistema solare"
        >
          <div
            className="relative shrink-0"
            style={{ width: STAGE, height: STAGE, transform: `scale(${scale})` }}
          >
            {/* Sole */}
            <div className="sun" role="img" aria-label="Sole">
              <div className="sun-corona" />
            </div>

            {/* Orbite e pianeti */}
            {planets.map((planet) => {
              const isSelected = selectedPlanet?.name === planet.name;
              const duration = planet.animationDuration / speed;
              const startAngle = START_ANGLES[planet.name] ?? 0;
              return (
                <div
                  key={planet.name}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{ width: planet.orbitRadius * 2, height: planet.orbitRadius * 2 }}
                >
                  {/* Traccia orbita */}
                  <div
                    className={`orbit-ring absolute inset-0 rounded-full ${isSelected ? 'selected' : ''}`}
                  />

                  {/* Wrapper animato */}
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      animation: isPlaying ? `orbit ${duration}s linear infinite` : 'none',
                      rotate: `${startAngle}deg`,
                    }}
                  >
                    {/* Pianeta (contro-rotazione per mantenere l'etichetta leggibile) */}
                    <div
                      className="planet absolute rounded-full focus-visible:outline-none"
                      role="button"
                      tabIndex={0}
                      aria-label={`Seleziona ${planet.nameIt}`}
                      onClick={() => setSelectedPlanet(planet)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedPlanet(planet);
                        }
                      }}
                      style={{
                        width: planet.size,
                        height: planet.size,
                        background: planet.gradient,
                        boxShadow: `0 0 ${planet.size}px ${planet.color}66${
                          isSelected ? ', 0 0 0 2px rgba(255,255,255,0.9)' : ''
                        }`,
                        top: -planet.size / 2,
                        left: planet.orbitRadius - planet.size / 2,
                        animation: isPlaying ? `counter-orbit ${duration}s linear infinite` : 'none',
                      }}
                    >
                      {planet.name === 'Saturn' && <div className="saturn-ring" />}
                      {showLabels && <span className="planet-label">{planet.nameIt}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pannello informazioni */}
          {selectedPlanet && (
            <PlanetInfoPanel planet={selectedPlanet} onClose={() => setSelectedPlanet(null)} />
          )}
        </main>

        {/* Sidebar controlli */}
        <ControlsSidebar
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying((p) => !p)}
          speed={speed}
          onSpeedChange={setSpeed}
          speedOptions={SPEED_OPTIONS}
          planets={planets}
          selectedName={selectedPlanet?.name ?? null}
          onSelectPlanet={setSelectedPlanet}
        />
      </div>
    </div>
  );
}
