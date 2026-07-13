/* Breakout Land — the walkable hub island (canvas, high-fidelity art pass) */

const WORLD = { w: 1600, h: 1100 };

const BUILDINGS = [
  { id: 'daily',  name: 'Lock Plaza',          sub: 'Lock of the Day', x: 800,  y: 470,  w: 170, h: 150 },
  { id: 'games',  name: 'Game Hall',           sub: 'Assigned games',  x: 420,  y: 560,  w: 200, h: 150 },
  { id: 'math',   name: 'Math Trailhead',      sub: 'Breakout Math',   x: 1122, y: 438,  w: 190, h: 140 },
  { id: 'arcade', name: 'The Arcade',          sub: 'Earned play time',x: 1220, y: 760,  w: 190, h: 150 },
  { id: 'shop',   name: 'Style Shop',          sub: 'Spend your keys', x: 430,  y: 870,  w: 170, h: 135 },
  { id: 'badges', name: 'Badge Hall',          sub: 'Your trophies',   x: 640,  y: 330,  w: 170, h: 125 },
  { id: 'plus',   name: 'Breakout+ Clubhouse', sub: 'Bonus content',   x: 880,  y: 880,  w: 175, h: 140 },
];

/* Organic island geometry — a soft blob floating in open water (diorama style) */
const ISLAND = { cx: 800, cy: 620, R: 585, sy: 0.74 };
function islandR(th) {
  return ISLAND.R * (1 + .055 * Math.sin(2 * th + 1.3) + .04 * Math.sin(3 * th + 4.1) + .028 * Math.sin(5 * th + 2.2));
}
function blobPath(ctx, scale, dy = 0) {
  ctx.beginPath();
  for (let i = 0; i <= 88; i++) {
    const th = (i / 88) * Math.PI * 2;
    const r = islandR(th) * scale;
    const x = ISLAND.cx + Math.cos(th) * r;
    const y = ISLAND.cy + Math.sin(th) * r * ISLAND.sy + dy;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}
function insideIsland(x, y, margin = 1) {
  const dx = x - ISLAND.cx, dy = (y - ISLAND.cy) / ISLAND.sy;
  const th = Math.atan2(dy, dx);
  return Math.hypot(dx, dy) < islandR(th) * margin;
}

const TREES = [
  [350, 390], [430, 300], [700, 258], [980, 268], [1175, 330], [1258, 480], [1262, 700],
  [1160, 895], [900, 945], [620, 945], [408, 828], [338, 600], [1052, 598], [540, 340],
];
const BUSHES = [
  [524, 424], [880, 318], [1146, 522], [1006, 818], [560, 758], [724, 878], [368, 700], [1236, 608],
];
const ROCKS = [[470, 652], [1118, 382], [948, 928], [388, 476]];
const FLOWERS = Array.from({ length: 46 }, (_, i) => [
  170 + ((i * 173) % 1290), 255 + ((i * 271) % 770), ['#ff6b5b', '#ffd75e', '#e75480', '#9b5de5', '#fff'][i % 5],
]);
const TUFTS = Array.from({ length: 60 }, (_, i) => [150 + ((i * 197) % 1320), 245 + ((i * 331) % 790)]);

const world = {
  cv: null, ctx: null, raf: null,
  keysDown: {}, target: null, nearBuilding: null,
  dir: 1, walking: false, t0: 0, clouds: [], birds: [],
};

function enterWorld() {
  showScreen('world');
  updateHUD();
  if (!world.cv) initWorld();
  world.t0 = performance.now();
  cancelAnimationFrame(world.raf);
  worldLoop(world.t0);
}

function initWorld() {
  world.cv = document.getElementById('world-canvas');
  world.ctx = world.cv.getContext('2d');
  world.clouds = Array.from({ length: 6 }, (_, i) => ({
    x: (i * 300) % WORLD.w, y: 36 + (i * 97) % 150, s: .7 + (i % 3) * .3, v: 8 + (i % 3) * 5,
  }));
  world.birds = Array.from({ length: 3 }, (_, i) => ({ off: i * 7.2, y: 90 + i * 55, v: 42 + i * 9 }));

  addEventListener('keydown', e => {
    if (!screenIs('world')) return;
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    world.keysDown[e.key.toLowerCase()] = true;
    if ((e.key === 'e' || e.key === 'E' || e.key === 'Enter') && world.nearBuilding) {
      openBuilding(world.nearBuilding.id);
    }
    if (e.key.startsWith('Arrow')) e.preventDefault();
  });
  addEventListener('keyup', e => { world.keysDown[e.key.toLowerCase()] = false; });

  const toWorldXY = (e) => {
    const r = world.cv.getBoundingClientRect();
    const scale = getViewScale();
    const cam = getCamera(scale);
    const cx = (e.clientX - r.left);
    const cy = (e.clientY - r.top);
    return { x: cam.x + cx / scale, y: cam.y + cy / scale };
  };
  world.cv.addEventListener('pointerdown', e => {
    const p = toWorldXY(e);
    const b = BUILDINGS.find(b => Math.abs(p.x - b.x) < b.w / 2 + 20 && Math.abs(p.y - (b.y - b.h / 2)) < b.h / 2 + 30);
    if (b && world.nearBuilding && b.id === world.nearBuilding.id) { openBuilding(b.id); return; }
    world.target = p;
  });

  document.getElementById('enter-btn').addEventListener('click', () => {
    if (world.nearBuilding) openBuilding(world.nearBuilding.id);
  });
}

function getViewScale() {
  const vw = world.cv.clientWidth, vh = world.cv.clientHeight;
  return Math.max(vw / 1240, vh / 880, .62);
}
function getCamera(scale) {
  const vw = world.cv.clientWidth / scale, vh = world.cv.clientHeight / scale;
  let x = state.pos.x - vw / 2, y = state.pos.y - vh / 2;
  x = Math.max(0, Math.min(WORLD.w - vw, x));
  y = Math.max(0, Math.min(WORLD.h - vh, y));
  return { x, y, vw, vh };
}

function worldLoop(t) {
  if (!screenIs('world')) return;
  const sec = (t - world.t0) / 1000;
  stepPlayer();
  drawWorld(sec);
  world.raf = requestAnimationFrame(worldLoop);
}

function stepPlayer() {
  const sp = 4.4;
  let dx = 0, dy = 0;
  const k = world.keysDown;
  if (k['arrowleft'] || k['a']) dx -= 1;
  if (k['arrowright'] || k['d']) dx += 1;
  if (k['arrowup'] || k['w']) dy -= 1;
  if (k['arrowdown'] || k['s']) dy += 1;

  if (dx || dy) {
    world.target = null;
    const len = Math.hypot(dx, dy);
    state.pos.x += (dx / len) * sp;
    state.pos.y += (dy / len) * sp;
    world.walking = true;
    if (dx) world.dir = dx > 0 ? 1 : -1;
  } else if (world.target) {
    const tx = world.target.x - state.pos.x, ty = world.target.y - state.pos.y;
    const d = Math.hypot(tx, ty);
    if (d < 6) { world.target = null; world.walking = false; }
    else {
      state.pos.x += (tx / d) * sp;
      state.pos.y += (ty / d) * sp;
      world.walking = true;
      if (Math.abs(tx) > 1) world.dir = tx > 0 ? 1 : -1;
    }
  } else {
    world.walking = false;
  }

  // keep the explorer on the grass (radial island bounds)
  if (!insideIsland(state.pos.x, state.pos.y, .855)) {
    const dx = state.pos.x - ISLAND.cx, dy = (state.pos.y - ISLAND.cy) / ISLAND.sy;
    const th = Math.atan2(dy, dx);
    const r = islandR(th) * .855;
    state.pos.x = ISLAND.cx + Math.cos(th) * r;
    state.pos.y = ISLAND.cy + Math.sin(th) * r * ISLAND.sy;
    world.target = null;
  }

  world.nearBuilding = null;
  for (const b of BUILDINGS) {
    const d = Math.hypot(state.pos.x - b.x, state.pos.y - (b.y + 18));
    if (d < 115) { world.nearBuilding = b; break; }
  }
  const btn = document.getElementById('enter-btn');
  if (world.nearBuilding) {
    btn.classList.add('show');
    btn.textContent = `Enter ${world.nearBuilding.name} ✦`;
  } else {
    btn.classList.remove('show');
  }
}

/* =============== rendering =============== */

const INK_LINE = 'rgba(45, 36, 60, .30)';

function drawWorld(sec) {
  const cv = world.cv, ctx = world.ctx;
  const dpr = window.devicePixelRatio || 1;
  const wpx = Math.round(cv.clientWidth * dpr), hpx = Math.round(cv.clientHeight * dpr);
  if (cv.width !== wpx || cv.height !== hpx) { cv.width = wpx; cv.height = hpx; }
  ctx.save();
  ctx.scale(dpr, dpr);

  const scale = getViewScale();
  const cam = getCamera(scale);
  const W = cv.clientWidth, H = cv.clientHeight;

  // ---- open water fills the whole view (screen space, before camera transform) ----
  const sea = ctx.createLinearGradient(0, 0, 0, H);
  sea.addColorStop(0, '#37a6d4'); sea.addColorStop(.55, '#2c95c7'); sea.addColorStop(1, '#2384b8');
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-cam.x, -cam.y);

  // depth rings hugging the island contour (lighter shallows)
  ctx.fillStyle = 'rgba(120,214,235,.5)';
  blobPath(ctx, 1.22, 14); ctx.fill();
  ctx.fillStyle = 'rgba(150,226,242,.55)';
  blobPath(ctx, 1.11, 10); ctx.fill();
  // sparkles + waves in open water
  ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    const wx = 60 + (i * 267) % (WORLD.w - 120), wy = 60 + (i * 353) % (WORLD.h - 120);
    if (insideIsland(wx, wy, 1.12)) continue;
    const off = Math.sin(sec * 1.5 + i) * 5;
    ctx.beginPath(); ctx.arc(wx + off, wy, 11, Math.PI * .12, Math.PI * .88); ctx.stroke();
  }

  // animated foam collar
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  blobPath(ctx, 1.028 + Math.sin(sec * 1.3) * .006, 6); ctx.fill();

  // cliff face under the island front edge (diorama depth)
  ctx.fillStyle = '#b98e52';
  blobPath(ctx, 1, 34); ctx.fill();
  ctx.fillStyle = '#a87c42';
  blobPath(ctx, 1, 22); ctx.fill();

  // sandy beach top
  const sand = ctx.createLinearGradient(0, ISLAND.cy - 460, 0, ISLAND.cy + 470);
  sand.addColorStop(0, '#f4e3b2'); sand.addColorStop(1, '#e8cf92');
  ctx.fillStyle = sand;
  blobPath(ctx, 1, 0); ctx.fill();
  // wet sand line
  ctx.strokeStyle = 'rgba(160,128,70,.3)'; ctx.lineWidth = 5;
  blobPath(ctx, .985, 2); ctx.stroke();

  // grass plateau with soft under-shadow
  ctx.fillStyle = '#559e46';
  blobPath(ctx, .905, 12); ctx.fill();
  const grass = ctx.createRadialGradient(ISLAND.cx, ISLAND.cy - 80, 120, ISLAND.cx, ISLAND.cy + 40, 720);
  grass.addColorStop(0, '#92d476'); grass.addColorStop(.7, '#76bf5e'); grass.addColorStop(1, '#61ad4f');
  ctx.fillStyle = grass;
  blobPath(ctx, .9, 0); ctx.fill();
  // mowed light bands, clipped to the grass
  ctx.save();
  blobPath(ctx, .9, 0); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.05)';
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.translate(WORLD.w / 2, WORLD.h / 2); ctx.rotate(-.35);
    ctx.fillRect(-1100 + i * 260, -700, 130, 1500);
    ctx.restore();
  }
  ctx.restore();

  // wooden dock + rowboat (south shore)
  drawDock(ctx, sec);

  // ---- paths ----
  const drawPath = (x0, y0, x1, y1, mx, my) => {
    ctx.strokeStyle = '#d9b980'; ctx.lineWidth = 40; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.stroke();
    ctx.strokeStyle = '#e8cf98'; ctx.lineWidth = 26;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.stroke();
  };
  BUILDINGS.forEach(b => drawPath(800, 570, b.x, b.y + 22, (800 + b.x) / 2, (570 + b.y) / 2 + 40));
  // stepping stones on paths
  ctx.fillStyle = 'rgba(190,155,95,.5)';
  BUILDINGS.forEach(b => {
    for (let t = .3; t < .95; t += .22) {
      const mx = (800 + b.x) / 2, my = (570 + b.y) / 2 + 40;
      const px = (1 - t) * (1 - t) * 800 + 2 * (1 - t) * t * mx + t * t * b.x;
      const py = (1 - t) * (1 - t) * 570 + 2 * (1 - t) * t * my + t * t * (b.y + 22);
      ctx.beginPath(); ctx.ellipse(px, py, 7, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    }
  });

  // ---- central plaza: brick circle ----
  const plazaGrad = ctx.createRadialGradient(800, 570, 10, 800, 570, 100);
  plazaGrad.addColorStop(0, '#f0d9a4'); plazaGrad.addColorStop(1, '#dcbc82');
  ctx.fillStyle = plazaGrad;
  ctx.beginPath(); ctx.arc(800, 570, 96, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c8a468'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.arc(800, 570, 96, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(170,132,80,.3)';
  for (const r of [34, 58, 80]) { ctx.beginPath(); ctx.arc(800, 570, r, 0, Math.PI * 2); ctx.stroke(); }
  for (let a = 0; a < 16; a++) {
    const th = (a / 16) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(800 + Math.cos(th) * 20, 570 + Math.sin(th) * 20);
    ctx.lineTo(800 + Math.cos(th) * 92, 570 + Math.sin(th) * 92);
    ctx.stroke();
  }

  // flowers & grass tufts & rocks
  TUFTS.forEach(([tx, ty], i) => {
    if (!insideIsland(tx, ty, .86) || Math.hypot(tx - 800, ty - 570) < 120) return;
    ctx.strokeStyle = 'rgba(58,128,52,.5)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    const sway = Math.sin(sec * 2 + i) * 1.5;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx - 3 + sway, ty - 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + 2 + sway, ty - 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + 5 + sway, ty - 5); ctx.stroke();
  });
  FLOWERS.forEach(([fx, fy, c], i) => {
    if (!insideIsland(fx, fy, .86) || Math.hypot(fx - 800, fy - 570) < 125) return;
    const sway = Math.sin(sec * 1.8 + i) * 1.2;
    ctx.fillStyle = c;
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2 + sway * .1;
      ctx.beginPath(); ctx.arc(fx + Math.cos(a) * 3.2 + sway, fy + Math.sin(a) * 3.2, 2.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ffd75e';
    ctx.beginPath(); ctx.arc(fx + sway, fy, 2, 0, Math.PI * 2); ctx.fill();
  });
  ROCKS.forEach(([rx, ry]) => {
    ctx.fillStyle = 'rgba(30,50,40,.12)';
    ctx.beginPath(); ctx.ellipse(rx, ry + 6, 16, 5, 0, 0, Math.PI * 2); ctx.fill();
    const rg = ctx.createLinearGradient(rx - 12, ry - 14, rx + 10, ry + 8);
    rg.addColorStop(0, '#c3cbc6'); rg.addColorStop(1, '#93a09b');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(rx - 15, ry + 6); ctx.quadraticCurveTo(rx - 14, ry - 10, rx - 2, ry - 13);
    ctx.quadraticCurveTo(rx + 12, ry - 12, rx + 14, ry + 2); ctx.quadraticCurveTo(rx + 10, ry + 8, rx - 15, ry + 6);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = INK_LINE; ctx.lineWidth = 2; ctx.stroke();
  });

  // lock statue in plaza
  drawLockStatue(ctx, 800, 545, sec);

  // ---- y-sorted entities ----
  const drawables = [
    ...BUILDINGS.map(b => ({ y: b.y, fn: () => drawBuilding(ctx, b, sec) })),
    ...TREES.filter(([tx, ty]) => insideIsland(tx, ty, .84)).map(([tx, ty]) => ({ y: ty, fn: () => drawTree(ctx, tx, ty, sec) })),
    ...BUSHES.filter(([bx, by]) => insideIsland(bx, by, .84)).map(([bx, by]) => ({ y: by, fn: () => drawBush(ctx, bx, by, sec) })),
    {
      y: state.pos.y,
      fn: () => {
        drawPet(ctx, state.pos.x - 34 * world.dir, state.pos.y + 2, 1, state.player.pet, sec);
        drawAvatar(ctx, state.pos.x, state.pos.y, 1, state.player, sec, world.walking, world.dir);
        ctx.font = '700 13px system-ui, sans-serif';
        const nm = state.player.name || 'Explorer';
        const tw = ctx.measureText(nm).width;
        ctx.fillStyle = 'rgba(0,45,114,.8)';
        roundRect(ctx, state.pos.x - tw / 2 - 9, state.pos.y - 120, tw + 18, 21, 10.5); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(nm, state.pos.x, state.pos.y - 105);
        ctx.textAlign = 'left';
      },
    },
  ];
  drawables.sort((a, b) => a.y - b.y).forEach(d => d.fn());

  // target marker
  if (world.target) {
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 3;
    const r = 10 + Math.sin(sec * 8) * 3;
    ctx.beginPath(); ctx.arc(world.target.x, world.target.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath(); ctx.arc(world.target.x, world.target.y, 3.5, 0, Math.PI * 2); ctx.fill();
  }

  // floating sparkle keys
  for (let i = 0; i < 5; i++) {
    const kx = 300 + (i * 331) % 1100, ky = 280 + (i * 449) % 660;
    if (!insideIsland(kx, ky, .88)) continue;
    const fl = Math.sin(sec * 2 + i * 1.7) * 6;
    ctx.save(); ctx.globalAlpha = .55 + Math.sin(sec * 3 + i) * .25;
    ctx.translate(kx, ky + fl); ctx.rotate(Math.sin(sec + i) * .2);
    drawKeyGlyph(ctx, 0, 0, .8, '#ffd75e');
    ctx.restore();
  }

  // butterflies
  for (let i = 0; i < 3; i++) {
    const bx = 400 + ((i * 421) % 900) + Math.sin(sec * .7 + i * 2) * 90;
    const by = 330 + ((i * 291) % 500) + Math.cos(sec * .9 + i) * 40;
    const flap = Math.abs(Math.sin(sec * 14 + i * 3));
    ctx.save(); ctx.translate(bx, by);
    ctx.fillStyle = ['#ff8fa3', '#a7d8ff', '#ffd75e'][i];
    ctx.beginPath(); ctx.ellipse(-3, 0, 4.5 * flap + .8, 4, .5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3, 0, 4.5 * flap + .8, 4, -.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a3348';
    ctx.beginPath(); ctx.ellipse(0, 0, 1.2, 3.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  ctx.restore(); // world space

  // ---- screen-space atmosphere ----
  // clouds
  ctx.fillStyle = 'rgba(255,255,255,.88)';
  world.clouds.forEach(c => {
    const cx = (c.x + sec * c.v) % (W + 280) - 140;
    ctx.beginPath();
    ctx.arc(cx, c.y, 24 * c.s, 0, Math.PI * 2);
    ctx.arc(cx + 27 * c.s, c.y + 6 * c.s, 18 * c.s, 0, Math.PI * 2);
    ctx.arc(cx - 27 * c.s, c.y + 7 * c.s, 16 * c.s, 0, Math.PI * 2);
    ctx.arc(cx + 8 * c.s, c.y - 9 * c.s, 15 * c.s, 0, Math.PI * 2);
    ctx.fill();
  });
  // birds
  ctx.strokeStyle = 'rgba(50,70,110,.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  world.birds.forEach(b => {
    const bx = (b.off * 120 + sec * b.v) % (W + 200) - 100;
    const by = b.y + Math.sin(sec * 2 + b.off) * 8;
    const f = Math.sin(sec * 9 + b.off) * 4;
    ctx.beginPath(); ctx.moveTo(bx - 7, by - f); ctx.quadraticCurveTo(bx, by + 3, bx + 0, by); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + 7, by - f); ctx.quadraticCurveTo(bx, by + 3, bx + 0, by); ctx.stroke();
  });
  // warm light + vignette
  const warm = ctx.createRadialGradient(W * .3, -H * .2, 60, W * .3, -H * .2, H * 1.4);
  warm.addColorStop(0, 'rgba(255,236,170,.14)'); warm.addColorStop(.5, 'rgba(255,236,170,.03)'); warm.addColorStop(1, 'rgba(255,236,170,0)');
  ctx.fillStyle = warm; ctx.fillRect(0, 0, W, H);
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .45, W / 2, H / 2, Math.max(W, H) * .78);
  vig.addColorStop(0, 'rgba(20,35,70,0)'); vig.addColorStop(1, 'rgba(20,35,70,.16)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

  ctx.restore(); // dpr
}

/* =============== buildings =============== */

function drawBuilding(ctx, b, sec) {
  const near = world.nearBuilding && world.nearBuilding.id === b.id;
  // ground shadow
  ctx.fillStyle = 'rgba(25,45,30,.16)';
  ctx.beginPath(); ctx.ellipse(b.x, b.y + 14, b.w * .58, 16, 0, 0, Math.PI * 2); ctx.fill();

  if (near) {
    const pulse = .5 + Math.sin(sec * 4) * .18;
    const g = ctx.createRadialGradient(b.x, b.y + 8, 10, b.x, b.y + 8, b.w * .8);
    g.addColorStop(0, `rgba(255,233,138,${pulse})`); g.addColorStop(1, 'rgba(255,233,138,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(b.x, b.y + 8, b.w * .8, 34, 0, 0, Math.PI * 2); ctx.fill();
    // welcome sparkles
    for (let i = 0; i < 3; i++) {
      const a = sec * 1.6 + i * 2.1;
      const sx = b.x + Math.cos(a) * (b.w * .55), sy = b.y - b.h * .55 + Math.sin(a * 1.3) * (b.h * .45);
      ctx.save(); ctx.globalAlpha = .55 + Math.sin(a * 2) * .35;
      ctx.fillStyle = '#fff3b0';
      drawStar(ctx, sx, sy, 4, 5, 1.9); ctx.fill();
      ctx.restore();
    }
  }

  ctx.save();
  const fn = {
    daily: drawLockPavilion, games: drawGameHall, math: drawTrailhead, arcade: drawArcade,
    shop: drawStyleShop, badges: drawBadgeHall, plus: drawClubhouse,
  }[b.id];
  fn(ctx, b, sec);
  ctx.restore();

  // hanging sign
  drawSign(ctx, b.x, b.y + 16, b.name);

  // lock badge if gated
  if (b.id === 'arcade' && !arcadeAllowed()) drawPadlockBadge(ctx, b.x + b.w / 2 - 6, b.y - b.h + 26);
  if (b.id === 'plus' && !state.plus) drawPadlockBadge(ctx, b.x + b.w / 2 - 6, b.y - b.h + 26);
}

function outlineLast(ctx, lw = 2.5) { ctx.strokeStyle = INK_LINE; ctx.lineWidth = lw; ctx.stroke(); }

function wallRect(ctx, x, y, w, h, r, c1, c2) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g;
  roundRect(ctx, x, y, w, h, r); ctx.fill();
  outlineLast(ctx);
}

function windowPane(ctx, x, y, w, h, frame = '#fff') {
  ctx.fillStyle = frame;
  roundRect(ctx, x - 3, y - 3, w + 6, h + 6, 6); ctx.fill();
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#cdeffb'); g.addColorStop(.55, '#9fd8ef'); g.addColorStop(.56, '#8ccfe8'); g.addColorStop(1, '#bce8f7');
  ctx.fillStyle = g;
  roundRect(ctx, x, y, w, h, 4); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(x + w * .18, y + h * .82); ctx.lineTo(x + w * .55, y + h * .1); ctx.stroke();
}

function doorArch(ctx, x, yBase, w, h, color, dark) {
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 - 4, yBase);
  ctx.lineTo(x - w / 2 - 4, yBase - h + w / 2);
  ctx.arc(x, yBase - h + w / 2, w / 2 + 4, Math.PI, 0);
  ctx.lineTo(x + w / 2 + 4, yBase);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, yBase);
  ctx.lineTo(x - w / 2, yBase - h + w / 2);
  ctx.arc(x, yBase - h + w / 2, w / 2, Math.PI, 0);
  ctx.lineTo(x + w / 2, yBase);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd75e';
  ctx.beginPath(); ctx.arc(x + w / 4, yBase - h * .38, 2.6, 0, Math.PI * 2); ctx.fill();
}

function bunting(ctx, x0, y0, x1, y1, sec, colors = ['#ff6b5b', '#ffd75e', '#2ec4b6', '#9b5de5']) {
  const sag = 14;
  ctx.strokeStyle = 'rgba(90,70,40,.6)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + sag, x1, y1); ctx.stroke();
  const n = 6;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const fx = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * ((x0 + x1) / 2) + t * t * x1;
    const fy = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (Math.max(y0, y1) + sag) + t * t * y1;
    const wob = Math.sin(sec * 3 + i) * 1.2;
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.moveTo(fx - 5, fy); ctx.lineTo(fx + 5, fy); ctx.lineTo(fx + wob, fy + 10);
    ctx.closePath(); ctx.fill();
  }
}

