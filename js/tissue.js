/*
 * Wound-closure simulation for the hero.
 *
 * Tissue is a grid of cells. Each step, an empty site next to living tissue
 * fills with a probability proportional to how many living neighbours it has
 * (an Eden-style growth model), so the wound edge advances inward and smooths
 * out as it goes. Open sites that touch tissue are drawn as a segmentation
 * outline, and the readout estimates time to closure from the recent rate.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('tissue');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d', { alpha: false });

  var els = {
    area: document.getElementById('r-area'),
    rate: document.getElementById('r-rate'),
    eta: document.getElementById('r-eta'),
    status: document.getElementById('r-status'),
    toggle: document.getElementById('sim-toggle')
  };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var darkScheme = window.matchMedia('(prefers-color-scheme: dark)');

  var STEP_MS = 50;          // 20 simulation steps per second
  var GROWTH = 0.1;          // division probability per step with 8 living neighbours
  var MATURE = 160;          // steps for new tissue to reach its mature colour
  var BUCKETS = 6;           // colour steps between new and mature tissue
  var HOLD_CLOSED = 2.2;     // seconds to show a closed wound before opening another

  var cols = 0, rows = 0, cell = 7, cssW = 0, cssH = 0, total = 0;
  var alive, age, nuc, shade, dirty;
  var dirtyList = [];
  var palette = null;
  var openCount = 0;
  var simTime = 0;
  var history = [];
  var closedAt = -1;
  var userPaused = reduceMotion.matches;
  var inView = true;
  var rafId = 0, lastTime = 0, acc = 0, lastReadout = 0;
  var dragging = false, lastCarve = null;

  /* ---------- colour ---------- */

  function hexToRgb(hex) {
    hex = hex.trim().replace('#', '');
    if (hex.length === 3) hex = hex.replace(/./g, '$&$&');
    var n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) {
    return 'rgb(' +
      Math.round(a[0] + (b[0] - a[0]) * t) + ',' +
      Math.round(a[1] + (b[1] - a[1]) * t) + ',' +
      Math.round(a[2] + (b[2] - a[2]) * t) + ')';
  }

  function readPalette() {
    var cs = getComputedStyle(canvas);
    var get = function (name) { return cs.getPropertyValue(name) || '#000'; };
    var tissue = ['--t1', '--t2', '--t3', '--t4'].map(function (v) { return hexToRgb(get(v)); });
    var fresh = hexToRgb(get('--t-new'));
    var young = tissue.map(function (mature) {
      var list = [];
      for (var b = 0; b < BUCKETS; b++) list.push(mix(fresh, mature, b / BUCKETS));
      return list;
    });
    palette = {
      tissue: tissue.map(function (c) { return mix(c, c, 0); }),
      young: young,
      nuc: get('--nuc').trim(),
      bed: get('--bed').trim(),
      edge: get('--edge').trim()
    };
  }

  function bucket(a) {
    var b = (a * BUCKETS / MATURE) | 0;
    return b >= BUCKETS ? BUCKETS - 1 : b;
  }

  /* ---------- grid ---------- */

  function setup() {
    var rect = canvas.getBoundingClientRect();
    cssW = Math.max(1, Math.round(rect.width));
    cssH = Math.max(1, Math.round(rect.height));
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cell = cssW < 600 ? 6 : 7;
    cols = Math.ceil(cssW / cell);
    rows = Math.ceil(cssH / cell);
    total = cols * rows;

    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    alive = new Uint8Array(total).fill(1);
    age = new Uint16Array(total).fill(MATURE);
    nuc = new Uint8Array(total);
    shade = new Uint8Array(total);
    dirty = new Uint8Array(total);
    dirtyList = [];
    openCount = 0;

    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var i = y * cols + x;
        // banded, fibrous variation in stain density
        var n = Math.sin(x * 0.085 + Math.sin(y * 0.06) * 2.4) +
                Math.sin((x * 0.6 + y) * 0.045) * 0.7 +
                (Math.random() - 0.5) * 1.2;
        var s = Math.floor((n + 2.3) / 4.6 * 4);
        shade[i] = s < 0 ? 0 : s > 3 ? 3 : s;
        nuc[i] = Math.random() < 0.3 ? 1 + ((Math.random() * 4) | 0) : 0;
      }
    }

    openRandomWound(true);
    drawAll();
    resetHistory();
    updateReadout();
  }

  function idx(x, y) { return y * cols + x; }

  function mark(i) {
    if (!dirty[i]) { dirty[i] = 1; dirtyList.push(i); }
  }

  function markAround(i) {
    var x = i % cols, y = (i / cols) | 0;
    for (var dy = -1; dy <= 1; dy++) {
      var yy = y + dy;
      if (yy < 0 || yy >= rows) continue;
      for (var dx = -1; dx <= 1; dx++) {
        var xx = x + dx;
        if (xx < 0 || xx >= cols) continue;
        mark(yy * cols + xx);
      }
    }
  }

  function kill(i) {
    if (alive[i]) {
      alive[i] = 0;
      openCount++;
      markAround(i);
    }
  }

  // An irregular, slightly elongated blob, like a pressure injury seen from above.
  function openWound(cx, cy, R, stretch) {
    var p1 = Math.random() * 6.283, p2 = Math.random() * 6.283, p3 = Math.random() * 6.283;
    var sx = stretch || 1;
    var rot = (Math.random() - 0.5) * 0.9;
    var c = Math.cos(rot), s = Math.sin(rot);
    var reach = Math.ceil(R * sx * 1.45) + 2;
    var y0 = Math.max(0, Math.floor(cy - reach)), y1 = Math.min(rows, Math.ceil(cy + reach));
    var x0 = Math.max(0, Math.floor(cx - reach)), x1 = Math.min(cols, Math.ceil(cx + reach));
    for (var y = y0; y < y1; y++) {
      for (var x = x0; x < x1; x++) {
        var dx = x - cx, dy = y - cy;
        var u = (dx * c + dy * s) / sx;
        var v = -dx * s + dy * c;
        var th = Math.atan2(v, u);
        var r = R * (1 + 0.22 * Math.sin(2 * th + p1) + 0.12 * Math.sin(3 * th + p2) + 0.07 * Math.sin(5 * th + p3));
        r *= 0.93 + Math.random() * 0.14;
        if (u * u + v * v < r * r) kill(idx(x, y));
      }
    }
  }

  function openRandomWound(first) {
    var R = Math.max(7, Math.min(rows * 0.34, cols * (cols < 90 ? 0.19 : 0.16)));
    var cx = cols * (first ? 0.5 + (Math.random() - 0.5) * 0.25 : 0.22 + Math.random() * 0.56);
    var cy = rows * (0.42 + Math.random() * 0.16);
    var stretch = Math.min(2.1, Math.max(1.2, cols / rows * 0.55));
    openWound(cx, cy, R, stretch);
  }

  /* ---------- simulation ---------- */

  function stepSim() {
    var births = [];
    for (var i = 0; i < total; i++) {
      if (alive[i]) {
        if (age[i] < MATURE) {
          var before = bucket(age[i]);
          age[i]++;
          if (age[i] >= MATURE || bucket(age[i]) !== before) mark(i);
        }
        continue;
      }
      var x = i % cols, y = (i / cols) | 0, n = 0;
      var up = y > 0, down = y < rows - 1, left = x > 0, right = x < cols - 1;
      if (up) { n += alive[i - cols]; if (left) n += alive[i - cols - 1]; if (right) n += alive[i - cols + 1]; }
      if (down) { n += alive[i + cols]; if (left) n += alive[i + cols - 1]; if (right) n += alive[i + cols + 1]; }
      if (left) n += alive[i - 1];
      if (right) n += alive[i + 1];
      if (n && Math.random() < GROWTH * n / 8) births.push(i);
    }
    for (var k = 0; k < births.length; k++) {
      var j = births[k];
      alive[j] = 1;
      age[j] = 0;
      openCount--;
      markAround(j);
    }
    simTime += STEP_MS / 1000;

    if (openCount === 0) {
      if (closedAt < 0) closedAt = simTime;
      else if (simTime - closedAt > HOLD_CLOSED) {
        openRandomWound(false);
        resetHistory();
      }
    }
  }

  function resetHistory() {
    history = [];
    closedAt = openCount === 0 ? simTime : -1;
  }

  /* ---------- drawing ---------- */

  function isEdge(i) {
    var x = i % cols, y = (i / cols) | 0;
    return (y > 0 && alive[i - cols]) || (y < rows - 1 && alive[i + cols]) ||
           (x > 0 && alive[i - 1]) || (x < cols - 1 && alive[i + 1]);
  }

  function drawCell(i) {
    var x = i % cols, y = (i / cols) | 0;
    var px = x * cell, py = y * cell;
    if (alive[i]) {
      ctx.fillStyle = age[i] >= MATURE ? palette.tissue[shade[i]] : palette.young[shade[i]][bucket(age[i])];
      ctx.fillRect(px, py, cell, cell);
      var v = nuc[i];
      if (v) {
        var ox = (v === 1 || v === 3) ? -0.12 : 0.12;
        var oy = (v <= 2) ? -0.1 : 0.1;
        ctx.fillStyle = palette.nuc;
        ctx.beginPath();
        ctx.ellipse(px + cell * (0.5 + ox), py + cell * (0.5 + oy), cell * 0.3, cell * 0.21, v * 0.8, 0, 6.2832);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = palette.bed;
      ctx.fillRect(px, py, cell, cell);
      if (isEdge(i)) {
        ctx.fillStyle = palette.edge;
        var m = cell * 0.27;
        ctx.fillRect(px + m, py + m, cell - 2 * m, cell - 2 * m);
      }
    }
  }

  function drawAll() {
    ctx.fillStyle = palette.bed;
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.globalAlpha = 1;
    for (var i = 0; i < total; i++) drawCell(i);
    for (var k = 0; k < dirtyList.length; k++) dirty[dirtyList[k]] = 0;
    dirtyList = [];
  }

  function flush() {
    for (var k = 0; k < dirtyList.length; k++) {
      var i = dirtyList[k];
      dirty[i] = 0;
      drawCell(i);
    }
    dirtyList = [];
  }

  /* ---------- readout ---------- */

  function updateReadout() {
    var frac = total ? openCount / total : 0;
    history.push([simTime, frac]);
    while (history.length > 2 && simTime - history[0][0] > 2.5) history.shift();

    var rate = 0;
    if (history.length > 1) {
      var a = history[0], b = history[history.length - 1];
      if (b[0] > a[0]) rate = (a[1] - b[1]) / (b[0] - a[0]);
    }
    if (rate < 0) rate = 0;

    els.area.textContent = (frac * 100).toFixed(1);
    els.rate.textContent = (rate * 100).toFixed(2);

    if (openCount === 0) {
      els.eta.textContent = 'closed';
    } else if (rate > 1e-6) {
      // area shrinks roughly with the square root of the remaining area, so T = 2A / rate
      els.eta.textContent = 'in ' + Math.max(1, Math.round(2 * frac / rate)) + ' s';
    } else {
      els.eta.textContent = '—';
    }

    var status;
    if (userPaused) status = 'paused';
    else if (openCount === 0) status = 'healed';
    else status = 'closing';
    els.status.textContent = status;
  }

  /* ---------- loop ---------- */

  function shouldRun() {
    return !userPaused && inView && !document.hidden;
  }

  function frame(t) {
    rafId = 0;
    if (!shouldRun()) { lastTime = 0; return; }
    if (!lastTime) lastTime = t;
    var dt = t - lastTime;
    lastTime = t;
    if (dt > 250) dt = STEP_MS;
    acc += dt;
    var steps = 0;
    while (acc >= STEP_MS && steps < 3) {
      stepSim();
      acc -= STEP_MS;
      steps++;
    }
    if (steps === 3) acc = 0;
    flush();
    if (t - lastReadout > 200) {
      lastReadout = t;
      updateReadout();
    }
    schedule();
  }

  function schedule() {
    if (shouldRun()) {
      if (!rafId) rafId = requestAnimationFrame(frame);
    } else {
      lastTime = 0;
    }
  }

  /* ---------- interaction ---------- */

  function toCell(e) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width * cols,
      y: (e.clientY - rect.top) / rect.height * rows
    };
  }

  canvas.addEventListener('pointerdown', function (e) {
    var p = toCell(e);
    var coarse = e.pointerType !== 'mouse';
    openWound(p.x, p.y, coarse ? 9 : 5 + Math.random() * 2, 1.25);
    dragging = !coarse;
    lastCarve = p;
    closedAt = -1;
    history = [];
    flush();
    updateReadout();
  });

  canvas.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var p = toCell(e);
    if (lastCarve && Math.hypot(p.x - lastCarve.x, p.y - lastCarve.y) < 1.5) return;
    openWound(p.x, p.y, 3 + Math.random() * 1.5, 1);
    lastCarve = p;
    flush();
  });

  window.addEventListener('pointerup', function () { dragging = false; lastCarve = null; });
  window.addEventListener('pointercancel', function () { dragging = false; lastCarve = null; });

  function syncToggle() {
    els.toggle.textContent = userPaused ? 'Play' : 'Pause';
    els.toggle.setAttribute('aria-pressed', String(userPaused));
    els.toggle.setAttribute('aria-label', userPaused ? 'Play simulation' : 'Pause simulation');
  }

  els.toggle.addEventListener('click', function () {
    userPaused = !userPaused;
    syncToggle();
    updateReadout();
    schedule();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      schedule();
    }).observe(canvas);
  }

  document.addEventListener('visibilitychange', schedule);

  var resizeTimer = 0, lastW = 0, lastH = 0;
  function onResize() {
    var r = canvas.getBoundingClientRect();
    if (Math.abs(r.width - lastW) < 8 && Math.abs(r.height - lastH) < 8) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var rr = canvas.getBoundingClientRect();
      lastW = rr.width; lastH = rr.height;
      setup();
    }, 180);
  }
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(canvas);
  else window.addEventListener('resize', onResize);

  function onSchemeChange() { readPalette(); drawAll(); }
  if (darkScheme.addEventListener) darkScheme.addEventListener('change', onSchemeChange);

  // Exposed for theme switching and testing.
  window.tissueSim = {
    repaint: onSchemeChange,
    stats: function () { return { open: openCount, total: total, time: simTime }; }
  };

  /* ---------- start ---------- */

  readPalette();
  var r0 = canvas.getBoundingClientRect();
  lastW = r0.width; lastH = r0.height;
  setup();
  syncToggle();
  schedule();
})();
