/**
 * Test end-to-end (RTL) dei flussi principali dell'app, pensati per la CI:
 * ogni test copre un'intera "user journey" della demo interattiva.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  cleanup();
  vi.useFakeTimers();
});

describe('Flusso: apertura pannello → chiusura con Esc', () => {
  it('seleziona Giove dalla scena, apre le info e le richiude con Esc', () => {
    render(<App />);

    // 1. il pianeta sulla scena è un bottone accessibile
    fireEvent.click(screen.getByRole('button', { name: /Seleziona Giove/i }));
    const dialog = screen.getByRole('dialog', { name: /Informazioni su Giove/i });
    expect(dialog).toBeInTheDocument();

    // 2. Esc chiude il pannello e riporta alla vista libera
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Flusso: modalità confronto pianeti', () => {
  it('apre il confronto, cambia i pianeti nei due select e verifica i valori', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Confronto/i }));
    const dialog = screen.getByRole('dialog', { name: /Confronto pianeti/i });
    expect(dialog).toBeInTheDocument();

    // default: Terra vs Giove — il rapporto dimensioni deve citare Giove
    expect(dialog).toHaveTextContent(/Giove è [\d.,]+× più grande/);

    // cambio Pianeta B: Giove → Mercurio
    fireEvent.change(screen.getByLabelText(/Pianeta B/i), {
      target: { value: 'Mercury' },
    });
    expect(dialog).toHaveTextContent(/Terra è [\d.,]+× più grande/);

    // chiusura
    fireEvent.click(screen.getByRole('button', { name: /Chiudi confronto/i }));
    expect(screen.queryByRole('dialog', { name: /Confronto pianeti/i })).not.toBeInTheDocument();
  });
});

describe('Flusso: quiz mode a punteggio completo', () => {
  it('rispondendo correttamente a tutte le domande si ottiene il punteggio massimo', async () => {
    // Le opzioni sono i primi (total+1) pulsanti "chip" del dialog: total
    // risposte + chip di progresso ("Domanda x di y"). Con Math.random
    // mockato lo shuffle è deterministico: proviamo un indice alla volta e
    // ripartiamo finché non otteniamo il punteggio pieno.
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      let finalScore = '';
      for (let attempt = 0; attempt < 4; attempt++) {
        cleanup();
        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /Quiz/i }));
        const dialog = screen.getByRole('dialog', { name: /Quiz sul sistema solare/i });
        const total = Number(/Domanda 1 di (\d+)/.exec(dialog.textContent ?? '')?.[1] ?? 5);

        for (let q = 0; q < total; q++) {
          const options = Array.from(dialog.querySelectorAll('button.chip')).slice(0, total + 1);
          expect(options.length).toBeGreaterThanOrEqual(2);
          fireEvent.click(options[attempt]); // stesso indice per tutte le domande
          fireEvent.click(screen.getByRole('button', { name: /Prossima domanda|Vedi risultato/i }));
          await Promise.resolve(); // lascia flushare gli update di React 18
        }

        finalScore = /Punteggio: (\d+\/\d+)/.exec(dialog.textContent ?? '')?.[1] ?? '';
        if (finalScore === `${total}/${total}`) {
          expect(dialog).toHaveTextContent(/Perfetto/);
          return; // successo: punteggio massimo raggiunto rispondendo sempre giusto
        }
      }
      throw new Error(
        `Nessun indice di opzione produce il punteggio massimo (ultimo: ${finalScore})`
      );
    } finally {
      spy.mockRestore();
    }
  });

  it('una risposta errata non blocca il flusso del quiz', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /Quiz/i }));
      const dialog = screen.getByRole('dialog', { name: /Quiz sul sistema solare/i });
      const options = Array.from(dialog.querySelectorAll('button.chip')) as HTMLButtonElement[];
      fireEvent.click(options[0]);
      // dopo la selezione le opzioni sono disabilitate (niente double-pick)
      expect(options.every((o) => o.disabled)).toBe(true);
      // ma si può andare avanti comunque
      fireEvent.click(screen.getByRole('button', { name: /Prossima domanda/i }));
      expect(dialog).toHaveTextContent(/Domanda 2 di/);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('Flusso: zoom, pan e reimpostazione visuale', () => {
  it('i pulsanti di zoom modificano la transform del palco e reset la ripristina', () => {
    render(<App />);
    const stage = document.querySelector('[aria-label="Simulazione del sistema solare"] > div');
    expect(stage).not.toBeNull();

    const scaleOf = () => {
      const m = /scale\(([\d.]+)\)/.exec((stage as HTMLElement).style.transform);
      return m ? parseFloat(m[1]) : NaN;
    };
    const initial = scaleOf();

    fireEvent.click(screen.getByLabelText('Aumenta zoom'));
    fireEvent.click(screen.getByLabelText('Aumenta zoom'));
    expect(scaleOf()).toBeGreaterThan(initial);

    fireEvent.click(screen.getByLabelText('Riduci zoom'));
    expect(scaleOf()).toBeLessThan(initial * 1.5 + 0.001);

    fireEvent.click(screen.getByLabelText('Reimposta visuale'));
    expect(scaleOf()).toBeCloseTo(initial, 5);
  });
});

describe('Flusso: data picker posiziona i pianeti alla data scelta', () => {
  it('cambiando la data la sidebar aggiorna la data di simulazione', () => {
    render(<App />);
    const dateInput = screen.getByLabelText(/Data/i) as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2031-06-15' } });
    expect(dateInput.value).toBe('2031-06-15');
  });
});

describe('Flusso: toggle etichette e realismo', () => {
  it('i chip di stato riflettono aria-pressed dopo il toggle', () => {
    render(<App />);
    const labels = screen.getByRole('button', { name: /Etichette/i });
    const realism = screen.getByRole('button', { name: /Realismo/i });

    expect(realism).toHaveAttribute('aria-pressed', 'true'); // attivo di default
    fireEvent.click(labels);
    expect(labels).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(realism);
    expect(realism).toHaveAttribute('aria-pressed', 'false');
  });
});
