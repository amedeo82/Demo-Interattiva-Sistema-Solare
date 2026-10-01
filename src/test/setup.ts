import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

// Isolamento fra test: `usePersistentState` legge da localStorage all'inizializzazione,
// quindi un test che modifica una preferenza (es. cliccando il chip "5x" della velocità)
// inquinerebbe il successivo test che si aspetta il default. jsdom condivide un unico
// localStorage fra tutti i test del file, azzerandolo qui preserviamo l'equivalente
// di un "primo avvio" per ogni test.
afterEach(() => {
  try {
    window.localStorage.clear();
  } catch {
    // localStorage potrebbe non essere disponibile (probe fallito in safeStorage);
    // in tal caso le preferenze sono già solo in memoria e non c'è nulla da pulire.
  }
});

// Mock di matchMedia (usato per prefers-reduced-motion) non presente in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock del canvas 2D: jsdom non implementa getContext('2d') né toDataURL.
// Le texture procedurali vengono "pittate" su un contesto finto e il mock
// restituisce un data-uri minimo, così i test possono renderizzare App.
if (typeof HTMLCanvasElement !== 'undefined') {
  const noop = () => {};
  const makeCtx = () => ({
    fillStyle: '',
    globalAlpha: 1,
    clearRect: noop,
    fillRect: noop,
    beginPath: noop,
    arc: noop,
    ellipse: noop,
    moveTo: noop,
    lineTo: noop,
    closePath: noop,
    fill: noop,
    drawImage: noop,
    createRadialGradient: () => ({ addColorStop: noop }),
    createLinearGradient: () => ({ addColorStop: noop }),
  });
  HTMLCanvasElement.prototype.getContext = function () {
    return makeCtx();
  } as unknown as typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,iVBORw0KGgo=';
}
