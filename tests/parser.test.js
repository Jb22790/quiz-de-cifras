import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCifra } from '../js/core/parser.js';

const st = parseCifra(readFileSync('tests/fixtures/exemplo.txt', 'utf8'));

test('intro first, not counted', () => {
  assert.equal(st[0].name, 'Intro');
  assert.equal(st[0].counts, false);
  assert.deepEqual(st[0].lines[0].chords.map(c => c.name), ['Am', 'F#m', 'F', 'Em']);
});
test('header dropped', () => assert.ok(!JSON.stringify(st).includes('Tom:') && !JSON.stringify(st).includes('Artista')));
test('first verse line', () => {
  const l = st[1].lines[0];
  assert.equal(l.lyric, 'ABRI A JANELA DO QUARTO');
  assert.deepEqual(l.chords, [{ name: 'Am', col: 23 }]);
  assert.equal(st[1].counts, true);
});
test('stanzas split on blank lines', () => { assert.equal(st[1].lines.length, 4); assert.equal(st.length, 4); });
test('(2x) duplicates stanza', () => {
  const s = parseCifra('G\nla la\nD\nle le (2x)');
  assert.equal(s.length, 2);
  assert.notEqual(s[0].id, s[1].id);
  assert.equal(s[1].lines[1].lyric, 'le le');
});
test('standalone 2x line repeats previous stanza', () => assert.equal(parseCifra('G\nla\n\n(3x)').length, 3));
test('chord line with no lyric', () => { const s = parseCifra('Am\nla\n\nF E Am'); assert.equal(s.at(-1).lines[0].lyric, ''); });
test('lyric without chords kept', () => { const s = parseCifra('Am\nla\nsó letra'); assert.deepEqual(s[0].lines[1].chords, []); });
test('CRLF + tabs + nbsp', () => {
  const s = parseCifra('Am\t F\r\nla la la la la la\r\n');
  assert.deepEqual(s[0].lines[0].chords, [{ name: 'Am', col: 0 }, { name: 'F', col: 5 }]);
  assert.deepEqual(parseCifra('\u00a0\u00a0G\nla la')[0].lines[0].chords, [{ name: 'G', col: 2 }]);
});
test('tablature skipped', () => {
  const s = parseCifra('G\nla\nE|---0---|\nB|-1-----|');
  assert.equal(s[0].lines.length, 1);
});
test('empty input', () => assert.deepEqual(parseCifra('  \n\n'), []));

test('final review: [Refrão] (2x) repeats the chorus', () => {
  const s = parseCifra('G\nverso\n[Refrão] (2x)\nC\nrefrão');
  assert.deepEqual(s.map(x => x.name), ['', 'Refrão', 'Refrão']);
});
test('final review: [Refrão] (2x) after blank line', () => {
  const s = parseCifra('G\nverso\n\n[Refrão] (2x)\nC\nrefrão');
  assert.deepEqual(s.map(x => x.name), ['', 'Refrão', 'Refrão']);
});
test('final review: "Intro:" label with chords', () => {
  const s = parseCifra('Intro: Am F C G\n\nAm\nletra');
  assert.equal(s[0].name, 'Intro');
  assert.deepEqual(s[0].lines[0].chords.map(c => c.name), ['Am', 'F', 'C', 'G']);
  assert.equal(s[0].lines[0].chords[0].col, 7);
});
test('final review: lyric with colon stays lyric', () => {
  const s = parseCifra('G\nEu disse: vem cá');
  assert.equal(s[0].lines[0].lyric, 'Eu disse: vem cá');
});
