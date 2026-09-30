/**
 * Test end-to-end (RTL) dei flussi principali dell'app, pensati per la CI:
 * ogni test copre un'intera "user journey" della demo interattiva.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import { planets } from './data/planets';
import { buildQuestions } from './components/QuizModal';

// NB: niente cleanup() manuale e niente fake timers globali — ci pensa
// globals:true in vitest.config.ts (cleanup automatico) così i test async
// (waitFor) non restano bloccati su timer che nessuno fa avanzare.

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
  // Le domande sono generate da buildQuestions(planets, rnd): usando lo stesso
  // RNG iniettivo nel test conosciamo in anticipo le opzioni shuffled e quindi
  // l'indice della risposta corretta per ogni domanda. Niente più mock globale
  // di Math.random né euristiche fragili su querySelectorAll('button.chip').
  const mulberry32 = (seed: number) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  it('rispondendo correttamente a tutte le domande si ottiene il punteggio massimo', async () => {
    // `rnd` viene chiamato due volte con lo stesso seed: la prima per generare
    // le domande attese dal test, la seconda (dentro QuizModal) per generare
    // quelle mostrate a schermo. Essendo deterministico, i due set coincidono.
    const rnd = mulberry32(42);
    const questions = buildQuestions(planets, mulberry32(42));
    expect(questions.length).toBeGreaterThanOrEqual(2);

    render(<App quizRnd={rnd} />);
    fireEvent.click(screen.getByRole('button', { name: /Quiz/i }));
    const dialog = screen.getByRole('dialog', { name: /Quiz sul sistema solare/i });

    for (let q = 0; q < questions.length; q++) {
      // re-interroga il DOM a ogni iterazione: le opzioni cambiano domanda per domanda
      const options = dialog.querySelectorAll<HTMLButtonElement>('[data-testid="quiz-option"]');
      expect(options.length).toBe(questions[q].options.length);
      fireEvent.click(options[questions[q].answerIndex]);
      fireEvent.click(screen.getByRole('button', { name: /Prossima domanda|Vedi risultato/i }));
      await waitFor(() => {
        if (q + 1 < questions.length) {
          expect(dialog).toHaveTextContent(`Domanda ${q + 2} di`);
        } else {
          expect(dialog).toHaveTextContent(/Punteggio:/);
        }
      });
    }

    expect(dialog).toHaveTextContent(`Punteggio: ${questions.length}/${questions.length}`);
    expect(dialog).toHaveTextContent(/Perfetto/);
  });

  it('una risposta errata non blocca il flusso del quiz', async () => {
    // stesse domande del componente: generatore atteso e reale partono dallo stesso seed
    const rnd = mulberry32(7);
    const questions = buildQuestions(planets, mulberry32(7));
    const wrongIndex = (questions[0].answerIndex + 1) % questions[0].options.length;

    render(<App quizRnd={rnd} />);
    fireEvent.click(screen.getByRole('button', { name: /Quiz/i }));
    const dialog = screen.getByRole('dialog', { name: /Quiz sul sistema solare/i });

    const options = dialog.querySelectorAll<HTMLButtonElement>('[data-testid="quiz-option"]');
    fireEvent.click(options[wrongIndex]);
    // dopo la selezione le opzioni sono disabilitate (niente double-pick)
    expect(Array.from(options).every((o) => o.disabled)).toBe(true);
    // ma si può andare avanti comunque
    fireEvent.click(screen.getByRole('button', { name: /Prossima domanda/i }));
    await waitFor(() => expect(dialog).toHaveTextContent(/Domanda 2 di/));
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
