/*
 * Dithered cloud background behind the top of the page.
 *
 * Clouds come from layered value noise, are pushed toward the edges so the
 * text stays readable, and are drawn with a 4x4 ordered (Bayer) dither in the
 * site's pink, purple and blue at a coarse pixel size, then fade out at the
 * bottom. The pattern is seeded, so it looks the same on every visit.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('sky-art');
  var anchor = document.querySelector('.hero__grid');
  if (!canvas || !canvas.getContext || !anchor) return;
  var ctx = canvas.getContext('2d');

  var PALETTES = {
    light: {
      bg: '#F8F5F8',
      hues: [
        ['#F5E1EB', '#EFC5D7', '#E7A6C3', '#DC86AE'],   // pink
        ['#ECE4F7', '#D9CAF1', '#C0A9E8', '#A58BDD'],   // purple
        ['#E4ECF8', '#CCDCF3', '#A9C5EC', '#8BAFE3']    // blue
      ]
    },
    dark: {
      bg: '#14111F',
      hues: [
        ['#22152D', '#33183B', '#4C2050', '#6B2A66'],
        ['#1C1832', '#28204A', '#392B69', '#4F3D92'],
        ['#161B31', '#1C2847', '#253864', '#314C83']
      ]
    }
  };

  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(function (v) { return (v + 0.5) / 16; });
  var SEED = 2026;

  function hash(x, y) {
    var h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(SEED, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967295;
  }

  function noise(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  function fbm(x, y, octaves) {
    var sum = 0, amp = 0.5, norm = 0, f = 1;
    for (var i = 0; i < octaves; i++) {
      sum += noise(x * f, y * f) * amp;
      norm += amp;
      amp *= 0.5;
      f *= 2.03;
    }
    return sum / norm;
  }

  function smooth(e0, e1, x) {
    var t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  }

  function hexToRgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  var lastKey = '';

  function render() {
    var dark = window.matchMedia('(prefers-color-scheme: dark)').matches &&
      document.documentElement.getAttribute('data-theme') !== 'light';
    var pal = PALETTES[dark ? 'dark' : 'light'];
    var W = document.documentElement.clientWidth;
    var H = Math.round(anchor.getBoundingClientRect().bottom + window.scrollY + 72);
    var key = W + 'x' + H + (dark ? 'd' : 'l');
    if (key === lastKey) return;
    lastKey = key;

    var px = W < 640 ? 3 : 4;                  // size of one dither pixel in CSS px
    var cols = Math.ceil(W / px), rows = Math.ceil(H / px);
    canvas.style.height = H + 'px';
    canvas.width = cols;
    canvas.height = rows;

    var img = ctx.createImageData(cols, rows);
    var data = img.data;
    var bg = hexToRgb(pal.bg);
    var hues = pal.hues.map(function (h) { return h.map(hexToRgb); });
    var narrow = W < 860;
    var scale = px / 150;                      // clouds roughly 300-600 px across

    for (var y = 0; y < rows; y++) {
      var yn = y / rows;
      for (var x = 0; x < cols; x++) {
        var xn = x / cols;

        // where clouds may gather: strong at the right and top, light behind the text
        var weight;
        if (narrow) {
          weight = 0.25 + 0.75 * (1 - smooth(0, 0.22, yn)) * 0.8 + 0.35 * smooth(0.75, 1, xn);
        } else {
          weight = 0.18 + 0.82 * smooth(0.5, 0.92, xn) + 0.5 * (1 - smooth(0, 0.2, yn)) + 0.3 * (1 - smooth(0, 0.07, xn));
        }
        weight = Math.min(1, weight);

        var n = fbm(x * scale, y * scale * 1.35, 5);
        var cloud = smooth(0.44, 0.74, n) * weight;
        var sky = 0.14 + 0.1 * (1 - yn);
        var intensity = Math.max(sky, cloud * 1.05);
        intensity *= 1 - smooth(0.62, 1, yn);  // dissolve into the page at the bottom

        // hue: blue sky, pink and purple clouds
        var hn = fbm(x * scale * 0.55 + 40, y * scale * 0.55 + 17, 3);
        var cloudHue = smooth(0.38, 0.62, hn);
        var t = cloud > 0.12 ? cloudHue : 2;   // 0 pink, 1 purple, 2 blue

        var th = BAYER[(y & 3) * 4 + (x & 3)];
        var hueIndex = Math.floor(t) + ((t - Math.floor(t)) > th ? 1 : 0);
        if (hueIndex > 2) hueIndex = 2;

        var v = intensity * 4;
        var level = Math.floor(v) + ((v - Math.floor(v)) > BAYER[((y + 2) & 3) * 4 + ((x + 1) & 3)] ? 1 : 0);
        if (level > 4) level = 4;

        var c = level === 0 ? bg : hues[hueIndex][level - 1];
        var o = (y * cols + x) * 4;
        data[o] = c[0];
        data[o + 1] = c[1];
        data[o + 2] = c[2];
        data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  render();
  var timer = 0;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(render, 150);
  }
  window.addEventListener('resize', schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  var scheme = window.matchMedia('(prefers-color-scheme: dark)');
  if (scheme.addEventListener) scheme.addEventListener('change', function () { lastKey = ''; render(); });
})();
