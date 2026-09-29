import React, { useState } from 'react';

interface PlanetData {
  name: string;
  nameIt: string;
  diameter: number;
  distanceFromSun: number;
  orbitalPeriod: number;
  color: string;
  size: number;
  orbitRadius: number;
  description: string;
  animationDuration: number;
}

const planets: PlanetData[] = [
  {
    name: 'Mercury',
    nameIt: 'Mercurio',
    diameter: 4879,
    distanceFromSun: 57.9,
    orbitalPeriod: 88,
    color: '#b5b5b5',
    size: 8,
    orbitRadius: 60,
    description: 'Il pianeta più piccolo e più vicino al Sole.',
    animationDuration: 4,
  },
  {
    name: 'Venus',
    nameIt: 'Venere',
    diameter: 12104,
    distanceFromSun: 108.2,
    orbitalPeriod: 225,
    color: '#e8cda0',
    size: 12,
    orbitRadius: 90,
    description: 'Il pianeta più caldo del sistema solare.',
    animationDuration: 7,
  },
  {
    name: 'Earth',
    nameIt: 'Terra',
    diameter: 12756,
    distanceFromSun: 149.6,
    orbitalPeriod: 365,
    color: '#4fa4e8',
    size: 13,
    orbitRadius: 125,
    description: 'Il nostro pianeta, l\'unico con vita conosciuta.',
    animationDuration: 10,
  },
  {
    name: 'Mars',
    nameIt: 'Marte',
    diameter: 6792,
    distanceFromSun: 227.9,
    orbitalPeriod: 687,
    color: '#e07040',
    size: 10,
    orbitRadius: 160,
    description: 'Il pianeta rosso, obiettivo di esplorazione umana.',
    animationDuration: 15,
  },
  {
    name: 'Jupiter',
    nameIt: 'Giove',
    diameter: 142984,
    distanceFromSun: 778.6,
    orbitalPeriod: 4333,
    color: '#c8a060',
    size: 28,
    orbitRadius: 210,
    description: 'Il pianeta più grande del sistema solare.',
    animationDuration: 25,
  },
  {
    name: 'Saturn',
    nameIt: 'Saturno',
    diameter: 120536,
    distanceFromSun: 1433.5,
    orbitalPeriod: 10759,
    color: '#e8d088',
    size: 24,
    orbitRadius: 270,
    description: 'Famoso per i suoi magnifici anelli.',
    animationDuration: 35,
  },
  {
    name: 'Uranus',
    nameIt: 'Urano',
    diameter: 51118,
    distanceFromSun: 2872.5,
    orbitalPeriod: 30687,
    color: '#7de8e8',
    size: 18,
    orbitRadius: 330,
    description: 'Un gigante di ghiaccio che ruota su un fianco.',
    animationDuration: 50,
  },
  {
    name: 'Neptune',
    nameIt: 'Nettuno',
    diameter: 49528,
    distanceFromSun: 4495.1,
    orbitalPeriod: 60190,
    color: '#4060e0',
    size: 17,
    orbitRadius: 380,
    description: 'Il pianeta più lontano dal Sole.',
    animationDuration: 70,
  },
];

