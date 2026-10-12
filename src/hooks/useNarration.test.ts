/**
 * S14 · F7 — Test per useNarration (Web Speech API mockata).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNarration, isSpeechSupported } from './useNarration';
import { useUiStore } from '../store/ui';

// Stato mock del sintetizzatore
class UtteranceStub {
  text = '';
  lang = '';
  voice: unknown = null;
  rate = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
}
const mockState = {
  utterances: [] as UtteranceStub[],
  cancelled: 0,
};

// jsdom non definisce SpeechSynthesisUtterance: stub minimo.
vi.stubGlobal('SpeechSynthesisUtterance', UtteranceStub);

vi.stubGlobal('speechSynthesis', {
  cancel: vi.fn(() => {
    mockState.cancelled++;
  }),
  speak: vi.fn((u: UtteranceStub) => {
    mockState.utterances.push(u);
  }),
  getVoices: vi.fn(() => [
    { lang: 'it-IT', name: 'Test Italian' } as unknown as SpeechSynthesisVoice,
  ]),
});

describe('isSpeechSupported', () => {
  it('true quando speechSynthesis è disponibile', () => {
    expect(isSpeechSupported()).toBe(true);
  });
});

describe('useNarration', () => {
  beforeEach(() => {
    mockState.utterances = [];
    mockState.cancelled = 0;
    useUiStore.setState({ narrationActive: false });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('toggle con testo → speak con lang it-IT e narrationActive=true', () => {
    const { result } = renderHook(() => useNarration('Benvenuto su Giove'));
    act(() => {
      result.current.toggle();
    });
    expect(result.current.speaking).toBe(true);
    expect(mockState.utterances.length).toBe(1);
    expect(mockState.utterances[0].lang).toBe('it-IT');
    expect(useUiStore.getState().narrationActive).toBe(true);
  });

  it('toggle durante la lettura → cancel e narrationActive=false', () => {
    const { result } = renderHook(() => useNarration('Testo'));
    act(() => {
      result.current.toggle();
    });
    act(() => {
      result.current.toggle();
    });
    expect(result.current.speaking).toBe(false);
    expect(mockState.cancelled).toBeGreaterThanOrEqual(1);
    expect(useUiStore.getState().narrationActive).toBe(false);
  });

  it('cambio testo → stop immediato', () => {
    const { result, rerender } = renderHook(({ t }) => useNarration(t), {
      initialProps: { t: 'primo' },
    });
    act(() => {
      result.current.toggle();
    });
    const cancelledBefore = mockState.cancelled;
    rerender({ t: 'secondo' });
    expect(mockState.cancelled).toBeGreaterThan(cancelledBefore);
    expect(result.current.speaking).toBe(false);
  });

  it('unmount → stop', () => {
    const { result, unmount } = renderHook(() => useNarration('Testo'));
    act(() => {
      result.current.toggle();
    });
    const cancelledBefore = mockState.cancelled;
    unmount();
    expect(mockState.cancelled).toBeGreaterThan(cancelledBefore);
  });
});
