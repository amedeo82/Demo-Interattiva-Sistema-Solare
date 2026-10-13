/**
 * Quiz mode: domande a risposta multipla sui pianeti.
 * Le domande sono generate in parte dai dati reali del dataset (così il
 * quiz resta sincronizzato con i dati) e in parte "curated".
 *
 * S14 · F8 — evoluzione:
 *  - 3 livelli di difficoltà (easy/medium/hard) con pool di domande diversi
 *  - best score persistito per livello (PREFS_KEYS.quizBest)
 *  - modalità "focus" su un singolo pianeta (bottone "Mettimi alla prova"
 *    nel pannello info → QuizModal con focusPlanet)
 */
import { useEffect, useMemo, useState } from 'react';
import type { PlanetData } from '../data/planets';
import { PREFS_KEYS, loadJSON, saveJSON } from '../utils/prefs';
import { useT } from '../i18n';

export type QuizLevel = 'easy' | 'medium' | 'hard';

interface Props {
  planets: PlanetData[];
  onClose: () => void;
  /** RNG iniettabile per rendere deterministico lo shuffle nei test. */
  rnd?: () => number;
  /** S14 · F8 — livello di difficoltà. Default 'medium' (comportamento storico). */
  level?: QuizLevel;
  /** S14 · F8 — se valorizzato, il quiz propone solo domande su questo pianeta. */
  focusPlanet?: string;
}

export interface Question {
  prompt: string;
  options: string[];
  answerIndex: number;
}

/** Best score persistiti, per livello. */
type BestScores = Partial<Record<QuizLevel, number>>;

