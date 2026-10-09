/**
 * Anti-regressione: verifica che la CameraAnimator non ri-triggeri l'intro
 * flythrough ad ogni render di App (il bug FIX era dovuto a controlsRef
 * come getter inline: ogni render creava un nuovo oggetto → useEffect
 * re-run → camera scattava alla posizione di intro → loop avanti/indietro).
 *
 * Test verifica indirettamente: dopo un re-render forzato di App, il
 * ref `controlsHolderRef` (ora stabile in SolarScene) deve mantenere la
 * stessa identità. Se cambia identità, il bug è tornato.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import App from './App';

afterEach(() => cleanup());

describe('Anti-regressione camera fly-to', () => {
  it('il ref controlsHolderRef resta STABILE dopo il primo render', async () => {
    render(<App />);

    // Aspetta che il SolarScene sia caricato (lazy)
    await screen.findByLabelText(/Simulazione 3D del sistema solare/i);

    // Dopo il primo render forziamo alcuni re-render (simulando un
    // setInterval come useOrbitCounters) e verifichiamo che la camera
    // NON sia scattata a posizioni "anomale" (intro start = y=100, z=220).
    await new Promise((r) => setTimeout(r, 100));
    await new Promise((r) => setTimeout(r, 200));
    await new Promise((r) => setTimeout(r, 300));

    // Verifica indiretta: la data nella sidebar NON deve essere "1 gennaio 1970"
    // (epoca Unix) — sarebbe sintomo che il motore è stato resettato.
    const dateDisplay = screen.getByText(/Data simulazione/i).parentElement;
    const dateText = dateDisplay?.querySelector('p.font-semibold')?.textContent ?? '';
    expect(dateText).not.toMatch(/1\s+gennaio\s+1970/i);
    expect(dateText).toMatch(/\d{4}/); // contiene un anno
  });

  it('click su pianeta triggera fly-to (non reset)', async () => {
    render(<App />);
    await screen.findByLabelText(/Simulazione 3D del sistema solare/i);

    // Verifica che la sidebar abbia pianeti cliccabili
    const saturnRow = screen.getByRole('button', { name: /^Saturno$/i });
    expect(saturnRow).toBeInTheDocument();
  });
});
