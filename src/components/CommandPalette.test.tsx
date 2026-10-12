/**
 * S14 · F9 — Test per CommandPalette.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommandPalette, type PaletteCommand } from './CommandPalette';

const commands: PaletteCommand[] = [
  { id: 'mars', label: 'Marte', icon: '🔴', hint: 'Pianeta', run: vi.fn() },
  { id: 'jupiter', label: 'Giove', icon: '🟠', hint: 'Pianeta', run: vi.fn() },
  { id: 'compare', label: 'Confronto pianeti', icon: '⚖️', hint: 'Vista', run: vi.fn() },
  { id: 'quiz', label: 'Quiz spaziale', icon: '🧠', hint: 'Vista', run: vi.fn() },
];

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('non renderizza nulla se open=false', () => {
    const { container } = render(
      <CommandPalette open={false} onClose={() => {}} commands={commands} />
    );
    expect(container.querySelector('[data-testid="command-palette"]')).toBeNull();
  });

  it('mostra tutti i comandi a apertura', () => {
    render(<CommandPalette open={true} onClose={() => {}} commands={commands} />);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Marte')).toBeInTheDocument();
    expect(screen.getByText('Giove')).toBeInTheDocument();
  });

  it('filtra per query', () => {
    render(<CommandPalette open={true} onClose={() => {}} commands={commands} />);
    const input = screen.getByLabelText('Cerca comando');
    fireEvent.change(input, { target: { value: 'mar' } });
    expect(screen.getByText('Marte')).toBeInTheDocument();
    expect(screen.queryByText('Giove')).toBeNull();
  });

  it('mostra messaggio "Nessun risultato" per query senza match', () => {
    render(<CommandPalette open={true} onClose={() => {}} commands={commands} />);
    const input = screen.getByLabelText('Cerca comando');
    fireEvent.change(input, { target: { value: 'zzz' } });
    expect(screen.getByText(/nessun risultato/i)).toBeInTheDocument();
  });

  it('Enter esegue il comando attivo e chiude la palette', () => {
    const onClose = vi.fn();
    const marsRun = vi.fn();
    const cmds: PaletteCommand[] = [{ ...commands[0], run: marsRun }];
    render(<CommandPalette open={true} onClose={onClose} commands={cmds} />);
    const input = screen.getByLabelText('Cerca comando');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(marsRun).toHaveBeenCalledTimes(1);
  });

  it('freccia giù sposta il selection, Enter esegue il nuovo attivo', () => {
    const onClose = vi.fn();
    const jupiterRun = vi.fn();
    const marsRun = vi.fn();
    const cmds: PaletteCommand[] = [
      { ...commands[0], run: marsRun },
      { ...commands[1], run: jupiterRun },
    ];
    render(<CommandPalette open={true} onClose={onClose} commands={cmds} />);
    const input = screen.getByLabelText('Cerca comando');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(jupiterRun).toHaveBeenCalledTimes(1);
    expect(marsRun).not.toHaveBeenCalled();
  });

  it('Esc chiude la palette', () => {
    const onClose = vi.fn();
    render(<CommandPalette open={true} onClose={onClose} commands={commands} />);
    const input = screen.getByLabelText('Cerca comando');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('click su un comando lo esegue', () => {
    const quizRun = vi.fn();
    const cmds: PaletteCommand[] = [{ ...commands[3], run: quizRun }];
    render(<CommandPalette open={true} onClose={() => {}} commands={cmds} />);
    fireEvent.click(screen.getByText('Quiz spaziale'));
    expect(quizRun).toHaveBeenCalledTimes(1);
  });
});
