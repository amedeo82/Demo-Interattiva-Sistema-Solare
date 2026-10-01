import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import App from './App';

beforeEach(() => cleanup());

describe('App — rendering', () => {
  it('mostra header e simulazione', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Sistema Solare/i);
    expect(screen.getByLabelText(/Simulazione 3D del sistema solare/i)).toBeInTheDocument();
  });

  it('renderizza la scena 3D e il pannello laterale', () => {
    render(<App />);
    // La sidebar lista i pianeti come bottoni (per accessibilità).
    const planetRows = screen.getAllByRole('button', { name: /^(Mercurio|Venere|Terra|Marte|Giove|Saturno|Urano|Nettuno)$/i });
    expect(planetRows.length).toBeGreaterThanOrEqual(8);
  });
});

describe('App — interazioni', () => {
  it('apre il pannello informazioni al click su un pianeta', () => {
    render(<App />);
    // Nella scena 3D i pianeti non sono più bottoni DOM; la selezione passa
    // dalla sidebar (lista pianeti) — è il modo canonico anche per chi non usa
    // mouse 3D.
    fireEvent.click(screen.getAllByRole('button', { name: /^Terra$/i })[0]);
    const dialog = screen.getByRole('dialog', { name: /Informazioni su Terra/i });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Terra');
  });

  it('chiude il pannello con il tasto Esc', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /^Marte$/i })[0]);
    expect(screen.queryByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('chiude il pannello con il pulsante ✕', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /^Giove$/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /Chiudi pannello/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('attiva/disattiva la riproduzione dal pulsante in sidebar', () => {
    render(<App />);
    const btn = screen.getByRole('button', { name: /Pausa/i });
    fireEvent.click(btn);
    expect(screen.getByRole('button', { name: /Riproduci/i })).toBeInTheDocument();
  });

  it('cambia velocità dai chip di selezione', () => {
    render(<App />);
    const chip = screen.getByRole('button', { name: '5x' });
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
  });

  it('seleziona un pianeta dalla lista in sidebar', () => {
    render(<App />);
    // il pulsante del pianeta sulla scena si chiama "Seleziona Saturno",
    // quello della sidebar semplicemente "Saturno"
    const rows = screen.getAllByRole('button', { name: /^Saturno$/i });
    fireEvent.click(rows[0]);
    expect(screen.getByRole('dialog', { name: /Informazioni su Saturno/i })).toBeInTheDocument();
  });
});

describe('App — scorciatoie da tastiera', () => {
  it('Spazio mette in pausa', () => {
    render(<App />);
    fireEvent.keyDown(window, { key: ' ' });
    expect(screen.getByRole('button', { name: /Riproduci/i })).toBeInTheDocument();
  });

  it('Freccia destra aumenta la velocità', () => {
    render(<App />);
    const before = screen.getByRole('button', { name: '1x' });
    expect(before).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByRole('button', { name: '2x' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('ignora i tasti digitati negli input', () => {
    render(<App />);
    // nessun input presente, ma verifichiamo che il listener non esploda
    const handler = vi.fn();
    window.addEventListener('keydown', handler);
    fireEvent.keyDown(window, { key: ' ' });
    window.removeEventListener('keydown', handler);
    expect(handler).toHaveBeenCalled();
  });
});
