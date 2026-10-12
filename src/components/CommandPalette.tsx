/**
 * S14 · F9 — Command palette (Ctrl/Cmd+K).
 *
 * Ricerca rapida per pianeti, comandi e toggle con navigazione da tastiera
 * (↑/↓ per muoversi, Enter per eseguire, Esc per chiudere). Il filtro è un
 * semplice `includes` case-insensitive sul label + hint (niente dipendenze).
 *
 * a11y: input con role="combobox" + listbox con aria-activedescendant,
 * focus automatico all'apertura, ritorno del focus al mount precedente è
 * gestito dal caller (il bottone che ha aperto la palette).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../i18n';

export interface PaletteCommand {
  id: string;
  label: string;
  /** Suggerimento secondario mostrato sotto il label (es. gruppo). */
  hint?: string;
  /** Icona emoji (opzionale). */
  icon?: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: PaletteCommand[];
}

export function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const t = useT();
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) => c.label.toLowerCase().includes(q) || (c.hint ?? '').toLowerCase().includes(q)
    );
  }, [commands, query]);

  // Reset all'apertura
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      // Focus dopo il mount (il portale/dialog è già in DOM)
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Mantieni l'elemento attivo visibile nello scroll (guard per jsdom,
  // dove scrollIntoView non è implementato).
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIdx]);

  if (!open) return null;

  const runCommand = (c: PaletteCommand) => {
    // Chiudi prima, poi esegui: la palette non deve restare aperta sopra
    // i modali/viste che il comando apre. Sincrono: nessun conflitto con
    // l'handler di chiusura (che tocca solo `paletteOpen`).
    onClose();
    c.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filtered[activeIdx];
      if (cmd) runCommand(cmd);
    }
  };

  return (
    <div
      className="absolute inset-0 z-[300] flex items-start justify-center bg-black/50 p-4 pt-24 backdrop-blur-sm"
      onClick={onClose}
      data-testid="command-palette"
    >
      <div
        className="panel-in w-full max-w-md overflow-hidden rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          role="combobox"
          aria-expanded="true"
          aria-haspopup="listbox"
          aria-controls="command-palette-list"
        >
          <input
            ref={inputRef}
            type="text"
            role="searchbox"
            aria-label={t('palette.search')}
            aria-autocomplete="list"
            aria-activedescendant={
              filtered[activeIdx] ? `cmd-${filtered[activeIdx].id}` : undefined
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={t('palette.placeholder')}
            className="w-full border-b border-white/10 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none"
          />
        </div>
        <ul
          id="command-palette-list"
          ref={listRef}
          role="listbox"
          aria-label={t('palette.list')}
          className="max-h-72 overflow-y-auto py-1"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-white/50" aria-live="polite">
              {t('palette.none', { q: query })}
            </li>
          ) : (
            filtered.map((c, i) => (
              <li
                key={c.id}
                id={`cmd-${c.id}`}
                role="option"
                aria-selected={i === activeIdx}
                data-idx={i}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => runCommand(c)}
                className={`flex cursor-pointer items-center gap-3 px-4 py-2 text-sm ${
                  i === activeIdx ? 'bg-white/10 text-white' : 'text-white/75'
                }`}
              >
                {c.icon && (
                  <span aria-hidden className="w-5 text-center">
                    {c.icon}
                  </span>
                )}
                <span className="flex-1">{c.label}</span>
                {c.hint && (
                  <span className="text-[10px] uppercase tracking-wider text-white/40">
                    {c.hint}
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
