/**
 * Fixture condivise tra i test: qui `mulberry32` NON è il PRNG di produzione
 * (src/utils/random.ts) ma una variante con stato mutabile, pensata per i test
 * "a punteggio completo" del QuizModal.
 *
 * Perché serve: App memoizza l'RNG iniettato (`useMemo(() => quizRnd ?? Math.random, [quizRnd])`)
 * e QuizModal lo usa per generare le domande; se il test usasse lo stesso
 * istanza mulberry32(42) anche per calcolare le risposte attese, i due stream
 * si sfaserebbero (entrambi avanzano a ogni chiamata). Usando un generatore
 * che riparte dal seed a ogni invocazione, il flusso "atteso" e quello "reale"
 * restano allineati senza mock globali di Math.random.
 */
export function seededRng(seed: number): () => number {
  return () => {
    let s = seed | 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