function flag(ctx, x, yTop, h, color, sec) {
  ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, yTop + h); ctx.lineTo(x, yTop); ctx.stroke();
  const wave = Math.sin(sec * 4) * 3;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, yTop);
  ctx.quadraticCurveTo(x + 12, yTop + 2 + wave * .3, x + 24, yTop + wave);
  ctx.lineTo(x + 22, yTop + 10 + wave);
  ctx.quadraticCurveTo(x + 11, yTop + 10 + wave * .3, x, yTop + 12);
  ctx.closePath(); ctx.fill();
}

function drawSign(ctx, x, y, text) {
  ctx.font = '800 15px system-ui, sans-serif';
  const tw = ctx.measureText(text).width;
  const w = tw + 26, h = 27;
  // posts
  ctx.fillStyle = '#8a5f31';
  ctx.fillRect(x - w / 2 + 5, y - 6, 4, 14); ctx.fillRect(x + w / 2 - 9, y - 6, 4, 14);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#fffbef'); g.addColorStop(1, '#f4e6c4');
  ctx.fillStyle = g;
  roundRect(ctx, x - w / 2, y, w, h, 9); ctx.fill();
  ctx.strokeStyle = '#c9a86a'; ctx.lineWidth = 2.5;
  roundRect(ctx, x - w / 2, y, w, h, 9); ctx.stroke();
  ctx.fillStyle = '#3c3325';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y + 19);
  ctx.textAlign = 'left';
}

