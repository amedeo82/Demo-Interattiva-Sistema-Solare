/**
 * Sfondo stellato ad alte prestazioni su <canvas>.
 *
 * - Le stelle sono disegnate in un bitmap offscreen (1×) e riutilizzato:
 *   il costo per frame è un solo drawImage, non centinaia di nodi DOM.
 * - Lo scintillio (twinkle) anima solo le ~30 stelle più luminose.
 * - Gestisce devicePixelRatio, resize e prefers-reduced-motion.
 */
import { useEffect, useRef } from 'react';

interface Star {
  x: number; // px
  y: number; // px
  r: number; // raggio px
  o: number; // opacità base
}

const NEBULAE = [
  { fx: 0.12, fy: 0.14, size: 480, color: 'rgba(109, 91, 222, 0.16)' },
  { fx: 0.72, fy: 0.6, size: 560, color: 'rgba(56, 130, 246, 0.12)' },
  { fx: 0.14, fy: 0.78, size: 420, color: 'rgba(217, 70, 160, 0.10)' },
  { fx: 0.8, fy: 0.2, size: 380, color: 'rgba(45, 212, 191, 0.08)' },
];

export default function Starfield({ count = 400 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let stars: Star[] = [];
    let twinklers: (Star & { phase: number; speed: number })[] = [];
    let layer: HTMLCanvasElement | null = null;
    let rafId = 0;
    let w = 0;
    let h = 0;

    const buildLayer = () => {
      // Bitmap offscreen con tutte le stelle statiche
      layer = document.createElement('canvas');
      layer.width = w;
      layer.height = h;
      const lctx = layer.getContext('2d');
      if (!lctx) return;
      for (const s of stars) {
        lctx.globalAlpha = s.o;
        lctx.fillStyle = '#fff';
        lctx.beginPath();
        lctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        lctx.fill();
        if (s.r > 1.4) {
          // bagliore per le stelle grandi
          lctx.globalAlpha = s.o * 0.25;
          lctx.beginPath();
          lctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2);
          lctx.fill();
        }
      }
      lctx.globalAlpha = 1;
    };

    const paintBackground = () => {
      ctx.clearRect(0, 0, w, h);
      for (const n of NEBULAE) {
        const g = ctx.createRadialGradient(n.fx * w, n.fy * h, 0, n.fx * w, n.fy * h, n.size);
        g.addColorStop(0, n.color);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
    };

    const draw = (t: number) => {
      paintBackground();
      if (layer) ctx.drawImage(layer, 0, 0);
      // Twinkle: ridisegna solo le poche stelle animate
      for (const s of twinklers) {
        const alpha = s.o * (0.35 + 0.65 * Math.abs(Math.sin((t / 1000) * s.speed + s.phase)));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const loop = (t: number) => {
      draw(t);
      rafId = requestAnimationFrame(loop);
    };

    const regenerate = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.floor(canvas.clientWidth * dpr);
      h = Math.floor(canvas.clientHeight * dpr);
      canvas.width = w;
      canvas.height = h;

      stars = Array.from({ length: count }, () => {
        const big = Math.random() >= 0.85;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: (big ? 1 + Math.random() * 1.2 : 0.4 + Math.random() * 0.6) * dpr,
          o: 0.25 + Math.random() * 0.7,
        };
      });
      // Solo le stelle più luminose scintillano (costo per frame limitato)
      twinklers = stars
        .filter((s) => s.o > 0.8)
        .slice(0, 30)
        .map((s) => ({ ...s, phase: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() }));

      buildLayer();
      draw(0);
    };

    const onResize = () => regenerate();

    regenerate();
    window.addEventListener('resize', onResize);
    if (!reducedMotion) rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
    };
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      // S1.3 — la classe attiva la parallasse pilotata dalle CSS var sul
      //  <main>: lo starfield "scorre" in senso opposto al tilt della
      //  camera, dando l'illusione di essere molto più lontano del sistema.
      className="starfield-parallax pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