function loadBest(): BestScores {
  return loadJSON<BestScores>(PREFS_KEYS.quizBest, {}, (v) => typeof v === 'object' && v !== null);
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Sceglie N distrattori (nomi italiani) diversi dal pianeta corretto. */
function distractors(
  planets: PlanetData[],
  correct: PlanetData,
  n: number,
  rnd: () => number
): string[] {
  const pool = planets.filter((p) => p.name !== correct.name).map((p) => p.nameIt);
  return shuffle(pool, rnd).slice(0, n);
}

/** Domande "curated" di base: più grande, più veloce, anelli. */
function curatedQuestions(planets: PlanetData[], rnd: () => number): Question[] {
  const byDiameter = [...planets].sort((x, y) => x.diameter - y.diameter);
  const biggest = byDiameter[byDiameter.length - 1];
  const byPeriod = [...planets].sort((x, y) => x.orbitalPeriod - y.orbitalPeriod);
  const fastest = byPeriod[0];
  const withRings = planets.find((p) => p.name === 'Saturn') ?? planets[5];

  const make = (prompt: string, correct: PlanetData): Question => {
    const options = shuffle([correct.nameIt, ...distractors(planets, correct, 3, rnd)], rnd);
    return { prompt, options, answerIndex: options.indexOf(correct.nameIt) };
  };

  return [
    make('Quale pianeta è il più grande del sistema solare?', biggest),
    make('Quale pianeta completa lorbita più rapidamente?', fastest),
    make('Quale pianeta è famoso per i suoi anelli?', withRings),
  ];
}

/** Domande "A quale pianeta si riferisce questo fatto?" dalle trivia. */
function triviaQuestions(
  planets: PlanetData[],
  count: number,
  rnd: () => number,
  focus?: string
): Question[] {
  const pool = planets.filter((p) => p.facts.trivia.length > 0);
  const source = focus ? pool.filter((p) => p.name === focus) : pool;
  const picked = source.slice(0, count);
  return picked.map((p) => {
    const fact = p.facts.trivia[0];
    const options = shuffle([p.nameIt, ...distractors(planets, p, 3, rnd)], rnd);
    return {
      prompt: `A quale pianeta si riferisce questo fatto? "${fact}"`,
      options,
      answerIndex: options.indexOf(p.nameIt),
    };
  });
}

/** Domande extra per il livello hard: più satelliti, più lontano. */
function hardQuestions(planets: PlanetData[], rnd: () => number): Question[] {
  const byMoons = [...planets].sort((x, y) => y.facts.moonsCount - x.facts.moonsCount);
  const mostMoons = byMoons[0];
  const byDistance = [...planets].sort((x, y) => y.distanceFromSun - x.distanceFromSun);
  const farthest = byDistance[0];
  const make = (prompt: string, correct: PlanetData): Question => {
    const options = shuffle([correct.nameIt, ...distractors(planets, correct, 3, rnd)], rnd);
    return { prompt, options, answerIndex: options.indexOf(correct.nameIt) };
  };
  return [
    make('Quale pianeta ha più satelliti confermati?', mostMoons),
    make('Quale pianeta è il più lontano dal Sole?', farthest),
  ];
}

/**
 * Genera le domande del quiz a partire dal dataset.
 * `rnd` è iniettabile (default: Math.random) così i test possono usare un RNG
 * deterministico. `level` filtra il pool; `focusPlanet` restringe le domande
 * a un solo pianeta.
 */
export function buildQuestions(
  planets: PlanetData[],
  rnd: () => number = Math.random,
  level: QuizLevel = 'medium',
  focusPlanet?: string
): Question[] {
  if (focusPlanet) {
    const target = planets.find((p) => p.name === focusPlanet);
    if (!target) return [];
    const make = (prompt: string, correct: PlanetData): Question => {
      const options = shuffle([correct.nameIt, ...distractors(planets, correct, 3, rnd)], rnd);
      return { prompt, options, answerIndex: options.indexOf(correct.nameIt) };
    };
    // Domande sul pianeta: fino a 3 trivia + 1 curated se è la risposta
    const qs: Question[] = triviaQuestions(planets, 3, rnd, focusPlanet);
    const byDiameter = [...planets].sort((x, y) => x.diameter - y.diameter);
    if (byDiameter[byDiameter.length - 1].name === target.name) {
      qs.push(make('Quale pianeta è il più grande del sistema solare?', target));
    }
    return qs;
  }
  switch (level) {
    case 'easy':
      return curatedQuestions(planets, rnd).slice(0, 3);
    case 'hard':
      return [
        ...curatedQuestions(planets, rnd),
        ...triviaQuestions(planets, 3, rnd),
        ...hardQuestions(planets, rnd),
      ];
    case 'medium':
    default:
      // Comportamento storico: 3 curated + 2 trivia
      return [...curatedQuestions(planets, rnd), ...triviaQuestions(planets, 2, rnd)];
  }
}

const LEVEL_KEYS: Record<QuizLevel, string> = {
  easy: 'quiz.levelEasy',
  medium: 'quiz.levelMedium',
  hard: 'quiz.levelHard',
};

export default function QuizModal({
  planets,
  onClose,
  rnd = Math.random,
  level: initialLevel = 'medium',
  focusPlanet,
}: Props) {
  const t = useT();
  const [level, setLevel] = useState<QuizLevel>(initialLevel);
  const [best, setBest] = useState<BestScores>(() => loadBest());
  // Reset del quiz al cambio livello (nuova chiave per useMemo)
  const questions = useMemo(
    () => buildQuestions(planets, rnd, level, focusPlanet),
    [planets, rnd, level, focusPlanet]
  );
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const q = questions[index];
  const finished = index >= questions.length;

  // Salva il best score quando il quiz termina (effetto, non render:
  // side-effect nel render verrebbero duplicati da StrictMode).
  useEffect(() => {
    if (!finished) return;
    setBest((prevBest) => {
      const prev = prevBest[level] ?? 0;
      if (score <= prev) return prevBest;
      const next = { ...prevBest, [level]: score };
      saveJSON(PREFS_KEYS.quizBest, next);
      return next;
    });
  }, [finished, level, score]);

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.answerIndex) setScore((s) => s + 1);
  };

  const next = () => {
    setPicked(null);
    setIndex((n) => n + 1);
  };

  const bestForLevel = best[level] ?? 0;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Quiz sul sistema solare"
      onClick={onClose}
    >
      <div
        className="panel-in w-full max-w-md rounded-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold">{t('quiz.title')}</h2>
            <p className="text-[11px] text-white/65">
              {t('quiz.best', {
                level: t(LEVEL_KEYS[level]).toLowerCase(),
                score: bestForLevel,
                total: level === 'easy' ? 3 : level === 'medium' ? 5 : 8,
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t('quiz.close')}
            className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Selettore difficoltà (solo fuori da modalità focus) */}
        {!focusPlanet && !finished && (
          <div className="mb-3 flex gap-1" role="group" aria-label={t('quiz.difficultyGroup')}>
            {(Object.keys(LEVEL_KEYS) as QuizLevel[]).map((l) => (
              <button
                key={l}
                onClick={() => {
                  setLevel(l);
                  setIndex(0);
                  setPicked(null);
                  setScore(0);
                }}
                className={`flex-1 rounded-md px-2 py-1 text-xs transition-colors ${
                  level === l ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/5'
                }`}
                aria-pressed={level === l}
              >
                {t(LEVEL_KEYS[l])}
              </button>
            ))}
          </div>
        )}
        {focusPlanet && (
          <p className="mb-3 rounded-lg bg-purple-500/10 px-3 py-1.5 text-xs text-purple-200">
            {t('quiz.focus', {
              name: planets.find((p) => p.name === focusPlanet)?.nameIt ?? focusPlanet,
            })}
          </p>
        )}

        {finished ? (
          <div className="py-6 text-center">
            <p className="text-4xl">
              {score === questions.length ? '🏆' : score >= questions.length / 2 ? '🌟' : '🚀'}
            </p>
            <p className="mt-3 text-lg font-semibold">
              {t('quiz.score', { score, total: questions.length })}
            </p>
            <p className="mt-1 text-sm text-white/70">
              {score === questions.length ? t('quiz.perfect') : t('quiz.retry')}
            </p>
            {score > 0 && score >= bestForLevel && (
              <p className="mt-2 text-xs text-emerald-300">{t('quiz.newRecord')}</p>
            )}
          </div>
        ) : (
          <>
            {/* S15 — barra di progresso visiva (1/5, 2/5, ...): migliora
                l'orientamento dell'utente nel flusso di domande. */}
            <div className="mb-2 flex items-center gap-2" aria-hidden>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-400 transition-[width] duration-300 ease-out"
                  style={{ width: `${((index + 1) / questions.length) * 100}%` }}
                />
              </div>
              <span className="font-mono text-[10px] tabular-nums text-white/70">
                {index + 1}/{questions.length}
              </span>
            </div>
            <p className="mb-3 text-[11px] uppercase tracking-wider text-white/55">
              {t('quiz.question', { n: index + 1, total: questions.length })}
            </p>
            <p className="mb-4 text-sm font-medium leading-relaxed">{q.prompt}</p>
            <div className="flex flex-col gap-2">
              {q.options.map((opt, i) => {
                let cls = 'chip text-left text-sm';
                if (picked !== null) {
                  if (i === q.answerIndex) cls += ' active';
                  else if (i === picked) cls += ' !bg-red-500/25 !border-red-400/50';
                }
                return (
                  <button
                    key={i}
                    className={cls}
                    data-testid="quiz-option"
                    onClick={() => pick(i)}
                    disabled={picked !== null}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <button className="btn-play mt-4 w-full" onClick={next}>
                {index + 1 === questions.length ? t('quiz.seeResult') : t('quiz.next')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
