/* =========================================================
   Laboratoire interactif — simulation de processus de
   dégradation (Gamma ou Wiener), seuil de défaillance L
   et maintenance imparfaite de type ARD1.

   Temps de panne : T = inf{ t : X(t) >= L }
   ARD1 aux instants tau_k :
     X(tau_k+) = X(tau_k-) - rho * [X(tau_k-) - X(tau_{k-1}+)]
========================================================= */

(function () {
  'use strict';

  var H_PLOT = 4000;   // horizon affiché (heures)
  var DT_SHOW = 25;    // pas de temps des trajectoires dessinées (heures)
  var DT_MC = 50;      // pas de temps de la simulation Monte-Carlo (heures)
  var T_MAX = 20000;   // horizon maximal de la simulation Monte-Carlo
  var UNIT = 1000;     // les paramètres sont exprimés « par 1000 h »
  var N_SHOW = 18;     // trajectoires dessinées
  var N_MC = 800;      // systèmes simulés pour les statistiques
  var N_MC_FAST = 250; // pendant qu'on fait glisser un curseur

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  var form, canvas, ctx, histCanvas, hctx;
  var state = {};
  var seed = 20260325;
  var result = null;
  var colors = {};
  var animRaf = null;
  var progress = 0;

  /* ---------- Générateur pseudo-aléatoire reproductible ----------
     Chaque incrément (système i, pas k) a sa propre graine : quand on
     bouge un curseur, les trajectoires se déforment au lieu de sauter. */
  var rs = 0;
  function seedStream(a, b, c) {
    var h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35) ^ Math.imul(c + 0x27d4eb2f, 0x165667b1);
    h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
    h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
    rs = (h ^ (h >>> 16)) >>> 0;
  }
  function rand() {
    rs = (rs + 0x6d2b79f5) >>> 0;
    var t = rs;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  // Loi normale centrée réduite (Box–Muller)
  function randn() {
    var u = 1 - rand(), v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  // Loi Gamma(k, 1) — méthode de Marsaglia & Tsang (avec « boost » si k < 1)
  function rgamma(k) {
    if (k < 1) {
      var u0 = rand();
      return rgamma(k + 1) * Math.pow(u0, 1 / k);
    }
    var d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      var x, v;
      do { x = randn(); v = 1 + c * x; } while (v <= 0);
      v = v * v * v;
      var u = rand();
      if (u < 1 - 0.0331 * x * x * x * x) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }

  /* ---------- Lecture des paramètres ---------- */
  function readState() {
    var f = form.elements;
    state.model = f.model.value;
    state.alpha = +f.alpha.value;
    state.beta = +f.beta.value;
    state.mu = +f.mu.value;
    state.sigma = +f.sigma.value;
    state.L = +f.L.value;
    state.maint = f.maint.checked;
    state.tau = +f.tau.value;
    state.rho = +f.rho.value;
  }

  /* ---------- Simulation d'un système ----------
     stream : identifiant du flux aléatoire, DT : pas de temps (h) */
  function simulate(stream, i, record, DT) {
    var dt = DT / UNIT;
    var isGamma = state.model === 'gamma';
    var shape = state.alpha * dt, scale = state.beta;
    var drift = state.mu * dt, vol = state.sigma * Math.sqrt(dt);
    var L = state.L, rho = state.rho, tau = state.tau;
    var nextMaint = state.maint ? tau : Infinity;
    var x = 0, xAfterMaint = 0;
    var pts = record ? [0, 0] : null;   // tableau plat : t0, x0, t1, x1, …
    var steps = T_MAX / DT;

    for (var k = 1; k <= steps; k++) {
      seedStream(stream, i, k);
      var xPrev = x;
      x += isGamma ? scale * rgamma(shape) : drift + vol * randn();
      var t = k * DT;

      if (x >= L) {
        // instant de franchissement interpolé dans le pas
        var tc = t - DT + DT * (L - xPrev) / (x - xPrev);
        if (record && tc <= H_PLOT) pts.push(tc, L);
        return { T: tc, pts: pts };
      }
      if (record && t <= H_PLOT) pts.push(t, x);

      if (t >= nextMaint) {
        x -= rho * (x - xAfterMaint);
        xAfterMaint = x;
        nextMaint += tau;
        if (record && t <= H_PLOT) pts.push(t, x);
      }
    }
    return { T: Infinity, pts: pts };
  }

  function computePaths() {
    readState();
    var show = [];
    for (var i = 0; i < N_SHOW; i++) show.push(simulate(seed, i, true, DT_SHOW));
    result = result || {};
    result.show = show;
  }

  function computeTimes(n) {
    var times = new Float64Array(n);
    var stream = (seed ^ 0x5bd1e995) >>> 0;
    for (var i = 0; i < n; i++) times[i] = simulate(stream, i, false, DT_MC).T;
    times.sort();
    result.times = times;
  }

  /* ---------- Formatage ---------- */
  function lang() { return root.lang === 'en' ? 'en' : 'fr'; }
  function num(v, digits) {
    return new Intl.NumberFormat(lang() === 'en' ? 'en-GB' : 'fr-FR', {
      minimumFractionDigits: digits, maximumFractionDigits: digits
    }).format(v);
  }
  function hours(v) { return num(Math.round(v / 10) * 10, 0) + ' h'; }
  function percent(v) {
    return new Intl.NumberFormat(lang() === 'en' ? 'en-GB' : 'fr-FR', {
      style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1
    }).format(v);
  }

  var T = {
    fr: { theory: 'théorique : L/μ = ', lower: 'borne inf. (censure à 20 000 h)', none: 'Aucune panne avant 20 000 h' },
    en: { theory: 'theory: L/μ = ', lower: 'lower bound (censored at 20,000 h)', none: 'No failure before 20,000 h' }
  };

  /* ---------- Affichage des valeurs et statistiques ---------- */
  function updateOutputs() {
    var fmt = {
      alpha: function (v) { return num(v, 1); },
      beta: function (v) { return num(v, 2); },
      mu: function (v) { return num(v, 1); },
      sigma: function (v) { return num(v, 1); },
      L: function (v) { return num(v, 1); },
      tau: function (v) { return num(v, 0) + ' h'; },
      rho: function (v) { return num(v, 2); }
    };
    form.querySelectorAll('input[type="range"]').forEach(function (input) {
      var min = +input.min, max = +input.max, v = +input.value;
      input.style.setProperty('--p', ((v - min) / (max - min) * 100) + '%');
      var out = form.querySelector('output[data-for="' + input.name + '"]');
      if (out) out.textContent = fmt[input.name] ? fmt[input.name](v) : v;
    });
  }

  function updateStats() {
    var times = result.times, n = times.length;
    var failed = 0, sum = 0, aliveAtH = 0;
    for (var i = 0; i < n; i++) {
      if (isFinite(times[i])) { failed++; sum += times[i]; }
      if (times[i] > H_PLOT) aliveAtH++;
    }
    var censored = n - failed;
    var mttf = (sum + censored * T_MAX) / n;
    var median = times[Math.floor(n / 2)];
    var t = T[lang()];

    document.getElementById('st-mttf').textContent = (censored ? '≥ ' : '') + hours(mttf);
    document.getElementById('st-med').textContent = isFinite(median) ? hours(median) : '> ' + hours(T_MAX);
    document.getElementById('st-rel').textContent = percent(aliveAtH / n);

    var sub = document.getElementById('st-mttf-s');
    if (censored) sub.textContent = 'MTTF · ' + t.lower;
    else if (state.model === 'wiener' && !state.maint) sub.textContent = 'MTTF · ' + t.theory + hours(state.L / state.mu * UNIT);
    else sub.textContent = 'MTTF';
  }

  function updateFormula() {
    var html = state.model === 'gamma'
      ? '<span><i>X</i>(<i>t</i>) − <i>X</i>(<i>s</i>) ∼ Γ(<i>α</i>(<i>t</i> − <i>s</i>), <i>β</i>)</span>'
      : '<span><i>X</i>(<i>t</i>) = <i>μt</i> + <i>σB</i>(<i>t</i>)</span>';
    if (state.maint) {
      html += '<span class="small"><i>X</i>(<i>τ<sub>k</sub></i><sup>+</sup>) = <i>X</i>(<i>τ<sub>k</sub></i><sup>−</sup>) − <i>ρ</i>[<i>X</i>(<i>τ<sub>k</sub></i><sup>−</sup>) − <i>X</i>(<i>τ<sub>k−1</sub></i><sup>+</sup>)]</span>';
    }
    html += '<span class="small"><i>T</i> = inf{ <i>t</i> : <i>X</i>(<i>t</i>) ≥ <i>L</i> }</span>';
    form.querySelector('.lab-formula').innerHTML = html;
  }

  /* ---------- Couleurs (suivent le thème) ---------- */
  function hexToRgb(hex) {
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [139, 92, 246];
  }
  function mix(a, b, f) {
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * f) + ',' + Math.round(a[1] + (b[1] - a[1]) * f) + ',' + Math.round(a[2] + (b[2] - a[2]) * f) + ')';
  }
  function readColors() {
    var cs = getComputedStyle(root);
    function v(name) { return cs.getPropertyValue(name).trim(); }
    colors.a1 = hexToRgb(v('--accent1'));
    colors.a2 = hexToRgb(v('--accent2'));
    colors.a3 = v('--accent3');
    colors.ink = v('--ink');
    colors.soft = v('--ink-soft');
    colors.faint = v('--ink-faint');
    colors.rule = v('--rule');
  }

  /* ---------- Outils de dessin ---------- */
  function fitCanvas(c, context) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = c.clientWidth, h = c.clientHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, w, h);
    return { w: w, h: h };
  }
  function niceStep(range, target) {
    var raw = range / target;
    var p = Math.pow(10, Math.floor(Math.log10(raw)));
    var f = raw / p;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
  }

  /* ---------- Graphique des trajectoires ---------- */
  function drawPaths(p) {
    if (!result) return;
    var size = fitCanvas(canvas, ctx);
    var w = size.w, h = size.h;
    var m = { l: 40, r: 12, t: 12, b: 30 };
    var pw = w - m.l - m.r, ph = h - m.t - m.b;
    var L = state.L;
    var yMin = state.model === 'wiener' ? -0.25 * L : 0;
    var yMax = L * 1.22;
    function X(t) { return m.l + t / H_PLOT * pw; }
    function Y(v) { return m.t + (1 - (v - yMin) / (yMax - yMin)) * ph; }

    ctx.font = '11px "IBM Plex Mono", ui-monospace, monospace';
    ctx.lineWidth = 1;

    // Grille et graduations
    ctx.strokeStyle = colors.rule;
    ctx.fillStyle = colors.faint;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    var xStep = pw < 420 ? 2000 : 1000;
    for (var t = 0; t <= H_PLOT; t += xStep) {
      ctx.beginPath(); ctx.moveTo(X(t), m.t); ctx.lineTo(X(t), m.t + ph); ctx.stroke();
      var last = t + xStep > H_PLOT;
      ctx.textAlign = last ? 'right' : 'center';
      ctx.fillText(num(t, 0) + (last ? ' h' : ''), last ? X(t) + m.r : X(t), m.t + ph + 8);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    var yStep = niceStep(yMax - yMin, 5);
    for (var v = Math.ceil(yMin / yStep) * yStep; v <= yMax; v += yStep) {
      ctx.beginPath(); ctx.moveTo(m.l, Y(v)); ctx.lineTo(m.l + pw, Y(v)); ctx.stroke();
      ctx.fillText(num(v, yStep < 1 ? 1 : 0), m.l - 8, Y(v));
    }

    ctx.save();
    ctx.beginPath(); ctx.rect(m.l, m.t, pw, ph); ctx.clip();

    // Instants de maintenance
    if (state.maint) {
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = colors.soft;
      ctx.globalAlpha = 0.55;
      for (var tm = state.tau; tm < H_PLOT; tm += state.tau) {
        ctx.beginPath(); ctx.moveTo(X(tm), m.t); ctx.lineTo(X(tm), m.t + ph); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Seuil de défaillance
    ctx.setLineDash([7, 6]);
    ctx.strokeStyle = colors.a3;
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(m.l, Y(L)); ctx.lineTo(m.l + pw, Y(L)); ctx.stroke();
    ctx.setLineDash([]);

    // Trajectoires
    var tLimit = p * H_PLOT;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1.6;
    result.show.forEach(function (r, i) {
      var pts = r.pts;
      ctx.strokeStyle = mix(colors.a1, colors.a2, i / (N_SHOW - 1));
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(X(pts[0]), Y(pts[1]));
      for (var j = 2; j < pts.length; j += 2) {
        if (pts[j] > tLimit) {
          var t0 = pts[j - 2], v0 = pts[j - 1];
          var f = (tLimit - t0) / (pts[j] - t0);
          ctx.lineTo(X(tLimit), Y(v0 + f * (pts[j + 1] - v0)));
          break;
        }
        ctx.lineTo(X(pts[j]), Y(pts[j + 1]));
      }
      ctx.stroke();
    });

    // Points de défaillance
    ctx.globalAlpha = 1;
    ctx.fillStyle = colors.a3;
    ctx.shadowColor = colors.a3;
    ctx.shadowBlur = 10;
    result.show.forEach(function (r) {
      if (r.T <= H_PLOT && r.T <= tLimit) {
        ctx.beginPath(); ctx.arc(X(r.T), Y(L), 3.6, 0, Math.PI * 2); ctx.fill();
      }
    });
    ctx.shadowBlur = 0;
    ctx.restore();

    // Étiquette du seuil
    ctx.font = '600 12px "IBM Plex Mono", ui-monospace, monospace';
    ctx.fillStyle = colors.a3;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('L = ' + num(L, 1), m.l + 8, Y(L) - 5);
  }

  /* ---------- Histogramme des temps de panne ---------- */
  function drawHist() {
    if (!result) return;
    var size = fitCanvas(histCanvas, hctx);
    var w = size.w, h = size.h;
    var m = { l: 8, r: 8, t: 6, b: 22 };
    var pw = w - m.l - m.r, ph = h - m.t - m.b;
    var times = result.times;
    var finite = [];
    for (var i = 0; i < times.length; i++) if (isFinite(times[i])) finite.push(times[i]);

    hctx.font = '11px "IBM Plex Mono", ui-monospace, monospace';
    if (!finite.length) {
      hctx.fillStyle = colors.soft;
      hctx.textAlign = 'center';
      hctx.textBaseline = 'middle';
      hctx.fillText(T[lang()].none, w / 2, h / 2);
      return;
    }

    var q = finite[Math.floor(0.98 * (finite.length - 1))];
    var xMax = Math.min(T_MAX, Math.max(H_PLOT, Math.ceil(q * 1.05 / 1000) * 1000));
    var bins = pw < 420 ? 24 : 40;
    var counts = new Array(bins).fill(0);
    finite.forEach(function (t) {
      if (t < xMax) counts[Math.floor(t / xMax * bins)]++;
    });
    var cMax = Math.max.apply(null, counts) || 1;
    var bw = pw / bins;
    function X(t) { return m.l + t / xMax * pw; }

    var grad = hctx.createLinearGradient(0, m.t, 0, m.t + ph);
    grad.addColorStop(0, mix(colors.a1, colors.a2, 0.2));
    grad.addColorStop(1, mix(colors.a1, colors.a2, 0.9));
    hctx.fillStyle = grad;
    hctx.globalAlpha = 0.85;
    counts.forEach(function (c, k) {
      var bh = c / cMax * ph;
      if (bh > 0) hctx.fillRect(m.l + k * bw + 0.5, m.t + ph - bh, Math.max(bw - 1.5, 1), bh);
    });
    hctx.globalAlpha = 1;

    hctx.strokeStyle = colors.rule;
    hctx.beginPath(); hctx.moveTo(m.l, m.t + ph + 0.5); hctx.lineTo(m.l + pw, m.t + ph + 0.5); hctx.stroke();

    // Horizon du graphique (4000 h)
    if (xMax > H_PLOT) {
      hctx.setLineDash([4, 4]);
      hctx.strokeStyle = colors.a3;
      hctx.beginPath(); hctx.moveTo(X(H_PLOT), m.t); hctx.lineTo(X(H_PLOT), m.t + ph); hctx.stroke();
      hctx.setLineDash([]);
    }

    hctx.fillStyle = colors.faint;
    hctx.textBaseline = 'top';
    [0, xMax / 2, xMax].forEach(function (t, k) {
      hctx.textAlign = k === 0 ? 'left' : k === 2 ? 'right' : 'center';
      hctx.fillText(num(t, 0) + ' h', X(t), m.t + ph + 6);
    });
  }

  /* ---------- Rendu et animation ---------- */
  function render(animate) {
    if (animRaf) { cancelAnimationFrame(animRaf); animRaf = null; }
    drawHist();
    if (!animate || reduceMotion) {
      progress = 1;
      drawPaths(1);
      return;
    }
    var start = null;
    function frame(now) {
      if (start === null) start = now;
      var k = Math.min((now - start) / 1500, 1);
      progress = 1 - Math.pow(1 - k, 3);
      drawPaths(progress);
      animRaf = k < 1 ? requestAnimationFrame(frame) : null;
    }
    animRaf = requestAnimationFrame(frame);
  }

  /* Pendant le glissement d'un curseur : trajectoires + petit échantillon.
     Dès que l'utilisateur s'arrête : échantillon complet. */
  var pending = false, pendingAnimate = false, fullTimer = null;
  function refresh(animate) {
    pendingAnimate = pendingAnimate || !!animate;
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () {
      pending = false;
      updateOutputs();
      computePaths();
      computeTimes(N_MC_FAST);
      updateStats();
      updateFormula();
      render(pendingAnimate);
      pendingAnimate = false;

      clearTimeout(fullTimer);
      fullTimer = setTimeout(function () {
        computeTimes(N_MC);
        updateStats();
        drawHist();
      }, 180);
    });
  }

  function syncVisibility() {
    var f = form.elements;
    var model = f.model.value;
    form.querySelectorAll('.lab-group[data-model]').forEach(function (g) {
      g.hidden = g.getAttribute('data-model') !== model;
    });
    form.querySelector('.lab-maint').hidden = !f.maint.checked;
    var lg = document.querySelector('.lg-maint-wrap');
    if (lg) lg.hidden = !f.maint.checked;
  }

  /* ---------- Initialisation ---------- */
  function init() {
    form = document.querySelector('.lab-controls');
    canvas = document.getElementById('lab-paths');
    histCanvas = document.getElementById('lab-hist');
    if (!form || !canvas || !histCanvas || !canvas.getContext) return;
    ctx = canvas.getContext('2d');
    hctx = histCanvas.getContext('2d');

    readColors();
    syncVisibility();
    updateOutputs();
    computePaths();
    computeTimes(N_MC);
    updateStats();
    updateFormula();
    progress = 0;
    drawPaths(0);
    drawHist();

    form.addEventListener('input', function (e) {
      if (e.target.name === 'model' || e.target.name === 'maint') {
        syncVisibility();
        refresh(true);
      } else {
        refresh(false);
      }
    });

    form.querySelector('.lab-reseed').addEventListener('click', function () {
      seed = (Math.random() * 4294967296) >>> 0;
      refresh(true);
    });

    document.addEventListener('site:theme', function () {
      readColors();
      drawHist();
      drawPaths(progress);
    });
    document.addEventListener('site:lang', function () {
      updateOutputs();
      updateStats();
      drawHist();
      drawPaths(progress);
    });

    if ('ResizeObserver' in window) {
      var rt;
      new ResizeObserver(function () {
        clearTimeout(rt);
        rt = setTimeout(function () { drawHist(); drawPaths(progress); }, 60);
      }).observe(canvas);
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { drawHist(); drawPaths(progress); });
    }

    // Les trajectoires se dessinent quand le laboratoire apparaît à l'écran
    if ('IntersectionObserver' in window && !reduceMotion) {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          render(true);
          io.disconnect();
        }
      }, { threshold: 0.35 });
      io.observe(canvas);
    } else {
      render(false);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
