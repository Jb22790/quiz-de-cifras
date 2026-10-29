// Tela do editor: estrofes, frases e acordes. A letra nunca é editável.

import { h, sheet } from './dom.js';
import { cifraLine } from './cifra.js';
import { isChordToken } from '../core/chords.js';
import {
  moveStanza, duplicateStanza, deleteStanza, renameStanza, setCounts,
  moveLines, duplicateLines, deleteLines, linesToStanza,
  setChord, shiftChord, removeChord, addChord, distinctChords, createHistory,
} from '../core/edit.js';

const PALETTE = ['#5ec8ff', '#2ed47a', '#ff7ad9', '#ffb627', '#b18cff', '#ff8a5c'];

export function stanzaLabel(st, s) {
  return st.name || `Estrofe ${s + 1}`;
}

export function firstLyric(st) {
  const l = st.lines.find(x => x.lyric.trim());
  return l ? l.lyric.trim().slice(0, 30) + (l.lyric.trim().length > 30 ? '…' : '') : 'só acordes';
}

export function render(root, ctx, id) {
  let song = ctx.getSong(id);
  if (!song) { ctx.go('#/'); return; }

  const history = createHistory(30);
  let selecting = false;
  let moving = false;
  let selected = new Set();

  const addrOf = lineId => {
    for (let s = 0; s < song.stanzas.length; s++) {
      const l = song.stanzas[s].lines.findIndex(x => x.id === lineId);
      if (l !== -1) return { s, l };
    }
    return null;
  };
  const selectedAddrs = () => [...selected].map(addrOf).filter(Boolean);

  function apply(next) {
    history.push(song);
    song = next;
    ctx.putSong(song);
    draw();
  }

  function undo() {
    const prev = history.undo();
    if (!prev) return;
    song = prev;
    ctx.putSong(song);
    draw();
  }

  // Move frases (por id) para a estrofe stanzaId, antes da frase beforeId (ou no fim).
  function moveLinesTo(ids, stanzaId, beforeId) {
    const moving = new Set(ids);
    const toS = song.stanzas.findIndex(s => s.id === stanzaId);
    const rest = song.stanzas[toS].lines.filter(l => !moving.has(l.id));
    const idx = beforeId ? rest.findIndex(l => l.id === beforeId) : -1;
    apply(moveLines(song, ids.map(addrOf), toS, idx === -1 ? rest.length : idx));
  }

  function exitSelect() {
    selecting = false;
    moving = false;
    selected = new Set();
    draw();
  }

  // ---------- desenho ----------
  function draw() {
    const scrollY = window.scrollY;
    root.replaceChildren(h('section', { class: 'screen editor' }, header(), list(), bar()));
    window.scrollTo(0, scrollY);
  }

  function header() {
    if (selecting) {
      return h('div', { class: 'top' },
        h('button', { class: 'ico', 'aria-label': 'Sair da seleção', onclick: exitSelect }, '✕'),
        h('div', { class: 'title' }, moving ? 'Toque onde colocar' : `${selected.size} selecionada${selected.size === 1 ? '' : 's'}`),
        h('div', { style: 'width:40px' }));
    }
    return h('div', { class: 'top' },
      h('button', { class: 'ico', 'aria-label': 'Voltar', onclick: () => ctx.go('#/') }, '←'),
      h('button', {
        class: 'title',
        onclick: async () => {
          const name = await ctx.promptDialog({ title: 'Nome da música', value: song.title, validate: v => !v && 'Dê um nome pra música' });
          if (name) apply({ ...song, title: name });
        },
      }, song.title, ' ✎'),
      h('button', { class: 'ico', 'aria-label': 'Jogar', onclick: () => ctx.go(`#/jogar/${song.id}`) }, '▶'));
  }

  function list() {
    return h('div', { class: 'editor-list' }, song.stanzas.map((st, s) => stanzaBlock(st, s)),
      !song.stanzas.length && h('p', { class: 'hint' }, 'Nenhuma estrofe. Desfaça (↶) ou cole a cifra de novo.'));
  }

  function slot(stanzaId, beforeId) {
    return h('button', {
      class: 'slot',
      onclick: () => {
        const ids = [...selected];
        moving = false;
        selecting = false;
        selected = new Set();
        moveLinesTo(ids, stanzaId, beforeId);
      },
    }, '⬇ colocar aqui');
  }

  function stanzaBlock(st, s) {
    const color = PALETTE[s % PALETTE.length];
    const handle = h('span', { class: 'ico handle', 'aria-label': 'Arrastar estrofe' }, '⋮⋮');
    handle.addEventListener('pointerdown', e => startDrag(e, 'stanza', st.id, stanzaLabel(st, s)));

    const head = h('div', { class: 'sh' },
      h('button', { class: 'name', onclick: () => stanzaMenu(s) }, stanzaLabel(st, s)),
      !st.counts && h('span', { class: 'badge' }, 'não conta'),
      !selecting && [
        h('button', { class: 'ico', 'aria-label': 'Duplicar estrofe', onclick: () => apply(duplicateStanza(song, s)) }, '⧉'),
        h('button', { class: 'ico', 'aria-label': 'Apagar estrofe', onclick: () => confirmDeleteStanza(s) }, '🗑'),
        handle,
      ]);

    const lines = h('div', { class: 'lines' });
    st.lines.forEach((line, l) => {
      if (moving && !selected.has(line.id)) lines.append(slot(st.id, line.id));
      lines.append(lineRow(line, s, l));
    });
    if (moving) lines.append(slot(st.id, null));

    return h('div', { class: 'stz' + (st.counts ? '' : ' off'), style: `--c:${color}`, 'data-stanza': st.id }, head, lines);
  }

  function lineRow(line, s, l) {
    const isSel = selected.has(line.id);
    const left = selecting
      ? h('span', { class: 'cb' }, h('i'))
      : (() => {
        const hd = h('span', { class: 'handle', 'aria-label': 'Arrastar frase' }, '⋮⋮');
        hd.addEventListener('pointerdown', e => startDrag(e, 'line', line.id, line.lyric || line.chords.map(c => c.name).join(' ')));
        return hd;
      })();

    const cifra = cifraLine(line, selecting
      ? {}
      : {
        chord: (c, i) => ({ text: c.name, onclick: () => chordMenu(line.id, i) }),
        onRowTap: col => addChordMenu(line.id, col),
      });

    return h('div', {
      class: 'ln' + (isSel ? ' sel' : ''),
      'data-line': line.id,
      onclick: selecting && !moving ? () => {
        if (isSel) selected.delete(line.id); else selected.add(line.id);
        draw();
      } : null,
    }, left, cifra);
  }

  function bar() {
    const btn = (icon, label, onclick, disabled = false) => h('button', { onclick, disabled }, h('i', null, icon), label);
    let buttons;
    if (moving) {
      buttons = [btn('✕', 'Cancelar movimento', () => { moving = false; draw(); })];
    } else if (selecting) {
      const none = selected.size === 0;
      const run = fn => () => { const addrs = selectedAddrs(); selected = new Set(); selecting = false; apply(fn(song, addrs)); };
      buttons = [
        btn('⧉', 'Duplicar', run(duplicateLines), none),
        btn('↕', 'Mover', () => { moving = true; draw(); }, none),
        btn('📦', 'Virar estrofe', run(linesToStanza), none),
        btn('🗑', 'Apagar', run(deleteLines), none),
      ];
    } else {
      buttons = [
        btn('☑️', 'Selecionar', () => { selecting = true; draw(); }),
        btn('＋', 'Estrofe', addStanzaMenu, !song.stanzas.length),
        btn('↶', 'Desfazer', undo, !history.canUndo()),
      ];
    }
    return h('div', { class: 'bar' }, h('div', { class: 'in' }, buttons));
  }

  // ---------- menus ----------
  async function confirmDeleteStanza(s) {
    const ok = await ctx.confirmDialog({ title: `Apagar "${stanzaLabel(song.stanzas[s], s)}"?`, text: 'Dá pra desfazer depois com ↶.', ok: 'Apagar' });
    if (ok) apply(deleteStanza(song, s));
  }

  function stanzaMenu(s) {
    const st = song.stanzas[s];
    sheet(close => [
      h('h3', null, stanzaLabel(st, s)),
      h('button', {
        class: 'menu-item',
        onclick: async () => {
          close();
          const name = await ctx.promptDialog({ title: 'Nome da estrofe', value: st.name, placeholder: 'Ex.: Refrão' });
          if (name !== null) apply(renameStanza(song, s, name));
        },
      }, '✎', 'Renomear'),
      h('button', {
        class: 'switch' + (st.counts ? ' on' : ''),
        onclick: () => { close(); apply(setCounts(song, s, !st.counts)); },
      }, h('span', null, 'Conta no jogo', h('small', { style: 'display:block;color:var(--mut);font-size:12px' }, st.counts ? 'Vira pergunta no quiz' : 'Aparece, mas não vira pergunta')), h('span', { class: 'knob' })),
      h('button', { class: 'menu-item', onclick: () => { close(); apply(duplicateStanza(song, s)); } }, '⧉', 'Duplicar'),
      s > 0 && h('button', { class: 'menu-item', onclick: () => { close(); apply(moveStanza(song, s, s - 1)); } }, '⬆', 'Subir'),
      s < song.stanzas.length - 1 && h('button', { class: 'menu-item', onclick: () => { close(); apply(moveStanza(song, s, s + 1)); } }, '⬇', 'Descer'),
      h('button', { class: 'menu-item', onclick: () => { close(); confirmDeleteStanza(s); } }, '🗑', 'Apagar'),
    ]);
  }

  function addStanzaMenu() {
    sheet(close => [
      h('h3', null, 'Nova estrofe'),
      h('p', null, 'Escolha qual estrofe copiar pro fim da música.'),
      song.stanzas.map((st, s) => h('button', {
        class: 'menu-item',
        onclick: () => {
          close();
          const dup = duplicateStanza(song, s);
          apply(moveStanza(dup, s + 1, dup.stanzas.length - 1));
        },
      }, h('span', null, stanzaLabel(st, s), h('small', null, firstLyric(st))))),
    ]);
  }

  function chordGrid(current, onPick) {
    const typeNew = async () => {
      const name = await ctx.promptDialog({
        title: 'Digite o acorde', placeholder: 'Ex.: G7, F#m, C/E',
        validate: v => !isChordToken(v) && 'Isso não parece um acorde',
      });
      if (name) onPick(name);
    };
    return h('div', { class: 'cgrid' },
      distinctChords(song).map(n => h('button', { class: n === current ? 'on' : '', onclick: () => onPick(n) }, n)),
      h('button', { 'aria-label': 'Digitar acorde', onclick: typeNew }, '✎'));
  }

  function chordMenu(lineId, i) {
    let index = i;
    const close = sheet(() => {
      const addr = addrOf(lineId);
      const c = song.stanzas[addr.s].lines[addr.l].chords[index];
      const shift = delta => {
        const col = Math.max(0, c.col + delta);
        apply(shiftChord(song, addrOf(lineId), index, delta));
        const a = addrOf(lineId);
        index = song.stanzas[a.s].lines[a.l].chords.findIndex(x => x.col === col && x.name === c.name);
        c.col = col;
      };
      return [
        h('h3', null, `Trocar acorde “${c.name}”`),
        chordGrid(c.name, name => { close(); apply(setChord(song, addrOf(lineId), index, name)); }),
        h('div', { class: 'row2' },
          h('button', { class: 'btn sec', onclick: () => shift(-1) }, '⟵ mover'),
          h('button', { class: 'btn sec', onclick: () => shift(1) }, 'mover ⟶')),
        h('div', { class: 'row2' },
          h('button', { class: 'btn danger', onclick: () => { close(); apply(removeChord(song, addrOf(lineId), index)); } }, '🗑 tirar acorde')),
      ];
    });
  }

  function addChordMenu(lineId, col) {
    const close = sheet(() => [
      h('h3', null, 'Adicionar acorde aqui'),
      chordGrid(null, name => { close(); apply(addChord(song, addrOf(lineId), name, col)); }),
    ]);
  }

  // ---------- arrastar (toque e mouse) ----------
  function startDrag(e, kind, dragId, label) {
    if (selecting) return;
    e.preventDefault();
    const handle = e.currentTarget;
    try { handle.setPointerCapture(e.pointerId); } catch { /* ponteiro sintético */ }
    const srcEl = root.querySelector(kind === 'line' ? `[data-line="${dragId}"]` : `[data-stanza="${dragId}"]`);
    srcEl.classList.add('dragging');
    const ghost = h('div', { class: 'ghost' }, kind === 'line' ? '♪ ' : '▤ ', label);
    document.body.append(ghost);
    const ind = h('div', { class: 'drop-ind' });
    const startY = e.clientY;
    let y = startY;
    let moved = false;
    let target = null;
    let raf = 0;

    const place = () => {
      ghost.style.top = `${y - 22}px`;
      target = kind === 'line' ? lineTarget(y, dragId) : stanzaTarget(y, dragId);
      if (!target) { ind.remove(); return; }
      if (target.beforeEl) target.beforeEl.before(ind);
      else target.container.append(ind);
    };
    const tick = () => {
      if (!moved) { raf = requestAnimationFrame(tick); return; }
      if (y < 80) window.scrollBy(0, -12);
      else if (y > window.innerHeight - 120) window.scrollBy(0, 12);
      place();
      raf = requestAnimationFrame(tick);
    };
    const move = ev => { y = ev.clientY; if (Math.abs(y - startY) > 6) moved = true; };
    const end = ev => {
      cancelAnimationFrame(raf);
      handle.removeEventListener('pointermove', move);
      ghost.remove();
      ind.remove();
      srcEl.classList.remove('dragging');
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
      if (!moved || !target || ev.type === 'pointercancel') return;
      if (kind === 'line') moveLinesTo([dragId], target.stanzaId, target.beforeId);
      else {
        const from = song.stanzas.findIndex(s => s.id === dragId);
        let to = target.beforeId ? song.stanzas.findIndex(s => s.id === target.beforeId) : song.stanzas.length;
        if (to > from) to -= 1;
        if (to !== from) apply(moveStanza(song, from, to));
      }
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
    raf = requestAnimationFrame(tick);
  }

  function lineTarget(y, dragId) {
    const blocks = [...root.querySelectorAll('.stz')];
    if (!blocks.length) return null;
    let block = blocks.find(b => { const r = b.getBoundingClientRect(); return y >= r.top && y <= r.bottom; });
    if (!block) {
      block = blocks.reduce((best, b) => {
        const r = b.getBoundingClientRect();
        const d = Math.min(Math.abs(y - r.top), Math.abs(y - r.bottom));
        return !best || d < best.d ? { b, d } : best;
      }, null).b;
    }
    const container = block.querySelector('.lines');
    const lines = [...container.querySelectorAll('.ln')].filter(el => el.dataset.line !== dragId);
    const before = lines.find(el => { const r = el.getBoundingClientRect(); return y < r.top + r.height / 2; });
    return { container, beforeEl: before ?? null, stanzaId: block.dataset.stanza, beforeId: before?.dataset.line ?? null };
  }

  function stanzaTarget(y, dragId) {
    const container = root.querySelector('.editor-list');
    const blocks = [...container.querySelectorAll('.stz')].filter(b => b.dataset.stanza !== dragId);
    const before = blocks.find(b => { const r = b.getBoundingClientRect(); return y < r.top + r.height / 2; });
    return { container, beforeEl: before ?? null, beforeId: before?.dataset.stanza ?? null };
  }

  draw();
}
