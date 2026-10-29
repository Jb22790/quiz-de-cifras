import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newLine, newStanza, newSong } from '../js/core/model.js';
import { buildQuestions, chordPool, makeOptions, starsFor, createSession, answer, next, jumpTo, restart, result } from '../js/core/quiz.js';

const ch = (...names) => names.map((name, i) => ({ name, col: i * 4 }));
const song = newSong('t', [
  newStanza('Intro', [newLine('', ch('G', 'D'))], false),
  newStanza('', [newLine('v1', ch('Am', 'F#m')), newLine('v2', ch('G', 'G'))]),
  newStanza('Solo', [newLine('', ch('E'))], false),
  newStanza('Refrão', [newLine('r1', ch('C'))]),
]);
const introOnly = newSong('i', [newStanza('Intro', [newLine('', ch('G'))], false)]);
const firstOpt = s => s.questions[s.index].answer;

test('intro excluded, order kept', () => assert.deepEqual(buildQuestions(song).map(q => q.answer), ['Am', 'F#m', 'G', 'G', 'C']));
test('question addresses', () => assert.deepEqual(buildQuestions(song)[0], { s: 1, l: 0, c: 0, answer: 'Am' }));
test('repeats are separate questions', () => assert.equal(buildQuestions(song).filter(q => q.answer === 'G').length, 2));
test('pool from counted stanzas only', () => assert.deepEqual(chordPool(song), ['Am', 'F#m', 'G', 'C']));
test('options only from pool, fewer when small', () => {
  assert.equal(makeOptions('G', ['G', 'C', 'D'], 4).length, 3);
  const pool = ['G', 'C', 'D', 'Em', 'Am'];
  for (let i = 0; i < 50; i++) {
    const o = makeOptions('G', pool, 4);
    assert.ok(o.includes('G'));
    assert.equal(new Set(o).size, 4);
    assert.ok(o.every(x => pool.includes(x)));
  }
});
test('answer position varies', () => {
  const pos = new Set();
  for (let i = 0; i < 60; i++) pos.add(makeOptions('G', ['G', 'C', 'D', 'Em'], 4).indexOf('G'));
  assert.equal(pos.size, 4);
});
test('single-chord song → 1 option', () => assert.deepEqual(makeOptions('G', ['G'], 3), ['G']));
test('stars thresholds', () => assert.deepEqual([0.9, 0.89, 0.7, 0.4, 0.39].map(starsFor), [3, 2, 2, 1, 0]));

test('session basics', () => {
  const s = createSession(song, 4);
  assert.equal(s.total, 5); assert.equal(s.index, 0); assert.equal(s.finished, false);
  assert.ok(s.options.includes('Am'));
});
test('streak and best', () => {
  let s = createSession(song, 4);
  for (const ok of [true, true, false, true]) {
    s = answer(s, ok ? firstOpt(s) : s.options.find(o => o !== firstOpt(s)));
    s = next(s);
  }
  assert.equal(s.correct, 3); assert.equal(s.wrong, 1); assert.equal(s.streak, 1); assert.equal(s.bestStreak, 2);
});
test('double answer ignored', () => {
  let s = createSession(song, 4);
  s = answer(s, 'Am');
  s = answer(s, 'C');
  assert.equal(s.correct, 1); assert.equal(s.wrong, 0); assert.deepEqual(s.last, { choice: 'Am', correct: true });
});
test('finishes after last question', () => {
  let s = createSession(song, 2);
  for (let i = 0; i < 5; i++) s = next(answer(s, firstOpt(s)));
  assert.equal(s.finished, true);
  assert.deepEqual(result(s), { correct: 5, total: 5, pct: 1, stars: 3, bestStreak: 5, countsForStars: true });
});
test('zero-question song finished immediately', () => {
  const s = createSession(introOnly, 4);
  assert.equal(s.finished, true); assert.equal(s.total, 0); assert.equal(result(s).pct, 0);
});
test('jump to non-counted stanza lands on next question', () => {
  const s = jumpTo(createSession(song, 4), 2);
  assert.equal(s.index, 4); assert.equal(firstOpt(s), 'C'); assert.equal(s.jumped, true);
});
test('jump backwards', () => assert.equal(jumpTo(next(next(createSession(song, 4))), 0).index, 0));
test('jump past last question finishes', () => {
  const s = jumpTo(createSession(song, 4), 4);
  assert.equal(s.finished, true);
});
test('jump disables stars; restart re-enables', () => {
  let s = jumpTo(createSession(song, 4), 3);
  s = next(answer(s, firstOpt(s)));
  assert.equal(result(s).countsForStars, false);
  assert.equal(result(restart(s, song)).countsForStars, true);
  assert.equal(restart(s, song).index, 0);
});

test('final review: jumping back never shows more correct than answered', () => {
  let s = createSession(song, 4);
  s = next(answer(s, firstOpt(s)));
  s = next(answer(s, firstOpt(s)));
  s = jumpTo(s, 0);
  for (let i = 0; i < 5; i++) s = next(answer(s, firstOpt(s)));
  const r = result(s);
  assert.equal(r.countsForStars, false);
  assert.ok(r.correct <= r.total, `${r.correct} de ${r.total}`);
  assert.ok(r.pct <= 1);
});