/* Lock Plaza pavilion — gold dome, keyhole doorway */
function drawLockPavilion(ctx, b, sec) {
  const x = b.x, base = b.y;
  // walls
  wallRect(ctx, x - 72, base - 86, 144, 86, 12, '#fff6df', '#f3ddae');
  // pilasters
  ctx.fillStyle = '#e8cf98';
  ctx.fillRect(x - 66, base - 82, 10, 82); ctx.fillRect(x + 56, base - 82, 10, 82);
  // gold trim band under the dome
  ctx.fillStyle = '#e0a52a';
  roundRect(ctx, x - 84, base - 96, 168, 14, 7); ctx.fill(); outlineLast(ctx, 2);
  // dome — proper onion profile with vertical seams
  const dome = ctx.createLinearGradient(x - 70, base - 160, x + 70, base - 90);
  dome.addColorStop(0, '#ffd257'); dome.addColorStop(.5, '#ffb627'); dome.addColorStop(1, '#e08f0e');
  ctx.fillStyle = dome;
  ctx.beginPath();
  ctx.moveTo(x - 76, base - 96);
  ctx.bezierCurveTo(x - 78, base - 138, x - 42, base - 158, x, base - 158);
  ctx.bezierCurveTo(x + 42, base - 158, x + 78, base - 138, x + 76, base - 96);
  ctx.closePath(); ctx.fill();
  outlineLast(ctx);
  // dome seams + shine
  ctx.strokeStyle = 'rgba(160,100,10,.35)'; ctx.lineWidth = 2;
  for (const k of [-.55, 0, .55]) {
    ctx.beginPath();
    ctx.moveTo(x + k * 70, base - 97);
    ctx.quadraticCurveTo(x + k * 34, base - 140, x, base - 157);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 60, base - 106);
  ctx.quadraticCurveTo(x - 58, base - 136, x - 26, base - 150);
  ctx.stroke();
  // key finial on a little spire
  ctx.fillStyle = '#e0a52a';
  ctx.beginPath(); ctx.arc(x, base - 160, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(x, base - 172); ctx.rotate(Math.sin(sec * 1.4) * .1);
  drawKeyGlyph(ctx, -8, 0, 1, '#ffdf7e');
  ctx.restore();
  // keyhole doorway
  ctx.fillStyle = '#4a3405';
  ctx.beginPath();
  ctx.arc(x, base - 52, 15, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 10, base); ctx.lineTo(x - 4, base - 46); ctx.lineTo(x + 4, base - 46); ctx.lineTo(x + 10, base);
  ctx.closePath(); ctx.fill();
  // glow inside keyhole
  ctx.fillStyle = `rgba(255,214,94,${.5 + Math.sin(sec * 2.4) * .2})`;
  ctx.beginPath(); ctx.arc(x, base - 52, 7, 0, Math.PI * 2); ctx.fill();
  // windows
  windowPane(ctx, x - 52, base - 62, 22, 26);
  windowPane(ctx, x + 30, base - 62, 22, 26);
  bunting(ctx, x - 78, base - 90, x + 78, base - 90, sec);
}

/* Game Hall — red banner hall with marquee + awning */
function drawGameHall(ctx, b, sec) {
  const x = b.x, base = b.y;
  wallRect(ctx, x - 92, base - 92, 184, 92, 12, '#ff7d67', '#e2523f');
  // white trim band
  ctx.fillStyle = '#fff2e2';
  roundRect(ctx, x - 92, base - 98, 184, 14, 7); ctx.fill();
  // big top roof
  const roof = ctx.createLinearGradient(x, base - 160, x, base - 92);
  roof.addColorStop(0, '#ff9d84'); roof.addColorStop(1, '#e2523f');
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - 104, base - 94);
  ctx.quadraticCurveTo(x, base - 168, x + 104, base - 94);
  ctx.closePath(); ctx.fill();
  outlineLast(ctx);
  // roof stripes: clean wedges fanning from the apex, clipped to the roof
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - 104, base - 94);
  ctx.quadraticCurveTo(x, base - 168, x + 104, base - 94);
  ctx.closePath(); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  for (const i of [-2, 0, 2]) {
    ctx.beginPath();
    ctx.moveTo(x, base - 148);
    ctx.lineTo(x + i * 30 - 11, base - 90);
    ctx.lineTo(x + i * 30 + 11, base - 90);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // marquee
  const mw = 120;
  ctx.fillStyle = '#27406e';
  roundRect(ctx, x - mw / 2, base - 128, mw, 24, 8); ctx.fill();
  outlineLast(ctx);
  ctx.font = '900 13px system-ui'; ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe08a';
  ctx.fillText('★ GAMES ★', x, base - 111);
  ctx.textAlign = 'left';
  // marquee bulbs
  for (let i = 0; i < 8; i++) {
    const on = ((sec * 4) | 0) % 2 === i % 2;
    ctx.fillStyle = on ? '#ffe08a' : '#8fa3c9';
    ctx.beginPath(); ctx.arc(x - mw / 2 + 8 + i * (mw - 16) / 7, base - 130, 2.4, 0, Math.PI * 2); ctx.fill();
  }
  // door with striped awning
  doorArch(ctx, x, base, 34, 52, '#7c2d1f', '#5f2015');
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(x - 28, base - 58); ctx.lineTo(x + 28, base - 58); ctx.lineTo(x + 22, base - 44); ctx.lineTo(x - 22, base - 44); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e2523f';
  for (let i = -2; i <= 2; i += 2) {
    ctx.beginPath(); ctx.moveTo(x + i * 11 - 5, base - 58); ctx.lineTo(x + i * 11 + 5, base - 58); ctx.lineTo(x + i * 11 + 4, base - 44); ctx.lineTo(x + i * 11 - 4, base - 44); ctx.closePath(); ctx.fill();
  }
  windowPane(ctx, x - 74, base - 66, 24, 28);
  windowPane(ctx, x + 50, base - 66, 24, 28);
  flag(ctx, x - 98, base - 132, 40, '#ffd75e', sec);
  flag(ctx, x + 98 - 24, base - 132, 40, '#2ec4b6', sec + .5);
}

