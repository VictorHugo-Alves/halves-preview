/* HALVES · formulário "Fale com a gente" antes do WhatsApp.
   Mesma lógica e mesmo destino da página de halves.com.br (raiz):
   1. grava no CRM (Supabase, RPC capturar_lead) e, em paralelo, na planilha (Apps Script, backup);
   2. espera o CRM até 1,5 s; "Recebido!" só aparece se o CRM respondeu ok;
   3. abre o WhatsApp da HALVES com a mensagem pronta.
   Origem: o CRM e a planilha guardam a URL da página (p_pagina / Página), que aqui contém /v2/.
   A RPC não tem campo de origem que grave: p_formulario só liga regras com 'raio-x' e ignora o resto. */
(function () {
  'use strict';

  var CONFIG = {
    PLANILHA_URL: 'https://script.google.com/macros/s/AKfycbwT2uodnKqNECF2BlGBXm5ainAEwc0QAlnvf2QmZyL_yPo8vhHvCu9w6ogYeBodE_o/exec',
    WHATSAPP: '5521974455900',  // número da HALVES (21 97445-5900)
    /* CRM (Supabase). A chave publishable é pública por natureza: só executa a RPC capturar_lead. */
    SUPABASE_URL: 'https://yjmuwpkvoexunkjcafgv.supabase.co',
    SUPABASE_KEY: 'sb_publishable_evVh_bIikrP4SMP16OMmsw_5UqqDWLV',
    ENVIO_TIMEOUT_MS: 8000,     // prazo do fetch do CRM
    RPC_ESPERA_MS: 1500,        // quanto o WhatsApp espera a resposta do CRM antes de abrir
    /* seletor de país do WhatsApp: versão travada + hash de integridade (iguais aos da página atual) */
    ITI: 'https://cdn.jsdelivr.net/npm/intl-tel-input@29.5.3/dist',
    ITI_JS_SRI: 'sha384-1k5t9CQZrBJeWjMvg0TBTlVboAUK8rjnCB32B82h3uEU1PJjbPEvC9nLAZZPqDLl',
    ITI_CSS_SRI: 'sha384-khdvUrzJNN6Jw9yHboN6430RRijNf+nAlKcZv0a5IrkTjwZpwgJ9fzD3kjbqhOyZ'
  };

  var $ = function (id) { return document.getElementById(id); };
  var modal = $('formModal');
  if (!modal) return;
  var card = modal.querySelector('.fm-card');
  var form = $('leadForm');
  var tel = $('PHONE');
  var telMsg = $('tel-msg');
  var iti = null, itiCarga = null, quemAbriu = null;

  /* guarda as UTMs da chegada, mesmo se a pessoa navegar pela página antes de enviar */
  var UTM = (function () {
    var q = new URLSearchParams(location.search), o = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) { o[k] = q.get(k) || ''; });
    return o;
  })();

  /* ---- abrir e fechar ---- */
  function openForm(origem) {
    carregaTel();
    quemAbriu = origem || document.activeElement;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('fm-lock');
    setTimeout(function () { var n = $('FNAME'); if (n && !n.closest('[hidden]')) n.focus({ preventScroll: true }); }, 60);
  }
  function closeForm() {
    if (!modal.classList.contains('open')) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('fm-lock');
    if (quemAbriu && quemAbriu.focus) quemAbriu.focus({ preventScroll: true });
  }

  /* todo CTA de WhatsApp abre o formulário; sem JS, o href segue indo direto ao WhatsApp */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-open-form]');
    if (!a) return;
    e.preventDefault();
    openForm(a);
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-open-form]'), function (b) {
    b.addEventListener('pointerenter', carregaTel, { once: true });
    b.addEventListener('touchstart', carregaTel, { once: true, passive: true });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-close-form]'), function (b) {
    b.addEventListener('click', closeForm);
  });
  modal.addEventListener('click', function (e) { if (e.target === modal) closeForm(); });
  document.addEventListener('keydown', function (e) {
    if (!modal.classList.contains('open')) return;
    var dentro = card.contains(document.activeElement) || document.activeElement === document.body;
    if (e.key === 'Escape' && dentro && !e.defaultPrevented) { closeForm(); return; }
    if (e.key !== 'Tab' || !card.contains(document.activeElement)) return;
    /* foco preso no cartão enquanto ele está aberto */
    var f = Array.prototype.filter.call(card.querySelectorAll('a[href],button:not([disabled]),input:not([tabindex="-1"]),select'), function (el) {
      return el.offsetParent !== null;
    });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ---- telefone: intl-tel-input, CSS e JS só quando o formulário abre (ou o dedo chega no botão);
     o utils (validação e máscara por país, ~260 KB) só depois disso, sob demanda ---- */
  function carregaTel() {
    if (itiCarga) return itiCarga;
    /* já abre a conexão com o CRM: no envio sobra só a ida e volta da RPC */
    if (CONFIG.SUPABASE_URL && !$('pc-crm')) {
      var pc = document.createElement('link');
      pc.id = 'pc-crm'; pc.rel = 'preconnect'; pc.href = CONFIG.SUPABASE_URL; pc.crossOrigin = 'anonymous';
      document.head.appendChild(pc);
    }
    itiCarga = new Promise(function (ok, falha) {
      var css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = CONFIG.ITI + '/css/intlTelInput.min.css';
      css.integrity = CONFIG.ITI_CSS_SRI; css.crossOrigin = 'anonymous';
      document.head.appendChild(css);
      var js = document.createElement('script');
      js.src = CONFIG.ITI + '/js/intlTelInput.min.js';
      js.integrity = CONFIG.ITI_JS_SRI; js.crossOrigin = 'anonymous';
      js.onload = ok; js.onerror = falha;
      document.head.appendChild(js);
    }).then(iniciaTel).catch(function () { itiCarga = null; });
    return itiCarga;
  }
  function iniciaTel() {
    if (iti || !window.intlTelInput) return;
    iti = window.intlTelInput(tel, {
      initialCountry: 'br',
      separateDialCode: true,
      countryOrder: ['br', 'pt', 'us'],
      countryNameLocale: 'pt-BR',
      countryNameOverrides: { us: 'Estados Unidos (EUA)' },   /* quem busca "eua" acha */
      countrySearch: true,
      dropdownParent: document.body,   /* fora do cartão: o overflow do modal não corta a lista */
      formatAsYouType: true,
      placeholderNumberPolicy: 'AGGRESSIVE',
      placeholderNumberType: 'MOBILE',
      uiTranslations: {
        selectedCountryAriaLabel: 'País do WhatsApp: ${countryName} (${dialCode}). Trocar país',
        noCountrySelected: 'Escolha o país do WhatsApp',
        countryListAriaLabel: 'Lista de países',
        searchPlaceholder: 'Buscar país',
        clearSearchAriaLabel: 'Limpar busca',
        closeCountrySelectorAriaLabel: 'Fechar',
        searchEmptyState: 'Nenhum país com esse nome',
        searchSummaryAria: function (n) { return n === 1 ? '1 país encontrado' : n + ' países encontrados'; }
      },
      loadUtils: function () { return import(CONFIG.ITI + '/js/utils.js'); }
    });
    tel.addEventListener('countrychange', function () { setErr('f-tel', false); });
  }

  function paisAtual() { return iti ? ((iti.getSelectedCountry() || {}).iso2 || '') : 'br'; }

  /* Brasil: o +55 já está no seletor. Se a pessoa digitar ou colar o 55 de novo, ele sai.
     Só com 12 ou 13 dígitos: DDD 55 existe (RS), então "começa com 55" sozinho não basta. */
  function semDDI(d) { return paisAtual() === 'br' && d.length >= 12 && d.indexOf('55') === 0; }
  tel.addEventListener('keydown', function (e) {
    if (!iti || !/^[0-9]$/.test(e.key) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (this.selectionStart !== this.value.length) return;
    var novo = this.value.replace(/\D/g, '') + e.key;
    if (!semDDI(novo)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    iti.setNumber('+' + novo);
  });
  tel.addEventListener('paste', function (e) {
    if (!iti) return;
    var txt = (e.clipboardData && e.clipboardData.getData('text')) || '';
    var d = txt.replace(/\D/g, '');
    if (!d || this.value.replace(/\D/g, '')) return;
    if (semDDI(d) || /^\s*(\+|00)/.test(txt)) {
      e.preventDefault(); e.stopImmediatePropagation();
      iti.setNumber('+' + d.replace(/^00/, ''));
      this.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  tel.addEventListener('input', function () {
    if (paisAtual() !== 'br') return;
    var d = this.value.replace(/\D/g, '');
    if (semDDI(d)) {
      if (iti) { iti.setNumber('+' + d); return; }
      d = d.slice(2); this.value = d;
    }
    if (iti) return;
    /* sem a biblioteca (CDN fora): máscara brasileira */
    d = d.slice(0, 11);
    if (d.length === 0) { this.value = ''; return; }
    if (d.length <= 2) { this.value = '(' + d; return; }
    if (d.length <= 7) { this.value = '(' + d.slice(0, 2) + ') ' + d.slice(2); return; }
    this.value = '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  });

  /* devolve { e164, pais } ou { erro: 'texto' } */
  function leTelefone() {
    var d = tel.value.replace(/\D/g, '');
    var pais = paisAtual();
    if (!d) return { erro: 'Informe seu WhatsApp.' };
    if (iti && window.intlTelInput.utils) {
      if (iti.isValidNumber()) return { e164: iti.getNumber('E164'), pais: pais.toUpperCase() };
      var e = iti.getValidationError();
      if (e === 'TOO_SHORT') return { erro: pais === 'br' ? 'Faltou dígito. Confere o DDD e o número.' : 'Faltou dígito. Confere o número.' };
      if (e === 'TOO_LONG') return { erro: 'Sobrou dígito. Confere o número.' };
      return { erro: 'Esse número não bate com o país escolhido. Confere a bandeira e o número.' };
    }
    /* reserva, se o utils não carregou: regra simples por tamanho */
    if (pais === 'br') {
      if (d.length < 10 || d.length > 11) return { erro: 'Confere o DDD e o número.' };
      return { e164: '+55' + d, pais: 'BR' };
    }
    var dial = ((iti && iti.getSelectedCountry()) || {}).dialCode;
    if (!dial || d.length < 6 || d.length > 14) return { erro: 'Confere o número e o país escolhido.' };
    return { e164: '+' + dial + d, pais: pais.toUpperCase() };
  }

  function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }
  function setErr(id, on) {
    var g = $(id); g.classList.toggle('err', on);
    var campo = g.querySelector('input,select'); if (campo) campo.setAttribute('aria-invalid', on ? 'true' : 'false');
  }
  [['FNAME', 'f-nome'], ['EMAIL', 'f-email'], ['PHONE', 'f-tel'], ['PERFIL', 'f-perfil']].forEach(function (p) {
    $(p[0]).addEventListener('input', function () { setErr(p[1], false); });
    $(p[0]).addEventListener('change', function () { setErr(p[1], false); });
  });

  /* fetch com prazo: o lead nunca fica preso esperando servidor */
  function comPrazo(url, opts) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var t = ctrl ? setTimeout(function () { ctrl.abort(); }, CONFIG.ENVIO_TIMEOUT_MS) : null;
    if (ctrl) opts.signal = ctrl.signal;
    return fetch(url, opts).finally(function () { clearTimeout(t); });
  }
  function enviaCRM(d, site) {
    if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_KEY) return Promise.resolve(null);
    var corpo = {
      p_nome: d.nome, p_email: d.email, p_whatsapp: d.whatsapp, p_pais: d.pais, p_perfil: d.perfil,
      p_utm_source: d.utm_source, p_utm_medium: d.utm_medium, p_utm_campaign: d.utm_campaign,
      p_utm_content: d.utm_content, p_utm_term: d.utm_term,
      p_pagina: d.pagina, p_referrer: d.referrer, p_site: site
    };
    return comPrazo(CONFIG.SUPABASE_URL + '/rest/v1/rpc/capturar_lead', {
      method: 'POST', keepalive: true,
      headers: { 'apikey': CONFIG.SUPABASE_KEY, 'Authorization': 'Bearer ' + CONFIG.SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo)
    }).then(function (r) { return r.json(); }).catch(function () { return null; });
  }
  /* planilha (backup): sendBeacon é dispara e esquece, sobrevive à ida pro WhatsApp.
     Sem sendBeacon, ou se ele recusar, vai pelo fetch no-cors com keepalive, também sem esperar. */
  function enviaPlanilha(d) {
    if (!CONFIG.PLANILHA_URL) return;
    var corpo = JSON.stringify(d);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(CONFIG.PLANILHA_URL, new Blob([corpo], { type: 'text/plain;charset=utf-8' }))) return;
    } catch (err) {}
    try {
      fetch(CONFIG.PLANILHA_URL, { method: 'POST', mode: 'no-cors', keepalive: true,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: corpo }).catch(function () {});
    } catch (err) {}
  }

  var btn = $('cta'), btnTx = btn.querySelector('.btn-tx');
  var enviando = false;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (enviando) return;
    /* utils ainda chegando? espera até 3 s antes de validar o número */
    var pronto = (iti && !window.intlTelInput.utils && iti.promise)
      ? Promise.race([iti.promise.catch(function () {}), new Promise(function (r) { setTimeout(r, 3000); })])
      : Promise.resolve();
    btn.disabled = true;
    pronto.then(function () { btn.disabled = false; valida(); });
  });

  function valida() {
    var ok = true, primeiro = null;
    function falha(grupo, campo) { setErr(grupo, true); ok = false; if (!primeiro) primeiro = $(campo); }
    var nome = $('FNAME').value.trim().slice(0, 120);
    if (nome.length < 2) falha('f-nome', 'FNAME');
    if (!emailOk($('EMAIL').value)) falha('f-email', 'EMAIL');
    var t = leTelefone();
    if (t.erro) { telMsg.textContent = t.erro; falha('f-tel', 'PHONE'); }
    if (!$('PERFIL').value) falha('f-perfil', 'PERFIL');
    if (!ok) { if (primeiro) primeiro.focus(); return; }

    var perfil = $('PERFIL').value;
    var site = $('SITE').value;
    var dados = {
      nome: nome,
      email: $('EMAIL').value.trim().slice(0, 254),
      whatsapp: t.e164,
      pais: t.pais,
      perfil: perfil,
      pagina: location.href.split('#')[0].slice(0, 500),
      referrer: document.referrer.slice(0, 500)
    };
    for (var k in UTM) { dados[k] = UTM[k].slice(0, 200); }

    enviando = true;
    btn.disabled = true; btnTx.textContent = 'Enviando...';

    /* grava nos dois em paralelo. A planilha sai sem espera; o CRM a gente espera até 1,5 s.
       Passou disso, segue pro WhatsApp e o keepalive termina o envio (prazo total de 8 s). */
    if (!site) enviaPlanilha(dados);
    var crm = enviaCRM(dados, site);
    Promise.race([crm, new Promise(function (r) { setTimeout(function () { r(null); }, CONFIG.RPC_ESPERA_MS); })]).then(function (res) {
      var gravou = res && res.ok === true;
      form.hidden = true;
      $('fmOkT').hidden = !gravou;
      $('fmOkP').textContent = CONFIG.WHATSAPP ? 'Abrindo o WhatsApp pra gente continuar a conversa...' : 'Logo a gente te chama pra conversar.';
      $('fmOk').hidden = false;
      if (CONFIG.WHATSAPP) {
        var msg = 'Oi! Sou ' + nome + (perfil && perfil !== 'Outro' ? ', ' + perfil.toLowerCase() : '') + '. Vim pela página da HALVES e quero entender como funciona.';
        setTimeout(function () { location.href = 'https://wa.me/' + CONFIG.WHATSAPP + '?text=' + encodeURIComponent(msg); }, 120);
      }
    });
  }

  /* voltou do WhatsApp pelo "voltar" do navegador: a página reaparece fechada e pronta, sem reenviar nada */
  addEventListener('pageshow', function (e) {
    if (!e.persisted || !enviando) return;
    enviando = false;
    form.reset(); form.hidden = false; $('fmOk').hidden = true;
    btn.disabled = false; btnTx.textContent = 'Quero falar com a HALVES';
    closeForm();
  });
})();
