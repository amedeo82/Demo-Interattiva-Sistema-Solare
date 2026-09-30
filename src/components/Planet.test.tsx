/**
 * Test del componente Planet: interazioni (click/tastiera) e comportamento
 * della memoizzazione custom — il componente non deve riconnettersi quando
 * cambiano solo props escluse dal confronto (es. onSelect inline).
 */
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Planet from './Planet';
import { planets } from '../data/planets';

// Spy sul hook delle texture: viene invocato a OGNI render di Planet,
// quindi conta i render effettivi del componente.
const textureSpy = vi.hoisted(() => vi.fn(() => null as string | null));
vi.mock('../utils/textures', () => ({
  usePlanetTexture: () => textureSpy(),
}));

const earth = planets.find((p) => p.name === 'Earth')!;

/** Elementi JSX identici tra un render e il successivo: React riapplica la
 *  memo() anche attraverso render() multipli (stesso container). */
const baseProps = {
  planet: earth,
  angle: 0,
  radius: 120,
  isSelected: false,
  showLabel: true,
  simTime: 0,
  realistic: false,
};

function planetElement(overrides: Record<string, unknown> = {}): ReactElement {
  return <Planet {...baseProps} {...overrides} />;
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

  it('usa la ref stabile: una callback inline nuova riceve comunque l\'ultima onSelect', () => {
    // Re-render con onSelect diversa: memo salta il re-render, ma il click
    // deve comunque chiamare la NUOVA callback (comportamento corretto del ref).
    const first = vi.fn();
    const second = vi.fn();
    render(planetElement({ showLabel: false, onSelect: first }));
    render(planetElement({ showLabel: false, onSelect: second }));
    fireEvent.click(screen.getByRole('button', { name: 'Seleziona Terra' }));
    expect(second).toHaveBeenCalledWith(earth);
    expect(first).not.toHaveBeenCalled();
  });
});

describe('Planet — memoizzazione', () => {
  it('non si riconnette se cambiano solo props escluse dal confronto (onSelect)', () => {
    const first = vi.fn();
    const second = vi.fn();
    render(planetElement({ onSelect: first }));
    expect(textureSpy).toHaveBeenCalledTimes(1);
    // Stesso pianeta, stesse props visive, onSelect diversa → nessun re-render.
    render(planetElement({ onSelect: second }));
    expect(textureSpy).toHaveBeenCalledTimes(1);
  });

  it('si riconnette quando cambia angle (nuova posizione orbitale)', () => {
    const onSelect = vi.fn();
    render(planetElement({ onSelect }));
    render(planetElement({ onSelect, angle: 45 }));
    expect(textureSpy).toHaveBeenCalledTimes(2);
  });

  it('si riconnette quando cambia isSelected o showLabel', () => {
    const onSelect = vi.fn();
    render(planetElement({ onSelect }));
    render(planetElement({ onSelect, isSelected: true }));
    expect(textureSpy).toHaveBeenCalledTimes(2);
    render(planetElement({ onSelect, isSelected: true, showLabel: false }));
    expect(textureSpy).toHaveBeenCalledTimes(3);
  });

  it('si riconnette quando cambia simTime (rotazione assiale/lune)', () => {
    const onSelect = vi.fn();
    render(planetElement({ onSelect }));
    render(planetElement({ onSelect, simTime: 0.1 }));
    expect(textureSpy).toHaveBeenCalledTimes(2);
  });
});
