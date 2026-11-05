(function () {
  'use strict';

  var Dados = window.QuadradinhosDados;
  var Motor = window.QuadradinhosMotor;
  var SVG = 'http://www.w3.org/2000/svg';

  // ---------- desenho do quadradinho (SVG) ----------

  var CASAS = 6;
  var LARG = 100, ALT = 144;
  var X0 = 18, X1 = 82;          // primeira e última corda
  var Y0 = 14, PASSO = 21;       // pestana do instrumento e altura de cada casa

  function el(nome, attrs, pai) {
    var e = document.createElementNS(SVG, nome);
    Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (pai) pai.appendChild(e);
    return e;
  }

  function xCorda(corda) { return X0 + (corda - 1) * (X1 - X0) / 3; }
  function yCasa(casa) { return Y0 + (casa - 0.5) * PASSO; }

  function desenharQuadradinho(desenho) {
    var svg = el('svg', { viewBox: '0 0 ' + LARG + ' ' + ALT, class: 'qd-svg', role: 'img', 'aria-label': desenho.nome });
    var yFim = Y0 + CASAS * PASSO;

    el('rect', { x: X0, y: Y0, width: X1 - X0, height: yFim - Y0, class: 'qd-braco' }, svg);
    for (var c = 1; c <= 4; c++) {
      el('line', { x1: xCorda(c), y1: Y0, x2: xCorda(c), y2: yFim, class: 'qd-corda' }, svg);
    }
    for (var f = 1; f <= CASAS; f++) {
      el('line', { x1: X0, y1: Y0 + f * PASSO, x2: X1, y2: Y0 + f * PASSO, class: 'qd-traste' }, svg);
    }
    el('line', { x1: X0 - 1, y1: Y0, x2: X1 + 1, y2: Y0, class: 'qd-pestana-fixa' }, svg);

    if (desenho.pestana) {
      var y = yCasa(desenho.pestana);
      el('line', { x1: X0 + 4, y1: y, x2: X1 + 2, y2: y, class: 'qd-seta' }, svg);
      el('polygon', { points: (X0 - 4) + ',' + y + ' ' + (X0 + 7) + ',' + (y - 6) + ' ' + (X0 + 7) + ',' + (y + 6), class: 'qd-seta-ponta' }, svg);
    }

    desenho.dedos.forEach(function (d) {
      var cx = xCorda(d[0]), cy = yCasa(d[1]);
      el('circle', { cx: cx, cy: cy, r: 8.5, class: 'qd-bola' }, svg);
      var t = el('text', { x: cx, y: cy + 3.3, class: 'qd-dedo' }, svg);
      t.textContent = d[2];
    });

    return svg;
  }

  function nomeEDesenho(id, pai) {
    var d = Dados.desenhos[id];
    var nome = document.createElement('div');
    nome.className = 'nome';
    nome.textContent = d.nome;
    var dg = document.createElement('div');
    dg.className = 'dg';
    dg.appendChild(desenharQuadradinho(d));
    pai.appendChild(nome);
    pai.appendChild(dg);
  }

  // ---------- estado do jogo ----------

  var estado = {
    filtro: localStorage.getItem('qd-filtro') || 'maior',
    nOpcoes: parseInt(localStorage.getItem('qd-opcoes') || '3', 10),
    sequencia: null,
    passo: 1,          // índice do acorde que está sendo perguntado (1..3); 4 = terminou
    acertos: 0,
    erros: 0,
    streak: 0,
    opcoes: [],
    travado: false
  };

  function $(id) { return document.getElementById(id); }
  var $seq = $('sequencia'), $opcoes = $('opcoes'), $pergunta = $('pergunta'), $fim = $('fim');

  function atualizarTopo() {
    document.querySelectorAll('[data-filtro]').forEach(function (b) {
      b.classList.toggle('on', b.dataset.filtro === estado.filtro);
    });
    document.querySelectorAll('[data-opcoes]').forEach(function (b) {
      b.classList.toggle('on', parseInt(b.dataset.opcoes, 10) === estado.nOpcoes);
    });
    $('acertos').textContent = estado.acertos;
    $('erros').textContent = estado.erros;
    $('streak').textContent = estado.streak;
    var feitos = Math.min(estado.passo, 4);
    $('prog').style.width = (feitos / 4 * 100) + '%';
    $('passo').textContent = estado.passo >= 4 ? 'sequência completa' : 'acorde ' + (estado.passo + 1) + ' de 4';
  }

  function desenharSequencia() {
    $seq.innerHTML = '';
    estado.sequencia.acordes.forEach(function (id, i) {
      var casa = document.createElement('div');
      if (i < estado.passo) {
        casa.className = 'casa ' + (estado.sequencia.resultados[i] || '');
        nomeEDesenho(id, casa);
      } else {
        casa.className = 'casa vazia' + (i === estado.passo ? ' atual' : '');
        casa.innerHTML = '<div class="nome">?</div>';
      }
      $seq.appendChild(casa);
    });
  }

  function desenharOpcoes() {
    $opcoes.innerHTML = '';
    $opcoes.className = 'opts n' + estado.nOpcoes;
    var correto = estado.sequencia.acordes[estado.passo];
    estado.opcoes = Motor.gerarOpcoes(Dados.desenhos, correto, estado.nOpcoes, Math.random);
    estado.opcoes.forEach(function (id, i) {
      var b = document.createElement('button');
      b.className = 'opt';
      b.dataset.id = id;
      var tecla = document.createElement('span');
      tecla.className = 'tecla';
      tecla.textContent = i + 1;
      b.appendChild(tecla);
      nomeEDesenho(id, b);
      b.addEventListener('click', function () { escolher(id); });
      $opcoes.appendChild(b);
    });
    var anterior = Dados.desenhos[estado.sequencia.acordes[estado.passo - 1]].nome;
    $pergunta.textContent = 'Qual vem depois de ' + anterior + '?';
  }

  var timer = null;

  // escolhida: sequência específica (vinda do modo estudar); sem ela, sorteia
  function novaSequencia(escolhida) {
    clearTimeout(timer);
    var s = escolhida;
    if (!s || !s.acordes) {
      var lista = Motor.filtrarSequencias(Dados.sequencias, estado.filtro);
      var anterior = estado.sequencia ? estado.sequencia.titulo : null;
      s = Motor.sortearSequencia(lista, Math.random, anterior);
    }
    estado.sequencia = { titulo: s.titulo, acordes: s.acordes, resultados: [] };
    estado.passo = 1;
    estado.travado = false;
    $('titulo-sequencia').textContent = 'Sequência de ' + s.titulo;
    $fim.hidden = true;
    $opcoes.hidden = false;
    desenharSequencia();
    desenharOpcoes();
    atualizarTopo();
  }

  function terminar() {
    var r = estado.sequencia.resultados;
    var certos = r.filter(function (x) { return x === 'ok'; }).length;
    $opcoes.hidden = true;
    $pergunta.textContent = '';
    $('fim-texto').innerHTML = (certos === 3 ? 'Mandou bem! 🎉' : certos + ' de 3 certos') +
      '<small>Agora toca ela no cavaco.</small>';
    $fim.hidden = false;
  }

  function escolher(id) {
    if (estado.travado || estado.passo >= 4) return;
    estado.travado = true;
    var correto = estado.sequencia.acordes[estado.passo];
    var acertou = Dados.desenhos[id].nome === Dados.desenhos[correto].nome;
    if (acertou) { estado.acertos++; estado.streak++; } else { estado.erros++; estado.streak = 0; }
    estado.sequencia.resultados[estado.passo] = acertou ? 'ok' : 'err';

    $opcoes.querySelectorAll('.opt').forEach(function (b) {
      if (b.dataset.id === correto) b.classList.add('ok');
      else if (b.dataset.id === id) b.classList.add('err');
      else b.classList.add('dim');
    });
    $pergunta.textContent = acertou ? 'Isso! 🔥' : 'Era ' + Dados.desenhos[correto].nome + '.';
    atualizarTopo();

    timer = setTimeout(function () {
      estado.passo++;
      estado.travado = false;
      desenharSequencia();
      atualizarTopo();
      if (estado.passo >= 4) terminar();
      else desenharOpcoes();
    }, acertou ? 700 : 1800);
  }

  document.querySelectorAll('[data-filtro]').forEach(function (b) {
    b.addEventListener('click', function () {
      estado.filtro = b.dataset.filtro;
      localStorage.setItem('qd-filtro', estado.filtro);
      novaSequencia();
    });
  });

  document.querySelectorAll('[data-opcoes]').forEach(function (b) {
    b.addEventListener('click', function () {
      estado.nOpcoes = parseInt(b.dataset.opcoes, 10);
      localStorage.setItem('qd-opcoes', String(estado.nOpcoes));
      atualizarTopo();
      if (!estado.travado && estado.passo < 4) desenharOpcoes();
    });
  });

  $('btn-proxima').addEventListener('click', function () { novaSequencia(); });

  // ---------- modo estudar: todas as sequências completas ----------

  function abrirEstudo() {
    var overlay = document.createElement('div');
    overlay.className = 'overlay';
    var sheet = document.createElement('div');
    sheet.className = 'sheet';
    overlay.appendChild(sheet);

    var cab = document.createElement('div');
    cab.className = 'sheet-top';
    cab.innerHTML = '<h3>Estudar sequências</h3>';
    var fechar = document.createElement('button');
    fechar.className = 'ico';
    fechar.setAttribute('aria-label', 'Fechar');
    fechar.textContent = '✕';
    cab.appendChild(fechar);
    sheet.appendChild(cab);

    var dica = document.createElement('p');
    dica.textContent = 'Maior: I → VI7 → IIm → V7.  Menor: Im → I7 → IVm → V7.';
    sheet.appendChild(dica);

    Motor.filtrarSequencias(Dados.sequencias, estado.filtro).forEach(function (seq) {
      var bloco = document.createElement('div');
      bloco.className = 'estudo-seq';
      var topo = document.createElement('div');
      topo.className = 'estudo-topo';
      var t = document.createElement('b');
      t.textContent = seq.titulo;
      var treinar = document.createElement('button');
      treinar.className = 'treinar';
      treinar.textContent = 'Treinar ▶';
      treinar.addEventListener('click', function () {
        fecharEstudo();
        novaSequencia(seq);
      });
      topo.appendChild(t);
      topo.appendChild(treinar);
      bloco.appendChild(topo);

      var grade = document.createElement('div');
      grade.className = 'estudo-grade';
      seq.acordes.forEach(function (id) {
        var casa = document.createElement('div');
        casa.className = 'casa';
        nomeEDesenho(id, casa);
        grade.appendChild(casa);
      });
      bloco.appendChild(grade);
      sheet.appendChild(bloco);
    });

    function fecharEstudo() {
      overlay.remove();
      document.removeEventListener('keydown', esc);
    }
    function esc(e) { if (e.key === 'Escape') fecharEstudo(); }
    fechar.addEventListener('click', fecharEstudo);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) fecharEstudo(); });
    document.addEventListener('keydown', esc);
    document.body.appendChild(overlay);
  }

  $('btn-estudar').addEventListener('click', abrirEstudo);

  document.addEventListener('keydown', function (e) {
    if (document.querySelector('.overlay')) return;
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= estado.opcoes.length && estado.passo < 4) {
      escolher(estado.opcoes[n - 1]);
    } else if (e.key === 'Enter' && !$fim.hidden) {
      e.preventDefault();
      novaSequencia();
    }
  });

  novaSequencia();
})();
