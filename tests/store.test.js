import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KEY, DEFAULT_PREFS, load, save, exportJson, parseBackup, mergeData, backupFilename } from '../js/core/store.js';

const fake = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), m }; };
const song = (id, title = id) => ({ id, title, createdAt: 1, best: null, stanzas: [] });

test('empty storage gives defaults', () => assert.deepEqual(load(fake()), { songs: [], prefs: DEFAULT_PREFS }));
test('round trip', () => {
  const st = fake();
  const data = { songs: [song('a')], prefs: { options: 2, showLyrics: false } };
  save(data, st);
  assert.ok(st.m.has(KEY));
  assert.deepEqual(load(st), data);
});
test('corrupt storage gives defaults', () => {
  const st = fake(); st.setItem(KEY, '{garbage');
  assert.deepEqual(load(st), { songs: [], prefs: DEFAULT_PREFS });
});
test('missing prefs fields filled', () => {
  const st = fake(); st.setItem(KEY, JSON.stringify({ songs: [], prefs: { options: 3 } }));
  assert.deepEqual(load(st).prefs, { options: 3, showLyrics: true });
});
test('export/parse round trip', () => {
  const data = { songs: [song('a')], prefs: DEFAULT_PREFS };
  const parsed = parseBackup(exportJson(data));
  assert.deepEqual(parsed, data);
  assert.equal(JSON.parse(exportJson(data)).app, 'cifraquiz');
});
for (const bad of ['{}', 'not json', '{"app":"cifraquiz","version":1,"songs":[{"x":1}]}', '{"app":"other","version":1,"songs":[]}', 'null'])
  test(`invalid backup ${bad}`, () => assert.throws(() => parseBackup(bad), { message: 'Arquivo de backup inválido' }));
test('merge replaces same id, appends new, keeps prefs', () => {
  const cur = { songs: [song('a', 'old'), song('b')], prefs: { options: 2, showLyrics: true } };
  const imp = { songs: [song('a', 'new'), song('c')], prefs: { options: 4, showLyrics: false } };
  const r = mergeData(cur, imp, 'merge');
  assert.deepEqual(r.songs.map(s => s.id + s.title), ['anew', 'bb', 'cc']);
  assert.deepEqual(r.prefs, cur.prefs);
});
test('replace drops old', () => {
  const r = mergeData({ songs: [song('a')], prefs: DEFAULT_PREFS }, { songs: [song('c')], prefs: { options: 3, showLyrics: true } }, 'replace');
  assert.deepEqual(r.songs.map(s => s.id), ['c']);
  assert.equal(r.prefs.options, 3);
});
test('backup filename', () => assert.equal(backupFilename(new Date(2026, 9, 29)), 'cifras-backup-2026-10-29.json'));

test('final review: backup with malformed stanzas rejected', () => {
  const bad = JSON.stringify({ app: 'cifraquiz', version: 1, songs: [{ id: 'a', title: 'x', stanzas: [{}] }] });
  assert.throws(() => parseBackup(bad), { message: 'Arquivo de backup inválido' });
  const bad2 = JSON.stringify({ app: 'cifraquiz', version: 1, songs: [{ id: 'a', title: 'x', stanzas: [{ lines: [{ lyric: 'a', chords: [{ name: 1 }] }] }] }] });
  assert.throws(() => parseBackup(bad2), { message: 'Arquivo de backup inválido' });
});
test('final review: invalid prefs fall back to defaults', () => {
  const txt = JSON.stringify({ app: 'cifraquiz', version: 1, songs: [], prefs: { options: 'x', showLyrics: 3 } });
  assert.deepEqual(parseBackup(txt).prefs, DEFAULT_PREFS);
});
