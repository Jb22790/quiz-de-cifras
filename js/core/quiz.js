// Regras do quiz: perguntas, opções, sessão, estrelas. Tudo em dados simples.

export function buildQuestions(song) {
  const qs = [];
  song.stanzas.forEach((st, s) => {
    if (!st.counts) return;
    st.lines.forEach((line, l) => {
      line.chords.forEach((ch, c) => qs.push({ s, l, c, answer: ch.name }));
    });
  });
  return qs;
}

export function chordPool(song) {
  return [...new Set(buildQuestions(song).map(q => q.answer))];
}

function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function makeOptions(answer, pool, n, rng = Math.random) {
  const others = shuffle(pool.filter(p => p !== answer), rng).slice(0, Math.max(0, n - 1));
  return shuffle([answer, ...others], rng);
}

export function starsFor(pct) {
  if (pct >= 0.9) return 3;
  if (pct >= 0.7) return 2;
  if (pct >= 0.4) return 1;
  return 0;
}

function goTo(session, index, rng) {
  const finished = index >= session.questions.length;
  return {
    ...session,
    index,
    finished,
    last: null,
    options: finished ? [] : makeOptions(session.questions[index].answer, session.pool, session.n, rng),
  };
}

export function createSession(song, n, rng = Math.random) {
  const questions = buildQuestions(song);
  const base = {
    questions, pool: chordPool(song), n, total: questions.length,
    index: 0, options: [], answered: 0, correct: 0, wrong: 0, streak: 0, bestStreak: 0,
    jumped: false, last: null, finished: false,
  };
  return goTo(base, 0, rng);
}

export function answer(session, choice) {
  if (session.last || session.finished) return session;
  const correct = choice === session.questions[session.index].answer;
  const streak = correct ? session.streak + 1 : 0;
  return {
    ...session,
    last: { choice, correct },
    answered: session.answered + 1,
    correct: session.correct + (correct ? 1 : 0),
    wrong: session.wrong + (correct ? 0 : 1),
    streak,
    bestStreak: Math.max(session.bestStreak, streak),
  };
}

export function next(session, rng = Math.random) {
  if (session.finished) return session;
  return goTo(session, session.index + 1, rng);
}

export function jumpTo(session, stanzaIndex, rng = Math.random) {
  let i = session.questions.findIndex(q => q.s >= stanzaIndex);
  if (i === -1) i = session.questions.length;
  return { ...goTo(session, i, rng), jumped: true };
}

export function restart(session, song, rng = Math.random) {
  return createSession(song, session.n, rng);
}

// Com pulos, o placar conta só o que foi respondido (pode repetir trechos).
export function result(session) {
  const total = session.jumped ? session.answered : session.total;
  const pct = total ? session.correct / total : 0;
  return {
    correct: session.correct,
    total,
    pct,
    stars: starsFor(pct),
    bestStreak: session.bestStreak,
    countsForStars: !session.jumped,
  };
}
