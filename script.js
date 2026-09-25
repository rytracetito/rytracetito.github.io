/* =========================================================
   TITO Amedée Rytrace — interactions du site
   Langue, thème, menu mobile, défilement, animations,
   copie de l'e-mail et fond animé du hero.
========================================================= */

(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Stockage local (protégé : navigation privée, cookies bloqués…) ---------- */
  function load(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }

  /* =========================================
     TEXTES DÉPENDANT DE LA LANGUE
  ========================================= */

  var TEXTS = {
    fr: {
      title: 'TITO Amedée Rytrace | Statistique, processus stochastiques & fiabilité',
      description: "TITO Amedée Rytrace | doctorant au LMAP (Université de Pau et des Pays de l'Adour) : tests d'adéquation pour les processus de dégradation Gamma et Wiener, avec ou sans maintenance imparfaite.",
      copied: 'Adresse copiée dans le presse-papiers',
      copyFailed: 'Copie impossible : ',
      menuOpen: 'Ouvrir le menu',
      menuClose: 'Fermer le menu',
      typer: [
        'modéliser la dégradation des systèmes',
        "tester l'adéquation des modèles aux données",
        'simuler des processus Gamma et Wiener',
        "quantifier l'effet d'une maintenance imparfaite",
        'prédire la durée de vie restante'
      ]
    },
    en: {
      title: 'TITO Amedée Rytrace | Statistics, stochastic processes & reliability',
      description: 'TITO Amedée Rytrace | PhD candidate at LMAP (University of Pau): goodness-of-fit tests for Gamma and Wiener degradation processes, with or without imperfect maintenance.',
      copied: 'Address copied to clipboard',
      copyFailed: 'Could not copy: ',
      menuOpen: 'Open menu',
      menuClose: 'Close menu',
      typer: [
        'modelling system degradation',
        'testing model fit against data',
        'simulating Gamma and Wiener processes',
        'quantifying imperfect maintenance',
        'predicting remaining useful life'
      ]
    }
  };

  function currentLang() {
    return root.lang === 'en' ? 'en' : 'fr';
  }

  /* =========================================
     LANGUE FR / EN
     Le texte français est écrit dans le HTML ;
     la traduction anglaise est dans data-en
     (ou data-en-html quand elle contient du HTML).
  ========================================= */

  function captureFrench() {
    document.querySelectorAll('[data-en]').forEach(function (el) {
      if (!el.hasAttribute('data-fr')) {
        el.setAttribute('data-fr', el.textContent.replace(/\s+/g, ' ').trim());
      }
    });
    document.querySelectorAll('[data-en-html]').forEach(function (el) {
      if (!el.hasAttribute('data-fr-html')) {
        el.setAttribute('data-fr-html', el.innerHTML.trim());
      }
    });
    document.querySelectorAll('[data-en-aria]').forEach(function (el) {
      if (!el.hasAttribute('data-fr-aria')) {
        el.setAttribute('data-fr-aria', el.getAttribute('aria-label') || '');
      }
    });
    document.querySelectorAll('[data-en-tip]').forEach(function (el) {
      if (!el.hasAttribute('data-fr-tip')) {
        el.setAttribute('data-fr-tip', el.getAttribute('data-tip') || '');
      }
    });
  }

  function setLang(lang) {
    root.lang = lang;

    document.querySelectorAll('[data-fr]').forEach(function (el) {
      var text = el.getAttribute('data-' + lang);
      if (text !== null) el.textContent = text;
    });
    document.querySelectorAll('[data-fr-html]').forEach(function (el) {
      var html = el.getAttribute('data-' + lang + '-html');
      if (html !== null) el.innerHTML = html;
    });
    document.querySelectorAll('[data-fr-aria]').forEach(function (el) {
      el.setAttribute('aria-label', el.getAttribute('data-' + lang + '-aria'));
    });
    document.querySelectorAll('[data-fr-tip]').forEach(function (el) {
      el.setAttribute('data-tip', el.getAttribute('data-' + lang + '-tip'));
    });

    document.querySelectorAll('.lang-toggle button').forEach(function (btn) {
      var active = btn.dataset.lang === lang;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active);
    });

    document.title = TEXTS[lang].title;
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', TEXTS[lang].description);

    save('site-lang', lang);
    document.dispatchEvent(new CustomEvent('site:lang', { detail: lang }));
  }

  /* =========================================
     THÈME CLAIR / SOMBRE
  ========================================= */

  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#f6f5f1' : '#0a0d14');
    save('site-theme', theme);
    document.dispatchEvent(new CustomEvent('site:theme', { detail: theme }));
  }

  /* =========================================
     MENU MOBILE
  ========================================= */

  function initMenu() {
    var burger = document.querySelector('.burger');
    var menu = document.getElementById('menu');
    if (!burger || !menu) return;

    function toggle(open) {
      menu.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open);
      burger.setAttribute('aria-label', open ? TEXTS[currentLang()].menuClose : TEXTS[currentLang()].menuOpen);
    }

    burger.addEventListener('click', function (e) {
      e.stopPropagation();
      toggle(!menu.classList.contains('open'));
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) toggle(false);
    });
    document.addEventListener('click', function (e) {
      if (menu.classList.contains('open') && !menu.contains(e.target)) toggle(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('open')) {
        toggle(false);
        burger.focus();
      }
    });
  }

  /* =========================================
     DÉFILEMENT : barre de progression,
     en-tête, bouton « haut de page »
  ========================================= */

  function initScroll() {
    var bar = document.querySelector('.progress span');
    var header = document.querySelector('header.topnav');
    var toTop = document.querySelector('.to-top');
    var ticking = false;

    function update() {
      var y = window.scrollY;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
      if (header) header.classList.toggle('scrolled', y > 10);
      if (toTop) toTop.classList.toggle('show', y > 900);
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });

    if (toTop) {
      toTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    }
    update();
  }

  /* =========================================
     SCROLL SPY — surligne la section active
  ========================================= */

  function initScrollSpy() {
    var links = document.querySelectorAll('nav.seclinks > a[href^="#"]');
    if (!links.length || !('IntersectionObserver' in window)) return;

    var byId = {};
    links.forEach(function (link) { byId[link.getAttribute('href').slice(1)] = link; });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        if (id !== 'hero' && !byId[id]) return; // section sans lien : on garde l'état
        links.forEach(function (link) { link.classList.toggle('active', link === byId[id]); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    document.querySelectorAll('main > section[id]').forEach(function (s) { observer.observe(s); });
  }

  /* =========================================
     APPARITION AU DÉFILEMENT + COMPTEURS
  ========================================= */

  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (reduceMotion || !target) return;
    var start = null;
    var duration = 1300;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    }
    el.textContent = '0';
    requestAnimationFrame(step);
  }

  function initReveal() {
    var selector = '.section-head, .card, .tl-item, .figure, .topic, .stat-tile, .mission, .about-text > p, .teach-text, .contact-card';
    var items = document.querySelectorAll(selector);

    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }

    items.forEach(function (el) {
      var siblings = Array.prototype.filter.call(el.parentElement.children, function (c) { return c.matches(selector); });
      var i = siblings.indexOf(el);
      el.style.setProperty('--d', (Math.min(i, 5) * 0.07) + 's');
      el.classList.add('reveal');
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add('in');
        el.querySelectorAll('[data-count]').forEach(animateCount);
        observer.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    items.forEach(function (el) { observer.observe(el); });
  }

  /* =========================================
     MACHINE À ÉCRIRE (hero)
  ========================================= */

  function initTyper() {
    var out = document.querySelector('.typer-text');
    if (!out) return;
    var timer = null;
    var run = 0;

    function start() {
      clearTimeout(timer);
      var phrases = TEXTS[currentLang()].typer;
      var myRun = ++run;

      if (reduceMotion) {
        out.textContent = phrases[0];
        return;
      }

      var p = 0, c = 0, deleting = false;
      (function tick() {
        if (myRun !== run) return;
        var phrase = phrases[p];
        if (!deleting) {
          c++;
          out.textContent = phrase.slice(0, c);
          if (c === phrase.length) { deleting = true; timer = setTimeout(tick, 2200); return; }
          timer = setTimeout(tick, 42 + Math.random() * 40);
        } else {
          c--;
          out.textContent = phrase.slice(0, c);
          if (c === 0) { deleting = false; p = (p + 1) % phrases.length; timer = setTimeout(tick, 350); return; }
          timer = setTimeout(tick, 22);
        }
      })();
    }

    document.addEventListener('site:lang', start);
    start();
  }

  /* =========================================
     COPIE DE L'E-MAIL + NOTIFICATION
  ========================================= */

  var toastTimer = null;
  function toast(message) {
    var el = document.querySelector('.toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  function initCopy() {
    document.querySelectorAll('.copy-email').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var email = btn.getAttribute('data-email');
        var t = TEXTS[currentLang()];
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(email).then(
            function () { toast(t.copied); },
            function () { toast(t.copyFailed + email); }
          );
        } else {
          var area = document.createElement('textarea');
          area.value = email;
          area.style.position = 'fixed';
          area.style.opacity = '0';
          document.body.appendChild(area);
          area.select();
          var ok = false;
          try { ok = document.execCommand('copy'); } catch (e) {}
          document.body.removeChild(area);
          toast(ok ? t.copied : t.copyFailed + email);
        }
      });
    });
  }

  /* =========================================
     HALO LUMINEUX QUI SUIT LA SOURIS (cartes)
  ========================================= */

  function initSpotlight() {
    if (!window.matchMedia('(hover: hover)').matches) return;
    document.addEventListener('pointermove', function (e) {
      var card = e.target.closest && e.target.closest('.card');
      if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  /* =========================================
     FOND DU HERO : trajectoires de dégradation
     (processus croissant à sauts, façon Gamma)
     qui montent vers un seuil de défaillance.
  ========================================= */

  function initHeroPaths() {
    var canvas = document.querySelector('.hero-paths');
    var hero = document.getElementById('hero');
    if (!canvas || !hero || !canvas.getContext) return;

    var ctx = canvas.getContext('2d');
    var W = 0, H = 0;
    var STEPS = 140;
    var DRAW_MS = 6000, HOLD_MS = 2600, FADE_MS = 1200;
    var paths = [];
    var colors = {};
    var t0 = 0;
    var raf = null;
    var visible = true;

    function readColors() {
      var cs = getComputedStyle(root);
      colors.a1 = cs.getPropertyValue('--accent1').trim();
      colors.a2 = cs.getPropertyValue('--accent2').trim();
      colors.a3 = cs.getPropertyValue('--accent3').trim();
      colors.light = root.getAttribute('data-theme') === 'light';
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function generate() {
      paths = [];
      var n = W < 700 ? 8 : 14;
      for (var i = 0; i < n; i++) {
        var rate = 0.55 + Math.random() * 0.9;
        var y = 0, pts = [0], cross = -1;
        for (var k = 1; k <= STEPS; k++) {
          if (Math.random() < 0.28) y += -Math.log(1 - Math.random()) * 0.016 * rate;
          y += 0.0016 * rate;
          pts.push(y);
          if (y >= 1) { cross = k; break; }
        }
        paths.push({ pts: pts, cross: cross, color: i % 3 === 2 ? 'a3' : (i % 2 ? 'a2' : 'a1') });
      }
    }

    // Niveau 0 en bas du hero, seuil (niveau 1) vers le haut
    function yOf(v) { return H * 0.8 - v * H * 0.6; }
    function xOf(k) { return (k / STEPS) * W; }

    function draw(progress, alpha) {
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = alpha;

      var thr = yOf(1);
      ctx.setLineDash([6, 8]);
      ctx.strokeStyle = colors.a3;
      ctx.globalAlpha = alpha * (colors.light ? 0.35 : 0.45);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, thr); ctx.lineTo(W, thr); ctx.stroke();
      ctx.setLineDash([]);

      var visibleSteps = progress * STEPS;
      paths.forEach(function (p) {
        var last = Math.min(Math.floor(visibleSteps), p.pts.length - 1);
        if (last < 1) return;
        ctx.globalAlpha = alpha * (colors.light ? 0.4 : 0.45);
        ctx.strokeStyle = colors[p.color];
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(xOf(0), yOf(p.pts[0]));
        for (var k = 1; k <= last; k++) {
          ctx.lineTo(xOf(k), yOf(p.pts[k - 1]));
          ctx.lineTo(xOf(k), yOf(p.pts[k]));
        }
        ctx.stroke();

        if (p.cross > 0 && visibleSteps >= p.cross) {
          var x = xOf(p.cross);
          ctx.globalAlpha = alpha * 0.9;
          ctx.fillStyle = colors.a3;
          ctx.shadowColor = colors.a3;
          ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.arc(x, thr, 3.2, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
      ctx.globalAlpha = 1;
    }

    function frame(now) {
      if (!t0) t0 = now;
      var t = now - t0;
      if (t < DRAW_MS) {
        draw(t / DRAW_MS, 1);
      } else if (t < DRAW_MS + HOLD_MS) {
        draw(1, 1);
      } else if (t < DRAW_MS + HOLD_MS + FADE_MS) {
        draw(1, 1 - (t - DRAW_MS - HOLD_MS) / FADE_MS);
      } else {
        generate();
        t0 = now;
      }
      raf = visible ? requestAnimationFrame(frame) : null;
    }

    function play() {
      if (reduceMotion) { draw(1, 1); return; }
      if (!raf && visible) raf = requestAnimationFrame(frame);
    }

    readColors();
    resize();
    generate();
    play();

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) play();
      }).observe(hero);
    }

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        resize();
        generate();
        if (reduceMotion) draw(1, 1);
      }, 150);
    });

    document.addEventListener('site:theme', function () {
      readColors();
      if (reduceMotion) draw(1, 1);
    });
  }

  /* =========================================
     INITIALISATION
  ========================================= */

  document.addEventListener('DOMContentLoaded', function () {
    captureFrench();

    var savedLang = load('site-lang');
    var browserLang = (navigator.language || 'fr').toLowerCase().indexOf('fr') === 0 ? 'fr' : 'en';
    setLang(savedLang || browserLang);

    setTheme(load('site-theme') || root.getAttribute('data-theme') || 'dark');

    document.querySelectorAll('.lang-toggle button').forEach(function (btn) {
      btn.addEventListener('click', function () { setLang(btn.dataset.lang); });
    });

    var themeButton = document.querySelector('.theme-toggle');
    if (themeButton) {
      themeButton.addEventListener('click', function () {
        setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
      });
    }

    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();

    initMenu();
    initScroll();
    initScrollSpy();
    initReveal();
    initTyper();
    initCopy();
    initSpotlight();
    initHeroPaths();
  });
})();
