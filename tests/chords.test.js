import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isChordToken, parseChordLine } from '../js/core/chords.js';
import { newLine, newStanza, newSong, cloneStanza } from '../js/core/model.js';

for (const c of ['A','Am','F#m','G/B','F7M','C#m7(b5)','D4','E7','Bb','Gm','A9','Dsus4','Cadd9','Bº','B°','E7(9)','C/E','Ab7M'])
  test(`chord ${c}`, () => assert.ok(isChordToken(c)));
for (const w of ['ABRI','DE','AMOR','Eu','Am.','...ABRI','Em,','Bom','Ah'])
  test(`not chord ${w}`, () => assert.ok(!isChordToken(w)));

test('positions', () => assert.deepEqual(parseChordLine('Am                     F#m'), [{name:'Am',col:0},{name:'F#m',col:23}]));
test('leading spaces', () => assert.deepEqual(parseChordLine('                       Am'), [{name:'Am',col:23}]));
test('lyric is not chord line', () => assert.equal(parseChordLine('...VI O SOL NASCER LÁ FORA'), null));
test('ignores repeat marker', () => assert.deepEqual(parseChordLine('G  D (2x)'), [{name:'G',col:0},{name:'D',col:3}]));
test('empty line is not chord line', () => assert.equal(parseChordLine('   '), null));
test('all-chord-token lyric is treated as chord line (accepted limitation)', () => assert.notEqual(parseChordLine('E A'), null));

test('cloneStanza gives fresh ids', () => {
  const s = newStanza('A', [newLine('x', [{ name: 'G', col: 0 }])]);
  const c = cloneStanza(s);
  assert.notEqual(c.id, s.id);
  assert.notEqual(c.lines[0].id, s.lines[0].id);
  assert.deepEqual(c.lines[0].chords, s.lines[0].chords);
  assert.equal(newSong('t', [s]).stanzas.length, 1);
});

for (const c of ['E7/9', 'C6/9', 'A7/13', 'A(add9)', 'N.C.', 'G7(#5)', 'Bm7/A'])
  test(`final review: chord ${c}`, () => assert.ok(isChordToken(c)));
test('final review: E7/9 line parses', () => assert.deepEqual(parseChordLine('E7/9   Am'), [{ name: 'E7/9', col: 0 }, { name: 'Am', col: 7 }]));
