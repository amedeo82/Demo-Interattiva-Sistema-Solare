/**
 * <HoverCrosshair /> — mirino cinematografico + readout coordinate mouse (DOM).
 *
 * Ascolta mousemove sul window, legge la posizione NDC aggiornata dal
 * componente R3F <HoverRaycaster> via mouseNdcRef, e mostra:
 *  - un mirino (SVG) che segue il cursore;
 *  - un piccolo badge con le coordinate 3D del punto sotto il mouse
 *    (proiettato sul piano orbitale Y=0) o il nome del corpo hovered.
 */
import { useEffect, useState } from 'react';
import type { MutableRefObject } from 'react';

export interface HoverCrosshairProps {
  /** Ref alla posizione NDC del mouse ({x, y} in [-1, 1]). Aggiornato da HoverRaycaster. */
  mouseNdcRef: MutableRefObject<{ x: number; y: number }>;
  /** Ref al world hit point (sull'eclittica Y=0) o null se fuori. */
  worldHitRef: MutableRefObject<{ x: number; y: number; z: number } | null>;
  /** Ref al nome del corpo hovered (o null). */
  hoveredBodyRef: MutableRefObject<string | null>;
}

export function HoverCrosshair({ mouseNdcRef, worldHitRef, hoveredBodyRef }: HoverCrosshairProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  // Refresh forza re-render ogni 100ms per rileggere i ref live (worldHit, hoveredBody).
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((t: number) => t + 1), 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
    };
    const onLeave = () => setPos(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  if (!pos) return null;

  const hit = worldHitRef.current;
  const bodyName = hoveredBodyRef.current;
  const ndc = mouseNdcRef.current;
  // Se il mouse è uscito dai bordi della viewport 3D, nascondi.
  const out = Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1;

  return (
    <>
      {/* Mirino SVG al centro del cursore */}
      <svg
        className="pointer-events-none fixed z-10"
        style={{ left: pos.x - 12, top: pos.y - 12 }}
        width={24}
        height={24}
        aria-hidden
      >
        <circle
          cx="12"
          cy="12"
          r={out ? 0 : 9}
          fill="none"
          stroke={bodyName ? '#a855f7' : 'rgba(255,255,255,0.6)'}
          strokeWidth="1.2"
        />
        <line x1="12" y1="2" x2="12" y2="6" stroke="rgba(255,255,255,0.8)" strokeWidth="1" />
        <line x1="12" y1="18" x2="12" y2="22" stroke="rgba(255,255,255,0.8)" strokeWidth="1" />
        <line x1="2" y1="12" x2="6" y2="12" stroke="rgba(255,255,255,0.8)" strokeWidth="1" />
        <line x1="18" y1="12" x2="22" y2="12" stroke="rgba(255,255,255,0.8)" strokeWidth="1" />
        <circle cx="12" cy="12" r="1" fill={bodyName ? '#a855f7' : 'rgba(255,255,255,0.9)'} />
      </svg>

      {/* Badge coordinate in basso al centro */}
      {(hit || bodyName) && (
        <div
          className="pointer-events-none fixed bottom-3 left-1/2 z-10 -translate-x-1/2 rounded border border-white/20 bg-black/55 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/85 backdrop-blur-sm"
          aria-hidden
        >
          {bodyName ? (
            <>
              <span className="text-white/50">Target · </span>
              <span className="text-purple-300">{bodyName}</span>
            </>
          ) : hit ? (
            <>
              <span className="text-white/50">X </span>
              <span>{hit.x.toFixed(1)}</span>
              <span className="ml-3 text-white/50">Z </span>
              <span>{hit.z.toFixed(1)}</span>
            </>
          ) : null}
        </div>
      )}
    </>
  );
}
