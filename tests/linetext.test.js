import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newLine, newStanza, newSong } from '../js/core/model.js';
import { formatChordLine, lineToText, parseLineText, replaceLine, matchesTitle } from '../js/core/edit.js';

test('formatChordLine places chords at their columns', () => {
  assert.equal(formatChordLine([{ name: 'Am', col: 0 }, { name: 'F#m', col: 6 }]), 'Am    F#m');
  assert.equal(formatChordLine([{ name: 'G', col: 3 }]), '   G');
});
test('formatChordLine keeps a space between overlapping chords', () => {
  assert.equal(formatChordLine([{ name: 'C#m7', col: 0 }, { name: 'D', col: 2 }]), 'C#m7 D');
});
test('lineToText: chords over lyric, or one of them alone', () => {
  assert.equal(lineToText(newLine('la la', [{ name: 'G', col: 3 }])), '   G\nla la');
  assert.equal(lineToText(newLine('só letra', [])), 'só letra');
  assert.equal(lineToText(newLine('', [{ name: 'E', col: 0 }])), 'E');
});
test('parseLineText round trip', () => {
  const l = newLine('...ABRI A JANELA', [{ name: 'Am', col: 0 }, { name: 'F', col: 9 }]);
  assert.deepEqual(parseLineText(lineToText(l)), { lyric: '...ABRI A JANELA', chords: l.chords });
});
test('parseLineText: lyric only / chords only / blank lines ignored', () => {
  assert.deepEqual(parseLineText('nova letra'), { lyric: 'nova letra', chords: [] });
  assert.deepEqual(parseLineText('\nG  D\n\n'), { lyric: '', chords: [{ name: 'G', col: 0 }, { name: 'D', col: 3 }] });
});
test('parseLineText: tabs, CRLF and nbsp normalized', () => {
  assert.deepEqual(parseLineText('Am\tF\r\nla la la'), { lyric: 'la la la', chords: [{ name: 'Am', col: 0 }, { name: 'F', col: 4 }] });
});
test('parseLineText errors', () => {
  assert.throws(() => parseLineText('letra um\nletra dois'), { message: 'A linha de cima precisa ter só acordes' });
  assert.throws(() => parseLineText('G\nla\nD'), { message: 'Edite uma frase só: acordes em cima, letra embaixo' });
  assert.throws(() => parseLineText('   \n'), { message: 'A frase não pode ficar vazia' });
});
test('replaceLine keeps id and does not mutate', () => {
  const song = newSong('t', [newStanza('', [newLine('a', [{ name: 'G', col: 0 }])])]);
  const before = JSON.stringify(song);
  const r = replaceLine(song, { s: 0, l: 0 }, { lyric: 'b', chords: [{ name: 'D', col: 2 }, { name: 'C', col: 0 }] });
  assert.equal(JSON.stringify(song), before);
  assert.equal(r.stanzas[0].lines[0].id, song.stanzas[0].lines[0].id);
  assert.equal(r.stanzas[0].lines[0].lyric, 'b');
  assert.deepEqual(r.stanzas[0].lines[0].chords.map(c => c.name), ['C', 'D']);
});
test('matchesTitle ignores accents and case', () => {
  assert.ok(matchesTitle('Minha Canção', 'cancao'));
  assert.ok(matchesTitle('Minha Canção', '  MINHA '));
  assert.ok(matchesTitle('Qualquer', ''));
  assert.ok(!matchesTitle('Minha Canção', 'samba'));
});
