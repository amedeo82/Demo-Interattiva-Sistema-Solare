/**
 * Test del componente Timeline (S15): verifica la renderizzazione dei
 * marker eventi (congiunzioni/opposizioni) sopra la traccia.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Timeline, { type TimelineMarker } from './Timeline';

describe('Timeline', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const baseProps = {
    baseSimTime: 0,
    currentSimTime: 0,
    yearSimSeconds: 10,
    onSeek: vi.fn(),
  };

  it('renderizza un marker per ogni evento nel range visibile', () => {
    const markers: TimelineMarker[] = [
      { simTime: -5, kind: 'conjunction', label: 'Conjunction Earth–Jupiter' },
      { simTime: 5, kind: 'opposition', label: 'Opposition of Mars' },
      // fuori range: simTime = 25 (> 20 = range/2 con range default 40)
      { simTime: 25, kind: 'other', label: 'Fuori' },
    ];
    render(<Timeline {...baseProps} markers={markers} rangeSimSeconds={40} />);
    const in1 = screen.getByLabelText('Conjunction Earth–Jupiter');
    const in2 = screen.getByLabelText('Opposition of Mars');
    expect(in1).toBeInTheDocument();
    expect(in2).toBeInTheDocument();
    // marker fuori range: non renderizzato
    expect(screen.queryByLabelText('Fuori')).toBeNull();
  });

  it('click su un marker chiama onSeek con il simTime del marker', () => {
    const onSeek = vi.fn();
    const markers: TimelineMarker[] = [
      { simTime: 5, kind: 'opposition', label: 'Opposition of Mars' },
    ];
    render(<Timeline {...baseProps} onSeek={onSeek} markers={markers} />);
    fireEvent.click(screen.getByLabelText('Opposition of Mars'));
    expect(onSeek).toHaveBeenCalledWith(5);
  });

  it('click sul marker non triggera il seek-on-pointerdown della traccia', () => {
    // Verifica che e.stopPropagation() impedisca alla traccia di
    // ricevere il pointerdown (che farebbe seek al punto cliccato).
    const onSeek = vi.fn();
    const markers: TimelineMarker[] = [{ simTime: 0, kind: 'conjunction', label: 'Test' }];
    render(<Timeline {...baseProps} onSeek={onSeek} markers={markers} />);
    fireEvent.click(screen.getByLabelText('Test'));
    // Ci aspettiamo 1 sola chiamata (quella del marker), non 2.
    expect(onSeek).toHaveBeenCalledTimes(1);
    expect(onSeek).toHaveBeenCalledWith(0);
  });
});
