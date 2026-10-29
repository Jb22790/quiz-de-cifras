import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newLine, newStanza, newSong } from '../js/core/model.js';
import {
  moveStanza, duplicateStanza, deleteStanza, addStanza, renameStanza, setCounts,
  moveLines, duplicateLines, deleteLines, linesToStanza,
  setChord, shiftChord, removeChord, addChord, distinctChords, createHistory,
} from '../js/core/edit.js';

const song = newSong('t', [
  newStanza('A', [newLine('a1', [{ name: 'G', col: 0 }, { name: 'D', col: 4 }]), newLine('a2', [{ name: 'Em', col: 0 }])]),
  newStanza('B', [newLine('b1', [{ name: 'G', col: 2 }])]),
]);
const lyrics = s => s.stanzas.map(st => st.lines.map(l => l.lyric));

test('moveStanza', () => assert.deepEqual(moveStanza(song, 0, 1).stanzas.map(s => s.name), ['B', 'A']));
test('duplicateStanza new ids', () => {
  const r = duplicateStanza(song, 0);
  assert.equal(r.stanzas[1].name, 'A');
  assert.notEqual(r.stanzas[1].id, song.stanzas[0].id);
});
test('deleteStanza', () => assert.deepEqual(deleteStanza(song, 0).stanzas.map(s => s.name), ['B']));
test('addStanza', () => assert.equal(addStanza(song, 1, 'X').stanzas[1].name, 'X'));
test('renameStanza / setCounts', () => {
  assert.equal(renameStanza(song, 0, 'Refrão').stanzas[0].name, 'Refrão');
  assert.equal(setCounts(song, 0, false).stanzas[0].counts, false);
});
test('moveLines across stanzas', () => assert.deepEqual(lyrics(moveLines(song, [{ s: 0, l: 0 }], 1, 1)), [['a2'], ['b1', 'a1']]));
test('moving last line drops empty stanza', () => assert.equal(moveLines(song, [{ s: 1, l: 0 }], 0, 0).stanzas.length, 1));
test('moveLines keeps original order', () => assert.deepEqual(lyrics(moveLines(song, [{ s: 0, l: 1 }, { s: 0, l: 0 }], 1, 0)), [['a1', 'a2', 'b1']]));
test('duplicateLines', () => assert.deepEqual(lyrics(duplicateLines(song, [{ s: 0, l: 0 }, { s: 0, l: 1 }])), [['a1', 'a2', 'a1', 'a2'], ['b1']]));
test('deleteLines', () => assert.deepEqual(lyrics(deleteLines(song, [{ s: 1, l: 0 }, { s: 0, l: 0 }])), [['a2']]));
test('linesToStanza', () => {
  const r = linesToStanza(song, [{ s: 0, l: 1 }]);
  assert.deepEqual(lyrics(r), [['a1'], ['a2'], ['b1']]);
});
test('setChord / removeChord', () => {
  assert.equal(setChord(song, { s: 0, l: 0 }, 1, 'F').stanzas[0].lines[0].chords[1].name, 'F');
  assert.equal(removeChord(song, { s: 0, l: 0 }, 0).stanzas[0].lines[0].chords.length, 1);
});
test('shiftChord clamps and resorts', () => {
  const s2 = addChord(song, { s: 1, l: 0 }, 'C', 0);
  assert.deepEqual(s2.stanzas[1].lines[0].chords.map(c => c.name), ['C', 'G']);
  assert.equal(shiftChord(s2, { s: 1, l: 0 }, 0, -3).stanzas[1].lines[0].chords[0].col, 0);
  assert.deepEqual(shiftChord(s2, { s: 1, l: 0 }, 0, 5).stanzas[1].lines[0].chords.map(c => c.name), ['G', 'C']);
});
test('distinctChords in order', () => assert.deepEqual(distinctChords(song), ['G', 'D', 'Em']));
test('input not mutated', () => {
  const before = JSON.stringify(song);
  deleteLines(song, [{ s: 0, l: 0 }]); moveLines(song, [{ s: 0, l: 0 }], 1, 0); shiftChord(song, { s: 0, l: 0 }, 0, 2);
  assert.equal(JSON.stringify(song), before);
});
test('history undo', () => {
  const h = createHistory(2);
  assert.equal(h.canUndo(), false);
  h.push(song); h.push(deleteStanza(song, 1)); h.push(deleteStanza(song, 0));
  assert.equal(h.undo().stanzas.length, 1);
  assert.equal(h.undo().stanzas.length, 1);
  assert.equal(h.undo(), null);
});
