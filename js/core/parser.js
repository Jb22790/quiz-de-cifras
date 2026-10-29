// Converte o texto colado do Cifra Club em estrofes (Stanza[]).

import { parseChordLine } from './chords.js';
import { newLine, newStanza, cloneStanza } from './model.js';

const TAB_RE = /^\s*[EADGBe]\s*\||\|-|-\|/;
const META_RE = /^\s*(tom|afinação|afinacao|capotraste|capo)\s*:/i;
const TRAILING_REPEAT_RE = /\(\s*([2-9])\s*x\s*\)\s*$/i;
const ALONE_REPEAT_RE = /^\s*\(?\s*([2-9])\s*x\s*\)?\s*$/i;
const LABEL_RE = /^\s*\[([^\]]+)\]/;
const COLON_LABEL_RE = /^\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9\- ]{0,20}):/;
const SECTION_WORD_RE = /^(intro|introdução|refrão|refrao|pré-refrão|pre-refrao|solo|final|ponte|verso|interlúdio|parte \d)$/i;

// Rótulos no estilo "Intro: Am F C" ou "Refrão:" sozinho. Uma letra com dois-pontos continua letra.
function colonLabel(line) {
  const m = line.match(COLON_LABEL_RE);
  if (!m) return null;
  const rest = line.slice(m[0].length).replace(TRAILING_REPEAT_RE, '');
  if (!rest.trim()) return SECTION_WORD_RE.test(m[1].trim()) ? m : null;
  return parseChordLine(rest) ? m : null;
}

function normalize(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/ /g, ' ')
    .split('\n')
    .map(expandTabs);
}

function expandTabs(line) {
  let out = '';
  for (const ch of line) {
    if (ch === '\t') out += ' '.repeat(4 - (out.length % 4));
    else out += ch;
  }
  return out;
}

export function parseCifra(text) {
  const raw = [];
  let cur = null;
  let pending = null;
  let seenChord = false;

  const ensure = () => { if (!cur) cur = { name: '', lines: [], repeat: 1 }; };
  const flush = () => {
    if (pending) { ensure(); cur.lines.push(newLine('', pending)); pending = null; }
  };
  const close = () => {
    flush();
    if (cur && cur.lines.length) raw.push(cur);
    cur = null;
  };

  for (let line of normalize(text)) {
    if (!line.trim()) { close(); continue; }
    if (TAB_RE.test(line) || META_RE.test(line)) continue;

    let m = line.match(ALONE_REPEAT_RE);
    if (m) {
      const target = cur && (cur.lines.length || pending) ? cur : raw.at(-1);
      if (target) target.repeat = Number(m[1]);
      continue;
    }
    m = line.match(LABEL_RE) || colonLabel(line);
    if (m) {
      close();
      cur = { name: m[1].trim(), lines: [], repeat: 1 };
      line = ' '.repeat(m[0].length) + line.slice(m[0].length);
      if (!line.trim()) continue;
    }

    m = line.match(TRAILING_REPEAT_RE);
    if (m) {
      ensure();
      cur.repeat = Number(m[1]);
      line = line.slice(0, m.index);
      if (!line.trim()) continue;
    }

    const chords = parseChordLine(line);
    if (chords) {
      seenChord = true;
      flush();
      ensure();
      pending = chords;
      continue;
    }
    if (!seenChord) continue;
    ensure();
    cur.lines.push(newLine(line.trimEnd(), pending || []));
    pending = null;
  }
  close();

  const stanzas = [];
  for (const r of raw) {
    const s = newStanza(r.name, r.lines);
    stanzas.push(s);
    for (let i = 1; i < r.repeat; i++) stanzas.push(cloneStanza(s));
  }
  return splitIntro(stanzas);
}

// Tudo antes da primeira linha com letra vira a estrofe "Intro", fora do jogo.
function splitIntro(stanzas) {
  let si = -1, li = -1;
  outer: for (let i = 0; i < stanzas.length; i++) {
    for (let j = 0; j < stanzas[i].lines.length; j++) {
      if (stanzas[i].lines[j].lyric.trim()) { si = i; li = j; break outer; }
    }
  }
  if (si === -1) si = stanzas.length, li = 0;
  const introLines = [
    ...stanzas.slice(0, si).flatMap(s => s.lines),
    ...(si < stanzas.length ? stanzas[si].lines.slice(0, li) : []),
  ];
  if (!introLines.length) return stanzas;
  const rest = stanzas.slice(si);
  if (rest.length) rest[0] = { ...rest[0], lines: rest[0].lines.slice(li) };
  return [newStanza('Intro', introLines, false), ...rest.filter(s => s.lines.length)];
}
