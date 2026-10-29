// Operações puras do editor: recebem uma Song e devolvem uma nova Song.
// Um endereço de frase é { s: índiceDaEstrofe, l: índiceDaFrase }.

import { newStanza, cloneStanza, cloneLine } from './model.js';
import { parseChordLine } from './chords.js';
import { normalizeLines } from './parser.js';

const copy = song => structuredClone(song);
const dropEmpty = song => ({ ...song, stanzas: song.stanzas.filter(s => s.lines.length) });

function sortAddrs(addrs) {
  return [...addrs].sort((a, b) => a.s - b.s || a.l - b.l);
}

function removeAddrs(song, addrs) {
  const keys = new Set(addrs.map(a => `${a.s}:${a.l}`));
  const taken = [];
  song.stanzas.forEach((st, s) => {
    st.lines = st.lines.filter((line, l) => {
      if (!keys.has(`${s}:${l}`)) return true;
      taken.push(line);
      return false;
    });
  });
  return taken;
}

export function moveStanza(song, from, to) {
  const r = copy(song);
  const [st] = r.stanzas.splice(from, 1);
  r.stanzas.splice(to, 0, st);
  return r;
}

export function duplicateStanza(song, s) {
  const r = copy(song);
  r.stanzas.splice(s + 1, 0, cloneStanza(r.stanzas[s]));
  return r;
}

export function deleteStanza(song, s) {
  const r = copy(song);
  r.stanzas.splice(s, 1);
  return r;
}

export function addStanza(song, at, name = '') {
  const r = copy(song);
  r.stanzas.splice(at, 0, newStanza(name));
  return r;
}

export function renameStanza(song, s, name) {
  const r = copy(song);
  r.stanzas[s].name = name;
  return r;
}

export function setCounts(song, s, counts) {
  const r = copy(song);
  r.stanzas[s].counts = counts;
  return r;
}

// toS/toL se referem à música depois de retirar as frases (antes de descartar estrofes vazias).
export function moveLines(song, addrs, toS, toL) {
  const r = copy(song);
  const taken = removeAddrs(r, sortAddrs(addrs));
  r.stanzas[toS].lines.splice(toL, 0, ...taken);
  return dropEmpty(r);
}

export function duplicateLines(song, addrs) {
  const r = copy(song);
  const byStanza = new Map();
  for (const a of sortAddrs(addrs)) {
    if (!byStanza.has(a.s)) byStanza.set(a.s, []);
    byStanza.get(a.s).push(a.l);
  }
  for (const [s, ls] of byStanza) {
    const lines = r.stanzas[s].lines;
    const copies = ls.map(l => cloneLine(lines[l]));
    lines.splice(ls.at(-1) + 1, 0, ...copies);
  }
  return r;
}

export function deleteLines(song, addrs) {
  const r = copy(song);
  removeAddrs(r, addrs);
  return dropEmpty(r);
}

export function linesToStanza(song, addrs) {
  const r = copy(song);
  const sorted = sortAddrs(addrs);
  const anchorId = r.stanzas[sorted[0].s].id;
  const taken = removeAddrs(r, sorted);
  const first = r.stanzas[sorted[0].s];
  const stanza = newStanza('', taken, first.counts);
  const at = r.stanzas.findIndex(s => s.id === anchorId) + 1;
  r.stanzas.splice(at, 0, stanza);
  return dropEmpty(r);
}

function withLine(song, { s, l }, fn) {
  const r = copy(song);
  const line = r.stanzas[s].lines[l];
  fn(line);
  line.chords.sort((a, b) => a.col - b.col);
  return r;
}

export function setChord(song, addr, i, name) {
  return withLine(song, addr, line => { line.chords[i].name = name; });
}

export function shiftChord(song, addr, i, delta) {
  return withLine(song, addr, line => { line.chords[i].col = Math.max(0, line.chords[i].col + delta); });
}

export function removeChord(song, addr, i) {
  return withLine(song, addr, line => { line.chords.splice(i, 1); });
}

export function addChord(song, addr, name, col) {
  return withLine(song, addr, line => { line.chords.push({ name, col: Math.max(0, col) }); });
}

export function distinctChords(song) {
  const seen = new Set();
  for (const st of song.stanzas) for (const line of st.lines) for (const c of line.chords) seen.add(c.name);
  return [...seen];
}

export function createHistory(limit = 30) {
  const stack = [];
  return {
    push(song) {
      stack.push(structuredClone(song));
      if (stack.length > limit) stack.shift();
    },
    undo() { return stack.pop() ?? null; },
    canUndo() { return stack.length > 0; },
  };
}

// ---------- edição do texto de uma frase ----------

export function formatChordLine(chords) {
  let out = '';
  for (const c of chords) {
    const pad = c.col - out.length;
    out += pad > 0 ? ' '.repeat(pad) : (out ? ' ' : '');
    out += c.name;
  }
  return out;
}

export function lineToText(line) {
  const chords = formatChordLine(line.chords);
  if (chords && line.lyric) return `${chords}\n${line.lyric}`;
  return chords || line.lyric;
}

// Lê "acordes em cima, letra embaixo". Lança Error com mensagem pro usuário.
export function parseLineText(text) {
  const lines = normalizeLines(text).filter(l => l.trim());
  if (!lines.length) throw new Error('A frase não pode ficar vazia');
  if (lines.length > 2) throw new Error('Edite uma frase só: acordes em cima, letra embaixo');
  const chords = parseChordLine(lines[0]);
  if (lines.length === 2) {
    if (!chords) throw new Error('A linha de cima precisa ter só acordes');
    return { lyric: lines[1].trimEnd(), chords };
  }
  return chords ? { lyric: '', chords } : { lyric: lines[0].trimEnd(), chords: [] };
}

export function replaceLine(song, addr, { lyric, chords }) {
  return withLine(song, addr, line => {
    line.lyric = lyric;
    line.chords = chords.map(c => ({ name: c.name, col: c.col }));
  });
}

// ---------- busca ----------

const fold = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function matchesTitle(title, query) {
  return fold(title).includes(fold(query));
}
