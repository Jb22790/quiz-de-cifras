// Estado do app, rotas (hash) e inicialização.

import { load, save } from './core/store.js';
import { toast, confirmDialog, choiceDialog, promptDialog } from './ui/dom.js';
import * as home from './ui/home.js';
import * as paste from './ui/paste.js';
import * as editor from './ui/editor.js';
import * as play from './ui/play.js';

const state = load();
const root = document.getElementById('app');

const ctx = {
  state,
  commit(mutator) {
    mutator(state);
    try { save(state); } catch { toast('Não consegui salvar no aparelho'); }
  },
  getSong: id => state.songs.find(s => s.id === id),
  putSong(song) {
    ctx.commit(st => {
      const i = st.songs.findIndex(s => s.id === song.id);
      if (i === -1) st.songs.push(song); else st.songs[i] = song;
    });
  },
  go(hash) { location.hash = hash; },
  replace(hash) { location.replace(hash); },
  toast, confirmDialog, choiceDialog, promptDialog,
};

const routes = [
  [/^#\/nova$/, () => paste],
  [/^#\/editar\/(.+)$/, () => editor],
  [/^#\/jogar\/(.+)$/, () => play],
];

function route() {
  document.querySelectorAll('.overlay, .ghost').forEach(e => e.remove());
  const hash = location.hash || '#/';
  let view = home, param = null;
  for (const [re, get] of routes) {
    const m = hash.match(re);
    if (m) { view = get(); param = m[1] ? decodeURIComponent(m[1]) : null; break; }
  }
  root.replaceChildren();
  window.scrollTo(0, 0);
  view.render(root, ctx, param);
}

window.addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
