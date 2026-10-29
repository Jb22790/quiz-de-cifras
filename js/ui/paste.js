// Tela "Colar cifra".

import { h } from './dom.js';
import { parseCifra } from '../core/parser.js';
import { newSong } from '../core/model.js';

export function render(root, ctx) {
  const title = h('input', { class: 'field', placeholder: 'Ex.: Minha Canção', autocomplete: 'off' });
  const text = h('textarea', {
    class: 'field', spellcheck: false, autocapitalize: 'off', autocomplete: 'off',
    placeholder: 'Cole aqui a cifra copiada do Cifra Club…',
  });

  const go = () => {
    const name = title.value.trim();
    if (!name) { ctx.toast('Dê um nome pra música'); title.focus(); return; }
    const stanzas = parseCifra(text.value);
    if (!stanzas.length) { ctx.toast('Não encontrei acordes nesse texto'); return; }
    const song = newSong(name, stanzas);
    ctx.putSong(song);
    ctx.go(`#/editar/${song.id}`);
  };

  root.append(h('section', { class: 'screen' },
    h('div', { class: 'top' },
      h('button', { class: 'ico', 'aria-label': 'Voltar', onclick: () => ctx.go('#/') }, '←'),
      h('div', { class: 'title' }, 'Nova música'),
      h('div', { style: 'width:40px' })),
    h('div', { class: 'label' }, 'Nome da música'),
    title,
    h('div', { class: 'label' }, 'Cifra'),
    text,
    h('p', { class: 'hint' }, 'Depois você confere e arruma a ordem no editor.'),
    h('button', { class: 'btn', onclick: go }, 'Continuar')));
}
