import React, { useMemo } from 'react';

interface Star {
  x: number; // %
  y: number; // %
  s: number; // px
  d: number; // delay (s)
  dur: number; // twinkle duration (s)
  o: number; // base opacity
}

const NEBULAE = [
  { top: '8%', left: '12%', size: 480, color: 'rgba(109, 91, 222, 0.16)' },
  { top: '58%', left: '68%', size: 560, color: 'rgba(56, 130, 246, 0.12)' },
  { top: '72%', left: '8%', size: 420, color: 'rgba(217, 70, 160, 0.10)' },
  { top: '18%', left: '74%', size: 380, color: 'rgba(45, 212, 191, 0.08)' },
];

/**
 * Sfondo stellato generato proceduralmente (memoizzato):
 * - stelle con scintillio (twinkle) a durata casuale
 * - alcune stelle "grandi" con bagliore
 * - nebulose sfocate per dare profondità
 */
export default function Starfield({ count = 140 }: { count?: number }) {
  const stars = useMemo<Star[]>(
    () =>
      Array.from({ length: count }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        s: Math.random() < 0.85 ? 1 + Math.random() : 2 + Math.random() * 1.5,
        d: Math.random() * 6,
        dur: 2.5 + Math.random() * 4,
        o: 0.3 + Math.random() * 0.7,
      })),
    [count]
  );

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {/* Nebulose */}
      {NEBULAE.map((n, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: n.top,
            left: n.left,
            width: n.size,
            height: n.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${n.color}, transparent 70%)`,
            filter: 'blur(30px)',
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}

      {/* Stelle */}
      {stars.map((st, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: `${st.y}%`,
            left: `${st.x}%`,
            width: st.s,
            height: st.s,
            borderRadius: '50%',
            background: 'white',
            opacity: st.o,
            boxShadow: st.s > 2 ? '0 0 6px rgba(255,255,255,0.8)' : undefined,
            animation: `twinkle ${st.dur}s ease-in-out ${st.d}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
