/**
 * <DateInline /> — selettore data inline in stile "chip":
 *
 * - di default mostra una stringa formattata localizzata ("17 ott 2027");
 * - al click apre il picker nativo (Chromium/Firefox supportano
 *   `HTMLInputElement.showPicker()`);
 * - nascosto sotto 1024px (li usa il bottom sheet mobile con il proprio input).
 *
 * S15 — sostituisce il `<input type="date">` raw in header, che mostrava
 * il formato `mm/dd/yyyy` del browser e stonava con lo stile chip del
 * resto dell'header.
 */
import { useRef } from 'react';
import { useT } from '../i18n';

interface Props {
  /** Data selezionata (o null = oggi, default). */
  value: Date | null;
  /** Callback con la nuova data (null = reset all'oggi). */
  onChange: (d: Date | null) => void;
  /** Visibilità: default true. */
  visible?: boolean;
  /** Classi extra per il wrapper. */
  className?: string;
  /** aria-label personalizzato. */
  ariaLabel?: string;
}

const MONTHS_IT_SHORT = [
  'gen',
  'feb',
  'mar',
  'apr',
  'mag',
  'giu',
  'lug',
  'ago',
  'set',
  'ott',
  'nov',
  'dic',
];

const MONTHS_EN_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatDate(d: Date, locale: 'it' | 'en'): string {
  const months = locale === 'it' ? MONTHS_IT_SHORT : MONTHS_EN_SHORT;
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function toInputValue(d: Date | null): string {
  if (!d) return '';
  // yyyy-mm-dd nel fuso locale
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function DateInline({ value, onChange, visible = true, className = '', ariaLabel }: Props) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const locale =
    typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en' : 'it';
  const display = formatDate(value ?? new Date(), locale);

  if (!visible) return null;

  const openPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    // showPicker() è supportato da Chromium 99+ e Firefox 101+; fallback: focus+click
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker();
        return;
      } catch {
        /* ignore — showPicker richiede user gesture in alcuni browser */
      }
    }
    el.focus();
    el.click();
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={openPicker}
        aria-label={ariaLabel ?? t('chip.date')}
        title={t('tip.date')}
        className="chip gap-2"
        data-testid="date-inline-button"
      >
        <span aria-hidden>📅</span>
        <span className="tabular-nums">{display}</span>
      </button>
      {/* Input invisibile: vive solo per il picker nativo. absolute + opacity-0
          ma cliccabile via showPicker(). Visivamente non occupa spazio. */}
      <input
        ref={inputRef}
        type="date"
        value={toInputValue(value)}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v ? new Date(`${v}T12:00:00Z`) : null);
        }}
        aria-hidden
        tabIndex={-1}
        className="pointer-events-none absolute inset-0 cursor-pointer opacity-0"
        style={{ colorScheme: 'dark' }}
      />
    </div>
  );
}
