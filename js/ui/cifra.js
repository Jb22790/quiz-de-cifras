// Desenha uma frase no formato do Cifra Club: acordes em cima, letra embaixo.

import { h } from './dom.js';

// chord(c, i) devolve { text, cls, onclick } ou null para esconder o acorde.
export function cifraLine(line, { chord = c => ({ text: c.name }), onRowTap } = {}) {
  const width = Math.max(line.lyric.length, ...line.chords.map(c => c.col + c.name.length), 1);
  const crow = h('div', { class: 'crow', style: `width:${width + 1}ch` });
  line.chords.forEach((c, i) => {
    const spec = chord(c, i);
    if (!spec) return;
    crow.append(h('span', {
      class: 'chd' + (spec.cls ? ' ' + spec.cls : ''),
      style: `left:${c.col}ch`,
      onclick: spec.onclick && (e => { e.stopPropagation(); spec.onclick(e); }),
    }, spec.text));
  });
  if (onRowTap) crow.addEventListener('click', e => onRowTap(colFromEvent(crow, e)));
  return h('div', { class: 'cifra' },
    crow,
    h('div', { class: 'lrow' + (line.lyric ? '' : ' nolyric'), style: `width:${width + 1}ch` }, line.lyric || '(só acordes)'));
}

function colFromEvent(crow, e) {
  const probe = h('span', { style: 'position:absolute;visibility:hidden;white-space:pre' }, '0'.repeat(20));
  crow.append(probe);
  const chWidth = probe.getBoundingClientRect().width / 20;
  probe.remove();
  return Math.max(0, Math.floor((e.clientX - crow.getBoundingClientRect().left) / chWidth));
}
