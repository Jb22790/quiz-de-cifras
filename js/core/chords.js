// Reconhecimento de acordes e de linhas de acordes (formato Cifra Club).

const CHORD_RE = /^(?:[A-G][#b]?(?:maj|min|dim|aug|sus|add|m|M|º|°|\+|-|[0-9]|\/[0-9]+|\((?:add|sus|[0-9b#+\-,\/]|M)+\))*(?:\/[A-G][#b]?)?|N\.C\.)$/;
const REPEAT_RE = /^\(?\d+x\)?$/i;
const DECORATION_RE = /^[|\-–:.]+$/;

export function isChordToken(token) {
  return CHORD_RE.test(token);
}

export function isRepeatMarker(token) {
  return REPEAT_RE.test(token);
}

// Retorna os acordes com a coluna de cada um, ou null se a linha não for de acordes.
export function parseChordLine(line) {
  const chords = [];
  for (const m of line.matchAll(/\S+/g)) {
    const tok = m[0];
    if (isRepeatMarker(tok) || DECORATION_RE.test(tok)) continue;
    if (!isChordToken(tok)) return null;
    chords.push({ name: tok, col: m.index });
  }
  return chords.length ? chords : null;
}
