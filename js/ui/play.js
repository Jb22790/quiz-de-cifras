// Tela do quiz: escuta a música por fora e escolhe o próximo acorde.

import { h, sheet } from './dom.js';
import { cifraLine } from './cifra.js';
import { starsText } from './home.js';
import { stanzaLabel, firstLyric } from './editor.js';
import { createSession, answer, next, jumpTo, restart, result } from '../core/quiz.js';

const AUTO_ADVANCE_MS = 700;

export function render(root, ctx, id) {
  const song = ctx.getSong(id);
  if (!song) { ctx.go('#/'); return; }

  let session = createSession(song, ctx.state.prefs.options);
  if (session.total === 0) {
    ctx.toast('Essa música ainda não tem acordes no jogo');
    ctx.replace(`#/editar/${song.id}`);
    return;
  }

  const flat = song.stanzas.flatMap((st, s) => st.lines.map((line, l) => ({ s, l, line })));
  let timer = 0;

  function choose(choice) {
    if (session.last) return;
    session = answer(session, choice);
    draw();
    if (session.last.correct) timer = setTimeout(advance, AUTO_ADVANCE_MS);
  }

  function advance() {
    clearTimeout(timer);
    session = next(session);
    draw();
  }

  function draw() {
    if (location.hash !== `#/jogar/${id}`) { clearTimeout(timer); return; }
    root.replaceChildren(session.finished ? endScreen() : quizScreen());
  }

  function quizScreen() {
    const q = session.questions[session.index];
    const st = song.stanzas[q.s];
    const pos = flat.findIndex(f => f.s === q.s && f.l === q.l);
    const prev = flat[pos - 1];
    const last = session.last;

    const current = cifraLine(st.lines[q.l], {
      chord: (c, i) => {
        if (i < q.c) return { text: c.name };
        if (i > q.c) return null;
        if (!last) return { text: '?', cls: 'q' };
        return { text: c.name, cls: 'q ' + (last.correct ? 'ok' : 'err') };
      },
    });

    const lyrics = ctx.state.prefs.showLyrics && h('div', { class: 'lyr' },
      prev && h('div', { class: 'past' }, cifraLine(prev.line)),
      current);

    const opts = h('div', { class: `opts n${session.options.length}` }, session.options.map(o => {
      let cls = 'opt';
      if (last) {
        if (o === q.answer) cls += ' ok';
        else if (o === last.choice) cls += ' err';
        else cls += ' dim';
      }
      return h('button', { class: cls, onclick: e => { e.stopPropagation(); choose(o); } }, o);
    }));

    const screen = h('section', { class: 'screen quiz' },
      h('div', { class: 'top' },
        h('button', { class: 'ico', 'aria-label': 'Sair', onclick: () => ctx.go('#/') }, '✕'),
        h('div', { class: 'title' }, song.title),
        h('button', { class: 'ico', 'aria-label': 'Menu', onclick: openMenu }, '⏸')),
      h('div', { class: 'prog' }, h('i', { style: `width:${(session.index / session.total) * 100}%` })),
      h('div', { class: 'meta' },
        h('span', null, `acorde ${session.index + 1} de ${session.total}`),
        h('span', null, `✅ ${session.correct} · ❌ ${session.wrong} · 🔥 ${session.streak}`)),
      st.name && h('div', { class: 'pill' }, st.name),
      lyrics,
      h('div', { class: 'ask' }, last ? (last.correct ? feedbackRight() : 'Era esse aí em verde 👆') : 'Qual é o próximo acorde?'),
      opts,
      h('div', { class: 'tapnext' }, last && !last.correct ? 'toque em qualquer lugar pra seguir' : ''));

    if (last && !last.correct) screen.addEventListener('click', advance, { once: true });
    return screen;
  }

  function feedbackRight() {
    const s = session.streak;
    if (s >= 10) return h('span', { class: 'streak-pop' }, `🔥 ${s} seguidos! Monstro!`);
    if (s >= 5) return h('span', { class: 'streak-pop' }, `🔥 ${s} seguidos!`);
    return 'Isso! 🎉';
  }

  function endScreen() {
    const r = result(session);
    let improved = false;
    if (r.countsForStars && (!song.best || r.pct > song.best.pct)) {
      const updated = { ...ctx.getSong(song.id), best: { stars: r.stars, pct: r.pct } };
      ctx.putSong(updated);
      song.best = updated.best;
      improved = true;
    }
    const stars = h('div', { class: 'bigstars' },
      [0, 1, 2].map(i => h('span', { class: i < r.stars ? '' : 'off', style: `animation-delay:${i * 0.15}s` }, i < r.stars ? '★' : '☆')));
    return h('section', { class: 'screen' },
      h('div', { class: 'top' },
        h('button', { class: 'ico', 'aria-label': 'Sair', onclick: () => ctx.go('#/') }, '✕'),
        h('div', { class: 'title' }, song.title),
        h('div', { style: 'width:40px' })),
      h('div', { class: 'result' },
        h('div', { class: 'score' }, String(r.correct), h('small', null, ` de ${r.total}`)),
        stars,
        h('div', null, `Maior sequência 🔥 ${r.bestStreak}`),
        !r.countsForStars && h('div', { class: 'note' }, 'Partida com pulos — estrelas não mudam'),
        improved && h('div', { class: 'note' }, '🏆 Novo recorde nessa música!'),
        h('div', { class: 'stack' },
          h('button', { class: 'btn', onclick: () => { session = restart(session, song); draw(); } }, 'Jogar de novo'),
          h('button', { class: 'btn sec', onclick: () => ctx.go('#/') }, 'Voltar'))));
  }

  function openMenu(e) {
    e.stopPropagation();
    clearTimeout(timer);
    const resume = () => { if (session.last?.correct) timer = setTimeout(advance, AUTO_ADVANCE_MS); };
    let acted = false;
    sheet(close => [
      h('h3', null, 'Pausa'),
      h('button', { class: 'menu-item', onclick: () => { acted = true; close(); session = restart(session, song); draw(); } }, '🔄', 'Reiniciar'),
      h('button', { class: 'menu-item', onclick: () => { acted = true; close(); openJump(resume); } }, '⏭', 'Ir para…'),
      h('button', {
        class: 'menu-item',
        onclick: () => {
          close();
          ctx.commit(st => { st.prefs.showLyrics = !st.prefs.showLyrics; });
          draw();
        },
      }, '📝', ctx.state.prefs.showLyrics ? 'Esconder letra' : 'Mostrar letra'),
      h('button', { class: 'menu-item', onclick: () => { acted = true; close(); ctx.go('#/'); } }, '🚪', 'Sair'),
    ], () => { if (!acted) resume(); });
  }

  function openJump(resume) {
    let picked = false;
    sheet(close => [
      h('h3', null, 'Ir para…'),
      h('p', null, 'Pular muda o placar, mas as estrelas só contam numa partida completa.'),
      song.stanzas.map((st, s) => h('button', {
        class: 'menu-item',
        onclick: () => { picked = true; close(); session = jumpTo(session, s); draw(); },
      }, h('span', null, stanzaLabel(st, s), h('small', null, firstLyric(st))), !st.counts && h('span', { class: 'badge' }, 'não conta'))),
    ], () => { if (!picked) resume(); });
  }

  draw();
}
