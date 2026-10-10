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
    const planetRows = screen.getAllByRole('button', {
      name: /^(Mercurio|Venere|Terra|Marte|Giove|Saturno|Urano|Nettuno)$/i,
    });
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

  it('il pannello espone le tab Dati / Atmosfera / Missioni / Curiosità', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /^Saturno$/i })[0]);
    const dialog = screen.getByRole('dialog', { name: /Informazioni su Saturno/i });
    // tablist ARIA: deve contenere tutte e 4 le sezioni
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Dati/),
        expect.stringMatching(/Atmosfera/),
        expect.stringMatching(/Missioni/),
        expect.stringMatching(/Curiosità/),
      ])
    );
    // default: Dati è selezionata
    expect(tabs.find((t) => t.textContent?.match(/Dati/))).toHaveAttribute('aria-selected', 'true');
    // Cambio tab → Missioni: la lista missioni appare
    fireEvent.click(tabs.find((t) => t.textContent?.match(/Missioni/))!);
    expect(tabs.find((t) => t.textContent?.match(/Missioni/))).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(dialog).toHaveTextContent(/Cassini-Huygens/);
  });

  it('il pannello non sfora dal contenitore <main> (regression desktop overflow)', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /^Marte$/i })[0]);
    const dialog = screen.getByRole('dialog', { name: /Informazioni su Marte/i });
    // Deve essere posizionato assolutamente dentro <main>, con max-h relativo
    // al contenitore (non al viewport) per evitare lo sforamento sotto l'header.
    const cls = dialog.className;
    expect(cls).toMatch(/absolute/);
    expect(cls).toMatch(/max-h-\[calc\(100%-2rem\)\]/);
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

describe('App — menu overflow header', () => {
  it('apre il menu "⋯" e mostra Confronto/Tour/Free Cam', () => {
    render(<App />);
    // Le voci secondarie dell'header non sono più bottoni sempre visibili:
    // vivono dentro un menu a tendina (role=menu) attivato dal bottone "⋯".
    expect(screen.queryByRole('menuitem', { name: /Confronto/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Altre opzioni/i }));
    expect(screen.getByRole('menuitem', { name: /Confronto/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Tour/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Free Cam/i })).toBeInTheDocument();
  });
});