/* Math Trailhead — wooden gate arch with hanging sign */
function drawTrailhead(ctx, b, sec) {
  const x = b.x, base = b.y;
  // stone pillar bases
  ctx.fillStyle = '#a9b3ad';
  roundRect(ctx, x - 84, base - 34, 26, 34, 5); ctx.fill(); outlineLast(ctx);
  roundRect(ctx, x + 58, base - 34, 26, 34, 5); ctx.fill(); outlineLast(ctx);
  // wooden posts
  const wood = ctx.createLinearGradient(x, base - 130, x, base);
  wood.addColorStop(0, '#a97b45'); wood.addColorStop(1, '#8a5f31');
  ctx.fillStyle = wood;
  roundRect(ctx, x - 79, base - 118, 16, 86, 6); ctx.fill(); outlineLast(ctx);
  roundRect(ctx, x + 63, base - 118, 16, 86, 6); ctx.fill(); outlineLast(ctx);
  // arch beam
  ctx.fillStyle = wood;
  ctx.beginPath();
  ctx.moveTo(x - 92, base - 106);
  ctx.quadraticCurveTo(x, base - 148, x + 92, base - 106);
  ctx.lineTo(x + 92, base - 92);
  ctx.quadraticCurveTo(x, base - 134, x - 92, base - 92);
  ctx.closePath(); ctx.fill(); outlineLast(ctx);
  // hanging unit sign
  const sw = 108;
  ctx.strokeStyle = '#6f4a22'; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(x - sw / 2 + 12, base - 118); ctx.lineTo(x - sw / 2 + 16, base - 96); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + sw / 2 - 12, base - 118); ctx.lineTo(x + sw / 2 - 16, base - 96); ctx.stroke();
  const sg = ctx.createLinearGradient(x, base - 96, x, base - 66);
  sg.addColorStop(0, '#6dcf7e'); sg.addColorStop(1, '#43a457');
  ctx.fillStyle = sg;
  roundRect(ctx, x - sw / 2, base - 96, sw, 30, 8); ctx.fill(); outlineLast(ctx);
  ctx.font = '900 15px system-ui'; ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText('× ÷ + −', x, base - 75);
  ctx.textAlign = 'left';
  // grassy mounds flanking the gate
  drawBush(ctx, x - 96, base - 2, sec);
  drawBush(ctx, x + 96, base - 2, sec + .8);
  flag(ctx, x - 76, base - 152, 34, '#57c26b', sec);
  flag(ctx, x + 63, base - 152, 34, '#ffd75e', sec + .7);
}

