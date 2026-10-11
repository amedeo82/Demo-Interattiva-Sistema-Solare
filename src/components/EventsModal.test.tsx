/**
 * S11 · F2 — Test per EventsModal.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EventsModal } from './EventsModal';

describe('EventsModal', () => {
  it('non renderizza nulla se open=false', () => {
    const { container } = render(<EventsModal open={false} onClose={() => {}} onGoTo={() => {}} />);
    expect(container.querySelector('[data-testid="events-modal"]')).toBeNull();
  });

  it('renderizza il dialog se open=true', async () => {
    render(<EventsModal open={true} onClose={() => {}} onGoTo={() => {}} />);
    await waitFor(
      () => {
        expect(screen.getByTestId('events-modal')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('bottone Chiudi chiama onClose', () => {
    const onClose = vi.fn();
    render(<EventsModal open={true} onClose={onClose} onGoTo={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /chiudi/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('mostra il placeholder "Nessun evento" se il range è vuoto', async () => {
    render(
      <EventsModal
        open={true}
        onClose={() => {}}
        onGoTo={() => {}}
        from={new Date('2030-01-01')}
        rangeMonths={0}
      />
    );
    await waitFor(
      () => {
        expect(screen.getByText(/nessun evento trovato/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });
});
