import '@testing-library/jest-dom/vitest';

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
  HTMLCanvasElement.prototype.getContext = function () {
    return {
      fillStyle: '',
      globalAlpha: 1,
      fillRect: noop,
      beginPath: noop,
      arc: noop,
      ellipse: noop,
      moveTo: noop,
      lineTo: noop,
      closePath: noop,
      fill: noop,
    };
  } as unknown as typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,iVBORw0KGgo=';
}
