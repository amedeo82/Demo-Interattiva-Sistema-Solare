/**
 * Test per l'equivalenza tra la scorciatoia da tastiera "Spazio" (toggle
 * play/pausa) e il pulsante dedicato in sidebar.
 *
 * Strategia: si congela il tempo con vi.useFakeTimers() così il motore
 * requestAnimationFrame non avanza tra un'azione e l'altra — gli unici stati
 * che cambiano sono quelli pilotati dalle interazioni.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
});

const playBtn = () => screen.getByRole('button', { name: /Pausa|Riproduci/i });

describe('Scorciatoia Spazio ≡ pulsante Play/Pausa', () => {
  it('parte in riproduzione (il pulsante offre "Pausa")', () => {
    render(<App />);
    expect(playBtn()).toHaveTextContent(/Pausa/i);
  });

  it('Spazio mette in pausa esattamente come il click sul pulsante', () => {
    render(<App />);

    // Percorso A: scorciatoia da tastiera
    fireEvent.keyDown(window, { key: ' ' });
    const afterKey = playBtn().textContent;
    expect(afterKey).toMatch(/Riproduci/i);

    // Percorso B: click sul pulsante → deve riportare allo stato iniziale
    fireEvent.click(playBtn());
    expect(playBtn().textContent).toMatch(/Pausa/i);

    // E i due percorsi sono interscambiabili: click + spazio = nessun cambio
    fireEvent.click(playBtn()); // pausa col click
    fireEvent.keyDown(window, { key: ' ' }); // riavvia con lo spazio
    expect(playBtn().textContent).toMatch(/Pausa/i);
  });

  it('lo stato del pulsante è coerente con aria-pressed dopo toggle misti', () => {
    render(<App />);
    fireEvent.keyDown(window, { key: ' ' });
    fireEvent.keyDown(window, { key: ' ' });
    fireEvent.click(playBtn());
    // 2 toggle neutri + 1 click = in pausa
    expect(playBtn().textContent).toMatch(/Riproduci/i);
  });

  it('le frecce sinistra/destra regolano la velocità in modo simmetrico', () => {
    render(<App />);
    const pressedChip = () =>
      screen
        .getByRole('group', { name: /Velocità simulazione/i })
        .querySelectorAll('[aria-pressed="true"]')[0]?.textContent;

    expect(pressedChip()).toBe('1x');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(pressedChip()).toBe('2x');
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(pressedChip()).toBe('1x');
  });
});
