// Ajudantes de DOM: criação de elementos, toast e diálogos dentro do app.

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.append(c instanceof Node ? c : String(c));
  }
}

let toastTimer;
export function toast(msg) {
  document.querySelector('.toast')?.remove();
  clearTimeout(toastTimer);
  const el = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(el);
  toastTimer = setTimeout(() => el.remove(), 2400);
}

// Abre uma folha de baixo. build(close) devolve o conteúdo. Retorna close().
export function sheet(build, onClose) {
  const overlay = h('div', { class: 'overlay' });
  const panel = h('div', { class: 'sheet' });
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    overlay.remove();
    onClose?.();
  };
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  append(panel, [build(close)]);
  overlay.append(panel);
  document.body.append(overlay);
  return close;
}

export function confirmDialog({ title, text = '', ok = 'Confirmar', cancel = 'Cancelar', danger = true }) {
  return new Promise(resolve => {
    let value = false;
    sheet(close => [
      h('h3', null, title),
      text && h('p', null, text),
      h('div', { class: 'stack' },
        h('button', { class: danger ? 'btn danger' : 'btn', onclick: () => { value = true; close(); } }, ok),
        h('button', { class: 'btn sec', onclick: close }, cancel)),
    ], () => resolve(value));
  });
}

export function choiceDialog({ title, text = '', options }) {
  return new Promise(resolve => {
    let value = null;
    sheet(close => [
      h('h3', null, title),
      text && h('p', null, text),
      h('div', { class: 'stack' },
        options.map(o => h('button', { class: o.danger ? 'btn danger' : 'btn', onclick: () => { value = o.value; close(); } }, o.label)),
        h('button', { class: 'btn sec', onclick: close }, 'Cancelar')),
    ], () => resolve(value));
  });
}

export function promptDialog({ title, value = '', placeholder = '', ok = 'OK', validate }) {
  return new Promise(resolve => {
    let result = null;
    const input = h('input', { class: 'field', value, placeholder, autocapitalize: 'off', autocomplete: 'off' });
    const submit = close => {
      const v = input.value.trim();
      const err = validate?.(v);
      if (err) { toast(err); return; }
      result = v;
      close();
    };
    sheet(close => {
      input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(close); });
      return [
        h('h3', null, title),
        input,
        h('div', { class: 'stack' },
          h('button', { class: 'btn', onclick: () => submit(close) }, ok),
          h('button', { class: 'btn sec', onclick: close }, 'Cancelar')),
      ];
    }, () => resolve(result));
    setTimeout(() => input.focus(), 50);
  });
}