function App() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetData | null>(null);

  const speedOptions = [0.25, 0.5, 1, 2, 5, 10];

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      background: '#0a0a1a',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: 'white'
    }}>
      {/* Header */}
      <header style={{
        flexShrink: 0,
        padding: '12px 16px',
        background: 'linear-gradient(to right, #0d1b3e, #1a0a3e)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '4px' }}>
          🌌 Sistema Solare Interattivo
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>
          Clicca su un pianeta per scoprire le sue informazioni
        </p>
      </header>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Solar system visualization */}
        <div style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a1a'
        }}>
          <div style={{
            position: 'relative',
            width: '800px',
            height: '800px',
            transform: 'scale(0.7)'
          }}>
            {/* Sun */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #fff7a0, #ffdd44 30%, #ff9900 70%, #ff6600)',
              boxShadow: '0 0 60px rgba(255, 200, 50, 0.5)',
              zIndex: 10
            }}></div>

            {/* Orbits and planets */}
            {planets.map((planet) => (
              <div key={planet.name} style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
              }}>
                {/* Orbit */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: `${planet.orbitRadius * 2}px`,
                  height: `${planet.orbitRadius * 2}px`,
                  borderRadius: '50%',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}></div>

                {/* Planet wrapper for animation */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: `${planet.orbitRadius * 2}px`,
                  height: `${planet.orbitRadius * 2}px`,
                  borderRadius: '50%',
                  animation: isPlaying ? `orbit ${planet.animationDuration / speed}s linear infinite` : 'none'
                }}>
                  {/* Planet */}
                  <div
                    onClick={() => setSelectedPlanet(planet)}
                    style={{
                      position: 'absolute',
                      width: `${planet.size}px`,
                      height: `${planet.size}px`,
                      borderRadius: '50%',
                      backgroundColor: planet.color,
                      boxShadow: `0 0 ${planet.size}px ${planet.color}66`,
                      top: `-${planet.size / 2}px`,
                      left: `${planet.orbitRadius - planet.size / 2}px`,
                      cursor: 'pointer',
                      zIndex: 5,
                      border: selectedPlanet?.name === planet.name ? '2px solid white' : 'none'
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginTop: '4px',
                      fontSize: '10px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      whiteSpace: 'nowrap',
                      animation: isPlaying ? `counter-rotate ${planet.animationDuration / speed}s linear infinite` : 'none'
                    }}>
                      {planet.nameIt}
                    </span>
                    {planet.name === 'Saturn' && (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%) rotate(-20deg)',
                        width: '180%',
                        height: '50%',
                        border: '2px solid rgba(232, 208, 136, 0.5)',
                        borderRadius: '50%',
                        pointerEvents: 'none'
                      }}></div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Planet info panel */}
          {selectedPlanet && (
            <div style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(26, 26, 62, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '20px',
              width: '280px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
              zIndex: 100
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{selectedPlanet.nameIt}</h2>
                <button
                  onClick={() => setSelectedPlanet(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}
                >
                  ✕
                </button>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                margin: '16px auto',
                backgroundColor: selectedPlanet.color,
                boxShadow: `0 0 20px ${selectedPlanet.color}44`
              }}></div>
              <p style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.875rem',
                fontStyle: 'italic',
                marginBottom: '16px',
                lineHeight: 1.4
              }}>
                {selectedPlanet.description}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 0',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>Diametro</span>
                  <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: 500 }}>
                    {selectedPlanet.diameter.toLocaleString()} km
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 0',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>Distanza dal Sole</span>
                  <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: 500 }}>
                    {selectedPlanet.distanceFromSun.toLocaleString()} mln km
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 0',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>Periodo orbitale</span>
                  <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: 500 }}>
                    {selectedPlanet.orbitalPeriod < 365
                      ? `${selectedPlanet.orbitalPeriod} giorni`
                      : `${(selectedPlanet.orbitalPeriod / 365.25).toFixed(1)} anni (${selectedPlanet.orbitalPeriod.toLocaleString()} giorni)`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls sidebar */}
        <div style={{
          flexShrink: 0,
          width: '256px',
          background: 'rgba(13, 13, 42, 0.9)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflowY: 'auto'
        }}>
          <h3 style={{
            color: 'white',
            fontSize: '0.875rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Controlli
          </h3>

          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              border: '1px solid',
              background: isPlaying ? 'rgba(245, 158, 11, 0.2)' : 'rgba(34, 197, 94, 0.2)',
              color: isPlaying ? '#fcd34d' : '#86efac',
              borderColor: isPlaying ? 'rgba(245, 158, 11, 0.4)' : 'rgba(34, 197, 94, 0.4)'
            }}
          >
            {isPlaying ? '⏸ Pausa' : '▶ Riproduci'}
          </button>

          {/* Speed control */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Velocità: {speed}x
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '6px'
            }}>
              {speedOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    background: speed === s ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255, 255, 255, 0.05)',
                    color: speed === s ? '#e9d5ff' : 'rgba(255, 255, 255, 0.6)',
                    border: `1px solid ${speed === s ? 'rgba(168, 85, 247, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`
                  }}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Planet list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <h4 style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '8px'
            }}>
              Pianeti
            </h4>
            {planets.map((planet) => (
              <button
                key={planet.name}
                onClick={() => setSelectedPlanet(planet)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  background: selectedPlanet?.name === planet.name ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  border: selectedPlanet?.name === planet.name ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid transparent',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.875rem',
                  marginBottom: '4px'
                }}
              >
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  flexShrink: 0,
                  backgroundColor: planet.color
                }}></div>
                <span>{planet.nameIt}</span>
              </button>
            ))}
          </div>

          {/* Legend */}
          <div style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            paddingTop: '12px'
          }}>
            <p style={{
              color: 'rgba(255, 255, 255, 0.4)',
              fontSize: '0.75rem',
              textAlign: 'center',
              lineHeight: 1.4
            }}>
              Le orbite non sono in scala. Dimensioni e distanze sono rappresentate schematicamente.
            </p>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes orbit {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes counter-rotate {
          from { transform: translateX(-50%) rotate(0deg); }
          to { transform: translateX(-50%) rotate(-360deg); }
        }
      `}</style>
    </div>
  );
}

export default App;
