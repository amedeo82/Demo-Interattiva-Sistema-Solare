/**
 * Test del componente Planet: interazioni (click/tastiera) e comportamento
 * della memoizzazione custom — il componente non deve riconnettersi quando
 * cambiano solo props escluse dal confronto (es. onSelect inline).
 */
import { memo, useState, type ReactElement } from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Planet, { type PlanetProps as Props } from './Planet';
import { planets } from '../data/planets';

// Spy sul hook delle texture: viene invocato a OGNI render di Planet,
// quindi conta i render effettivi del componente.
const textureSpy = vi.hoisted(() => vi.fn(() => null as string | null));
vi.mock('../utils/textures', () => ({
  usePlanetTexture: () => textureSpy(),
}));

const earth = planets.find((p) => p.name === 'Earth')!;

const baseProps: Omit<Props, 'onSelect'> = {
  planet: earth,
  angle: 0,
  radius: 120,
  isSelected: false,
  showLabel: true,
  simTime: 0,
  realistic: false,
};

/* Props complete (con onSelect stub) da passare all'harness di memoizzazione. */
function fullProps(overrides: Partial<Props> = {}): Props {
  return { ...baseProps, onSelect: () => {}, ...overrides };
}

/* Il componente esportato è memo() con comparator custom che ignora
 * `onSelect`: per i test si usa il componente interno non-memo, così le
 * spy iniettate vengono sempre invocate. */
const RawPlanet = Planet as unknown as (p: Props) => ReactElement;

function planetElement(overrides: Partial<Props>): ReactElement {
  return <RawPlanet {...fullProps(overrides)} />;
}

/*
 * Harness per i test di memoizzazione: due render SUCCESSIVI dello stesso
 * albero (con le stesse props eccetto gli override) fanno sì che React
 * applichi davvero la comparator di memo(). Chiamare `render()` due volte
 * creerebbe invece alberi indipendenti (elementi React diversi → niente
 * bail-out), motivo per cui qui serve un update interno con stato.
 *
 * Il genitore è MEMOIZZATO a sua volta: senza memo(), ogni setState del
 * harness farebbe ricreare all'infinito la closure inline `onSelect`,
 * invalidando il confronto custom e impedendo di osservare il bail-out.
 */
let setHarnessProps!: (partial: Partial<Props>) => void;

const MemoHarness = memo(function MemoHarness({ initial }: { initial: Props }) {
  const [props, setProps] = useState<Props>(initial);
  setHarnessProps = (partial: Partial<Props>) =>
    act(() => setProps((prev) => ({ ...prev, ...partial })));
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

  it('usa la ref stabile: il click richiama onSelect anche se memo salta il re-render', () => {
    // Re-render dello STESSO albero con onSelect diversa: la comparator
    // esclude onSelect dal confronto → memo salta il re-render e l'ultimo
    // closure montato (first) resta attivo. Il click DEVE comunque arrivare
    // a una callback valida (nessun crash da closure stale/nulla).
    const first = vi.fn();
    const second = vi.fn();
    openHarness(fullProps({ showLabel: false, onSelect: first }));
    setHarnessProps({ onSelect: second });
    expect(textureSpy).toHaveBeenCalledTimes(1); // bail-out confermato
    fireEvent.click(screen.getByRole('button', { name: 'Seleziona Terra' }));
    expect(first).toHaveBeenCalledWith(earth);
    expect(second).not.toHaveBeenCalled();
  });
});

describe('Planet — memoizzazione', () => {
  it('non si riconnette se cambiano solo props escluse dal confronto (onSelect)', () => {
    const first = vi.fn();
    const second = vi.fn();
    openHarness(fullProps({ onSelect: first }));
    expect(textureSpy).toHaveBeenCalledTimes(1);
    // Stesso pianeta, stesse props visive, onSelect diversa → nessun re-render.
    setHarnessProps({ onSelect: second });
    expect(textureSpy).toHaveBeenCalledTimes(1);
  });

  it('si riconnette quando cambia angle (nuova posizione orbitale)', () => {
    const onSelect = vi.fn();
    openHarness(fullProps({ onSelect }));
    setHarnessProps({ angle: 45 });
    expect(textureSpy).toHaveBeenCalledTimes(2);
  });

  it('si riconnette quando cambia isSelected o showLabel', () => {
    const onSelect = vi.fn();
    openHarness(fullProps({ onSelect }));
    setHarnessProps({ isSelected: true });
    expect(textureSpy).toHaveBeenCalledTimes(2);
    setHarnessProps({ showLabel: false });
    expect(textureSpy).toHaveBeenCalledTimes(3);
  });

  it('si riconnette quando cambia simTime (rotazione assiale/lune)', () => {
    const onSelect = vi.fn();
    openHarness(fullProps({ onSelect }));
    setHarnessProps({ simTime: 0.1 });
    expect(textureSpy).toHaveBeenCalledTimes(2);
  });
});
