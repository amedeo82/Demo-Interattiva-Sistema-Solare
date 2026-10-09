import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

/** Polyfill ResizeObserver (richiesto da react-use-measure → drei <R3F>).
 *  jsdom non lo implementa; stub minimale che chiama la callback con un
 *  target fittizio. Senza questo, ogni test che monta <App> (che ora usa
 *  <SolarScene> → <Canvas>) crasha. */
class ResizeObserverStub {
  callback: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.callback = cb;
  }
  observe(target: Element) {
    this.callback(
      [{ target, contentRect: { width: 1280, height: 800 } } as ResizeObserverEntry],
      this as unknown as ResizeObserver
    );
  }
  unobserve() {}
  disconnect() {}
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
}

// Iscritto come polyfill anche per window per ambienti che leggono da lì.
if (typeof window !== 'undefined' && typeof window.ResizeObserver === 'undefined') {
  (window as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
}

// Mock IntersectionObserver (usato da alcuni drei components).
if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
}

/** Mock minimo del WebGL context (richiesto da react-three-fiber).
 *  Senza questo, drei/three crashano quando provano a fare getContext('webgl'). */
if (typeof HTMLCanvasElement !== 'undefined') {
  const webglMock = {
    getExtension: () => null,
    getParameter: () => 0,
    getShaderPrecisionFormat: () => ({ precision: 1, rangeMin: 1, rangeMax: 1 }),
    createBuffer: () => ({}),
    createShader: () => ({}),
    createProgram: () => ({}),
    createTexture: () => ({}),
    createVertexArray: () => ({}),
    bindBuffer: () => {},
    bufferData: () => {},
    shaderSource: () => {},
    compileShader: () => {},
    attachShader: () => {},
    linkProgram: () => {},
    useProgram: () => {},
    getShaderParameter: () => true,
    getProgramParameter: () => true,
    getProgramInfoLog: () => '',
    getShaderInfoLog: () => '',
    enable: () => {},
    disable: () => {},
    depthFunc: () => {},
    depthMask: () => {},
    clearColor: () => {},
    clear: () => {},
    viewport: () => {},
    drawArrays: () => {},
    drawElements: () => {},
    getError: () => 0,
    vertexAttribPointer: () => {},
    enableVertexAttribArray: () => {},
    disableVertexAttribArray: () => {},
    activeTexture: () => {},
    bindTexture: () => {},
    texImage2D: () => {},
    texParameteri: () => {},
    pixelStorei: () => {},
    uniform1i: () => {},
    uniform1f: () => {},
    uniformMatrix4fv: () => {},
    uniform3fv: () => {},
    deleteShader: () => {},
    deleteProgram: () => {},
    deleteBuffer: () => {},
    deleteTexture: () => {},
    blendFunc: () => {},
    blendEquation: () => {},
    cullFace: () => {},
    frontFace: () => {},
    scissor: () => {},
    colorMask: () => {},
    stencilMask: () => {},
    getContextAttributes: () => ({}),
    isContextLost: () => false,
    canvas: {},
    drawingBufferWidth: 1280,
    drawingBufferHeight: 800,
    MAX_TEXTURE_SIZE: 1024,
  } as unknown as WebGLRenderingContext;

  // 2D mock (preservato dal vecchio setup): usato dai test textures.test.ts.
  const noop = () => {};
  const makeCtx2D = () => ({
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
  HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,iVBORw0KGgo=';

  HTMLCanvasElement.prototype.getContext = function (kind: string) {
    if (kind === '2d') return makeCtx2D() as unknown as CanvasRenderingContext2D;
    if (kind === 'webgl' || kind === 'webgl2' || kind === 'experimental-webgl')
      return webglMock as unknown as WebGLRenderingContext;
    return null;
  } as unknown as typeof HTMLCanvasElement.prototype.getContext;
}

// Isola preferenze localStorage fra i test (vedi dopo commento in basso).
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
