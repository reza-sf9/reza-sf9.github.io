/*
 * Career run: a small side-scrolling jumping game in the hero.
 *
 * A cartoon Reza runs from 2008 to 2026. Obstacles change with each stage of
 * his career (merge conflicts at the software job, Reviewer 2 during the
 * Ph.D.), signposts mark jobs and degrees, and each milestone pops up as an
 * unlocked achievement. Coffee can be collected on the way.
 */
(function () {
  'use strict';

  var frame = document.getElementById('game-frame');
  var canvas = document.getElementById('game');
  var screen = document.getElementById('game-screen');
  var announcer = document.getElementById('game-announcer');
  if (!frame || !canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  var ui = {
    year: document.getElementById('g-year'),
    role: document.getElementById('g-role'),
    miles: document.getElementById('g-miles'),
    coffee: document.getElementById('g-coffee'),
    toggle: document.getElementById('game-toggle')
  };

  var START_YEAR = 2008;
  var FINISH_YEAR = 2027.2;
  var YEARS_PER_SECOND = 0.42;     // the whole run takes about 45 seconds
  var BANNER_TIME = 1.9;           // seconds a milestone banner stays up
  var BEST_KEY = 'career-run-best';

  // sign: text on the roadside post. title/sub: the pop-up. role: shown in the readout.
  var MILESTONES = [
    { year: 2008, sign: 'B.Sc. ECE', role: 'B.Sc. student, electrical and computer engineering' },
    { year: 2012.3, sign: 'Graduated', title: 'B.Sc. complete', sub: 'Electrical and computer engineering, Shahid Chamran University', icon: 'cap', burst: true },
    { year: 2012.7, sign: 'Vesis', title: 'New job: full-stack engineer', sub: 'C#, SQL Server and many APIs at Vesis', icon: 'case', role: 'Full-stack engineer, Vesis' },
    { year: 2015, sign: 'M.Sc. ECE', title: 'Started an M.Sc.', sub: 'Electrical and computer engineering, Isfahan University of Technology', icon: 'book', role: 'M.Sc. student and engineer' },
    { year: 2016.5, title: 'Four years of production code', sub: 'Shipped at Vesis', icon: 'code', role: 'M.Sc. student, electrical and computer engineering' },
    { year: 2018.4, sign: 'Graduated', title: 'M.Sc. complete', sub: 'Electrical and computer engineering', icon: 'cap', burst: true, role: 'Neural signal research' },
    { year: 2019, sign: 'Ortho BioMed', title: 'New job: deep learning engineer', sub: 'Organ donor matching at Ortho BioMed, Canada', icon: 'case', role: 'Deep learning engineer, Ortho BioMed' },
    { year: 2019.6, title: 'First paper published', sub: 'IEEE EMBC 2019', icon: 'paper', burst: true },
    { year: 2020.6, title: 'National Health Grant', sub: 'Award-winning ML for organ transplantation', icon: 'star', burst: true },
    { year: 2021.6, sign: 'WPI', title: 'Joined WPI CareLab', sub: 'Research assistant building wound AI', icon: 'case', role: 'M.S. student, WPI CareLab' },
    { year: 2023.4, sign: 'Graduated', title: 'M.S. complete', sub: 'Computer science, WPI', icon: 'cap', burst: true },
    { year: 2023.85, sign: 'Ph.D.', title: 'Ph.D. starts', sub: 'Computer science, WPI', icon: 'book', role: 'Ph.D. candidate, WPI CareLab' },
    { year: 2024.4, title: "People's Choice Award", sub: 'WPI Graduate Research Innovation Exchange', icon: 'star', burst: true },
    { year: 2025, title: 'Three U.S. patents', sub: 'Wound assessment and organ donor matching', icon: 'bulb', burst: true },
    { year: 2025.5, title: 'Paper at EMNLP', sub: 'Agentic medical knowledge graphs', icon: 'paper', burst: true },
    { year: 2026.6, sign: 'Centific', title: 'New job: healthcare AI research intern', sub: 'RLHF and agentic AI at Centific', icon: 'case', role: 'Research intern, healthcare AI, Centific' }
  ];
  var TOTAL_MILESTONES = MILESTONES.filter(function (m) { return m.title; }).length;

  // [label, tall, message shown when you hit it]
  var ERAS = [
    { until: 2012.5, items: [
      ['Short circuit', 0, 'Short circuit. Someone forgot the ground wire.'],
      ['Signals final', 1, 'The Signals and Systems final wins this round.'],
      ['Lab report', 0, 'The lab report was due an hour ago.']
    ] },
    { until: 2015, items: [
      ['Null pointer', 0, 'Object reference not set to an instance of an object.'],
      ['SQL deadlock', 1, 'Your transaction was deadlocked and chosen as the victim.'],
      ['Merge conflict', 0, 'Merge conflict on main. Nobody admits to touching it.'],
      ['Friday deploy', 1, 'Never deploy on a Friday.']
    ] },
    { until: 2019, items: [
      ['Thesis draft 17', 1, 'Your advisor has a few small comments on draft 17.'],
      ['MATLAB license', 0, 'License checkout failed. MATLAB is unavailable.'],
      ['60 Hz noise', 0, 'Power-line hum at 60 Hz. Should have added a notch filter.']
    ] },
    { until: 2021.6, items: [
      ['Missing values', 0, 'Half the columns are NaN. Time to impute.'],
      ['Class imbalance', 1, '99% accuracy, by always predicting the majority class.'],
      ['Overfitting', 0, 'Training accuracy 100%. Test accuracy 51%.']
    ] },
    { until: 2026, items: [
      ['Reviewer 2', 1, 'Reviewer 2 asked for just one more baseline.'],
      ['CUDA OOM', 0, 'CUDA out of memory. Try a smaller batch size.'],
      ['NaN loss', 0, 'The loss went NaN. Lower the learning rate.'],
      ['Hallucination', 1, 'The model cited a paper that does not exist.'],
      ['Label noise', 0, 'Three annotators, four opinions.'],
      ['Deadline AoE', 1, 'Missed the deadline, even in Anywhere on Earth time.']
    ] },
    { until: 9999, items: [
      ['Data drift', 0, 'The data drifted while you were looking away.'],
      ['Hallucination', 1, 'The model cited a paper that does not exist.']
    ] }
  ];

  // Faded backdrops for each period. Two entries means two places at once.
  // If the key has a logo in LOGO_FILES it is shown; otherwise the name is
  // written in the background instead.
  var BACKDROPS = [
    { until: 2012.5, items: [{ key: 'chamran', name: 'Shahid Chamran University' }] },
    { until: 2015, items: [{ icon: 'dev', name: 'Vesis' }] },
    { until: 2016.5, items: [{ icon: 'dev', name: 'Vesis' }, { key: 'iut', name: 'Isfahan University of Technology' }] },
    { until: 2018.5, items: [{ key: 'iut', name: 'Isfahan University of Technology' }] },
    { until: 2019, items: [{ name: 'Neural signal research' }] },
    { until: 2021.6, items: [{ key: 'orthobiomed', name: 'Ortho BioMed' }] },
    { until: 2026.55, items: [{ key: 'wpi', name: 'WPI CareLab' }] },
    { until: 9999, items: [{ key: 'wpi', name: 'WPI CareLab' }, { key: 'centific', name: 'Centific' }] }
  ];
  // Pixel pictures for backdrops without a logo: drawn large, with a small label.
  var BACKDROP_ICONS = {
    dev: [   // a monitor showing </>, for the software developer years
      'kkkkkkkkkkkkkkkk',
      'k..............k',
      'k..............k',
      'k....a...a.a...k',
      'k...a....a..a..k',
      'k..a....a....a.k',
      'k...a..a....a..k',
      'k....a.a...a...k',
      'k..............k',
      'k..............k',
      'kkkkkkkkkkkkkkkk',
      '......kkkk......',
      '....kkkkkkkk....'
    ]
  };
  var logos = {};            // key -> Image once loaded, or false if missing
  var backdrop = 0, prevBackdrop = -1, backdropFade = 1;

  // Watermark versions of the logos in assets/logos/web (dark parts opaque,
  // light parts transparent). Add a line here when you add one.
  var LOGO_FILES = {
    chamran: 'chamran.png',
    iut: 'iut.png',
    orthobiomed: 'orthobiomed.png',
    wpi: 'wpi-goat.png',
    centific: 'centific-mask.png'
  };

  function loadLogos() {
    if (loadLogos.done) return;
    loadLogos.done = true;
    Object.keys(LOGO_FILES).forEach(function (key) {
      var img = new Image();
      img.onload = function () { logos[key] = img; if (state !== 'running') draw(); };
      img.onerror = function () { logos[key] = false; };
      img.src = 'assets/logos/web/' + LOGO_FILES[key];
    });
  }

  function backdropFor(y) {
    for (var i = 0; i < BACKDROPS.length; i++) if (y < BACKDROPS[i].until) return i;
    return BACKDROPS.length - 1;
  }

  /* ---------- sprites: one character per pixel, '.' is empty ---------- */

  // Cartoon Reza: swept-up dark hair, thick brows, light stubble, navy polo.
  var HEAD = [
    '.....HHHHHH.....',
    '...HHHHHHHHHH...',
    '..HHHHhhhHHHHH..',
    '..HHHHHHHHHHHHH.',
    '.HHHHHHHHHHHHHH.',
    '.HHSSSSSSSSSHHH.',
    '.HSSSSSSSSSSSSH.',
    '.HSBBBSSSSBBBSH.',
    'SSSSSSSSSSSSSSSS',
    'SSSSeSSSSSSeSSSS',
    '.SSSeSSSSSSeSSS.',
    '.SSSSSSSNSSSSSS.',
    '.TSSSSSSSSSSSST.',
    '..TTSSMMMMSSTT..',
    '...TTTTTTTTTT...',
    '.....TTTTTT.....'
  ];
  var BLINK = { 9: 'SSSSSSSSSSSSSSSS', 10: '.SSeeSSSSSeeSSS.' };
  var OUCH = { 9: 'SSSSSSSSSSSSSSSS', 10: '.SSeeSSSSSeeSSS.', 13: '..TTSSSMMSSSTT..', 14: '...TTTMMMMTTT...' };
  var BODY = [
    '......SSSS......',
    '....CCPPPPCC....',
    '...PPPPCKPPPP...',
    '..PPPPPPKPPPPP..',
    '.APPPPPPPPPPPPA.',
    '.AppPPPPPPPPppA.',
    '..PPPPPPPPPPPP..'
  ];
  var LEGS = {
    a:    ['....LLL..LLL....', '...LL......LL...', '..FF........FF..'],
    b:    ['.....LLLLLL.....', '.....LL..LL.....', '....FFF..FFF....'],
    jump: ['....LLLLLLLL....', '....LL....LL....', '...FF......FF...'],
    hit:  ['....LL....LL....', '....LL....LL....', '...FFF....FFF...']
  };
  var SPRITE_W = 16, SPRITE_H = HEAD.length + BODY.length + 3;

  var COFFEE = [
    '.m..m...',
    '..m..m..',
    'uuuuuu..',
    'udddduu.',
    'udddduu.',
    'udddduu.',
    '.uuuu...'
  ];

  var ICONS = {
    cap:   ['...kk...', '.kkkkkk.', 'kkkkkkkk', '.kkkkkkg', '..kkkk.g', '..kkkk.g'],
    case:  ['..kkkk..', '..k..k..', 'kkkkkkkk', 'kkkkkkkk', 'kkkggkkk', 'kkkkkkkk', 'kkkkkkkk'],
    book:  ['kkk..kkk', 'kggkkggk', 'kkkkkkkk', 'kggkkggk', 'kkkkkkkk', '.kkkkkk.'],
    paper: ['kkkkk...', 'k...kk..', 'k.gg..k.', 'k.....k.', 'k.ggg.k.', 'k.....k.', 'k.ggg.k.', 'kkkkkkk.'],
    star:  ['...gg...', '...gg...', 'gggggggg', '.gggggg.', '..gggg..', '.gg..gg.', 'gg....gg'],
    bulb:  ['..gggg..', '.gggggg.', '.gggggg.', '..gggg..', '...kk...', '..kkkk..', '...kk...'],
    code:  ['....g...', '.k..g.k.', 'k..g...k', '.k.g..k.', '..g.....']
  };

  var C = {};               // colours read from CSS
  var W = 0, H = 0, dpr = 1;
  var groundY = 0, ps = 3, playerX = 0;
  var gravity = 0, jumpV = 0, baseSpeed = 0;
  var labelFont = 12;
  var groundTile = null, tileW = 0;

  var state = 'ready';      // ready | running | paused | over | won
  var year, speed, scroll, sinceSpawn, nextGap, itemTimer;
  var player, obstacles, items, signs, floats, sparks, banners;
  var nextSign, nextPop, unlocked, coffee = 0, role = '';
  var holding = false, rafId = 0, lastT = 0, acc = 0, animT = 0, endedAt = 0;

  /* ---------- setup ---------- */

  function readColors() {
    var cs = getComputedStyle(frame);
    var names = ['sky', 'ink', 'ink-2', 'rule', 'rule-strong', 'accent', 't1', 't2', 't3', 't4', 'nuc',
      'c-hair', 'c-hair-hi', 'c-skin', 'c-stubble', 'c-eye', 'c-nose', 'c-mouth', 'c-collar', 'c-button',
      'c-polo', 'c-polo-shade', 'c-jeans', 'c-shoe', 'g-outline', 'g-coffee', 'g-cup', 'g-steam',
      'g-block', 'g-block-text', 'g-toast-bg', 'g-toast-fg', 'g-toast-label', 'g-gold'];
    names.forEach(function (n) { C[n] = cs.getPropertyValue('--' + n).trim(); });
    C.sprite = {
      H: C['c-hair'], h: C['c-hair-hi'], B: C['c-hair'], S: C['c-skin'], A: C['c-skin'], T: C['c-stubble'],
      e: C['c-eye'], N: C['c-nose'], M: C['c-mouth'], C: C['c-collar'], K: C['c-button'], P: C['c-polo'],
      p: C['c-polo-shade'], L: C['c-jeans'], F: C['c-shoe'],
      m: C['g-steam'], u: C['g-cup'], d: C['g-coffee']
    };
    C.icon = { k: C['g-toast-fg'], g: C['g-gold'] };
    C.sans = getComputedStyle(document.body).fontFamily;
    C.mono = cs.getPropertyValue('--mono').trim() || 'monospace';
  }

  function measure() {
    var r = frame.getBoundingClientRect();
    var oldW = W, oldH = H;
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    groundY = Math.round(H * 0.8);
    ps = Math.max(2, Math.round(H * 0.21 / SPRITE_H));
    playerX = Math.max(24, Math.round(W * 0.09));
    gravity = H * 3.2;
    jumpV = H * 1.55;
    baseSpeed = Math.max(H * 0.9, Math.min(H * 2.1, W / 1.9));
    labelFont = Math.max(10, Math.round(H * 0.04));
    buildGroundTile();
    return { sx: oldW ? W / oldW : 1, sy: oldH ? H / oldH : 1 };
  }

  function buildGroundTile() {
    var gh = H - groundY;
    tileW = Math.max(256, Math.ceil(W / 64) * 64);
    var c = Math.max(4, Math.round(H / 64));
    var tile = document.createElement('canvas');
    tile.width = Math.round(tileW * dpr);
    tile.height = Math.round(gh * dpr);
    var t = tile.getContext('2d');
    t.scale(dpr, dpr);
    var shades = [C.t1, C.t2, C.t3, C.t4];
    var cols = Math.ceil(tileW / c), rows = Math.ceil(gh / c);
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        // wrap the pattern horizontally so the tile repeats without a seam
        var a = (x / cols) * Math.PI * 2;
        var n = Math.sin(a * 3 + Math.sin(y * 0.3) * 1.5) + Math.cos(a * 5 + y * 0.2) * 0.6 + (Math.random() - 0.5) * 1.1;
        var s = Math.floor((n + 2.2) / 4.4 * 4);
        t.fillStyle = shades[s < 0 ? 0 : s > 3 ? 3 : s];
        t.fillRect(x * c, y * c, c, c);
        if (Math.random() < 0.28) {
          t.fillStyle = C.nuc;
          t.beginPath();
          t.ellipse(x * c + c / 2, y * c + c / 2, c * 0.3, c * 0.21, Math.random() * 3, 0, 6.2832);
          t.fill();
        }
      }
    }
    groundTile = tile;
  }

  function reset() {
    year = START_YEAR;
    speed = baseSpeed;
    scroll = 0;
    sinceSpawn = 0;
    nextGap = W * 0.9;
    itemTimer = 1.4;
    player = { y: groundY, vy: 0, onGround: true, hit: false, blinkAt: 2.5 };
    obstacles = [];
    items = [];
    floats = [];
    sparks = [];
    banners = [];
    signs = [{ x: Math.max(playerX + 120, W * 0.62), m: MILESTONES[0] }];
    nextSign = 1;
    nextPop = 1;
    unlocked = 0;
    coffee = 0;
    role = MILESTONES[0].role;
    holding = false;
    animT = 0;
    backdrop = backdropFor(year);
    prevBackdrop = -1;
    backdropFade = 1;
    updateReadout(true);
  }

  /* ---------- helpers ---------- */

  function eraFor(y) {
    for (var i = 0; i < ERAS.length; i++) if (y < ERAS[i].until) return ERAS[i];
    return ERAS[ERAS.length - 1];
  }

  function playerBox() {
    var w = SPRITE_W * ps, h = SPRITE_H * ps;
    return { x: playerX + ps * 2.5, y: player.y - h + ps * 2, w: w - ps * 5, h: h - ps * 2.5 };
  }

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function wrapLabel(label) {
    // two short lines keep obstacles narrow enough to jump on small screens
    var words = label.split(' ');
    if (words.length === 1) return [label];
    var best = [label], bestW = Infinity;
    for (var i = 1; i < words.length; i++) {
      var l1 = words.slice(0, i).join(' '), l2 = words.slice(i).join(' ');
      var w = Math.max(l1.length, l2.length);
      if (w < bestW) { bestW = w; best = [l1, l2]; }
    }
    return best;
  }

  function spawnObstacle() {
    var pool = eraFor(year).items;
    if (year < 2009) pool = pool.filter(function (it) { return !it[1]; });
    var pick = pool[(Math.random() * pool.length) | 0];
    var lines = wrapLabel(pick[0]);
    ctx.font = '700 ' + labelFont + 'px ' + C.mono;
    var tw = 0;
    lines.forEach(function (l) { tw = Math.max(tw, ctx.measureText(l).width); });
    var pad = labelFont * 0.7;
    var minH = lines.length * labelFont * 1.15 + pad;
    var h = Math.max(minH, pick[1] ? H * 0.24 : H * 0.14);
    obstacles.push({ x: W + 10, w: Math.ceil(tw + pad * 2), h: h, lines: lines, msg: pick[2], label: pick[0] });
  }

  function spawnCoffee() {
    for (var i = 0; i < obstacles.length; i++) {
      if (obstacles[i].x > W - 80) return;  // keep clear of a fresh obstacle
    }
    var size = 7 * ps;
    var high = Math.random() < 0.6;
    var y = high ? groundY - H * 0.36 : groundY - size - ps * 2;
    items.push({ x: W + 10, y: y, size: size, phase: Math.random() * 6 });
  }

  function burst() {
    var cx = playerX + SPRITE_W * ps / 2, cy = player.y - SPRITE_H * ps;
    for (var i = 0; i < 22; i++) {
      var a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      var v = H * (0.6 + Math.random() * 0.8);
      sparks.push({
        x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        t: 0, life: 0.8 + Math.random() * 0.5, gold: Math.random() < 0.6
      });
    }
  }

  function announce(text) {
    if (announcer) announcer.textContent = text;
  }

  function unlock(m) {
    unlocked++;
    banners.push({ m: m, t: 0 });
    if (m.burst) burst();
    announce('Milestone: ' + m.title + '. ' + m.sub + '.');
  }

  /* ---------- simulation ---------- */

  function update(dt) {
    animT += dt;
    year += dt * YEARS_PER_SECOND;
    var progress = Math.min(1, (year - START_YEAR) / (FINISH_YEAR - START_YEAR));
    speed = baseSpeed * (1 + 0.45 * progress);
    var dx = speed * dt;
    scroll += dx;

    // player physics: holding the jump key softens gravity on the way up
    var g = gravity;
    if (!player.onGround && player.vy < 0 && holding) g = gravity * 0.62;
    player.vy += g * dt;
    player.y += player.vy * dt;
    if (player.y >= groundY) {
      player.y = groundY;
      player.vy = 0;
      player.onGround = true;
    }

    // move the world
    var i;
    for (i = 0; i < obstacles.length; i++) obstacles[i].x -= dx;
    for (i = 0; i < items.length; i++) items[i].x -= dx;
    for (i = 0; i < signs.length; i++) signs[i].x -= dx;
    for (i = 0; i < floats.length; i++) { floats[i].t += dt; floats[i].x -= dx; }
    for (i = 0; i < sparks.length; i++) {
      var s = sparks[i];
      s.t += dt;
      s.vy += gravity * 0.55 * dt;
      s.x += s.vx * dt - dx * 0.3;
      s.y += s.vy * dt;
    }
    // if milestones arrive close together, move the queue along faster
    if (banners.length) banners[0].t += dt * (banners.length > 1 ? 2.2 : 1);
    obstacles = obstacles.filter(function (o) { return o.x + o.w > -20; });
    items = items.filter(function (it) { return it.x + it.size > -20 && !it.taken; });
    signs = signs.filter(function (sg) { return sg.x > -240; });
    floats = floats.filter(function (f) { return f.t < 0.9; });
    sparks = sparks.filter(function (sp) { return sp.t < sp.life; });
    if (banners.length && banners[0].t > BANNER_TIME) banners.shift();

    // backdrop changes with the period
    var b = backdropFor(year);
    if (b !== backdrop) { prevBackdrop = backdrop; backdrop = b; backdropFade = 0; }
    if (backdropFade < 1) backdropFade = Math.min(1, backdropFade + dt / 0.8);

    // signposts arrive at the player as the year reaches them
    while (nextSign < MILESTONES.length && !MILESTONES[nextSign].sign) nextSign++;
    if (nextSign < MILESTONES.length) {
      var lead = (W + 10 - playerX) / speed * YEARS_PER_SECOND;
      if (year >= MILESTONES[nextSign].year - lead) {
        signs.push({ x: W + 10, m: MILESTONES[nextSign] });
        nextSign++;
      }
    }

    // milestones unlock on their date
    while (nextPop < MILESTONES.length && year >= MILESTONES[nextPop].year) {
      var m = MILESTONES[nextPop];
      if (m.role) role = m.role;
      if (m.title) unlock(m);
      nextPop++;
    }

    // obstacles, but not in the last stretch before the finish
    sinceSpawn += dx;
    if (sinceSpawn >= nextGap && year < FINISH_YEAR - 0.6) {
      spawnObstacle();
      sinceSpawn = 0;
      var air = 2 * jumpV / gravity;
      var last = obstacles[obstacles.length - 1];
      nextGap = last.w + speed * air * (1.05 + Math.random() * 1.1);
    }

    itemTimer -= dt;
    if (itemTimer <= 0) {
      spawnCoffee();
      itemTimer = 1 + Math.random() * 1.6;
    }

    // collisions
    var pb = playerBox();
    for (i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      if (overlap(pb, { x: o.x + 3, y: groundY - o.h + 3, w: o.w - 6, h: o.h - 3 })) {
        return lose(o);
      }
    }
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it.taken && overlap(pb, { x: it.x, y: it.y, w: it.size, h: it.size })) {
        it.taken = true;
        coffee++;
        floats.push({ x: it.x, y: it.y, t: 0, text: '+1 coffee' });
      }
    }

    if (year >= FINISH_YEAR) return win();
    updateReadout(false);
  }

  /* ---------- drawing ---------- */

  function drawSprite(rows, x, y, palette, outline, p) {
    p = p || ps;
    var o = Math.max(1, Math.round(p * 0.4));
    var r, c, ch;
    if (outline) {
      ctx.fillStyle = C['g-outline'];
      for (r = 0; r < rows.length; r++) {
        for (c = 0; c < rows[r].length; c++) {
          if (rows[r][c] !== '.') ctx.fillRect(x + c * p - o, y + r * p - o, p + o * 2, p + o * 2);
        }
      }
    }
    for (r = 0; r < rows.length; r++) {
      for (c = 0; c < rows[r].length; c++) {
        ch = rows[r][c];
        if (ch === '.') continue;
        ctx.fillStyle = palette[ch];
        ctx.fillRect(x + c * p, y + r * p, p, p);
      }
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function playerRows() {
    var head = HEAD.slice();
    var swap = null;
    if (player.hit) swap = OUCH;
    else if ((animT % 3.2) > 3.05) swap = BLINK;
    if (swap) Object.keys(swap).forEach(function (k) { head[k] = swap[k]; });
    var legs;
    if (player.hit) legs = LEGS.hit;
    else if (!player.onGround) legs = LEGS.jump;
    else legs = (Math.floor(scroll / (ps * 10)) % 2) ? LEGS.a : LEGS.b;
    return head.concat(BODY, legs);
  }

  function drawBanner(b) {
    var m = b.m;
    var t = b.t;
    var inT = Math.min(1, t / 0.2);
    var outT = Math.max(0, (t - (BANNER_TIME - 0.3)) / 0.3);
    var ease = 1 - Math.pow(1 - inT, 3);
    var fsTitle = Math.max(13, Math.round(H * 0.05));
    var fsSmall = Math.max(10, Math.round(H * 0.033));
    var ip = Math.max(2, Math.round(H * 0.011));     // icon pixel size
    var iconW = 8 * ip;
    var pad = Math.round(fsTitle * 0.7);

    ctx.font = '700 ' + fsTitle + 'px ' + C.sans;
    var wTitle = ctx.measureText(m.title).width;
    ctx.font = '400 ' + fsSmall + 'px ' + C.sans;
    var wSub = ctx.measureText(m.sub).width;
    var maxW = W - 24;
    var bw = Math.min(maxW, Math.max(wTitle, wSub) + iconW + pad * 3);
    var bh = fsSmall * 1.3 + fsTitle * 1.25 + fsSmall * 1.35 + pad * 1.2;
    var bx = Math.round((W - bw) / 2);
    var by = Math.round(H * 0.05 - (1 - ease) * (bh + 20));

    ctx.globalAlpha = 1 - outT;
    ctx.fillStyle = C['g-toast-bg'];
    roundRect(bx, by, bw, bh, 8);
    ctx.fill();

    var icon = ICONS[m.icon] || ICONS.star;
    drawSprite(icon, bx + pad, Math.round(by + (bh - icon.length * ip) / 2), C.icon, false, ip);

    var tx = bx + pad * 2 + iconW;
    var textW = bw - (tx - bx) - pad;
    ctx.textBaseline = 'top';
    ctx.font = '700 ' + fsSmall + 'px ' + C.sans;
    ctx.fillStyle = C['g-toast-label'];
    ctx.fillText('Milestone unlocked', tx, by + pad * 0.6, textW);
    ctx.font = '700 ' + fsTitle + 'px ' + C.sans;
    ctx.fillStyle = C['g-toast-fg'];
    ctx.fillText(m.title, tx, by + pad * 0.6 + fsSmall * 1.3, textW);
    ctx.font = '400 ' + fsSmall + 'px ' + C.sans;
    ctx.globalAlpha = (1 - outT) * 0.82;
    ctx.fillText(m.sub, tx, by + pad * 0.6 + fsSmall * 1.3 + fsTitle * 1.25, textW);
    ctx.globalAlpha = 1;
  }

  function drawStar(x, y, s) {
    ctx.fillRect(x - s, y - s * 3, s * 2, s * 6);
    ctx.fillRect(x - s * 3, y - s, s * 6, s * 2);
  }

  function fitName(name, boxW, maxFont) {
    // one line if it fits, otherwise two balanced lines
    ctx.font = '800 100px ' + C.sans;
    var lines = [name];
    var w = ctx.measureText(name).width;
    var words = name.split(' ');
    if (words.length > 1 && w / 100 * maxFont > boxW) {
      var best = null, bestW = Infinity;
      for (var i = 1; i < words.length; i++) {
        var a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
        var ww = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
        if (ww < bestW) { bestW = ww; best = [a, b]; }
      }
      lines = best;
      w = bestW;
    }
    return { lines: lines, size: Math.min(maxFont, boxW / w * 100) };
  }

  // Logos are drawn as a one-colour watermark in the page's ink colour, so they
  // read the same in light and dark mode and never fight with the game.
  var silhouettes = {};
  function silhouette(key, img) {
    var id = key + C.ink;
    if (silhouettes[id]) return silhouettes[id];
    var k = Math.min(1, 640 / Math.max(img.width, img.height));
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width * k));
    c.height = Math.max(1, Math.round(img.height * k));
    var g = c.getContext('2d');
    g.drawImage(img, 0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = C.ink;
    g.fillRect(0, 0, c.width, c.height);
    silhouettes[id] = c;
    return c;
  }

  function drawBackdrop(index, alpha) {
    if (index < 0 || alpha <= 0) return;
    var items = BACKDROPS[index].items;
    var n = items.length;
    var areaTop = H * 0.2, areaH = groundY - areaTop - H * 0.08;
    var slotW = W / n;
    items.forEach(function (it, k) {
      var cx = slotW * k + slotW / 2;
      var cy = areaTop + areaH / 2;
      var boxW = slotW * (n > 1 ? 0.78 : 0.62);
      var img = it.key ? logos[it.key] : null;
      if (it.icon && BACKDROP_ICONS[it.icon]) {
        var rows = BACKDROP_ICONS[it.icon];
        var p = Math.max(2, Math.floor(areaH * 0.6 / rows.length));
        var iconW = rows[0].length * p, iconH = rows.length * p;
        var fs = Math.max(12, Math.round(H * 0.06));
        ctx.font = '700 ' + fs + 'px ' + C.sans;
        var lw = ctx.measureText(it.name).width;
        var gap = p * 3;
        var x0 = Math.round(cx - (iconW + gap + lw) / 2);
        var y0 = Math.round(cy - iconH / 2);
        ctx.globalAlpha = alpha * 0.16;
        rows.forEach(function (r, ry) {
          for (var rx = 0; rx < r.length; rx++) {
            var ch = r[rx];
            if (ch === '.') continue;
            ctx.fillStyle = ch === 'a' ? C.accent : C.ink;
            ctx.fillRect(x0 + rx * p, y0 + ry * p, p, p);
          }
        });
        ctx.globalAlpha = alpha * 0.32;
        ctx.fillStyle = C.ink;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(it.name, x0 + iconW + gap, cy);
      } else if (img) {
        var scale = Math.min(boxW / img.width, areaH * 0.85 / img.height);
        var iw = img.width * scale, ih = img.height * scale;
        ctx.globalAlpha = alpha * 0.13;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(silhouette(it.key, img), cx - iw / 2, cy - ih / 2, iw, ih);
        ctx.imageSmoothingEnabled = false;
      } else {
        var fit = fitName(it.name, boxW, H * (n > 1 ? 0.11 : 0.15));
        ctx.globalAlpha = alpha * 0.09;
        ctx.fillStyle = C.ink;
        ctx.font = '800 ' + Math.round(fit.size) + 'px ' + C.sans;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var lh = fit.size * 1.02;
        var y0 = cy - (fit.lines.length - 1) * lh / 2;
        fit.lines.forEach(function (l, j) { ctx.fillText(l, cx, y0 + j * lh); });
        ctx.textAlign = 'left';
      }
    });
    ctx.globalAlpha = 1;
  }

  function draw() {
    ctx.fillStyle = C.sky;
    ctx.fillRect(0, 0, W, H);

    // fade the old backdrop out, then the new one in, so they never overlap
    drawBackdrop(prevBackdrop, Math.max(0, 1 - backdropFade * 2));
    drawBackdrop(backdrop, Math.max(0, backdropFade * 2 - 1));

    // faint plot grid in the background, moving slower than the ground
    ctx.strokeStyle = C.rule;
    ctx.lineWidth = 1;
    var gs = Math.round(H * 0.22);
    var off = (scroll * 0.3) % gs;
    ctx.beginPath();
    for (var gx = -off; gx < W; gx += gs) { ctx.moveTo(Math.round(gx) + 0.5, 0); ctx.lineTo(Math.round(gx) + 0.5, groundY); }
    for (var gy = groundY - gs; gy > 0; gy -= gs) { ctx.moveTo(0, Math.round(gy) + 0.5); ctx.lineTo(W, Math.round(gy) + 0.5); }
    ctx.stroke();

    // signposts
    var sfs = Math.max(11, Math.round(H * 0.038));
    signs.forEach(function (sg) {
      var postH = H * 0.4;
      var top = groundY - postH;
      var x = Math.round(sg.x);
      ctx.fillStyle = C['ink-2'];
      ctx.fillRect(x, top, 2, postH);
      var y1 = String(Math.floor(sg.m.year));
      ctx.font = '700 ' + sfs + 'px ' + C.sans;
      var w1 = ctx.measureText(y1).width;
      ctx.font = '400 ' + sfs + 'px ' + C.sans;
      var w2 = ctx.measureText(sg.m.sign).width;
      var bw = Math.max(w1, w2) + sfs * 1.2;
      var bh = sfs * 2.9;
      ctx.fillStyle = C.sky;
      ctx.strokeStyle = C['rule-strong'];
      roundRect(x + 0.5, top + 0.5, Math.round(bw), Math.round(bh), 3);
      ctx.fill();
      ctx.stroke();
      ctx.textBaseline = 'top';
      ctx.fillStyle = C.ink;
      ctx.font = '700 ' + sfs + 'px ' + C.sans;
      ctx.fillText(y1, x + sfs * 0.6, top + sfs * 0.45);
      ctx.fillStyle = C['ink-2'];
      ctx.font = '400 ' + sfs + 'px ' + C.sans;
      ctx.fillText(sg.m.sign, x + sfs * 0.6, top + sfs * 1.6);
    });

    // ground: a strip of tissue
    var gh = H - groundY;
    var tx = -(scroll % tileW);
    ctx.drawImage(groundTile, tx, groundY, tileW, gh);
    ctx.drawImage(groundTile, tx + tileW, groundY, tileW, gh);
    if (tx + tileW * 2 < W) ctx.drawImage(groundTile, tx + tileW * 2, groundY, tileW, gh);
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, groundY, W, 2);

    // obstacles
    obstacles.forEach(function (o) {
      var x = Math.round(o.x), y = Math.round(groundY - o.h);
      ctx.fillStyle = C['g-block'];
      roundRect(x, y, o.w, Math.round(o.h) + 4, 4);
      ctx.fill();
      ctx.fillStyle = C['g-block-text'];
      ctx.font = '700 ' + labelFont + 'px ' + C.mono;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      var lh = labelFont * 1.15;
      var startY = y + o.h / 2 - (o.lines.length - 1) * lh / 2;
      o.lines.forEach(function (l, k) { ctx.fillText(l, x + o.w / 2, startY + k * lh); });
      ctx.textAlign = 'left';
      if (o.label === 'Reviewer 2') {
        // a small unimpressed face
        var ey = y + labelFont * 0.55, cx = x + o.w / 2, e = Math.max(2, labelFont * 0.18);
        ctx.fillRect(cx - labelFont * 0.7, ey, e * 1.6, e);
        ctx.fillRect(cx + labelFont * 0.7 - e * 1.6, ey, e * 1.6, e);
        ctx.fillRect(cx - labelFont * 0.5, y + o.h - labelFont * 0.7, labelFont, e * 0.8);
      }
    });

    // coffee
    items.forEach(function (it) {
      var bob = Math.sin(animT * 5 + it.phase) * ps * 0.8;
      drawSprite(COFFEE, Math.round(it.x), Math.round(it.y + bob), C.sprite, true);
    });

    // player
    var rows = playerRows();
    drawSprite(rows, playerX, Math.round(player.y - rows.length * ps), C.sprite, true);

    // celebration sparks
    var sp = Math.max(1, Math.round(ps * 0.6));
    sparks.forEach(function (s) {
      ctx.globalAlpha = Math.max(0, 1 - s.t / s.life);
      ctx.fillStyle = s.gold ? C['g-gold'] : C.accent;
      drawStar(Math.round(s.x), Math.round(s.y), sp);
    });
    ctx.globalAlpha = 1;

    // floating +1 labels
    ctx.font = '700 ' + Math.max(11, Math.round(H * 0.036)) + 'px ' + C.sans;
    ctx.textBaseline = 'alphabetic';
    floats.forEach(function (f) {
      ctx.globalAlpha = 1 - f.t / 0.9;
      ctx.fillStyle = C.accent;
      ctx.fillText(f.text, f.x, f.y - f.t * H * 0.12);
    });
    ctx.globalAlpha = 1;

    if (banners && banners.length) drawBanner(banners[0]);
  }

  /* ---------- readout and screens ---------- */

  var lastShown = {};
  function setText(el, key, value) {
    if (el && lastShown[key] !== value) { el.textContent = value; lastShown[key] = value; }
  }

  function updateReadout(force) {
    if (force) lastShown = {};
    setText(ui.year, 'year', String(Math.min(2026, Math.floor(year))));
    setText(ui.role, 'role', role);
    setText(ui.miles, 'miles', unlocked + ' / ' + TOTAL_MILESTONES);
    setText(ui.coffee, 'coffee', String(coffee));
  }

  function readBest() {
    try { return parseFloat(localStorage.getItem(BEST_KEY)) || 0; } catch (e) { return 0; }
  }
  function saveBest(y) {
    try { if (y > readBest()) localStorage.setItem(BEST_KEY, String(y)); } catch (e) { /* storage unavailable */ }
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  function showScreen(html) {
    screen.innerHTML = html;
    screen.hidden = false;
  }
  function hideScreen() {
    screen.hidden = true;
    screen.classList.remove('is-win');
  }

  function coffeeText(n) { return n === 1 ? '1 coffee' : n + ' coffees'; }

  function lose(o) {
    state = 'over';
    endedAt = performance.now();
    player.hit = true;
    banners = [];
    var reached = Math.floor(year);
    saveBest(reached);
    var best = Math.floor(readBest());
    draw();
    updateReadout(true);
    showScreen(
      '<p class="game__title">' + esc(o.msg) + '</p>' +
      '<p>You made it to ' + reached + ' (' + esc(role) + ') with ' + unlocked + ' of ' + TOTAL_MILESTONES + ' milestones and ' + coffeeText(coffee) + '. Best run: ' + best + '.</p>' +
      '<div class="game__actions"><button class="btn" type="button" data-action="start">Run again</button>' +
      '<a class="btn btn--ghost" href="#experience">See the real timeline</a></div>'
    );
    syncToggle();
  }

  function win() {
    state = 'won';
    screen.classList.add('is-win');
    endedAt = performance.now();
    year = FINISH_YEAR;
    saveBest(2026);
    burst();
    draw();
    updateReadout(true);
    showScreen(
      '<p class="game__title">You made it to 2026.</p>' +
      '<p>All ' + TOTAL_MILESTONES + ' milestones unlocked, fueled by ' + coffeeText(coffee) + '. Next milestone: a full-time role in healthcare AI or applied ML. Maybe on your team?</p>' +
      '<div class="game__actions"><a class="btn" href="mailto:saadatifard.reza@gmail.com">Email me</a>' +
      '<button class="btn btn--ghost" type="button" data-action="start">Run again</button></div>'
    );
    syncToggle();
  }

  function showStart() {
    var best = Math.floor(readBest());
    showScreen(
      '<p class="game__title">Career run</p>' +
      '<p>Get me from 2008 to 2026. Dodge merge conflicts, NaN losses and Reviewer 2, unlock every milestone, and grab coffee on the way.</p>' +
      '<div class="game__actions"><button class="btn" type="button" data-action="start">Start running</button></div>' +
      '<p class="game__keys">Space, up arrow or tap to jump. Hold for a higher jump.' + (best ? ' Your best: ' + best + '.' : '') + '</p>'
    );
  }

  function showPaused() {
    showScreen(
      '<p class="game__title">Paused in ' + Math.floor(year) + '</p>' +
      '<div class="game__actions"><button class="btn" type="button" data-action="resume">Keep running</button></div>' +
      '<p class="game__keys">Or press space.</p>'
    );
  }

  function syncToggle() {
    ui.toggle.textContent = state === 'running' ? 'Pause' : state === 'paused' ? 'Resume' : 'Play';
  }

  /* ---------- control ---------- */

  function bringIntoView() {
    var r = frame.getBoundingClientRect();
    if (r.bottom + 64 > window.innerHeight || r.top < 0) {
      var smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var y = window.scrollY + r.top - Math.max(16, (window.innerHeight - r.height - 80) / 2);
      window.scrollTo({ top: Math.max(0, y), behavior: smooth ? 'smooth' : 'auto' });
    }
  }

  function start() {
    loadLogos();
    reset();
    state = 'running';
    hideScreen();
    syncToggle();
    if (document.activeElement !== frame) frame.focus({ preventScroll: true });
    bringIntoView();
    lastT = 0;
    acc = 0;
    loop();
  }

  function pause() {
    if (state !== 'running') return;
    state = 'paused';
    holding = false;
    showPaused();
    syncToggle();
  }

  function resume() {
    if (state !== 'paused') return;
    state = 'running';
    hideScreen();
    syncToggle();
    if (document.activeElement !== frame) frame.focus({ preventScroll: true });
    lastT = 0;
    loop();
  }

  function jump() {
    if (state !== 'running') return;
    holding = true;
    if (player.onGround) {
      player.vy = -jumpV;
      player.onGround = false;
    }
  }

  function release() {
    holding = false;
    if (state === 'running' && !player.onGround && player.vy < -jumpV * 0.75) {
      player.vy = -jumpV * 0.75;
    }
  }

  function loop() {
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  function tick(t) {
    rafId = 0;
    if (state !== 'running') return;
    if (!lastT) lastT = t;
    var dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;
    acc += dt;
    var step = 1 / 120;
    while (acc >= step && state === 'running') {
      update(step);
      acc -= step;
    }
    if (state === 'running') {
      draw();
      loop();
    } else if (state === 'won') {
      celebrate();
    }
  }

  // keep the final sparks falling behind the win screen for a moment
  function celebrate() {
    var t0 = 0;
    function frameFn(t) {
      if (state !== 'won') return;
      if (!t0) t0 = t;
      var dt = 1 / 60;
      sparks.forEach(function (s) { s.t += dt; s.vy += gravity * 0.55 * dt; s.x += s.vx * dt; s.y += s.vy * dt; });
      sparks = sparks.filter(function (s) { return s.t < s.life; });
      draw();
      if (sparks.length && t - t0 < 2000) requestAnimationFrame(frameFn);
    }
    requestAnimationFrame(frameFn);
  }

  /* ---------- input ---------- */

  screen.addEventListener('click', function (e) {
    var b = e.target.closest('[data-action]');
    if (!b) return;
    e.stopPropagation();
    if (b.dataset.action === 'start') start();
    else if (b.dataset.action === 'resume') resume();
  });

  frame.addEventListener('pointerdown', function (e) {
    if (e.target.closest('a, button')) return;
    if (state === 'running') { e.preventDefault(); jump(); }
    else if (state === 'paused') resume();
    else if (state === 'ready') start();
  });
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);

  function isJumpKey(e) {
    return e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW';
  }

  window.addEventListener('keydown', function (e) {
    var focused = frame.contains(document.activeElement);
    var onControl = document.activeElement && document.activeElement.closest &&
      document.activeElement.closest('a, button, input, textarea, select');
    if (state === 'running') {
      if (isJumpKey(e)) {
        e.preventDefault();
        if (!e.repeat) jump();
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        pause();
      }
      return;
    }
    if (focused && !onControl && isJumpKey(e)) {
      e.preventDefault();
      // ignore a held or mashed jump key right after a run ends
      if ((state === 'over' || state === 'won') && (e.repeat || performance.now() - endedAt < 700)) return;
      if (state === 'paused') resume(); else start();
    }
  });
  window.addEventListener('keyup', function (e) { if (isJumpKey(e)) release(); });

  ui.toggle.addEventListener('click', function () {
    if (state === 'running') pause();
    else if (state === 'paused') resume();
    else start();
  });

  // Pause when the game scrolls away or the tab is hidden.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].intersectionRatio < 0.35) pause();
    }, { threshold: [0, 0.35, 1] }).observe(frame);
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });

  var resizeTimer = 0;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var r = frame.getBoundingClientRect();
      if (Math.abs(r.width - W) < 2 && Math.abs(r.height - H) < 2) return;
      var oldGround = groundY;
      var k = measure();
      if (state === 'ready') { reset(); draw(); return; }
      // keep the current run, rescaled to the new size
      obstacles.forEach(function (o) { o.x *= k.sx; o.h *= k.sy; o.w *= k.sx; });
      items.forEach(function (it) { it.x *= k.sx; it.y = groundY - (oldGround - it.y) * k.sy; it.size = 7 * ps; });
      signs.forEach(function (sg) { sg.x *= k.sx; });
      player.y = groundY - (oldGround - player.y) * k.sy;
      if (state === 'running') pause();
      draw();
    }, 150);
  }
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(frame);
  else window.addEventListener('resize', onResize);

  function repaint() {
    readColors();
    buildGroundTile();
    draw();
  }
  var scheme = window.matchMedia('(prefers-color-scheme: dark)');
  if (scheme.addEventListener) scheme.addEventListener('change', repaint);

  /* ---------- start ---------- */

  readColors();
  measure();
  reset();
  draw();
  showStart();
  syncToggle();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (state !== 'running') { readColors(); draw(); } });

  window.careerRun = {
    state: function () {
      return {
        state: state, year: year, unlocked: unlocked, coffee: coffee, speed: speed, H: H, W: W,
        playerX: playerX, playerW: SPRITE_W * ps, groundY: groundY, onGround: player.onGround,
        banner: banners.length ? banners[0].m.title : null,
        obstacles: obstacles.map(function (o) { return { x: o.x, w: o.w, h: o.h, label: o.label }; })
      };
    },
    start: start
  };
})();
