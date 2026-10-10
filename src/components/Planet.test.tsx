/**
 * Test del componente Planet: interazioni (click/tastiera), comportamento
 * della memoizzazione e aggiornamenti imperativi per-frame (rev. 2: la
 * posizione orbitale non passa più dai props, ma dal flusso di frame del
 * motore scritto direttamente nel DOM via ref).
 */
import { memo, useState, type ReactElement } from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Planet, { type PlanetProps as Props } from './Planet';
import { planets } from '../data/planets';
import type { SimPlanetState } from '../hooks/useOrbitEngine';

// Spy sul hook delle texture: viene invocato a OGNI render di Planet,
// quindi conta i render effettivi del componente.
const textureSpy = vi.hoisted(() => vi.fn(() => null as string | null));
const bumpSpy = vi.hoisted(() => vi.fn(() => null as string | null));
vi.mock('../utils/textures', () => ({
  usePlanetTexture: () => textureSpy(),
  usePlanetBump: () => bumpSpy(),
}));

const earth = planets.find((p) => p.name === 'Earth')!;

/* Stub del flusso di frame: memorizza il listener così i test possono
 * simulare un tick del motore senza requestAnimationFrame. */
let lastListener: ((p: Record<string, SimPlanetState>, t: number) => void) | null = null;
const subscribeFramesStub = (l: (p: Record<string, SimPlanetState>, t: number) => void) => {
  lastListener = l;
  return () => {
    if (lastListener === l) lastListener = null;
  };
};
function emitFrame(angle: number, radius = 130, simTime = 0) {
  act(() => {
    lastListener?.({ Earth: { angle, radius } }, simTime);
  });
}

const baseProps: Omit<Props, 'onSelect'> = {
  planet: earth,
  isSelected: false,
  showLabel: true,
  realistic: false,
  subscribeFrames: subscribeFramesStub,
};

/* Props complete (con onSelect stub) da passare all'harness di memoizzazione. */
function fullProps(overrides: Partial<Props> = {}): Props {
  return { ...baseProps, onSelect: () => {}, ...overrides };
}

/* Il componente esportato è memo(): per i test di interazione si usa il
 * componente interno non-memo, così le spy iniettate vengono sempre invocate. */
const RawPlanet = Planet as unknown as (p: Props) => ReactElement;

function planetElement(overrides: Partial<Props>): ReactElement {
  return <RawPlanet {...fullProps(overrides)} />;
}

/*
 * Harness per i test di memoizzazione: due render SUCCESSIVI dello stesso
 * albero (con le stesse props eccetto gli override) fanno sì che React
 * applichi davvero il confronto di memo(). Chiamare `render()` due volte
 * creerebbe invece alberi indipendenti (elementi React diversi → niente
 * bail-out), motivo per cui qui serve un update interno con stato.
 *
 * Due stati interni: `props` (le props passate a Planet) e `tick`. Ogni
 * setHarnessProps fa bumpare tick, così MemoHarness si riconnette SEMPRE e
 * React è costretto a eseguire il reconcile del figlio memo(): il bail-out
 * dipende quindi solo dal confronto shallow delle props — esattamente ciò
 * che i test vogliono misurare.
 *
 * NB: le props cambiate tramite setHarnessProps devono essere STABILI
 * (letterali o useMemo): valori "freschi" come vi.fn() creati riga per riga
 * sarebbero identità diverse a ogni update e romperebbero il bail-out.
 */
let setHarnessProps!: (next: Props) => void;

const MemoHarness = memo(function MemoHarness({ initial }: { initial: Props }) {
  const [props, setProps] = useState<Props>(initial);
  const [, setTick] = useState(0);
  setHarnessProps = (next: Props) =>
    act(() => {
      setProps(next);
      setTick((t) => t + 1); // forza il re-render dell'harness → reconcile del figlio
    });
  return <Planet {...props} />;
});

function openHarness(initial: Props) {
  render(<MemoHarness initial={initial} />);
}

function renderPlanet(overrides: Record<string, unknown> = {}) {
  const onSelect = vi.fn();
  render(planetElement({ onSelect, ...overrides }));
  return { onSelect };
}

afterEach(() => {
  cleanup();
  textureSpy.mockClear();
  lastListener = null;
});

describe('Planet — interazioni', () => {
  it('chiama onSelect con il pianeta al click', () => {
    const { onSelect } = renderPlanet();
    fireEvent.click(screen.getByRole('button', { name: 'Seleziona Terra' }));
    expect(onSelect).toHaveBeenCalledWith(earth);
  });

  it('chiama onSelect con Enter', () => {
    const { onSelect } = renderPlanet();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Seleziona Terra' }), { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('chiama onSelect con Spazio e previene il default (scroll)', () => {
    const { onSelect } = renderPlanet();
    const el = screen.getByRole('button', { name: 'Seleziona Terra' });
    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    el.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

describe('Planet — memoizzazione (rev. 2)', () => {
  it('NON si riconnette quando arriva un nuovo frame (posizioni via ref)', () => {
    // È il cuore dell'ottimizzazione 60fps: il tick del motore aggiorna il
    // DOM direttamente, senza coinvolgere il reconciler React.
    openHarness(fullProps());
    emitFrame(45, 130, 1.2);
    expect(textureSpy).toHaveBeenCalledTimes(1);
    const transform = screen.getByRole('button', { name: 'Seleziona Terra' }).style.transform;
    expect(transform).toContain('translate(');
    expect(transform).not.toBe('');
  });

  it('si riconnette quando cambia isSelected o showLabel', () => {
    openHarness(fullProps());
    setHarnessProps(fullProps({ isSelected: true }));
    expect(textureSpy).toHaveBeenCalledTimes(2);
    setHarnessProps(fullProps({ isSelected: true, showLabel: false }));
    expect(textureSpy).toHaveBeenCalledTimes(3);
  });

  it('si riconnette quando cambia realistic (struttura lune/DOM)', () => {
    openHarness(fullProps());
    setHarnessProps(fullProps({ realistic: true }));
    expect(textureSpy).toHaveBeenCalledTimes(2);
  });

  it("il click arriva all'ultima callback anche con onSelect instabile", () => {
    // Scenario reale: App passa setSelectedPlanet (identità stabile), ma un
    // wrapper inline potrebbe cambiarla tra i render. Il trucco "latest ref"
    // (ref mutato in render, pattern React ufficiale) fa sì che il click
    // invochi sempre l'ultima callback. Qui `onSelect` cambia a ogni update
    // (nuovo stub per riga): è il caso peggiore per memo() — il bail-out NON
    // scatta e Planet si riconnette — e proprio per questo il closure nel DOM
    // viene aggiornato: il click deve arrivare a `second`, mai a `first`.
    const first = vi.fn();
    const second = vi.fn();
    openHarness(fullProps({ showLabel: false, onSelect: first }));

    // 1) onSelect diversa → re-render (memo non può bailare su prop cambiata)
    setHarnessProps(fullProps({ showLabel: false, onSelect: second }));

    // 2) prop strutturale → altro re-render garantito
    setHarnessProps(fullProps({ showLabel: true, onSelect: second }));

    fireEvent.click(screen.getByRole('button', { name: 'Seleziona Terra' }));
    expect(second).toHaveBeenCalledWith(earth);
    expect(first).not.toHaveBeenCalled();
  });
});
