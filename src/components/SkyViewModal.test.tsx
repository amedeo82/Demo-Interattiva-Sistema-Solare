/**
 * S13 · F3 — Test per SkyViewModal.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SkyViewModal } from './SkyViewModal';

describe('SkyViewModal', () => {
  it('non renderizza nulla se open=false', () => {
    const { container } = render(<SkyViewModal open={false} onClose={() => {}} />);
    expect(container.querySelector('[data-testid="skyview-modal"]')).toBeNull();
  });

  it("renderizza il dialog con l'SVG del cielo", async () => {
    render(<SkyViewModal open={true} onClose={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId('skyview-modal')).toBeInTheDocument();
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(document.querySelector('svg[role="img"]')).toBeInTheDocument();
  });

  it('preset Roma è il default e il cambiamento non crasha', () => {
    render(<SkyViewModal open={true} onClose={() => {}} />);
    const select = screen.getByLabelText(/osservatore/i) as HTMLSelectElement;
    expect(select.value).toBe('0');
    fireEvent.change(select, { target: { value: '1' } });
    expect(select.value).toBe('1');
  });

  it('passaggio a "Manuale…" mostra input lat/lon', () => {
    render(<SkyViewModal open={true} onClose={() => {}} />);
    const select = screen.getByLabelText(/osservatore/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'manual' } });
    expect(screen.getByLabelText('Latitudine')).toBeInTheDocument();
    expect(screen.getByLabelText('Longitudine')).toBeInTheDocument();
  });

  it('bottone Chiudi chiama onClose', () => {
    const onClose = vi.fn();
    render(<SkyViewModal open={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /chiudi/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
