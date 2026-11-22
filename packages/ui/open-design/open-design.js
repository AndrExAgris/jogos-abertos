/* Open Design: preferências do usuário (tema, cores, densidade, animações) e menus.
   Carregue no <head>, sem defer, depois de tokens.css e bundle.css: aplica o tema antes de a página aparecer.
   O projeto declara os padrões no <html> (data-tema, data-primaria, data-secundaria, data-densidade);
   o que o usuário escolher nas configurações fica guardado e vence o padrão. */
(function () {
  var raiz = document.documentElement;
  var CHAVE = raiz.getAttribute('data-od-chave') || 'open-design';
  var padrao = {
    tema: raiz.getAttribute('data-tema') || raiz.getAttribute('data-theme') || 'sistema',
    primaria: raiz.getAttribute('data-primaria') || 'laranja',
    secundaria: raiz.getAttribute('data-secundaria') || 'teal',
    densidade: raiz.getAttribute('data-densidade') || 'equilibrada',
    movimento: 'normal',
    recolhido: 'nao'
  };
  var guardado = {};
  try { guardado = JSON.parse(localStorage.getItem(CHAVE) || '{}') || {}; } catch (e) {}
  var pref = {};
  for (var k in padrao) pref[k] = guardado[k] || padrao[k];
  var claro = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;

  function temaReal() { return pref.tema === 'sistema' ? (claro && claro.matches ? 'claro' : 'escuro') : pref.tema; }

  function marcar() {
    var itens = document.querySelectorAll('[data-od-definir]');
    for (var i = 0; i < itens.length; i++) {
      var par = itens[i].getAttribute('data-od-definir').split('=');
      var ativo = pref[par[0]] === par[1];
      if (itens[i].type === 'checkbox') itens[i].checked = ativo;
      else if (itens[i].hasAttribute('aria-checked')) itens[i].setAttribute('aria-checked', ativo ? 'true' : 'false');
      else itens[i].setAttribute('aria-pressed', ativo ? 'true' : 'false');
    }
    /* data-od-valor="tema": mostra o nome da opção atual (o título da linha ou o texto do botão que a define). */
    var valores = document.querySelectorAll('[data-od-valor]');
    for (var v = 0; v < valores.length; v++) {
      var chave = valores[v].getAttribute('data-od-valor');
      var opcao = document.querySelector('[data-od-definir="' + chave + '=' + pref[chave] + '"]');
      if (opcao) { var tt = opcao.querySelector('.linha-titulo') || opcao; valores[v].textContent = opcao.getAttribute('aria-label') || tt.textContent.trim(); }
    }
    var navs = document.querySelectorAll('.nav-lateral[data-od-recolhivel]');
    for (var j = 0; j < navs.length; j++) navs[j].setAttribute('data-recolhido', pref.recolhido === 'sim' ? 'true' : 'false');
  }

  function aplicar() {
    raiz.setAttribute('data-theme', temaReal());
    raiz.setAttribute('data-primaria', pref.primaria);
    raiz.setAttribute('data-secundaria', pref.secundaria);
    raiz.setAttribute('data-densidade', pref.densidade);
    raiz.setAttribute('data-movimento', pref.movimento);
    if (document.body) marcar();
    try { document.dispatchEvent(new CustomEvent('open-design:preferencias', { detail: copia() })); } catch (e) {}
  }

  function copia() { var c = {}; for (var k in pref) c[k] = pref[k]; c.temaAplicado = temaReal(); return c; }

  function definir(novas) {
    for (var k in novas) if (k in padrao) pref[k] = String(novas[k]);
    try { localStorage.setItem(CHAVE, JSON.stringify(pref)); } catch (e) {}
    aplicar();
  }

  /* Volta a aparência ao padrão (o estado do menu lateral recolhido é mantido). */
  function restaurar() {
    for (var k in padrao) if (k !== 'recolhido') pref[k] = padrao[k];
    try { localStorage.setItem(CHAVE, JSON.stringify(pref)); } catch (e) {}
    aplicar();
  }

  if (claro) {
    var mudou = function () { if (pref.tema === 'sistema') aplicar(); };
    if (claro.addEventListener) claro.addEventListener('change', mudou); else if (claro.addListener) claro.addListener(mudou);
  }

  /* Ligações declarativas:
     data-od-definir="tema=claro"            botão (ou caixa) que grava uma preferência
     data-od-alternar="id-do-painel"          abre e fecha um painel (menu de configurações, gaveta)
     data-od-recolher                         recolhe o menu lateral marcado com data-od-recolhivel
     data-od-menu                             abre e fecha o menu lateral como gaveta no celular
     [role=tablist] > [role=tab][aria-controls] abas com clique e setas
     data-od-dialogo="id" / data-od-fechar       abre e fecha <dialog> (diálogo central ou folha inferior)
     data-od-ir="id" / data-od-voltar            subtelas dentro de [data-od-telas]
     data-od-restaurar                           aparência padrão, com Desfazer
     OpenDesign.toast({ tipo, texto, acao })     notificação curta */
  document.addEventListener('click', function (e) {
    var alvo = e.target.closest ? e.target : e.target.parentElement;
    var def = alvo.closest('[data-od-definir]');
    if (def && def.type !== 'checkbox') {
      var par = def.getAttribute('data-od-definir').split('=');
      var o = {}; o[par[0]] = par[1]; definir(o);
    }
    if (alvo.closest('[data-od-recolher]')) definir({ recolhido: pref.recolhido === 'sim' ? 'nao' : 'sim' });
    var alt = alvo.closest('[data-od-alternar]');
    var abertos = document.querySelectorAll('[data-od-painel]:not([hidden])');
    var emToast = alvo.closest('.toasts');  /* Desfazer num toast não fecha o painel */
    for (var i = 0; i < abertos.length; i++) {
      if (!emToast && !abertos[i].contains(alvo) && (!alt || alt.getAttribute('data-od-alternar') !== abertos[i].id)) fechar(abertos[i]);
    }
    if (alt) {
      var painel = document.getElementById(alt.getAttribute('data-od-alternar'));
      if (painel) { if (painel.hidden) abrir(painel, alt); else fechar(painel); }
    }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches && t.matches('input[type="checkbox"][data-od-definir]')) {
      var par = t.getAttribute('data-od-definir').split('=');
      var o = {}; o[par[0]] = t.checked ? par[1] : padrao[par[0]]; definir(o);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var abertos = document.querySelectorAll('[data-od-painel]:not([hidden])');
    for (var i = 0; i < abertos.length; i++) fechar(abertos[i], true);
  });

  /* Menu lateral como gaveta no celular: botão com data-od-menu; fecha no véu, num link do menu ou com Esc. */
  function menu(abrirMenu) {
    if (abrirMenu) document.body.setAttribute('data-menu', 'aberto'); else document.body.removeAttribute('data-menu');
    var bs = document.querySelectorAll('[data-od-menu]');
    for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-expanded', abrirMenu ? 'true' : 'false');
  }
  document.addEventListener('click', function (e) {
    var alvo = e.target.closest ? e.target : e.target.parentElement;
    if (alvo.closest('[data-od-menu]')) { menu(document.body.getAttribute('data-menu') !== 'aberto'); return; }
    if (document.body.getAttribute('data-menu') === 'aberto') {
      var nav = alvo.closest('.nav-lateral');
      if (!nav || alvo.closest('.nav-lateral a')) menu(false);
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.body.getAttribute('data-menu') === 'aberto') menu(false); });

  /* Abas: [role=tablist] > [role=tab][aria-controls]; clique e setas trocam o painel. */
  function selecionarAba(aba, focar) {
    var lista = aba.closest('[role="tablist"]');
    var todas = lista.querySelectorAll('[role="tab"]');
    for (var i = 0; i < todas.length; i++) {
      var ativa = todas[i] === aba;
      todas[i].setAttribute('aria-selected', ativa ? 'true' : 'false');
      todas[i].tabIndex = ativa ? 0 : -1;
      var painel = document.getElementById(todas[i].getAttribute('aria-controls'));
      if (painel) painel.hidden = !ativa;
    }
    if (focar) aba.focus();
  }
  document.addEventListener('click', function (e) {
    var aba = e.target.closest && e.target.closest('[role="tablist"] [role="tab"]');
    if (aba) selecionarAba(aba, false);
  });
  document.addEventListener('keydown', function (e) {
    var aba = e.target.closest && e.target.closest('[role="tablist"] [role="tab"]');
    if (!aba) return;
    var todas = Array.prototype.slice.call(aba.closest('[role="tablist"]').querySelectorAll('[role="tab"]'));
    var i = todas.indexOf(aba), n = todas.length, alvo = null;
    if (e.key === 'ArrowRight') alvo = todas[(i + 1) % n];
    else if (e.key === 'ArrowLeft') alvo = todas[(i - 1 + n) % n];
    else if (e.key === 'Home') alvo = todas[0];
    else if (e.key === 'End') alvo = todas[n - 1];
    if (alvo) { e.preventDefault(); selecionarAba(alvo, true); }
  });
  document.addEventListener('DOMContentLoaded', function () {
    var listas = document.querySelectorAll('[role="tablist"]');
    for (var i = 0; i < listas.length; i++) {
      var atual = listas[i].querySelector('[role="tab"][aria-selected="true"]') || listas[i].querySelector('[role="tab"]');
      if (atual) selecionarAba(atual, false);
    }
  });

  /* Diálogos e folhas inferiores: <dialog class="dialogo" id="x"> ou <dialog class="folha-inferior" id="x">.
     data-od-dialogo="x" abre (showModal: prende o foco e fecha com Esc); data-od-fechar fecha o diálogo em que está.
     Tocar fora fecha, exceto com data-od-fixo no <dialog>. O foco volta ao botão que abriu.
     O valor do botão de fechar fica em dialog.returnValue (data-od-fechar="confirmar"). */
  function abrirDialogo(d, botao) {
    if (!d || d.open) return;
    d._odBotao = botao || document.activeElement;
    d.returnValue = '';
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    var foco = d.querySelector('[autofocus]') || d.querySelector('.botao-primario, .folha-inferior .menu-item, button:not(.folha-alca), input, a');
    if (foco) foco.focus();
  }
  function fecharDialogo(d, valor) {
    if (!d || !d.open) return;
    if (d.close) d.close(valor || ''); else d.removeAttribute('open');
  }
  document.addEventListener('click', function (e) {
    var alvo = e.target.closest ? e.target : e.target.parentElement;
    var abre = alvo.closest('[data-od-dialogo]');
    if (abre) { abrirDialogo(document.getElementById(abre.getAttribute('data-od-dialogo')), abre); return; }
    var f = alvo.closest('[data-od-fechar]');
    if (f) { fecharDialogo(f.closest('dialog'), f.getAttribute('data-od-fechar')); return; }
    if (alvo.tagName === 'DIALOG' && alvo.open && !alvo.hasAttribute('data-od-fixo')) {
      var r = alvo.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) fecharDialogo(alvo, 'fora');
    }
  });
  document.addEventListener('close', function (e) {
    var d = e.target;
    if (d && d.tagName === 'DIALOG' && d._odBotao && d._odBotao.focus) { d._odBotao.focus(); d._odBotao = null; }
  }, true);
  /* Arrastar a alça da folha para baixo: passou de 30% da altura (ou foi rápido), fecha; senão, volta. */
  document.addEventListener('pointerdown', function (e) {
    var alca = e.target.closest && e.target.closest('.folha-alca');
    if (!alca) return;
    var folha = alca.closest('dialog'); if (!folha) return;
    var y0 = e.clientY, t0 = Date.now(), dy = 0;
    folha.style.transition = 'none';
    try { alca.setPointerCapture(e.pointerId); } catch (x) {}
    function mover(ev) { dy = Math.max(0, ev.clientY - y0); folha.style.transform = 'translateY(' + dy + 'px)'; }
    function soltar() {
      alca.removeEventListener('pointermove', mover); alca.removeEventListener('pointerup', soltar); alca.removeEventListener('pointercancel', soltar);
      folha.style.transition = ''; folha.style.transform = '';
      var rapido = dy > 24 && dy / Math.max(1, Date.now() - t0) > 0.6;
      if (dy > folha.offsetHeight * 0.3 || rapido) fecharDialogo(folha, 'arrastar');
    }
    alca.addEventListener('pointermove', mover); alca.addEventListener('pointerup', soltar); alca.addEventListener('pointercancel', soltar);
  });

  /* Toasts: OpenDesign.toast({ tipo: 'sucesso'|'erro'|'aviso'|'info', texto, acao: { rotulo, ao: fn }, duracao })
     Some sozinho em duracao-toast (5 s); com ação, fica até a pessoa agir ou fechar. Pausa com o dedo ou o mouse em cima.
     No máximo três ao mesmo tempo (o mais antigo sai). Arrastar para o lado dispensa. Devolve { fechar }. */
  var ICONES_TOAST = {
    sucesso: '<path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M9 12l2 2l4 -4"/>',
    erro: '<path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M10 10l4 4m0 -4l-4 4"/>',
    aviso: '<path d="M12 9v4"/><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z"/><path d="M12 16h.01"/>',
    info: '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M12 9h.01"/><path d="M11 12h1v4h1"/>'
  };
  function regiaoToasts() {
    var r = document.querySelector('.toasts');
    if (!r) {
      r = document.createElement('div'); r.className = 'toasts';
      r.setAttribute('role', 'region'); r.setAttribute('aria-label', 'Notificações');
      (document.querySelector('.tela-app') || document.body).appendChild(r);
    }
    return r;
  }
  function duracaoPadrao() {
    var v = getComputedStyle(raiz).getPropertyValue('--duracao-toast');
    return parseFloat(v) || 5000;
  }
  function toast(op) {
    op = op || {};
    var tipo = op.tipo || 'sucesso';
    var regiao = regiaoToasts();
    var t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('data-tipo', tipo);
    t.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
    t.innerHTML = '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true">' + (ICONES_TOAST[tipo] || ICONES_TOAST.info) + '</svg><span class="toast-texto"></span>';
    t.querySelector('.toast-texto').textContent = op.texto || '';
    if (op.acao) {
      var b = document.createElement('button'); b.className = 'botao botao-terciario'; b.type = 'button';
      b.textContent = op.acao.rotulo || 'Desfazer';
      b.addEventListener('click', function () { if (op.acao.ao) op.acao.ao(); fechar(); });
      t.appendChild(b);
    }
    var x = document.createElement('button'); x.className = 'botao botao-terciario botao-icone'; x.type = 'button'; x.setAttribute('aria-label', 'Fechar');
    x.innerHTML = '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6l-12 12"/><path d="M6 6l12 12"/></svg>';
    x.addEventListener('click', function () { fechar(); });
    t.appendChild(x);
    var lista = regiao.querySelectorAll('.toast:not([data-saindo])');
    if (lista.length >= 3 && lista[0]._odFechar) lista[0]._odFechar();
    regiao.appendChild(t);

    var resta = op.duracao != null ? op.duracao : (op.acao ? 0 : duracaoPadrao());
    var relogio = null, inicio = 0, fechado = false;
    function contar() { if (resta > 0) { inicio = Date.now(); relogio = setTimeout(fechar, resta); } }
    function pausar() { if (relogio) { clearTimeout(relogio); relogio = null; resta -= Date.now() - inicio; } }
    function fechar() {
      if (fechado) return; fechado = true; pausar();
      t.setAttribute('data-saindo', '');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 200);
      if (op.aoFechar) op.aoFechar();
    }
    t._odFechar = fechar;
    t.addEventListener('pointerenter', pausar); t.addEventListener('pointerleave', function () { if (!fechado) contar(); });
    t.addEventListener('focusin', pausar); t.addEventListener('focusout', function () { if (!fechado && !t.contains(document.activeElement)) contar(); });
    /* arrastar para o lado */
    t.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      var x0 = e.clientX, dx = 0;
      t.style.transition = 'none';
      function mover(ev) { dx = ev.clientX - x0; t.style.transform = 'translateX(' + dx + 'px)'; t.style.opacity = String(Math.max(0.2, 1 - Math.abs(dx) / 240)); }
      function soltar() {
        t.removeEventListener('pointermove', mover); t.removeEventListener('pointerup', soltar); t.removeEventListener('pointercancel', soltar);
        t.style.transition = '';
        if (Math.abs(dx) > 80) { t.style.transform = 'translateX(' + (dx > 0 ? 120 : -120) + '%)'; t.style.opacity = '0'; fechar(); }
        else { t.style.transform = ''; t.style.opacity = ''; }
      }
      try { t.setPointerCapture(e.pointerId); } catch (x) {}
      t.addEventListener('pointermove', mover); t.addEventListener('pointerup', soltar); t.addEventListener('pointercancel', soltar);
    });
    contar();
    return { fechar: fechar, elemento: t };
  }

  /* Subtelas (Configurações > Aparência): contêiner [data-od-telas] com filhos [data-od-tela="id"]; o primeiro é o inicial.
     data-od-ir="id" avança; data-od-voltar volta (com data-od-voltar-auto, some na tela inicial).
     O título com data-od-titulo-tela recebe o data-od-titulo da tela. Dentro de uma .tela-app, o botão Voltar
     do Android (ou do navegador) também volta. Funciona igual no painel de configurações do desktop. */
  var gruposComHistorico = [];
  function escopoDe(grupo) { return grupo.closest('.tela-app') || grupo; }
  function irPara(id, voltando) {
    var tela = document.querySelector('[data-od-tela="' + id + '"]'); if (!tela) return;
    var grupo = tela.closest('[data-od-telas]');
    var todas = grupo.querySelectorAll(':scope > [data-od-tela]');
    for (var i = 0; i < todas.length; i++) { todas[i].hidden = todas[i] !== tela; todas[i].classList.remove('tela-entrando', 'tela-voltando'); }
    void tela.offsetWidth; tela.classList.add(voltando ? 'tela-voltando' : 'tela-entrando');
    var rolagem = tela.closest('.tela-conteudo'); if (rolagem) rolagem.scrollTop = 0;
    var escopo = escopoDe(grupo);
    var t = tela.hasAttribute('data-od-titulo') ? tela : tela.querySelector('[data-od-titulo]');
    var alvoTitulo = escopo.querySelector('[data-od-titulo-tela]');
    if (t && alvoTitulo) alvoTitulo.textContent = t.getAttribute('data-od-titulo');
    var inicial = grupo.querySelector(':scope > [data-od-tela]') === tela;
    var voltar = escopo.querySelectorAll('[data-od-voltar-auto]');
    for (var j = 0; j < voltar.length; j++) voltar[j].hidden = inicial;
    grupo._odPilha = grupo._odPilha || [];
    if (inicial) grupo._odPilha = [];
  }
  function grupoDoBotao(b) {
    var g = b.closest('[data-od-telas]');
    if (g) return g;
    var app = b.closest('.tela-app, .menu-configuracoes');
    return app ? app.querySelector('[data-od-telas]') : null;
  }
  function voltarTela(g) { var anterior = g._odPilha.pop(); if (anterior) irPara(anterior, true); }
  document.addEventListener('click', function (e) {
    var alvo = e.target.closest ? e.target : e.target.parentElement;
    var ir = alvo.closest('[data-od-ir]');
    if (ir) {
      var id = ir.getAttribute('data-od-ir');
      var tela = document.querySelector('[data-od-tela="' + id + '"]'); if (!tela) return;
      var grupo = tela.closest('[data-od-telas]');
      var atual = grupo.querySelector(':scope > [data-od-tela]:not([hidden])');
      grupo._odPilha = grupo._odPilha || []; grupo._odPilha.push(atual ? atual.getAttribute('data-od-tela') : null);
      if (grupo.closest('.tela-app')) { gruposComHistorico.push(grupo); try { history.pushState({ odTela: id }, ''); } catch (x) {} }
      irPara(id, false); return;
    }
    var v = alvo.closest('[data-od-voltar]');
    if (v) {
      var g = grupoDoBotao(v);
      if (!g || !g._odPilha || !g._odPilha.length) return;
      if (gruposComHistorico.indexOf(g) >= 0) { try { history.back(); } catch (x) { voltarTela(g); } }
      else voltarTela(g);
    }
  });
  window.addEventListener('popstate', function () {
    var g = gruposComHistorico.pop();
    if (g && g._odPilha && g._odPilha.length) voltarTela(g);
  });
  document.addEventListener('DOMContentLoaded', function () {
    var grupos = document.querySelectorAll('[data-od-telas]');
    for (var i = 0; i < grupos.length; i++) { var p = grupos[i].querySelector(':scope > [data-od-tela]'); if (p) irPara(p.getAttribute('data-od-tela'), false); }
  });

  /* data-od-restaurar: volta a aparência ao padrão e oferece Desfazer num toast. */
  document.addEventListener('click', function (e) {
    var alvo = e.target.closest ? e.target : e.target.parentElement;
    if (!alvo.closest('[data-od-restaurar]')) return;
    var antes = copia();
    restaurar();
    toast({ texto: 'Aparência restaurada.', acao: { rotulo: 'Desfazer', ao: function () { definir(antes); } } });
  });

  function abrir(painel, botao) {
    var telas = painel.matches('[data-od-telas]') ? painel : painel.querySelector('[data-od-telas]');
    if (telas) { var p0 = telas.querySelector(':scope > [data-od-tela]'); if (p0) irPara(p0.getAttribute('data-od-tela'), false); }
    painel.hidden = false; painel._odBotao = botao;
    botao.setAttribute('aria-expanded', 'true');
    var foco = painel.querySelector('[aria-pressed="true"], button, a, input');
    if (foco) foco.focus();
  }
  function fechar(painel, devolverFoco) {
    painel.hidden = true;
    if (painel._odBotao) { painel._odBotao.setAttribute('aria-expanded', 'false'); if (devolverFoco) painel._odBotao.focus(); }
  }

  window.OpenDesign = { preferencias: copia, definir: definir, toast: toast, abrirDialogo: function (id) { abrirDialogo(typeof id === 'string' ? document.getElementById(id) : id); }, fecharDialogo: function (id, v) { fecharDialogo(typeof id === 'string' ? document.getElementById(id) : id, v); }, irPara: irPara, restaurar: restaurar };
  aplicar();
  document.addEventListener('DOMContentLoaded', marcar);
})();
