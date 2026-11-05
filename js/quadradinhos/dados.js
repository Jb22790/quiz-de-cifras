// Quadradinhos do cavaco (afinação Ré-Sol-Si-Ré), transcritos do caderno do OneNote
// (CAVACO > QUADRADINHOS > MAIORES / MENORES).
//
// Cada desenho: dedos = [corda, casa, dedo]
//   corda: 1..4 da esquerda pra direita no desenho (1 = Ré grave, 2 = Sol, 3 = Si, 4 = Ré agudo)
//   casa:  1..6 a partir da pestana do instrumento
//   dedo:  número que aparece na bolinha
// pestana: casa em que o dedo 1 deita em todas as cordas (a seta no caderno).
// Corda sem dedo = solta.
(function (global) {
  'use strict';

  var desenhos = {
    'C':     { nome: 'C',    dedos: [[3, 1, 1], [1, 2, 2], [4, 2, 3]] },
    'A7':    { nome: 'A7',   dedos: [[1, 2, 2], [3, 2, 3], [4, 2, 4]] },
    'Dm':    { nome: 'Dm',   dedos: [[2, 2, 1], [1, 3, 2], [3, 3, 3], [4, 3, 4]] },
    'G7':    { nome: 'G7',   dedos: [[1, 3, 1], [3, 3, 2], [2, 4, 3], [4, 5, 4]] },
    'D':     { nome: 'D',    dedos: [[2, 2, 1], [3, 3, 2], [1, 4, 3], [4, 4, 4]] },
    'B7':    { nome: 'B7',   dedos: [[2, 2, 1], [1, 4, 2], [3, 4, 3], [4, 4, 4]] },
    'Em-4':  { nome: 'Em',   dedos: [[2, 4, 1], [1, 5, 2], [3, 5, 3], [4, 5, 4]] },
    'E':     { nome: 'E',    dedos: [[2, 1, 1], [1, 2, 2], [4, 2, 3]] },
    'C#7':   { nome: 'C#7',  dedos: [[3, 2, 1], [1, 3, 2], [4, 3, 3], [2, 4, 4]] },
    'F#m':   { nome: 'F#m',  dedos: [[2, 2, 1], [3, 2, 2], [1, 4, 3], [4, 4, 4]] },
    'B7-1':  { nome: 'B7',   dedos: [[1, 1, 1], [2, 2, 2], [4, 4, 4]] },
    'F':     { nome: 'F',    dedos: [[3, 1, 1], [2, 2, 2], [1, 3, 3], [4, 3, 4]] },
    'D7':    { nome: 'D7',   dedos: [[3, 1, 1], [2, 2, 2], [1, 4, 3], [4, 4, 4]] },
    'Gm':    { nome: 'Gm',   dedos: [[2, 3, 1], [3, 3, 2], [1, 5, 3], [4, 5, 4]] },
    'C7':    { nome: 'C7',   dedos: [[2, 3, 1], [1, 5, 2], [3, 5, 3], [4, 5, 4]] },
    'G':     { nome: 'G',    dedos: [[3, 3, 1], [2, 4, 2], [1, 5, 3], [4, 5, 4]] },
    'E7':    { nome: 'E7',   dedos: [[2, 1, 1], [1, 2, 2], [4, 2, 3], [3, 3, 4]] },
    'Am':    { nome: 'Am',   dedos: [[3, 1, 1], [1, 2, 2], [2, 2, 3], [4, 2, 4]] },
    'A':     { nome: 'A',    dedos: [], pestana: 2 },
    'F#7':   { nome: 'F#7',  dedos: [[1, 2, 1], [3, 2, 2], [2, 3, 3], [4, 4, 4]] },
    'Bm':    { nome: 'Bm',   dedos: [[3, 3, 1], [1, 4, 2], [2, 4, 3], [4, 4, 4]] },
    'B':     { nome: 'B',    dedos: [], pestana: 4 },
    'G#7':   { nome: 'G#7',  dedos: [[2, 5, 2], [4, 6, 3]], pestana: 4 },
    'C#m':   { nome: 'C#m',  dedos: [[2, 1, 1], [1, 2, 2], [3, 2, 3], [4, 2, 4]] },
    'Cm':    { nome: 'Cm',   dedos: [[3, 4, 1], [1, 5, 2], [2, 5, 3], [4, 5, 4]] },
    'Fm':    { nome: 'Fm',   dedos: [[2, 1, 1], [3, 1, 2], [1, 3, 3], [4, 3, 4]] },
    'F7':    { nome: 'F7',   dedos: [[1, 1, 1], [3, 1, 2], [2, 2, 3], [4, 3, 4]] },
    'Bbm':   { nome: 'Bbm',  dedos: [[3, 2, 1], [1, 3, 2], [2, 3, 3], [4, 3, 4]] },
    'Em':    { nome: 'Em',   dedos: [[1, 2, 2], [4, 2, 3]] }
  };

  var sequencias = [
    { titulo: 'Dó Maior',  tipo: 'maior', acordes: ['C', 'A7', 'Dm', 'G7'] },
    { titulo: 'Ré Maior',  tipo: 'maior', acordes: ['D', 'B7', 'Em-4', 'A7'] },
    { titulo: 'Mi Maior',  tipo: 'maior', acordes: ['E', 'C#7', 'F#m', 'B7-1'] },
    { titulo: 'Fá Maior',  tipo: 'maior', acordes: ['F', 'D7', 'Gm', 'C7'] },
    { titulo: 'Sol Maior', tipo: 'maior', acordes: ['G', 'E7', 'Am', 'D7'] },
    { titulo: 'Lá Maior',  tipo: 'maior', acordes: ['A', 'F#7', 'Bm', 'E7'] },
    { titulo: 'Si Maior',  tipo: 'maior', acordes: ['B', 'G#7', 'C#m', 'F#7'] },
    { titulo: 'Dó Menor',  tipo: 'menor', acordes: ['Cm', 'C7', 'Fm', 'G7'] },
    { titulo: 'Ré Menor',  tipo: 'menor', acordes: ['Dm', 'D7', 'Gm', 'A7'] },
    { titulo: 'Mi Menor',  tipo: 'menor', acordes: ['Em', 'E7', 'Am', 'B7'] },
    { titulo: 'Fá Menor',  tipo: 'menor', acordes: ['Fm', 'F7', 'Bbm', 'C7'] },
    { titulo: 'Sol Menor', tipo: 'menor', acordes: ['Gm', 'G7', 'Cm', 'D7'] },
    { titulo: 'Lá Menor',  tipo: 'menor', acordes: ['Am', 'A7', 'Dm', 'E7'] },
    { titulo: 'Si Menor',  tipo: 'menor', acordes: ['Bm', 'B7', 'Em', 'F#7'] }
  ];

  var api = { desenhos: desenhos, sequencias: sequencias };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.QuadradinhosDados = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
