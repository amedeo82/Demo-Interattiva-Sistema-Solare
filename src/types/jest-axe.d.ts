// S10a · M6a — tipi per jest-axe (non forniti ufficialmente).
declare module 'jest-axe' {
  import type { AxeResults, Result, RunOptions, Spec } from 'axe-core';

  export function axe(
    html: Element | string | Document,
    options?: RunOptions | Spec
  ): Promise<AxeResults>;

  export function configure(options: RunOptions | Spec): void;

  export const toHaveNoViolations: {
    toHaveNoViolations(received?: AxeResults): R;
  };

  // Risultato di un singolo check (per tipizzare gli assert personalizzati)
  export type AxeResult = Result;
}
