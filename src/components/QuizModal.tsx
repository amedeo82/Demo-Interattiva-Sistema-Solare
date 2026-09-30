/**
 * Quiz mode: domande a risposta multipla sui pianeti.
 * Le domande sono generate in parte dai dati reali del dataset (così il
 * quiz resta sincronizzato con i dati) e in parte "curated".
 */
import { useMemo, useState } from 'react';
import type { PlanetData } from '../data/planets';

interface Props {
  planets: PlanetData[];
  onClose: () => void;
}

interface Question {
  prompt: string;
  options: string[];
  answerIndex: number;
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestions(planets: PlanetData[]): Question[] {
  const rnd = Math.random;
  const byDiameter = [...planets].sort((x, y) => x.diameter - y.diameter);
  const biggest = byDiameter[byDiameter.length - 1];
  const smallest = byDiameter[0];
  const byPeriod = [...planets].sort((x, y) => x.orbitalPeriod - y.orbitalPeriod);
  const fastest = byPeriod[0];
  const withRings = planets.find((p) => p.name === 'Saturn') ?? planets[5];
  const redPlanet = planets.find((p) => p.nameIt === 'Marte') ?? planets[3];
  const hotPlanet = planets.find((p) => p.nameIt === 'Venere') ?? planets[1];

  const qBiggest: Question = {
    prompt: `Quale pianeta è il più grande del sistema solare?`,
    options: shuffle([biggest.nameIt, smallest.nameIt, redPlanet.nameIt, hotPlanet.nameIt], rnd),
    answerIndex: 0,
  };
  const qFastest: Question = {
    prompt: 'Quale pianeta completa lorbita più rapidamente?',
    options: shuffle([fastest.nameIt, withRings.nameIt, redPlanet.nameIt, hotPlanet.nameIt], rnd),
    answerIndex: 0,
  };
  const qRings: Question = {
    prompt: 'Quale pianeta è famoso per i suoi anelli?',
    options: shuffle([withRings.nameIt, redPlanet.nameIt, fastest.nameIt, hotPlanet.nameIt], rnd),
    answerIndex: 0,
  };
  const qTrivia = planets
    .filter((p) => p.facts.trivia.length > 0)
    .slice(0, 2)
    .map((p) => {
      const correct = p.facts.trivia[0];
      const others = planets
        .filter((q) => q.name !== p.name && q.facts.trivia.length > 0)
        .slice(0, 2)
        .map((q) => q.facts.trivia[0]);
      const options = shuffle([correct, ...others], rnd);
      return {
        prompt: `A quale pianeta si riferisce questo fatto? "${correct}"`,
        options: shuffle([p.nameIt, ...planets.filter((q) => q.name !== p.name).slice(0, 2).map((q) => q.nameIt)], rnd),
        answerIndex: 0,
      } satisfies Question;
    });

  // ricalcola gli indici di risposta dopo le shuffle
  return [qBiggest, qFastest, qRings, ...qTrivia].map((q) => ({
    ...q,
    answerIndex: (() => {
      if (q === qBiggest) return q.options.indexOf(biggest.nameIt);
      if (q === qFastest) return q.options.indexOf(fastest.nameIt);
      if (q === qRings) return q.options.indexOf(withRings.nameIt);
      return 0;
    })(),
  }));
}

export default function QuizModal({ planets, onClose }: Props) {
  const questions = useMemo(() => buildQuestions(planets), [planets]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const q = questions[index];
  const finished = index >= questions.length;

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.answerIndex) setScore((s) => s + 1);
  };

  const next = () => {
    setPicked(null);
    setIndex((n) => n + 1);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Quiz sul sistema solare"
      onClick={onClose}
    >
      <div className="panel-in w-full max-w-md rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-2">
          <h2 className="text-lg font-bold">🧠 Quiz spaziale</h2>
          <button
            onClick={onClose}
            aria-label="Chiudi quiz"
            className="rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        {finished ? (
          <div className="py-6 text-center">
            <p className="text-4xl">{score === questions.length ? '🏆' : score >= questions.length / 2 ? '🌟' : '🚀'}</p>
            <p className="mt-3 text-lg font-semibold">
              Punteggio: {score}/{questions.length}
            </p>
            <p className="mt-1 text-sm text-white/50">
              {score === questions.length
                ? 'Perfetto! Sei un astronauta navigato.'
                : 'Continua a esplorare e riprova!'}
            </p>
          </div>
        ) : (
          <>
            <p className="mb-1 text-xs uppercase tracking-wider text-white/40">
              Domanda {index + 1} di {questions.length}
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
                  <button key={i} className={cls} onClick={() => pick(i)} disabled={picked !== null}>
                    {opt}
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <button className="btn-play mt-4 w-full" onClick={next}>
                {index + 1 === questions.length ? 'Vedi risultato' : 'Prossima domanda →'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
