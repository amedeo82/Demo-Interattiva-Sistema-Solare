/**
 * S13 · F3 — Modal "Cielo da Terra": planetario geocentrico.
 *
 * Mostra alt/az dei pianeti (e del Sole) per un osservatore a terra,
 * alla data corrente. SVG con orizzonte, punti cardinali e corpi
 * proiettati (proiezione azimutale equidistante: raggio ∝ (90−alt)/90).
 *
 * L'azimut 0° è in alto (Nord), 90° a destra (Est), 180° in basso (Sud),
 * 270° a sinistra (Ovest) — convenzione bussola.
 *
 * Niente geolocalizzazione automatica (privacy): preset città italiane
 * + input manuale lat/lon.
 */
import { useMemo, useState } from 'react';
import { useT } from '../i18n';
import { computeSkyView, type Observer } from '../utils/skyView';

interface SkyViewModalProps {
  open: boolean;
  onClose: () => void;
}

const PRESETS: { name: string; observer: Observer }[] = [
  { name: 'Roma', observer: { latDeg: 41.89, lonDeg: 12.51 } },
  { name: 'Milano', observer: { latDeg: 45.46, lonDeg: 9.19 } },
  { name: 'Napoli', observer: { latDeg: 40.85, lonDeg: 14.27 } },
  { name: 'Palermo', observer: { latDeg: 38.12, lonDeg: 13.36 } },
];

const BODY_COLORS: Record<string, string> = {
  Sun: '#ffd54a',
  Mercury: '#b5b5b5',
  Venus: '#e8cda0',
  Mars: '#e07b4f',
  Jupiter: '#e0b07a',
  Saturn: '#f0d8a0',
  Uranus: '#9be8e8',
  Neptune: '#6a8aff',
};

const BODY_LABELS: Record<string, string> = {
  Sun: 'Sole',
  Mercury: 'Mercurio',
  Venus: 'Venere',
  Mars: 'Marte',
  Jupiter: 'Giove',
  Saturn: 'Saturno',
  Uranus: 'Urano',
  Neptune: 'Nettuno',
};

const SIZE = 340;
const C = SIZE / 2;
const R = C - 28;

export function SkyViewModal({ open, onClose }: SkyViewModalProps) {
  const t = useT();
  const [presetIdx, setPresetIdx] = useState(0);
  const [manual, setManual] = useState<{ lat: string; lon: string } | null>(null);
  const observer: Observer = manual
    ? {
        latDeg: clamp(parseFloat(manual.lat) || 0, -89, 89),
        lonDeg: clamp(parseFloat(manual.lon) || 0, -180, 180),
      }
    : PRESETS[presetIdx].observer;

  // Ricalcola quando cambia l'osservatore o all'apertura (data = adesso).
  const sky = useMemo(
    () => (open ? computeSkyView(new Date(), observer) : []),
    // Il calcolo dipende dall'istante; per la UI basta il refresh su apertura/cambio osservatore.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, observer.latDeg, observer.lonDeg]
  );

  if (!open) return null;

  const visible = sky.filter((s) => s.altDeg > 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('sky.title')}
      className="surface glass absolute inset-0 z-40 flex flex-col p-6"
      data-testid="skyview-modal"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-white">{t('sky.title')}</h2>
        <button
          type="button"
          aria-label={t('sky.close')}
          onClick={onClose}
          className="rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-white/75">
          {t('sky.observer')}
          <select
            value={manual ? 'manual' : String(presetIdx)}
            onChange={(e) => {
              if (e.target.value === 'manual')
                setManual({ lat: String(observer.latDeg), lon: String(observer.lonDeg) });
              else {
                setManual(null);
                setPresetIdx(Number(e.target.value));
              }
            }}
            className="rounded-lg border border-white/15 bg-[#141433] px-2 py-1.5 text-sm text-white"
          >
            {PRESETS.map((p, i) => (
              <option key={p.name} value={i}>
                {p.name}
              </option>
            ))}
            <option value="manual">{t('sky.manual')}</option>
          </select>
        </label>
        {manual && (
          <>
            <label className="flex flex-col gap-1 text-xs text-white/75">
              {t('sky.lat')}
              <input
                type="number"
                value={manual.lat}
                onChange={(e) => setManual({ ...manual, lat: e.target.value })}
                className="w-24 rounded-lg border border-white/15 bg-[#141433] px-2 py-1.5 text-sm text-white"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/75">
              {t('sky.lon')}
              <input
                type="number"
                value={manual.lon}
                onChange={(e) => setManual({ ...manual, lon: e.target.value })}
                className="w-24 rounded-lg border border-white/15 bg-[#141433] px-2 py-1.5 text-sm text-white"
              />
            </label>
          </>
        )}
      </div>

      <div className="mt-4 flex flex-1 items-center justify-center overflow-auto">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={t('sky.ariaSvg', { lat: observer.latDeg, lon: observer.lonDeg })}
        >
          {/* Disco del cielo (sopra l'orizzonte) */}
          <circle cx={C} cy={C} r={R} fill="rgba(20,20,60,0.55)" stroke="rgba(255,255,255,0.25)" />
          {/* Cerchi di quota (30°, 60°) */}
          <circle cx={C} cy={C} r={(R * 2) / 3} fill="none" stroke="rgba(255,255,255,0.08)" />
          <circle cx={C} cy={C} r={R / 3} fill="none" stroke="rgba(255,255,255,0.08)" />
          {/* Croce dei cardinali */}
          <line x1={C} y1={C - R} x2={C} y2={C + R} stroke="rgba(255,255,255,0.08)" />
          <line x1={C - R} y1={C} x2={C + R} y2={C} stroke="rgba(255,255,255,0.08)" />
          {/* Cardinali: N in alto, E a destra, S in basso, O a sinistra */}
          {[
            [t('sky.n'), C, C - R - 8],
            [t('sky.e'), C + R + 10, C + 4],
            [t('sky.s'), C, C + R + 16],
            [t('sky.w'), C - R - 12, C + 4],
          ].map(([label, x, y]) => (
            <text
              key={label as string}
              x={x as number}
              y={y as number}
              fill="rgba(255,255,255,0.6)"
              fontSize="12"
              textAnchor="middle"
              className="font-mono"
            >
              {label}
            </text>
          ))}
          {/* Corpi visibili */}
          {visible.map((s) => {
            // Proiezione azimutale: raggio ∝ zenit distance (90 − alt)
            const rr = ((90 - s.altDeg) / 90) * R;
            const rad = (s.azDeg * Math.PI) / 180;
            // az 0 = Nord (alto), senso orario: x = C + rr·sin(az), y = C − rr·cos(az)
            const x = C + rr * Math.sin(rad);
            const y = C - rr * Math.cos(rad);
            const color = BODY_COLORS[s.body] ?? '#ffffff';
            const isSun = s.body === 'Sun';
            return (
              <g key={s.body}>
                {isSun && <circle cx={x} cy={y} r={10} fill={color} opacity={0.25} />}
                <circle cx={x} cy={y} r={isSun ? 6 : 4.5} fill={color} />
                <text
                  x={x}
                  y={y - 9}
                  fill="rgba(255,255,255,0.85)"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {BODY_LABELS[s.body] ?? s.body}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="mt-2 text-[11px] text-white/55">
        {visible.length === 0
          ? t('sky.none')
          : t('sky.above', {
              list: visible.map((s) => BODY_LABELS[s.body] ?? s.body).join(', '),
            })}
        {t('sky.disclaimer')}
      </p>
    </div>
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
