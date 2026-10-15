/* HALVES · estudo Growlio. JS próprio, sem biblioteca. */
(function () {
  'use strict';
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var vh = innerHeight, vw = innerWidth;

  /* ---------- quebra de palavras (títulos e frase grande) ---------- */
  function splitWords(el) {
    var n = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          var parts = ch.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'w';
            var inner = document.createElement('span'); inner.textContent = p;
            w.style.setProperty('--i', n++);
            w.appendChild(inner); frag.appendChild(w);
          });
          node.replaceChild(frag, ch);
        } else if (ch.nodeType === 1) walk(ch);
      });
    })(el);
  }
  $$('.split, .scrub').forEach(splitWords);

  /* ---------- aparecer ao rolar ---------- */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -12% 0px' });
  $$('.rv, .split, .pcard, .scard').forEach(function (el) { io.observe(el); });

  /* ---------- faixas que correm: duplica o conteúdo ---------- */
  $$('.marquee').forEach(function (m) {
    var t = $('.marquee-track', m);
    var c = t.cloneNode(true); c.setAttribute('aria-hidden', 'true'); m.appendChild(c);
  });

  /* ---------- mini calendários do cartão 01 ---------- */
  $$('.mgrid').forEach(function (g, gi) {
    var full = g.parentNode.classList.contains('full');
    var fill = [0,1,2,3,4,7,8,9,10,11,14,15,16,17,18,21,22,23,24,25,28,29];
    for (var i = 0; i < 35; i++) {
      var c = document.createElement('i');
      if (full && fill.indexOf(i) > -1) { c.className = 'f'; c.style.setProperty('--k', i); }
      g.appendChild(c);
    }
  });

  /* ---------- fita de ícones do topo, correndo numa curva ---------- */
  var ribbon = $('#ribbon');
  var R = { tiles: [], path: null, len: 0, off: 0, on: true, w: 0, h: 0, gap: 0 };
  var ICONS = ['i-halves', 'i-wpp', 'i-scale', 'i-chat', 'i-calc', 'i-cal', 'i-halves', 'i-phone', 'i-check', 'i-door', 'i-case', 'i-clock'];
  var NS = 'http://www.w3.org/2000/svg';
  function buildRibbon() {
    ribbon.innerHTML = '';
    var w = ribbon.clientWidth, h = ribbon.clientHeight;
    var tile = vw >= 1100 ? 72 : vw >= 768 ? 62 : 46;
    R.w = w; R.h = h; R.gap = tile + (vw >= 768 ? 14 : 10);
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'track'); svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    var y0 = vw >= 768 ? 0.92 : 0.70; /* no celular a faixa é baixa: a ponta esquerda sobe para não cortar */
    var d = 'M ' + (-tile * 2) + ' ' + (h * y0) +
      ' C ' + (w * 0.30) + ' ' + (h * 0.98) + ', ' + (w * 0.52) + ' ' + (h * 0.62) + ', ' + (w * 0.70) + ' ' + (h * 0.40) +
      ' S ' + (w * 0.92) + ' ' + (h * 0.02) + ', ' + (w + tile * 2) + ' ' + (h * 0.04);
    var band = document.createElementNS(NS, 'path');
    band.setAttribute('d', d); band.setAttribute('fill', 'none');
    band.setAttribute('stroke', 'rgba(42,14,22,.07)'); band.setAttribute('stroke-width', tile + 22);
    svg.appendChild(band); ribbon.appendChild(svg);
    R.path = band; R.len = band.getTotalLength();
    var count = Math.ceil(R.len / R.gap);
    R.tiles = [];
    for (var i = 0; i < count; i++) {
      var el = document.createElement('div');
      el.className = 'tile t' + (i % 3);
      el.innerHTML = '<svg aria-hidden="true"><use href="#' + ICONS[i % ICONS.length] + '"/></svg>';
      ribbon.appendChild(el); R.tiles.push(el);
    }
    placeRibbon();
  }
  function placeRibbon() {
    var L = R.tiles.length * R.gap;
    for (var i = 0; i < R.tiles.length; i++) {
      var s = ((R.off + i * R.gap) % L + L) % L;
      if (s > R.len) { R.tiles[i].style.visibility = 'hidden'; continue; }
      R.tiles[i].style.visibility = '';
      var p = R.path.getPointAtLength(s), q = R.path.getPointAtLength(Math.min(R.len, s + 2));
      var a = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
      R.tiles[i].style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px) rotate(' + a.toFixed(1) + 'deg)';
    }
  }
  if (ribbon) {
    buildRibbon();
    new IntersectionObserver(function (es) { R.on = es[0].isIntersecting; }).observe(ribbon);
    if (!RM) {
      var last = performance.now();
      (function tick(t) {
        var dt = Math.min(50, t - last); last = t;
        if (R.on && !document.hidden) { R.off += dt * (vw >= 768 ? 0.06 : 0.045); placeRibbon(); }
        requestAnimationFrame(tick);
      })(last);
    }
  }

  /* ---------- passo a passo fixo ---------- */
  var proc = $('.proc'), step = -1;
  var navLis = $$('.proc-nav li'), pvs = $$('.pv'), pts = $$('.pt');
  var bar = $('.proc-bar');
  var typeEl = $('.srch-t'), typeTimer = null;
  function typeIt() {
    clearInterval(typeTimer);
    var full = typeEl.getAttribute('data-type'), k = 0;
    if (RM) { typeEl.textContent = full; return; }
    typeEl.textContent = '';
    typeTimer = setInterval(function () {
      k++; typeEl.textContent = full.slice(0, k);
      if (k >= full.length) clearInterval(typeTimer);
    }, 45);
  }
  function setStep(i) {
    if (i === step) return;
    step = i;
    navLis.forEach(function (li, j) { li.classList.toggle('on', j === i); });
    pts.forEach(function (p, j) { p.classList.toggle('on', j === i); });
    pvs.forEach(function (p, j) {
      p.classList.toggle('on', j === i);
      p.classList.remove('go');
    });
    var cur = pvs[i];
    void cur.offsetWidth;
    cur.classList.add('go');
    if (i === 0) typeIt();
  }
  $$('.proc-nav button').forEach(function (b) {
    b.addEventListener('click', function () {
      var i = +b.getAttribute('data-step');
      var top = proc.getBoundingClientRect().top + scrollY;
      var span = proc.offsetHeight - vh;
      scrollTo({ top: top + span * (i + 0.5) / 4, behavior: RM ? 'auto' : 'smooth' });
    });
  });

  /* ---------- cartões que empilham, sociedade, parallax ---------- */
  var cards = $$('.scard');
  cards.forEach(function (c, i) { c.style.setProperty('--i', i); });
  var soc = $('.soc'), hl = $('.soc-h.hl'), hr = $('.soc-h.hr');
  var lblL = $('.soc-label.l'), lblR = $('.soc-label.r'), socFoot = $('.soc-foot');
  var stmt = $('.statement'), stmtW = stmt ? $$('.w', stmt) : [];

  function progress(el) {
    var r = el.getBoundingClientRect();
    var span = el.offsetHeight - vh;
    return span > 0 ? clamp(-r.top / span, 0, 1) : (r.top < 0 ? 1 : 0);
  }

  function onScroll() {
    /* passo a passo */
    if (proc) {
      var p = progress(proc);
      bar.style.setProperty('--p', p.toFixed(3));
      setStep(Math.min(3, Math.floor(p * 4)));
    }
    /* cartões: o de baixo encolhe um pouco quando o próximo chega */
    for (var i = 0; i < cards.length - 1; i++) {
      var nx = cards[i + 1].getBoundingClientRect().top;
      var me = cards[i].getBoundingClientRect().top;
      var t = clamp(1 - (nx - me) / (vh * 0.7), 0, 1);
      cards[i].style.transform = RM ? '' : 'scale(' + (1 - t * 0.05).toFixed(4) + ')';
    }
    /* sociedade: as duas metades se encaixam */
    if (soc) {
      var sp = RM ? 1 : progress(soc);
      var j = clamp(sp / 0.7, 0, 1);
      var e = 1 - Math.pow(1 - j, 3);
      var dx = (1 - e) * Math.min(vw * 0.36, 520);
      hl.style.transform = 'translateX(' + (-dx).toFixed(1) + 'px) rotate(' + ((1 - e) * -14).toFixed(2) + 'deg)';
      hr.style.transform = 'translateX(' + dx.toFixed(1) + 'px) rotate(' + ((1 - e) * 14).toFixed(2) + 'deg)';
      lblL.classList.toggle('on', sp > 0.12);
      lblR.classList.toggle('on', sp > 0.42);
      socFoot.classList.toggle('on', sp > 0.72);
    }
    if (RM) return;
    /* frase grande acende palavra por palavra */
    if (stmt) {
      var rs = stmt.getBoundingClientRect();
      var f = clamp((vh * 0.85 - rs.top) / (rs.height + vh * 0.35), 0, 1);
      var lit = Math.round(f * stmtW.length);
      for (var m = 0; m < stmtW.length; m++) stmtW[m].classList.toggle('lit', m < lit);
    }
  }
  var ticking = false;
  addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; onScroll(); }); }
  }, { passive: true });
  var rzT;
  addEventListener('resize', function () {
    clearTimeout(rzT);
    rzT = setTimeout(function () {
      if (innerWidth !== vw) { vw = innerWidth; if (ribbon) buildRibbon(); }
      vh = innerHeight; onScroll();
    }, 150);
  });
  onScroll();

  /* ---------- perguntas: lista à esquerda, resposta à direita ---------- */
  var faqLis = $$('.faq-q li'), faqAns = $('.faq-ans'), faqT = $('#faqT'), faqP = $('#faqP');
  function openFaq(i, anim) {
    faqLis.forEach(function (li, j) {
      li.classList.toggle('on', j === i);
      $('button', li).setAttribute('aria-expanded', j === i ? 'true' : 'false');
    });
    var li = faqLis[i];
    faqAns.classList.remove('vazio');
    var set = function () { faqT.textContent = $('button', li).textContent; faqP.textContent = $('.faq-a', li).textContent; };
    if (!anim || RM) { set(); return; }
    faqAns.classList.add('swap');
    setTimeout(function () { set(); faqAns.classList.remove('swap'); }, 220);
  }
  faqLis.forEach(function (li, i) {
    $('button', li).addEventListener('click', function () {
      if (li.classList.contains('on') && innerWidth < 768) { li.classList.remove('on'); $('button', li).setAttribute('aria-expanded', 'false'); return; }
      openFaq(i, true);
    });
  });
  /* todas as perguntas começam fechadas */

  /* ---------- CTA final: ícones fogem do mouse, metades seguem o cursor ---------- */
  var fls = $$('.fl'), eyes = $$('.eye');
  if (!RM && matchMedia('(pointer:fine)').matches) {
    addEventListener('pointermove', function (ev) {
      var cx = ev.clientX / vw - 0.5, cy = ev.clientY / vh - 0.5;
      fls.forEach(function (f, i) {
        var depth = 14 + (i % 3) * 10;
        f.style.setProperty('--mx', (cx * -depth).toFixed(1) + 'px');
        f.style.setProperty('--my', (cy * -depth).toFixed(1) + 'px');
      });
      eyes.forEach(function (e) {
        var r = e.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var ex = r.left + r.width / 2, ey = r.top + r.height / 2;
        var ang = Math.atan2(ev.clientY - ey, ev.clientX - ex);
        var dist = Math.min(1, Math.hypot(ev.clientX - ex, ev.clientY - ey) / 600);
        var m = 22 * dist;
        e.style.transform = 'translate(' + (Math.cos(ang) * m).toFixed(1) + 'px,' + (Math.sin(ang) * m).toFixed(1) + 'px) rotate(' + (Math.cos(ang) * 4 * dist).toFixed(2) + 'deg)';
      });
    }, { passive: true });
  }
})();
