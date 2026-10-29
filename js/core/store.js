// Persistência no aparelho e backup (exportar / importar).

export const KEY = 'cifraquiz.v1';
export const DEFAULT_PREFS = { options: 4, showLyrics: true };

const INVALID = 'Arquivo de backup inválido';

function cleanPrefs(p) {
  return {
    options: [2, 3, 4].includes(p?.options) ? p.options : DEFAULT_PREFS.options,
    showLyrics: typeof p?.showLyrics === 'boolean' ? p.showLyrics : DEFAULT_PREFS.showLyrics,
  };
}

function withDefaults(data) {
  return {
    songs: Array.isArray(data?.songs) ? data.songs : [],
    prefs: cleanPrefs(data?.prefs),
  };
}

export function load(storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(KEY);
    return withDefaults(raw ? JSON.parse(raw) : null);
  } catch {
    return withDefaults(null);
  }
}

export function save(data, storage = globalThis.localStorage) {
  storage.setItem(KEY, JSON.stringify({ songs: data.songs, prefs: data.prefs }));
}

export function exportJson(data) {
  return JSON.stringify({
    app: 'cifraquiz',
    version: 1,
    exportedAt: new Date().toISOString(),
    songs: data.songs,
    prefs: data.prefs,
  }, null, 2);
}

const isObj = x => x && typeof x === 'object';
const isChord = c => isObj(c) && typeof c.name === 'string' && Number.isInteger(c.col) && c.col >= 0;
const isLine = l => isObj(l) && typeof l.lyric === 'string' && Array.isArray(l.chords) && l.chords.every(isChord);
const isStanza = st => isObj(st) && typeof st.counts === 'boolean' && Array.isArray(st.lines) && st.lines.every(isLine);
const isSong = s => isObj(s) && typeof s.id === 'string'
  && typeof s.title === 'string' && Array.isArray(s.stanzas) && s.stanzas.every(isStanza);

export function parseBackup(text) {
  let obj;
  try { obj = JSON.parse(text); } catch { throw new Error(INVALID); }
  if (!obj || obj.app !== 'cifraquiz' || obj.version !== 1 || !Array.isArray(obj.songs) || !obj.songs.every(isSong)) {
    throw new Error(INVALID);
  }
  return withDefaults(obj);
}

export function mergeData(current, imported, mode) {
  if (mode === 'replace') return withDefaults(imported);
  const byId = new Map(imported.songs.map(s => [s.id, s]));
  const songs = current.songs.map(s => byId.get(s.id) ?? s);
  const known = new Set(current.songs.map(s => s.id));
  for (const s of imported.songs) if (!known.has(s.id)) songs.push(s);
  return { songs, prefs: current.prefs };
}

export function backupFilename(date = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `cifras-backup-${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}.json`;
}
