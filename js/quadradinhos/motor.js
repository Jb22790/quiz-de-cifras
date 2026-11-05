(function (global) {
  'use strict';

  // Afinação do cavaco, da corda 1 (esquerda do desenho) à 4: Ré Sol Si Ré
  var AFINACAO = [2, 7, 11, 2];

  function qualidade(nome) {
    if (/7$/.test(nome)) return 'setima';
    if (/m$/.test(nome)) return 'menor';
    return 'maior';
  }

  function filtrarSequencias(sequencias, filtro) {
    if (filtro === 'todas') return sequencias.slice();
    return sequencias.filter(function (s) { return s.tipo === filtro; });
  }

  function sortearSequencia(sequencias, rng, tituloAnterior) {
    var candidatas = sequencias.filter(function (s) { return s.titulo !== tituloAnterior; });
    if (candidatas.length === 0) candidatas = sequencias;
    return candidatas[Math.floor(rng() * candidatas.length)];
  }

  function embaralhar(lista, rng) {
    var a = lista.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Monta n opções (ids de desenho): a certa + distratores com nomes diferentes,
  // de preferência da mesma qualidade (maior/menor/sétima) pra ficar desafiador.
  function gerarOpcoes(desenhos, idCorreto, n, rng) {
    var nomeCorreto = desenhos[idCorreto].nome;
    var q = qualidade(nomeCorreto);
    var usados = {};
    usados[nomeCorreto] = true;

    var ids = embaralhar(Object.keys(desenhos), rng);
    var mesmaQualidade = ids.filter(function (id) { return qualidade(desenhos[id].nome) === q; });
    var outras = ids.filter(function (id) { return qualidade(desenhos[id].nome) !== q; });

    var distratores = [];
    mesmaQualidade.concat(outras).forEach(function (id) {
      var nome = desenhos[id].nome;
      if (distratores.length < n - 1 && !usados[nome]) {
        usados[nome] = true;
        distratores.push(id);
      }
    });

    return embaralhar(distratores.concat([idCorreto]), rng);
  }

  // Notas (0-11) que o desenho produz, corda por corda.
  function notasDoDesenho(desenho) {
    var notas = [];
    for (var corda = 1; corda <= 4; corda++) {
      var casa = desenho.pestana || 0;
      desenho.dedos.forEach(function (d) {
        if (d[0] === corda && d[1] > casa) casa = d[1];
      });
      notas.push((AFINACAO[corda - 1] + casa) % 12);
    }
    return notas;
  }

  var api = {
    qualidade: qualidade,
    filtrarSequencias: filtrarSequencias,
    sortearSequencia: sortearSequencia,
    gerarOpcoes: gerarOpcoes,
    notasDoDesenho: notasDoDesenho
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.QuadradinhosMotor = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
