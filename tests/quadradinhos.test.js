import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../js/quadradinhos/motor.js');
const D = require('../js/quadradinhos/dados.js');

// rng determinístico pra testes
function rngSequencial(valores) {
  let i = 0;
  return () => valores[i++ % valores.length];
}

test('qualidade identifica maior, menor e com sétima', () => {
  assert.equal(M.qualidade('C'), 'maior');
  assert.equal(M.qualidade('F#'), 'maior');
  assert.equal(M.qualidade('Dm'), 'menor');
  assert.equal(M.qualidade('Bbm'), 'menor');
  assert.equal(M.qualidade('G7'), 'setima');
  assert.equal(M.qualidade('G#7'), 'setima');
});

test('filtrarSequencias separa maiores, menores e todas', () => {
  assert.equal(M.filtrarSequencias(D.sequencias, 'maior').length, 7);
  assert.equal(M.filtrarSequencias(D.sequencias, 'menor').length, 7);
  assert.equal(M.filtrarSequencias(D.sequencias, 'todas').length, 14);
});

test('aplicarSelecao tira as desmarcadas e, sem nada desmarcado, mantém todas', () => {
  const maiores = M.filtrarSequencias(D.sequencias, 'maior');
  assert.equal(M.aplicarSelecao(maiores, []).length, 7);
  assert.equal(M.aplicarSelecao(maiores, undefined).length, 7);
  const sel = M.aplicarSelecao(maiores, ['Si Maior', 'Fá Maior', 'Dó Menor']);
  assert.equal(sel.length, 5);
  assert.ok(!sel.some((s) => s.titulo === 'Si Maior' || s.titulo === 'Fá Maior'));
});

test('aplicarSelecao volta pra todas se tudo foi desmarcado', () => {
  const maiores = M.filtrarSequencias(D.sequencias, 'maior');
  const todasFora = maiores.map((s) => s.titulo);
  assert.equal(M.aplicarSelecao(maiores, todasFora).length, 7);
});

test('sortearSequencia não repete a anterior quando há outras', () => {
  const seqs = M.filtrarSequencias(D.sequencias, 'maior');
  for (let k = 0; k < 50; k++) {
    const s = M.sortearSequencia(seqs, Math.random, 'Dó Maior');
    assert.notEqual(s.titulo, 'Dó Maior');
  }
});

test('gerarOpcoes devolve n opções, inclui a certa e não repete nomes', () => {
  for (const n of [2, 3, 4]) {
    for (let k = 0; k < 100; k++) {
      const ops = M.gerarOpcoes(D.desenhos, 'A7', n, Math.random);
      assert.equal(ops.length, n);
      assert.ok(ops.includes('A7'));
      const nomes = ops.map((id) => D.desenhos[id].nome);
      assert.equal(new Set(nomes).size, n, 'nomes repetidos: ' + nomes);
    }
  }
});

test('gerarOpcoes prefere distratores da mesma qualidade', () => {
  for (let k = 0; k < 100; k++) {
    const ops = M.gerarOpcoes(D.desenhos, 'Dm', 4, Math.random);
    ops.forEach((id) => assert.equal(M.qualidade(D.desenhos[id].nome), 'menor'));
  }
});

test('gerarOpcoes nunca usa outro desenho com o mesmo nome do certo como distrator', () => {
  for (let k = 0; k < 200; k++) {
    const ops = M.gerarOpcoes(D.desenhos, 'Em', 4, Math.random);
    assert.ok(!ops.includes('Em-4'));
  }
});

test('gerarOpcoes embaralha a posição da resposta certa', () => {
  const posicoes = new Set();
  for (let k = 0; k < 200; k++) {
    posicoes.add(M.gerarOpcoes(D.desenhos, 'G7', 4, Math.random).indexOf('G7'));
  }
  assert.equal(posicoes.size, 4);
});

test('todas as sequências apontam pra desenhos que existem', () => {
  D.sequencias.forEach((s) => {
    assert.equal(s.acordes.length, 4);
    s.acordes.forEach((id) => assert.ok(D.desenhos[id], s.titulo + ': ' + id));
  });
});

// Confere a transcrição pela teoria: as notas que o desenho produz no cavaco
// (Ré-Sol-Si-Ré) têm que pertencer ao acorde do nome.
const NOTA = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function notasDoAcorde(nome) {
  const m = nome.match(/^([A-G])([#b]?)(m?)(7?)$/);
  let raiz = NOTA[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const intervalos = [0, m[3] ? 3 : 4, 7].concat(m[4] ? [10] : []);
  return new Set(intervalos.map((i) => (raiz + i + 12) % 12));
}

test('cada desenho produz só notas do acorde (confere a transcrição)', () => {
  Object.entries(D.desenhos).forEach(([id, d]) => {
    const tocadas = M.notasDoDesenho(d);
    const permitidas = notasDoAcorde(d.nome);
    tocadas.forEach((n) => assert.ok(permitidas.has(n), id + ' tem nota fora do acorde: ' + n));
    // a terça define maior/menor: tem que estar lá
    const raiz = [...permitidas][0];
    const terca = (raiz + (d.nome.includes('m') ? 3 : 4)) % 12;
    assert.ok(tocadas.includes(terca), id + ' sem a terça');
  });
});
