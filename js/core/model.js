// Fábricas e cópias das estruturas Song / Stanza / Line.

export function uid() {
  return crypto.randomUUID();
}

export function newLine(lyric = '', chords = []) {
  return { id: uid(), lyric, chords: chords.map(c => ({ ...c })) };
}

export function newStanza(name = '', lines = [], counts = true) {
  return { id: uid(), name, counts, lines };
}

export function newSong(title, stanzas) {
  return { id: uid(), title, createdAt: Date.now(), best: null, stanzas };
}

export function cloneLine(l) {
  return newLine(l.lyric, l.chords);
}

export function cloneStanza(s) {
  return newStanza(s.name, s.lines.map(cloneLine), s.counts);
}
