// Tela "Minhas músicas", com escolha de opções e backup.

import { h, sheet } from './dom.js';
import { buildQuestions } from '../core/quiz.js';
import { exportJson, parseBackup, mergeData, backupFilename } from '../core/store.js';
import { matchesTitle } from '../core/edit.js';

let query = '';

const COLORS = ['var(--pink)', 'var(--blu)', 'var(--pri)', 'var(--ok)'];
const EMOJIS = ['🎤', '🎸', '🥁', '🎹', '🎻', '🎺', '🪕', '🎷'];

export function starsText(n) {
  return '★'.repeat(n) + '☆'.repeat(3 - n);
}

export function render(root, ctx) {
  const { state } = ctx;
  const draw = () => { root.replaceChildren(); render(root, ctx); };

  const chips = h('div', { class: 'chips' }, 'Opções:',
    [2, 3, 4].map(n => h('button', {
      class: 'chip' + (state.prefs.options === n ? ' on' : ''),
      onclick: () => { ctx.commit(st => { st.prefs.options = n; }); draw(); },
    }, String(n))));

  const list = h('div', { class: 'songs' });
  const fillList = () => {
    const found = state.songs.map((song, i) => [song, i]).filter(([song]) => matchesTitle(song.title, query));
    list.replaceChildren(...(found.length
      ? found.map(([song, i]) => songCard(song, i, ctx, draw))
      : [h('div', { class: 'empty' }, h('div', { class: 'big' }, '🔎'), `Nenhuma música com "${query.trim()}".`)]));
  };

  const search = state.songs.length > 0 && h('div', { class: 'search' },
    h('input', {
      class: 'field', type: 'search', placeholder: '🔎 Buscar música', value: query,
      autocomplete: 'off', 'aria-label': 'Buscar música',
      oninput: e => { query = e.target.value; fillList(); },
    }));

  if (state.songs.length) fillList();
  else list.replaceChildren(h('div', { class: 'empty' }, h('div', { class: 'big' }, '🎶'),
    'Nenhuma música ainda.', h('br'), 'Toque em ', h('b', null, '＋ Colar cifra'), ' pra começar.'));

  root.append(h('section', { class: 'screen' },
    h('div', { class: 'top' },
      h('h1', null, 'Minhas músicas'),
      h('button', { class: 'ico', 'aria-label': 'Configurações', onclick: () => openSettings(ctx, draw) }, '⚙️')),
    chips,
    search,
    list,
    h('button', { class: 'fab', onclick: () => ctx.go('#/nova') }, '＋ Colar cifra')));
}

function songCard(song, i, ctx, draw) {
  const n = buildQuestions(song).length;
  const stars = song.best?.stars ?? 0;
  return h('div', { class: 'song', role: 'button', tabindex: 0, onclick: () => ctx.go(`#/jogar/${song.id}`) },
    h('div', { class: 'cover', style: `background:${COLORS[i % COLORS.length]}` }, EMOJIS[i % EMOJIS.length]),
    h('div', { class: 'info' },
      h('b', null, song.title),
      h('small', null, `${n} ${n === 1 ? 'acorde' : 'acordes'} no jogo · `, h('span', { class: 'stars' }, starsText(stars)))),
    h('div', { class: 'acts' },
      h('button', { class: 'ico', 'aria-label': 'Editar', onclick: e => { e.stopPropagation(); ctx.go(`#/editar/${song.id}`); } }, '✎'),
      h('button', {
        class: 'ico', 'aria-label': 'Apagar',
        onclick: async e => {
          e.stopPropagation();
          const ok = await ctx.confirmDialog({ title: `Apagar "${song.title}"?`, text: 'Essa música e a cifra dela somem do app.', ok: 'Apagar' });
          if (!ok) return;
          ctx.commit(st => { st.songs = st.songs.filter(s => s.id !== song.id); });
          draw();
        },
      }, '🗑')));
}

function openSettings(ctx, draw) {
  sheet(close => [
    h('h3', null, 'Backup'),
    h('p', null, 'As músicas ficam só neste aparelho. Exporte um backup de vez em quando pra não perder nada.'),
    h('button', { class: 'menu-item', onclick: () => { exportBackup(ctx); close(); } },
      '⬇️', h('span', null, 'Exportar backup', h('small', null, 'Baixa um arquivo .json com tudo'))),
    h('button', { class: 'menu-item', onclick: () => { close(); importBackup(ctx, draw); } },
      '⬆️', h('span', null, 'Importar backup', h('small', null, 'Escolhe um arquivo exportado antes'))),
  ]);
}

function exportBackup(ctx) {
  const blob = new Blob([exportJson(ctx.state)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: backupFilename() });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  ctx.toast('Backup exportado');
}

function importBackup(ctx, draw) {
  const input = h('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.remove();
    if (!file) return;
    let imported;
    try { imported = parseBackup(await file.text()); } catch (e) { ctx.toast(e.message); return; }
    const mode = await ctx.choiceDialog({
      title: 'Importar backup',
      text: `O arquivo tem ${imported.songs.length} música(s).`,
      options: [
        { label: 'Juntar com as atuais', value: 'merge' },
        { label: 'Substituir tudo', value: 'replace', danger: true },
      ],
    });
    if (!mode) return;
    ctx.commit(st => Object.assign(st, mergeData(st, imported, mode)));
    ctx.toast('Backup importado');
    draw();
  });
  document.body.append(input);
  input.click();
}
