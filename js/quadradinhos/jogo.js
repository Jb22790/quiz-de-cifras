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

  function lerDesmarcadas() {
    try {
      var v = JSON.parse(localStorage.getItem('qd-desmarcadas') || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }
  function salvarDesmarcadas(lista) {
    try { localStorage.setItem('qd-desmarcadas', JSON.stringify(lista)); } catch (e) { /* sem storage: vale só nesta sessão */ }
  }

  var estado = {
    filtro: localStorage.getItem('qd-filtro') || 'maior',
    nOpcoes: parseInt(localStorage.getItem('qd-opcoes') || '3', 10),
    desmarcadas: lerDesmarcadas(),   // títulos fora do treino; vazio = todas
    original: null,                  // sequência sorteada (pra poder refazer)
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
    var doFiltro = Motor.filtrarSequencias(Dados.sequencias, estado.filtro);
    var marcadas = doFiltro.filter(function (s) { return estado.desmarcadas.indexOf(s.titulo) < 0; }).length;
    var parcial = marcadas > 0 && marcadas < doFiltro.length;
    $('sel-conta').textContent = parcial ? marcadas + '/' + doFiltro.length : 'todas';
    $('btn-escolher').classList.toggle('parcial', parcial);
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
      var lista = Motor.aplicarSelecao(Motor.filtrarSequencias(Dados.sequencias, estado.filtro), estado.desmarcadas);
      var anterior = estado.sequencia ? estado.sequencia.titulo : null;
      s = Motor.sortearSequencia(lista, Math.random, anterior);
    }
    estado.original = s;
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
    var errou = certos < 3;
    $('fim-texto').innerHTML = (errou ? certos + ' de 3 certos' : 'Mandou bem! 🎉') +
      '<small>' + (errou ? 'Refaz essa pra fixar, ou segue pra próxima.' : 'Agora toca ela no cavaco.') + '</small>';
    // errou: "Refazer" vira o botão principal; acertou tudo: "Próxima" é o principal
    $('btn-refazer').classList.toggle('sec', !errou);
    $('btn-proxima').classList.toggle('sec', errou);
    $fim.hidden = false;
  }

  function refazer() {
    if (estado.original) novaSequencia(estado.original);
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
  $('btn-refazer').addEventListener('click', refazer);
  $('btn-refazer-mini').addEventListener('click', refazer);

  // ---------- folha que sobe (usada pelo estudar e pelo escolher) ----------

  function abrirFolha(titulo, aoFechar) {
    var overlay = document.createElement('div');
    overlay.className = 'overlay';
    var sheet = document.createElement('div');
    sheet.className = 'sheet';
    overlay.appendChild(sheet);

    var cab = document.createElement('div');
    cab.className = 'sheet-top';
    var h = document.createElement('h3');
    h.textContent = titulo;
    cab.appendChild(h);
    var x = document.createElement('button');
    x.className = 'ico';
    x.setAttribute('aria-label', 'Fechar');
    x.textContent = '✕';
    cab.appendChild(x);
    sheet.appendChild(cab);

    function fechar() {
      overlay.remove();
      document.removeEventListener('keydown', esc);
      if (aoFechar) aoFechar();
    }
    function esc(e) { if (e.key === 'Escape') fechar(); }
    x.addEventListener('click', fechar);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) fechar(); });
    document.addEventListener('keydown', esc);
    document.body.appendChild(overlay);
    return { sheet: sheet, fechar: fechar };
  }

  // ---------- escolher quais sequências entram no sorteio ----------

  function abrirEscolha() {
    var antes = estado.desmarcadas.slice().sort().join('|');
    var doFiltro = Motor.filtrarSequencias(Dados.sequencias, estado.filtro);

    var folha = abrirFolha('Escolher sequências', function () {
      // fechou com nada marcado (✕ ou Esc): volta pra todas em vez de ficar sem treino
      if (!doFiltro.some(function (s) { return marcada(s.titulo); })) {
        doFiltro.forEach(function (s) { setMarcada(s.titulo, true); });
      }
      salvarDesmarcadas(estado.desmarcadas);
      atualizarTopo();
      var mudou = estado.desmarcadas.slice().sort().join('|') !== antes;
      var atualFora = estado.sequencia && estado.desmarcadas.indexOf(estado.sequencia.titulo) >= 0;
      // só troca a sequência em jogo se ela saiu da seleção (não perde o progresso à toa)
      if (mudou && atualFora) novaSequencia();
    });
    var sheet = folha.sheet;

    var dica = document.createElement('p');
    dica.textContent = 'Marca só as que você quer treinar. O sorteio usa apenas as marcadas.';
    sheet.appendChild(dica);

    var acoes = document.createElement('div');
    acoes.className = 'sel-acoes';
    var bTodas = document.createElement('button');
    bTodas.className = 'chip';
    bTodas.textContent = 'Marcar todas';
    var bNenhuma = document.createElement('button');
    bNenhuma.className = 'chip';
    bNenhuma.textContent = 'Desmarcar todas';
    acoes.appendChild(bTodas);
    acoes.appendChild(bNenhuma);
    sheet.appendChild(acoes);

    var lista = document.createElement('div');
    lista.className = 'sel-lista';
    sheet.appendChild(lista);

    var aviso = document.createElement('p');
    aviso.className = 'sel-aviso';
    sheet.appendChild(aviso);

    var pronto = document.createElement('button');
    pronto.className = 'btn';
    pronto.textContent = 'Pronto';
    pronto.addEventListener('click', function () { if (!pronto.disabled) folha.fechar(); });
    sheet.appendChild(pronto);

    function marcada(titulo) { return estado.desmarcadas.indexOf(titulo) < 0; }
    function setMarcada(titulo, sim) {
      var i = estado.desmarcadas.indexOf(titulo);
      if (sim && i >= 0) estado.desmarcadas.splice(i, 1);
      if (!sim && i < 0) estado.desmarcadas.push(titulo);
    }

    function render() {
      lista.innerHTML = '';
      doFiltro.forEach(function (seq) {
        var on = marcada(seq.titulo);
        var b = document.createElement('button');
        b.className = 'sel-item' + (on ? ' on' : '');
        b.setAttribute('role', 'checkbox');
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        var caixa = document.createElement('span');
        caixa.className = 'caixa';
        caixa.textContent = on ? '✓' : '';
        var txt = document.createElement('span');
        txt.className = 'sel-txt';
        var t = document.createElement('b');
        t.textContent = seq.titulo;
        var ac = document.createElement('small');
        ac.textContent = seq.acordes.map(function (id) { return Dados.desenhos[id].nome; }).join(' → ');
        txt.appendChild(t);
        txt.appendChild(ac);
        b.appendChild(caixa);
        b.appendChild(txt);
        b.addEventListener('click', function () { setMarcada(seq.titulo, !on); render(); });
        lista.appendChild(b);
      });
      var n = doFiltro.filter(function (s) { return marcada(s.titulo); }).length;
      pronto.disabled = n === 0;
      aviso.textContent = n === 0 ? 'Marca pelo menos uma.' : n + ' de ' + doFiltro.length + ' no sorteio';
    }

    bTodas.addEventListener('click', function () {
      doFiltro.forEach(function (s) { setMarcada(s.titulo, true); });
      render();
    });
    bNenhuma.addEventListener('click', function () {
      doFiltro.forEach(function (s) { setMarcada(s.titulo, false); });
      render();
    });

    render();
  }

  $('btn-escolher').addEventListener('click', abrirEscolha);

  // ---------- modo estudar: todas as sequências completas ----------

  function abrirEstudo() {
    var folha = abrirFolha('Estudar sequências');
    var sheet = folha.sheet;
    var fecharEstudo = folha.fechar;

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
    } else if (e.key === 'r' || e.key === 'R') {
      refazer();
    }
  });

  novaSequencia();
})();