/* Arcade — purple facade, glowing neon sign */
function drawArcade(ctx, b, sec) {
  const x = b.x, base = b.y;
  wallRect(ctx, x - 88, base - 96, 176, 96, 12, '#a86ef0', '#7d43c9');
  // dark game-floor band
  ctx.fillStyle = '#3b2a6b';
  roundRect(ctx, x - 80, base - 60, 160, 60, 10); ctx.fill();
  // flat roof cap
  ctx.fillStyle = '#5b3fbf';
  roundRect(ctx, x - 96, base - 108, 192, 18, 9); ctx.fill(); outlineLast(ctx);
  // neon sign
  const glow = .55 + Math.sin(sec * 5) * .35;
  ctx.save();
  ctx.shadowColor = `rgba(255,224,122,${glow})`; ctx.shadowBlur = 18;
  ctx.fillStyle = '#1d1440';
  roundRect(ctx, x - 62, base - 146, 124, 34, 12); ctx.fill();
  ctx.font = '900 20px system-ui'; ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(255,224,122,${.75 + glow * .25})`;
  ctx.fillText('ARCADE', x, base - 121);
  ctx.restore();
  ctx.textAlign = 'left';
  // neon tube border
  ctx.strokeStyle = `rgba(76,201,240,${.5 + Math.sin(sec * 5 + 1.5) * .3})`; ctx.lineWidth = 2.5;
  roundRect(ctx, x - 62, base - 146, 124, 34, 12); ctx.stroke();
  // door + glow spill
  doorArch(ctx, x, base, 34, 50, '#241a4e', '#171040');
  ctx.fillStyle = `rgba(76,201,240,${.16 + Math.sin(sec * 3) * .05})`;
  ctx.beginPath(); ctx.ellipse(x, base + 4, 34, 10, 0, 0, Math.PI * 2); ctx.fill();
  // windows with game screens
  const scr = ['#4cc9f0', '#ff6b5b', '#ffd75e'];
  [-58, 34].forEach((wx, wi) => {
    ctx.fillStyle = '#241a4e';
    roundRect(ctx, x + wx - 4, base - 48, 32, 26, 5); ctx.fill();
    ctx.fillStyle = scr[(wi + ((sec * 2) | 0)) % 3];
    roundRect(ctx, x + wx, base - 44, 24, 18, 3); ctx.fill();
  });
  // joystick emblem
  ctx.fillStyle = '#ffd75e';
  ctx.beginPath(); ctx.arc(x, base - 78, 7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, base - 72); ctx.lineTo(x, base - 64); ctx.stroke();
  ctx.fillStyle = '#e8e2ff';
  roundRect(ctx, x - 11, base - 64, 22, 6, 3); ctx.fill();
}

/* Style Shop — boutique with scalloped awning */
function drawStyleShop(ctx, b, sec) {
  const x = b.x, base = b.y;
  wallRect(ctx, x - 78, base - 88, 156, 88, 12, '#63d4f5', '#2fa7d4');
  // roofline
  ctx.fillStyle = '#1f7fa6';
  roundRect(ctx, x - 86, base - 100, 172, 18, 9); ctx.fill(); outlineLast(ctx);
  // scalloped awning
  ctx.fillStyle = '#fff';
  roundRect(ctx, x - 72, base - 72, 144, 10, 4); ctx.fill();
  for (let i = 0; i < 6; i++) {
    const ax = x - 60 + i * 24;
    ctx.fillStyle = i % 2 ? '#ff8fa3' : '#fff';
    ctx.beginPath(); ctx.arc(ax, base - 62, 12, 0, Math.PI); ctx.fill();
  }
  // display window with shirt
  ctx.fillStyle = '#fff';
  roundRect(ctx, x - 64, base - 52, 52, 40, 7); ctx.fill();
  const g = ctx.createLinearGradient(x - 60, base - 48, x - 16, base - 16);
  g.addColorStop(0, '#d9f4fd'); g.addColorStop(1, '#aadff2');
  ctx.fillStyle = g;
  roundRect(ctx, x - 60, base - 48, 44, 32, 5); ctx.fill();
  // little shirt on display
  ctx.fillStyle = '#9b5de5';
  ctx.beginPath();
  ctx.moveTo(x - 50, base - 42); ctx.lineTo(x - 44, base - 45); ctx.lineTo(x - 32, base - 45); ctx.lineTo(x - 26, base - 42);
  ctx.lineTo(x - 30, base - 36); ctx.lineTo(x - 33, base - 38); ctx.lineTo(x - 33, base - 24); ctx.lineTo(x - 43, base - 24);
  ctx.lineTo(x - 43, base - 38); ctx.lineTo(x - 46, base - 36); ctx.closePath(); ctx.fill();
  // door
  doorArch(ctx, x + 34, base, 30, 48, '#176d92', '#0f5674');
  // hanging shirt sign
  ctx.strokeStyle = '#6f4a22'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x + 62, base - 88); ctx.lineTo(x + 62, base - 76 + Math.sin(sec * 2) * 1.5); ctx.stroke();
  ctx.fillStyle = '#ffd75e';
  ctx.beginPath(); ctx.arc(x + 62, base - 68 + Math.sin(sec * 2) * 1.5, 10, 0, Math.PI * 2); ctx.fill();
  outlineLast(ctx, 2);
}

/* Badge Hall — little museum with pediment + columns */
function drawBadgeHall(ctx, b, sec) {
  const x = b.x, base = b.y;
  // steps
  ctx.fillStyle = '#d8d3c4';
  roundRect(ctx, x - 84, base - 10, 168, 12, 4); ctx.fill(); outlineLast(ctx, 2);
  ctx.fillStyle = '#e6e1d2';
  roundRect(ctx, x - 76, base - 20, 152, 12, 4); ctx.fill(); outlineLast(ctx, 2);
  // body (warm tan so the white columns pop)
  wallRect(ctx, x - 70, base - 92, 140, 74, 6, '#e9d9ae', '#d4c08d');
  // columns
  ctx.fillStyle = '#fffdf4';
  [-52, -18, 16, 50].forEach(cx => {
    roundRect(ctx, x + cx - 6, base - 88, 13, 70, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(140,125,90,.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x + cx, base - 84); ctx.lineTo(x + cx, base - 24); ctx.stroke();
  });
  // pediment
  const ped = ctx.createLinearGradient(x, base - 130, x, base - 88);
  ped.addColorStop(0, '#fffdf4'); ped.addColorStop(1, '#e8e0c8');
  ctx.fillStyle = ped;
  ctx.beginPath();
  ctx.moveTo(x - 84, base - 90); ctx.lineTo(x, base - 128); ctx.lineTo(x + 84, base - 90);
  ctx.closePath(); ctx.fill(); outlineLast(ctx);
  // gold badge medallion in pediment
  const shine = .8 + Math.sin(sec * 2) * .2;
  ctx.fillStyle = `rgba(255,182,39,${shine})`;
  drawStar(ctx, x, base - 103, 5, 11, 4.6); ctx.fill();
  ctx.strokeStyle = '#c9880a'; ctx.lineWidth = 1.6; ctx.stroke();
  // trophy finial
  ctx.fillStyle = '#ffb627';
  ctx.beginPath(); ctx.moveTo(x - 7, base - 140); ctx.lineTo(x + 7, base - 140); ctx.lineTo(x + 4.6, base - 130); ctx.lineTo(x - 4.6, base - 130); ctx.closePath(); ctx.fill();
  ctx.fillRect(x - 5, base - 128, 10, 3);
  // doorway between center columns
  ctx.fillStyle = '#4a4433';
  roundRect(ctx, x - 11, base - 62, 22, 44, 8); ctx.fill();
}

/* Breakout+ Clubhouse — navy club with string lights */
function drawClubhouse(ctx, b, sec) {
  const x = b.x, base = b.y;
  wallRect(ctx, x - 80, base - 90, 160, 90, 12, '#33517e', '#1d3357');
  // roof
  const roof = ctx.createLinearGradient(x, base - 138, x, base - 86);
  roof.addColorStop(0, '#2a4066'); roof.addColorStop(1, '#16263f');
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - 94, base - 88); ctx.lineTo(x, base - 138); ctx.lineTo(x + 94, base - 88);
  ctx.closePath(); ctx.fill(); outlineLast(ctx);
  // glowing plus sign
  const g2 = .6 + Math.sin(sec * 3) * .3;
  ctx.save();
  ctx.shadowColor = `rgba(255,215,94,${g2})`; ctx.shadowBlur = 16;
  ctx.fillStyle = '#ffd75e';
  roundRect(ctx, x - 4.5, base - 126, 9, 26, 4); ctx.fill();
  roundRect(ctx, x - 13, base - 117.5, 26, 9, 4); ctx.fill();
  ctx.restore();
  // string lights along the eaves
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(x - 90, base - 86); ctx.quadraticCurveTo(x - 45, base - 74, x, base - 84); ctx.quadraticCurveTo(x + 45, base - 74, x + 90, base - 86); ctx.stroke();
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const lx = x - 90 + t * 180;
    const ly = base - 86 + Math.sin(t * Math.PI) * 9 + (t < .5 ? Math.sin(t * 2 * Math.PI) : Math.sin((t - .5) * 2 * Math.PI)) * 1;
    const on = ((sec * 3 + i) | 0) % 3 !== 0;
    ctx.fillStyle = on ? ['#ffd75e', '#ff8fa3', '#4cc9f0'][i % 3] : 'rgba(255,255,255,.3)';
    ctx.beginPath(); ctx.arc(lx, ly + 4, 2.6, 0, Math.PI * 2); ctx.fill();
  }
  // round window
  ctx.fillStyle = '#101c30';
  ctx.beginPath(); ctx.arc(x - 44, base - 52, 15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `rgba(255,224,138,${.5 + Math.sin(sec * 2) * .2})`;
  ctx.beginPath(); ctx.arc(x - 44, base - 52, 11, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#101c30'; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(x - 55, base - 52); ctx.lineTo(x - 33, base - 52); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 44, base - 63); ctx.lineTo(x - 44, base - 41); ctx.stroke();
  // door
  doorArch(ctx, x + 30, base, 32, 52, '#0f1e35', '#0a1526');
  // star flag
  flag(ctx, x + 88, base - 148, 44, '#ffd75e', sec);
}

function drawPadlockBadge(ctx, x, y) {
  ctx.fillStyle = '#e63946';
  ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2.6;
  ctx.strokeRect(x - 5.5, y - 2, 11, 8.5);
  ctx.beginPath(); ctx.arc(x, y - 3, 4.4, Math.PI, 0); ctx.stroke();
}

function drawTree(ctx, x, y, sec) {
  const sway = Math.sin(sec * 1.2 + x) * 2.4;
  ctx.fillStyle = 'rgba(25,45,30,.15)';
  ctx.beginPath(); ctx.ellipse(x, y + 4, 26, 8, 0, 0, Math.PI * 2); ctx.fill();
  const trunk = ctx.createLinearGradient(x - 7, y, x + 7, y);
  trunk.addColorStop(0, '#9a6a35'); trunk.addColorStop(1, '#7a4f24');
  ctx.fillStyle = trunk;
  ctx.beginPath();
  ctx.moveTo(x - 7, y); ctx.quadraticCurveTo(x - 3, y - 22, x - 4, y - 36);
  ctx.lineTo(x + 4, y - 36); ctx.quadraticCurveTo(x + 3, y - 22, x + 7, y);
  ctx.closePath(); ctx.fill();
  // canopy: dark base, mid, light top
  ctx.fillStyle = '#3d8a4a';
  ctx.beginPath();
  ctx.arc(x - 18 + sway, y - 40, 19, 0, Math.PI * 2);
  ctx.arc(x + 18 + sway, y - 40, 19, 0, Math.PI * 2);
  ctx.arc(x + sway, y - 56, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4da457';
  ctx.beginPath();
  ctx.arc(x - 13 + sway, y - 46, 15, 0, Math.PI * 2);
  ctx.arc(x + 13 + sway, y - 46, 15, 0, Math.PI * 2);
  ctx.arc(x + sway, y - 60, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6fc06e';
  ctx.beginPath(); ctx.arc(x - 6 + sway, y - 62, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.beginPath(); ctx.arc(x - 10 + sway, y - 66, 5, 0, Math.PI * 2); ctx.fill();
  // fruit
  if ((x + y) % 3 === 0) {
    ctx.fillStyle = '#ff6b5b';
    ctx.beginPath(); ctx.arc(x + 12 + sway, y - 52, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x - 16 + sway, y - 38, 3.2, 0, Math.PI * 2); ctx.fill();
  }
}

function drawBush(ctx, x, y, sec) {
  const sway = Math.sin(sec * 1.5 + y) * 1.2;
  ctx.fillStyle = 'rgba(25,45,30,.12)';
  ctx.beginPath(); ctx.ellipse(x, y + 3, 20, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4da457';
  ctx.beginPath();
  ctx.arc(x - 11 + sway, y - 6, 11, 0, Math.PI * 2);
  ctx.arc(x + 11 + sway, y - 6, 11, 0, Math.PI * 2);
  ctx.arc(x + sway, y - 12, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6fc06e';
  ctx.beginPath(); ctx.arc(x - 3 + sway, y - 13, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff8fa3';
  ctx.beginPath(); ctx.arc(x + 8 + sway, y - 10, 2.4, 0, Math.PI * 2); ctx.fill();
}

function drawLockStatue(ctx, x, y, sec) {
  const bob = Math.sin(sec * 1.6) * 3;
  // pedestal
  const ped = ctx.createLinearGradient(x, y + 2, x, y + 26);
  ped.addColorStop(0, '#e3ddcc'); ped.addColorStop(1, '#bdb49c');
  ctx.fillStyle = ped;
  roundRect(ctx, x - 30, y + 4, 60, 20, 6); ctx.fill(); outlineLast(ctx, 2);
  ctx.fillStyle = 'rgba(90,74,32,.5)';
  roundRect(ctx, x - 14, y + 10, 28, 8, 3); ctx.fill();
  ctx.save();
  ctx.translate(0, bob);
  // shackle
  ctx.strokeStyle = '#d98e00'; ctx.lineWidth = 10; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y - 36, 19, Math.PI, 0); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y - 36, 22, Math.PI * 1.15, Math.PI * 1.6); ctx.stroke();
  // body with gradient + gloss
  const lg = ctx.createLinearGradient(x - 28, y - 38, x + 28, y + 8);
  lg.addColorStop(0, '#ffd257'); lg.addColorStop(.55, '#ffb627'); lg.addColorStop(1, '#e08f0e');
  ctx.fillStyle = lg;
  roundRect(ctx, x - 29, y - 38, 58, 47, 13); ctx.fill(); outlineLast(ctx);
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  roundRect(ctx, x - 22, y - 33, 14, 30, 7); ctx.fill();
  // keyhole
  ctx.fillStyle = '#7a5310';
  ctx.beginPath(); ctx.arc(x, y - 19, 6.4, 0, Math.PI * 2); ctx.fill();
  roundRect(ctx, x - 2.8, y - 17, 5.6, 13, 2.8); ctx.fill();
  // sparkle
  const sp = (sec % 2.4) / 2.4;
  if (sp < .35) {
    ctx.save(); ctx.globalAlpha = 1 - sp / .35;
    ctx.fillStyle = '#fff';
    drawStar(ctx, x + 21, y - 42, 4, 7, 2.6); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawDock(ctx, sec) {
  const dx = 1010, top = 995;
  // posts in water
  ctx.fillStyle = '#8a5f31';
  [[dx - 20, top + 68], [dx + 20, top + 68], [dx - 20, top + 30], [dx + 20, top + 30]].forEach(([px, py]) => {
    ctx.beginPath(); ctx.ellipse(px, py + 6, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
  });
  // planks
  const g = ctx.createLinearGradient(dx, top, dx, top + 84);
  g.addColorStop(0, '#c99b5f'); g.addColorStop(1, '#a87c42');
  ctx.fillStyle = g;
  roundRect(ctx, dx - 26, top, 52, 84, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(90,60,20,.35)'; ctx.lineWidth = 2;
  roundRect(ctx, dx - 26, top, 52, 84, 8); ctx.stroke();
  for (let i = 1; i < 6; i++) {
    ctx.beginPath(); ctx.moveTo(dx - 24, top + i * 14); ctx.lineTo(dx + 24, top + i * 14); ctx.stroke();
  }
  // rowboat bobbing beside the dock
  const bob = Math.sin(sec * 1.4) * 3, bx = dx + 62, by = top + 62 + bob;
  ctx.fillStyle = 'rgba(0,30,60,.18)';
  ctx.beginPath(); ctx.ellipse(bx, by + 12, 34, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#b34a35';
  ctx.beginPath();
  ctx.moveTo(bx - 34, by);
  ctx.quadraticCurveTo(bx, by + 22, bx + 34, by);
  ctx.lineTo(bx + 26, by - 10);
  ctx.quadraticCurveTo(bx, by - 2, bx - 26, by - 10);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(60,20,10,.4)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#e0b070';
  roundRect(ctx, bx - 12, by - 6, 24, 5, 2.5); ctx.fill();
}

function drawKeyGlyph(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, 6 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(20,20,40,.25)';
  ctx.beginPath(); ctx.arc(x, y, 2.6 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(x + 4 * s, y - 1.6 * s, 14 * s, 3.2 * s);
  ctx.fillRect(x + 12 * s, y + 1.6 * s, 2.6 * s, 4.5 * s);
  ctx.fillRect(x + 16 * s, y + 1.6 * s, 2.6 * s, 6 * s);
}
