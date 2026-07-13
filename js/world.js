/* Breakout Land — the walkable hub island.
   Storybook art pass: thick outlines, dense ground texture (pre-rendered
   terrain buffer), a river with bridges, campfire, carved signage, and
   idle NPCs — in the vein of cozy illustrated island worlds. */

const WORLD = { w: 1600, h: 1100 };

/* Organic island geometry — a soft blob floating in open water */
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

const BUILDINGS = [
  { id: 'daily',  name: 'Lock Plaza',          sub: 'Lock of the Day', x: 800,  y: 470,  w: 170, h: 150 },
  { id: 'games',  name: 'Game Hall',           sub: 'Assigned games',  x: 400,  y: 560,  w: 200, h: 150 },
  { id: 'math',   name: 'Math Trailhead',      sub: 'Breakout Math',   x: 1122, y: 438,  w: 190, h: 140 },
  { id: 'arcade', name: 'The Arcade',          sub: 'Earned play time',x: 1220, y: 760,  w: 190, h: 150 },
  { id: 'shop',   name: 'Style Shop',          sub: 'Spend your keys', x: 430,  y: 870,  w: 170, h: 135 },
  { id: 'badges', name: 'Badge Hall',          sub: 'Your trophies',   x: 640,  y: 330,  w: 170, h: 125 },
  { id: 'plus',   name: 'Breakout+ Clubhouse', sub: 'Bonus content',   x: 880,  y: 880,  w: 175, h: 140 },
];

/* River: flows from the north shore between Badge Hall and Game Hall,
   south past the Style Shop path, out to sea. Two wooden bridges. */
const RIVER_CTRL = [[520, 205], [500, 400], [585, 560], [640, 760], [660, 1030]];
const RIVER_PTS = (() => {
  const pts = [];
  for (let s = 0; s < RIVER_CTRL.length - 1; s++) {
    const [x0, y0] = RIVER_CTRL[s], [x1, y1] = RIVER_CTRL[s + 1];
    const [xp, yp] = RIVER_CTRL[s - 1] || RIVER_CTRL[0];
    const [xn, yn] = RIVER_CTRL[s + 2] || RIVER_CTRL[s + 1];
    for (let t = 0; t < 1; t += .1) {
      // Catmull-Rom
      const t2 = t * t, t3 = t2 * t;
      pts.push([
        .5 * ((2 * x0) + (-xp + x1) * t + (2 * xp - 5 * x0 + 4 * x1 - xn) * t2 + (-xp + 3 * x0 - 3 * x1 + xn) * t3),
        .5 * ((2 * y0) + (-yp + y1) * t + (2 * yp - 5 * y0 + 4 * y1 - yn) * t2 + (-yp + 3 * y0 - 3 * y1 + yn) * t3),
      ]);
    }
  }
  pts.push(RIVER_CTRL[RIVER_CTRL.length - 1]);
  return pts;
})();
function riverDist(x, y) {
  let d = 1e9;
  for (const [rx, ry] of RIVER_PTS) d = Math.min(d, Math.hypot(x - rx, y - ry));
  return d;
}
function riverPath(ctx) {
  ctx.beginPath();
  RIVER_PTS.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
}
const BRIDGES = [[585, 568], [637, 765]];

const TREES = [
  [350, 390], [430, 300], [672, 296], [1008, 300], [1175, 330], [1258, 480], [1262, 700],
  [1160, 895], [900, 945], [620, 945], [408, 828], [338, 600], [1052, 598], [585, 318],
];
const BUSHES = [
  [440, 470], [880, 318], [1146, 522], [1006, 818], [560, 758], [724, 878], [368, 700], [1236, 608],
];
const ROCKS = [[470, 652], [1118, 382], [948, 928], [388, 476]];
const FLOWERS = Array.from({ length: 46 }, (_, i) => [
  170 + ((i * 173) % 1290), 255 + ((i * 271) % 770), ['#ff6b5b', '#ffd75e', '#e75480', '#9b5de5', '#fff'][i % 5],
]);
const TUFTS = Array.from({ length: 60 }, (_, i) => [150 + ((i * 197) % 1320), 245 + ((i * 331) % 790)]);

const CAMPFIRE = { x: 975, y: 352 };

/* Idle NPCs that make the island feel alive (name pills in brand colors) */
const NPCS = [
  { name: 'Maya', color: '#c914a7', mode: 'read', x: 618, y: 352, dir: -1,
    cfg: { skin: '#d99a6c', hairStyle: 'long', hairColor: '#5c3b1e', outfit: 'tee-purple', accessory: 'none', pet: 'nopet' } },
  { name: 'Leo', color: '#0068ff', mode: 'fish', x: 600, y: 560, dir: -1,
    cfg: { skin: '#8c5a33', hairStyle: 'buzz', hairColor: '#2b2118', outfit: 'tee-teal', accessory: 'cap', pet: 'nopet' } },
  { name: 'Zoe', color: '#26b59d', mode: 'wander', cx: 800, cy: 680, r: 118, speed: .3, dir: 1,
    cfg: { skin: '#ffd9b3', hairStyle: 'pony', hairColor: '#c94f30', outfit: 'tee-gold', accessory: 'none', pet: 'nopet' } },
  { name: 'Kai', color: '#5c25b7', mode: 'sit', x: 1035, y: 375, dir: -1,
    cfg: { skin: '#b5764a', hairStyle: 'spiky', hairColor: '#2b2118', outfit: 'tee-coral', accessory: 'none', pet: 'nopet' } },
];

const world = {
  cv: null, ctx: null, raf: null,
  keysDown: {}, target: null, nearBuilding: null,
  dir: 1, walking: false, t0: 0, clouds: [], birds: [],
  terrain: null,
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
    return { x: cam.x + (e.clientX - r.left) / scale, y: cam.y + (e.clientY - r.top) / scale };
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
    const dx2 = state.pos.x - ISLAND.cx, dy2 = (state.pos.y - ISLAND.cy) / ISLAND.sy;
    const th = Math.atan2(dy2, dx2);
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

const INK_LINE = 'rgba(40, 34, 56, .5)';

function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Static terrain painted once into an offscreen buffer (lets us afford
   hundreds of texture marks at 60fps) */
function buildTerrain() {
  const cv = document.createElement('canvas');
  cv.width = WORLD.w; cv.height = WORLD.h;
  const ctx = cv.getContext('2d');

  // shallows hugging the island
  ctx.fillStyle = 'rgba(120,214,235,.5)';
  blobPath(ctx, 1.22, 14); ctx.fill();
  ctx.fillStyle = 'rgba(150,226,242,.55)';
  blobPath(ctx, 1.11, 10); ctx.fill();
  // foam
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  blobPath(ctx, 1.03, 6); ctx.fill();
  // cliff face
  ctx.fillStyle = '#b98e52';
  blobPath(ctx, 1, 34); ctx.fill();
  ctx.fillStyle = '#a87c42';
  blobPath(ctx, 1, 22); ctx.fill();
  // beach
  const sand = ctx.createLinearGradient(0, ISLAND.cy - 460, 0, ISLAND.cy + 470);
  sand.addColorStop(0, '#f4e3b2'); sand.addColorStop(1, '#e8cf92');
  ctx.fillStyle = sand;
  blobPath(ctx, 1, 0); ctx.fill();
  ctx.strokeStyle = 'rgba(160,128,70,.3)'; ctx.lineWidth = 5;
  blobPath(ctx, .985, 2); ctx.stroke();
  // grass plateau + outline
  ctx.fillStyle = '#3f7a38';
  blobPath(ctx, .912, 10); ctx.fill();
  const grass = ctx.createRadialGradient(ISLAND.cx, ISLAND.cy - 80, 120, ISLAND.cx, ISLAND.cy + 40, 720);
  grass.addColorStop(0, '#94d977'); grass.addColorStop(.7, '#77c25f'); grass.addColorStop(1, '#63b050');
  ctx.fillStyle = grass;
  blobPath(ctx, .9, 0); ctx.fill();

  // mowed bands
  ctx.save();
  blobPath(ctx, .9, 0); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.05)';
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.translate(WORLD.w / 2, WORLD.h / 2); ctx.rotate(-.35);
    ctx.fillRect(-1100 + i * 260, -700, 130, 1500);
    ctx.restore();
  }

  // dense grass mottling (clipped to grass)
  const rnd = mulberry(42);
  for (let i = 0; i < 210; i++) {
    const x = 150 + rnd() * 1300, y = 230 + rnd() * 810;
    if (!insideIsland(x, y, .87) || riverDist(x, y) < 62 || Math.hypot(x - 800, y - 570) < 118) continue;
    const w = 14 + rnd() * 30;
    ctx.fillStyle = rnd() < .58 ? 'rgba(255,255,255,.07)' : 'rgba(20,80,25,.08)';
    ctx.beginPath(); ctx.ellipse(x, y, w, w * .55, rnd() * 3, 0, Math.PI * 2); ctx.fill();
  }
  // short grass strokes
  ctx.strokeStyle = 'rgba(48,118,44,.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let i = 0; i < 170; i++) {
    const x = 150 + rnd() * 1300, y = 230 + rnd() * 810;
    if (!insideIsland(x, y, .87) || riverDist(x, y) < 60 || Math.hypot(x - 800, y - 570) < 120) continue;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3 + rnd() * 2, y - 6 - rnd() * 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3, y - 5); ctx.stroke();
  }
  ctx.restore();

  // river (banks → water → highlight), under the paths' bridges
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#3f7a38'; ctx.lineWidth = 92; riverPath(ctx); ctx.stroke();
  ctx.strokeStyle = '#e8cf92'; ctx.lineWidth = 80; riverPath(ctx); ctx.stroke();
  ctx.strokeStyle = '#2384b8'; ctx.lineWidth = 58; riverPath(ctx); ctx.stroke();
  ctx.strokeStyle = '#46b7e8'; ctx.lineWidth = 48; riverPath(ctx); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 12; riverPath(ctx); ctx.stroke();

  // paths (dark border + sand + stones)
  const drawPathTo = (b) => {
    const mx = (800 + b.x) / 2, my = (570 + b.y) / 2 + 40;
    ctx.strokeStyle = 'rgba(130,96,48,.55)'; ctx.lineWidth = 46;
    ctx.beginPath(); ctx.moveTo(800, 570); ctx.quadraticCurveTo(mx, my, b.x, b.y + 22); ctx.stroke();
    ctx.strokeStyle = '#dcbc82'; ctx.lineWidth = 40;
    ctx.beginPath(); ctx.moveTo(800, 570); ctx.quadraticCurveTo(mx, my, b.x, b.y + 22); ctx.stroke();
    ctx.strokeStyle = '#ead29b'; ctx.lineWidth = 26;
    ctx.beginPath(); ctx.moveTo(800, 570); ctx.quadraticCurveTo(mx, my, b.x, b.y + 22); ctx.stroke();
    ctx.fillStyle = 'rgba(190,155,95,.5)';
    for (let t = .3; t < .95; t += .22) {
      const px = (1 - t) * (1 - t) * 800 + 2 * (1 - t) * t * mx + t * t * b.x;
      const py = (1 - t) * (1 - t) * 570 + 2 * (1 - t) * t * my + t * t * (b.y + 22);
      ctx.beginPath(); ctx.ellipse(px, py, 7, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    }
  };
  BUILDINGS.forEach(drawPathTo);
  drawPathTo({ x: 1010, y: 973 }); // path to the dock

  // plaza
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

  // bridges over the river
  BRIDGES.forEach(([bx, by]) => drawBridge(ctx, bx, by));

  // static flowers, tufts, daisies, rocks
  TUFTS.forEach(([tx, ty], i) => {
    if (!insideIsland(tx, ty, .86) || riverDist(tx, ty) < 58 || Math.hypot(tx - 800, ty - 570) < 120) return;
    ctx.strokeStyle = 'rgba(45,110,42,.6)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx - 3, ty - 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + 2, ty - 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + 5, ty - 5); ctx.stroke();
  });
  FLOWERS.forEach(([fx, fy, c]) => {
    if (!insideIsland(fx, fy, .86) || riverDist(fx, fy) < 58 || Math.hypot(fx - 800, fy - 570) < 125) return;
    ctx.fillStyle = c;
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      ctx.beginPath(); ctx.arc(fx + Math.cos(a) * 3.2, fy + Math.sin(a) * 3.2, 2.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ffd75e';
    ctx.beginPath(); ctx.arc(fx, fy, 2, 0, Math.PI * 2); ctx.fill();
  });
  ROCKS.forEach(([rx, ry]) => {
    ctx.fillStyle = 'rgba(30,50,40,.14)';
    ctx.beginPath(); ctx.ellipse(rx, ry + 6, 16, 5, 0, 0, Math.PI * 2); ctx.fill();
    const rg = ctx.createLinearGradient(rx - 12, ry - 14, rx + 10, ry + 8);
    rg.addColorStop(0, '#c3cbc6'); rg.addColorStop(1, '#93a09b');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(rx - 15, ry + 6); ctx.quadraticCurveTo(rx - 14, ry - 10, rx - 2, ry - 13);
    ctx.quadraticCurveTo(rx + 12, ry - 12, rx + 14, ry + 2); ctx.quadraticCurveTo(rx + 10, ry + 8, rx - 15, ry + 6);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = INK_LINE; ctx.lineWidth = 2.5; ctx.stroke();
  });

  // dock planks (static part; the rowboat is animated live)
  drawDockPlanks(ctx);

  // campfire stones + log bench (flames drawn live)
  drawCampsite(ctx);

  return cv;
}

function drawBridge(ctx, x, y) {
  ctx.fillStyle = 'rgba(30,40,30,.2)';
  ctx.beginPath(); ctx.ellipse(x, y + 26, 66, 10, 0, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createLinearGradient(x, y - 24, x, y + 24);
  g.addColorStop(0, '#c99b5f'); g.addColorStop(1, '#a87c42');
  ctx.fillStyle = g;
  roundRect(ctx, x - 62, y - 22, 124, 44, 10); ctx.fill();
  ctx.strokeStyle = INK_LINE; ctx.lineWidth = 3; ctx.stroke();
  ctx.strokeStyle = 'rgba(90,60,20,.4)'; ctx.lineWidth = 2;
  for (let i = -4; i <= 4; i++) {
    ctx.beginPath(); ctx.moveTo(x + i * 13, y - 20); ctx.lineTo(x + i * 13, y + 20); ctx.stroke();
  }
  // rails
  ctx.fillStyle = '#8a5f31';
  roundRect(ctx, x - 66, y - 30, 132, 8, 4); ctx.fill();
  roundRect(ctx, x - 66, y + 22, 132, 8, 4); ctx.fill();
  [[-58, -26], [58, -26], [-58, 26], [58, 26]].forEach(([px, py]) => {
    ctx.beginPath(); ctx.arc(x + px, y + py, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK_LINE; ctx.lineWidth = 2; ctx.stroke();
  });
}

function drawDockPlanks(ctx) {
  const dx = 1010, top = 995;
  ctx.fillStyle = '#8a5f31';
  [[dx - 20, top + 68], [dx + 20, top + 68], [dx - 20, top + 30], [dx + 20, top + 30]].forEach(([px, py]) => {
    ctx.beginPath(); ctx.ellipse(px, py + 6, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
  });
  const g = ctx.createLinearGradient(dx, top, dx, top + 84);
  g.addColorStop(0, '#c99b5f'); g.addColorStop(1, '#a87c42');
  ctx.fillStyle = g;
  roundRect(ctx, dx - 26, top, 52, 84, 8); ctx.fill();
  ctx.strokeStyle = INK_LINE; ctx.lineWidth = 3;
  roundRect(ctx, dx - 26, top, 52, 84, 8); ctx.stroke();
  ctx.strokeStyle = 'rgba(90,60,20,.35)'; ctx.lineWidth = 2;
  for (let i = 1; i < 6; i++) {
    ctx.beginPath(); ctx.moveTo(dx - 24, top + i * 14); ctx.lineTo(dx + 24, top + i * 14); ctx.stroke();
  }
}

function drawCampsite(ctx) {
  const { x, y } = CAMPFIRE;
  // worn ground
  ctx.fillStyle = 'rgba(216,186,130,.55)';
  ctx.beginPath(); ctx.ellipse(x, y + 4, 58, 30, 0, 0, Math.PI * 2); ctx.fill();
  // stone ring
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const sx = x + Math.cos(a) * 26, sy = y + Math.sin(a) * 15;
    ctx.fillStyle = i % 2 ? '#a8b2ac' : '#93a09b';
    ctx.beginPath(); ctx.ellipse(sx, sy, 7, 5.5, a, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK_LINE; ctx.lineWidth = 2; ctx.stroke();
  }
  // log bench
  ctx.fillStyle = '#a87c42';
  roundRect(ctx, x + 38, y + 8, 52, 13, 6.5); ctx.fill();
  ctx.strokeStyle = INK_LINE; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = '#c99b5f';
  ctx.beginPath(); ctx.ellipse(x + 38, y + 14.5, 4, 6.5, 0, 0, Math.PI * 2); ctx.fill();
}

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

  // open water
  const sea = ctx.createLinearGradient(0, 0, 0, H);
  sea.addColorStop(0, '#37a6d4'); sea.addColorStop(.55, '#2c95c7'); sea.addColorStop(1, '#2384b8');
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-cam.x, -cam.y);

  // pre-rendered terrain
  if (!world.terrain) world.terrain = buildTerrain();
  ctx.drawImage(world.terrain, 0, 0);

  // animated water: open-sea waves + foam shimmer + river flow
  ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    const wx = 60 + (i * 267) % (WORLD.w - 120), wy = 60 + (i * 353) % (WORLD.h - 120);
    if (insideIsland(wx, wy, 1.12)) continue;
    const off = Math.sin(sec * 1.5 + i) * 5;
    ctx.beginPath(); ctx.arc(wx + off, wy, 11, Math.PI * .12, Math.PI * .88); ctx.stroke();
  }
  ctx.strokeStyle = `rgba(255,255,255,${.35 + Math.sin(sec * 1.6) * .15})`;
  ctx.lineWidth = 7;
  blobPath(ctx, 1.045 + Math.sin(sec * 1.3) * .008, 8); ctx.stroke();
  // river flow dashes
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.setLineDash([16, 26]);
  ctx.lineDashOffset = -sec * 34;
  riverPath(ctx); ctx.stroke();
  ctx.restore();

  // rowboat bobbing by the dock
  drawBoat(ctx, sec);
  // lock statue
  drawLockStatue(ctx, 800, 545, sec);
  // campfire flames
  drawFlames(ctx, sec);

  // y-sorted entities
  const drawables = [
    ...BUILDINGS.map(b => ({ y: b.y, fn: () => drawBuilding(ctx, b, sec) })),
    ...TREES.filter(([tx, ty]) => insideIsland(tx, ty, .84)).map(([tx, ty]) => ({ y: ty, fn: () => drawTree(ctx, tx, ty, sec) })),
    ...BUSHES.filter(([bx, by]) => insideIsland(bx, by, .84)).map(([bx, by]) => ({ y: by, fn: () => drawBush(ctx, bx, by, sec) })),
    ...NPCS.map(n => ({ y: npcPos(n, sec).y, fn: () => drawNPC(ctx, n, sec) })),
    { y: 268, fn: () => drawWelcomeSign(ctx, 800, 268, sec) },
    { y: 668, fn: () => drawSignpost(ctx, 908, 668) },
    {
      y: state.pos.y,
      fn: () => {
        drawPet(ctx, state.pos.x - 34 * world.dir, state.pos.y + 2, 1, state.player.pet, sec);
        drawAvatar(ctx, state.pos.x, state.pos.y, 1, state.player, sec, world.walking, world.dir);
        namePill(ctx, state.pos.x, state.pos.y - 118, state.player.name || 'Explorer', '#002d72');
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
    if (!insideIsland(kx, ky, .88) || riverDist(kx, ky) < 60) continue;
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
    ctx.beginPath(); ctx.moveTo(bx - 7, by - f); ctx.quadraticCurveTo(bx, by + 3, bx, by); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + 7, by - f); ctx.quadraticCurveTo(bx, by + 3, bx, by); ctx.stroke();
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

/* ---- living island: NPCs, campfire, boat, signage ---- */

function npcPos(n, sec) {
  if (n.mode === 'wander') {
    const a = sec * n.speed + 1.4;
    return { x: n.cx + Math.cos(a) * n.r, y: n.cy + Math.sin(a) * n.r * .55 };
  }
  return { x: n.x, y: n.y };
}

function drawNPC(ctx, n, sec) {
  const p = npcPos(n, sec);
  let dir = n.dir || 1, walking = false;
  if (n.mode === 'wander') {
    const a = sec * n.speed + 1.4;
    dir = -Math.sin(a) >= 0 ? -1 : 1;
    walking = true;
  }
  drawAvatar(ctx, p.x, p.y, .92, n.cfg, sec + p.x, walking, dir);
  if (n.mode === 'fish') {
    // rod + line + bobber with ripple
    ctx.strokeStyle = '#6f4a22'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(p.x - 14, p.y - 24); ctx.lineTo(p.x - 46, p.y - 58); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.5;
    const bobY = p.y + 26 + Math.sin(sec * 2.2) * 3;
    ctx.beginPath(); ctx.moveTo(p.x - 46, p.y - 58); ctx.lineTo(p.x - 52, bobY); ctx.stroke();
    ctx.fillStyle = '#ff6b5b';
    ctx.beginPath(); ctx.arc(p.x - 52, bobY, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x - 52, bobY + 2, 8 + (sec * 14 % 10), 0, Math.PI * 2); ctx.stroke();
  }
  if (n.mode === 'read') {
    ctx.fillStyle = '#0068ff';
    ctx.save(); ctx.translate(p.x + (n.dir || 1) * -14, p.y - 26); ctx.rotate(-.15);
    roundRect(ctx, -8, -6, 16, 12, 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 5); ctx.stroke();
    ctx.restore();
  }
  if (n.mode === 'sit') {
    // cocoa mug
    ctx.fillStyle = '#ffd75e';
    roundRect(ctx, p.x - 20, p.y - 28, 9, 10, 2.5); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5;
    const st = Math.sin(sec * 3) * 2;
    ctx.beginPath(); ctx.moveTo(p.x - 15, p.y - 32); ctx.quadraticCurveTo(p.x - 13 + st, p.y - 38, p.x - 15, p.y - 44); ctx.stroke();
  }
  namePill(ctx, p.x, p.y - 112, n.name, n.color);
}

function namePill(ctx, x, y, text, color) {
  ctx.font = '700 12.5px system-ui, sans-serif';
  const tw = ctx.measureText(text).width;
  ctx.fillStyle = color;
  roundRect(ctx, x - tw / 2 - 9, y, tw + 18, 20, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2;
  roundRect(ctx, x - tw / 2 - 9, y, tw + 18, 20, 10); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y + 14);
  ctx.textAlign = 'left';
}

function drawFlames(ctx, sec) {
  const { x, y } = CAMPFIRE;
  // glow
  const g = ctx.createRadialGradient(x, y - 6, 4, x, y - 6, 46);
  g.addColorStop(0, `rgba(255,190,80,${.4 + Math.sin(sec * 9) * .1})`);
  g.addColorStop(1, 'rgba(255,190,80,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y - 6, 46, 0, Math.PI * 2); ctx.fill();
  // logs
  ctx.strokeStyle = '#6f4a22'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 12, y + 4); ctx.lineTo(x + 12, y - 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 12, y - 2); ctx.lineTo(x + 12, y + 4); ctx.stroke();
  // flames
  for (let i = 0; i < 3; i++) {
    const fl = Math.sin(sec * 10 + i * 2.3) * 3;
    const h = [22, 15, 11][i] + fl;
    ctx.fillStyle = ['#ff8a3d', '#ffb627', '#ffe08a'][i];
    ctx.beginPath();
    ctx.moveTo(x - 9 + i * 3, y - 2);
    ctx.quadraticCurveTo(x - 12 + i * 3, y - h * .6, x + (i - 1) * 2 + fl * .4, y - h);
    ctx.quadraticCurveTo(x + 10 - i * 3, y - h * .55, x + 9 - i * 3, y - 2);
    ctx.closePath(); ctx.fill();
  }
  // sparks
  for (let i = 0; i < 3; i++) {
    const t = (sec * .9 + i * .33) % 1;
    ctx.save(); ctx.globalAlpha = 1 - t;
    ctx.fillStyle = '#ffd75e';
    ctx.beginPath(); ctx.arc(x + Math.sin((sec + i) * 5) * 8, y - 8 - t * 34, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function drawBoat(ctx, sec) {
  const bob = Math.sin(sec * 1.4) * 3, bx = 1072, by = 1057 + bob;
  ctx.fillStyle = 'rgba(0,30,60,.18)';
  ctx.beginPath(); ctx.ellipse(bx, by + 12, 34, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#b34a35';
  ctx.beginPath();
  ctx.moveTo(bx - 34, by);
  ctx.quadraticCurveTo(bx, by + 22, bx + 34, by);
  ctx.lineTo(bx + 26, by - 10);
  ctx.quadraticCurveTo(bx, by - 2, bx - 26, by - 10);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = INK_LINE; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = '#e0b070';
  roundRect(ctx, bx - 12, by - 6, 24, 5, 2.5); ctx.fill();
}

/* Carved wooden welcome sign near the dock (the reference's big sign) */
function drawWelcomeSign(ctx, x, y, sec) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-.02);
  // posts
  ctx.fillStyle = '#8a5f31';
  roundRect(ctx, -104, -46, 14, 52, 6); ctx.fill();
  ctx.strokeStyle = INK_LINE; ctx.lineWidth = 3; ctx.stroke();
  roundRect(ctx, 90, -46, 14, 52, 6); ctx.fill(); ctx.stroke();
  // plank
  const g = ctx.createLinearGradient(0, -78, 0, -26);
  g.addColorStop(0, '#c99b5f'); g.addColorStop(1, '#9c7038');
  ctx.fillStyle = g;
  roundRect(ctx, -118, -80, 236, 52, 14); ctx.fill();
  ctx.strokeStyle = INK_LINE; ctx.lineWidth = 3.5; ctx.stroke();
  ctx.strokeStyle = 'rgba(90,60,20,.4)'; ctx.lineWidth = 2;
  roundRect(ctx, -110, -73, 220, 38, 10); ctx.stroke();
  // carved brand lettering
  ctx.font = '800 21px "Helix", "Quicksand", "Avenir Next", "Century Gothic", ui-rounded, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(70,44,12,.9)';
  ctx.fillText('BREAKOUT LAND', 0, -45);
  ctx.fillStyle = '#ffd75e';
  ctx.fillText('BREAKOUT LAND', 0, -47);
  ctx.textAlign = 'left';
  ctx.restore();
}

function drawSignpost(ctx, x, y) {
  ctx.fillStyle = 'rgba(30,40,30,.16)';
  ctx.beginPath(); ctx.ellipse(x, y + 2, 14, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8a5f31';
  roundRect(ctx, x - 5, y - 58, 10, 60, 4); ctx.fill();
  ctx.strokeStyle = INK_LINE; ctx.lineWidth = 2.5; ctx.stroke();
  const board = (by, text, flip) => {
    ctx.fillStyle = '#c99b5f';
    ctx.save();
    ctx.translate(x, by);
    ctx.scale(flip ? -1 : 1, 1);
    ctx.beginPath();
    ctx.moveTo(-6, -9); ctx.lineTo(48, -9); ctx.lineTo(58, 0); ctx.lineTo(48, 9); ctx.lineTo(-6, 9);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = INK_LINE; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
    ctx.font = '800 10.5px system-ui';
    ctx.fillStyle = '#4a3410';
    ctx.textAlign = 'center';
    ctx.fillText(text, x + (flip ? -24 : 24), y + by - y + 3.5);
    ctx.textAlign = 'left';
  };
  board(y - 46, 'ARCADE', false);
  board(y - 24, 'SHOP', true);
}

/* =============== buildings =============== */

function drawBuilding(ctx, b, sec) {
  const near = world.nearBuilding && world.nearBuilding.id === b.id;
  ctx.fillStyle = 'rgba(25,45,30,.16)';
  ctx.beginPath(); ctx.ellipse(b.x, b.y + 14, b.w * .58, 16, 0, 0, Math.PI * 2); ctx.fill();

  if (near) {
    const pulse = .5 + Math.sin(sec * 4) * .18;
    const g = ctx.createRadialGradient(b.x, b.y + 8, 10, b.x, b.y + 8, b.w * .8);
    g.addColorStop(0, `rgba(255,233,138,${pulse})`); g.addColorStop(1, 'rgba(255,233,138,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(b.x, b.y + 8, b.w * .8, 34, 0, 0, Math.PI * 2); ctx.fill();
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

  drawSign(ctx, b.x, b.y + 16, b.name);

  if (b.id === 'arcade' && !arcadeAllowed()) drawPadlockBadge(ctx, b.x + b.w / 2 - 6, b.y - b.h + 26);
  if (b.id === 'plus' && !state.plus) drawPadlockBadge(ctx, b.x + b.w / 2 - 6, b.y - b.h + 26);
}

function outlineLast(ctx, lw = 3) { ctx.strokeStyle = INK_LINE; ctx.lineWidth = lw; ctx.stroke(); }

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
  ctx.strokeStyle = INK_LINE; ctx.lineWidth = 2; ctx.stroke();
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
  ctx.fillStyle = '#8a5f31';
  ctx.fillRect(x - w / 2 + 5, y - 6, 4, 14); ctx.fillRect(x + w / 2 - 9, y - 6, 4, 14);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#fffbef'); g.addColorStop(1, '#f4e6c4');
  ctx.fillStyle = g;
  roundRect(ctx, x - w / 2, y, w, h, 9); ctx.fill();
  ctx.strokeStyle = '#b08d54'; ctx.lineWidth = 2.5;
  roundRect(ctx, x - w / 2, y, w, h, 9); ctx.stroke();
  ctx.fillStyle = '#3c3325';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y + 19);
  ctx.textAlign = 'left';
}

/* Lock Plaza pavilion — gold dome, keyhole doorway */
function drawLockPavilion(ctx, b, sec) {
  const x = b.x, base = b.y;
  wallRect(ctx, x - 72, base - 86, 144, 86, 12, '#fff6df', '#f3ddae');
  ctx.fillStyle = '#e8cf98';
  ctx.fillRect(x - 66, base - 82, 10, 82); ctx.fillRect(x + 56, base - 82, 10, 82);
  ctx.fillStyle = '#e0a52a';
  roundRect(ctx, x - 84, base - 96, 168, 14, 7); ctx.fill(); outlineLast(ctx, 2.5);
  const dome = ctx.createLinearGradient(x - 70, base - 160, x + 70, base - 90);
  dome.addColorStop(0, '#ffd257'); dome.addColorStop(.5, '#ffb627'); dome.addColorStop(1, '#e08f0e');
  ctx.fillStyle = dome;
  ctx.beginPath();
  ctx.moveTo(x - 76, base - 96);
  ctx.bezierCurveTo(x - 78, base - 138, x - 42, base - 158, x, base - 158);
  ctx.bezierCurveTo(x + 42, base - 158, x + 78, base - 138, x + 76, base - 96);
  ctx.closePath(); ctx.fill();
  outlineLast(ctx);
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
  ctx.fillStyle = '#e0a52a';
  ctx.beginPath(); ctx.arc(x, base - 160, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(x, base - 172); ctx.rotate(Math.sin(sec * 1.4) * .1);
  drawKeyGlyph(ctx, -8, 0, 1, '#ffdf7e');
  ctx.restore();
  ctx.fillStyle = '#4a3405';
  ctx.beginPath(); ctx.arc(x, base - 52, 15, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 10, base); ctx.lineTo(x - 4, base - 46); ctx.lineTo(x + 4, base - 46); ctx.lineTo(x + 10, base);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = `rgba(255,214,94,${.5 + Math.sin(sec * 2.4) * .2})`;
  ctx.beginPath(); ctx.arc(x, base - 52, 7, 0, Math.PI * 2); ctx.fill();
  windowPane(ctx, x - 52, base - 62, 22, 26);
  windowPane(ctx, x + 30, base - 62, 22, 26);
  bunting(ctx, x - 78, base - 90, x + 78, base - 90, sec);
}

/* Game Hall — red banner hall with marquee + awning */
function drawGameHall(ctx, b, sec) {
  const x = b.x, base = b.y;
  wallRect(ctx, x - 92, base - 92, 184, 92, 12, '#ff7d67', '#e2523f');
  ctx.fillStyle = '#fff2e2';
  roundRect(ctx, x - 92, base - 98, 184, 14, 7); ctx.fill(); outlineLast(ctx, 2.5);
  const roof = ctx.createLinearGradient(x, base - 160, x, base - 92);
  roof.addColorStop(0, '#ff9d84'); roof.addColorStop(1, '#e2523f');
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - 104, base - 94);
  ctx.quadraticCurveTo(x, base - 168, x + 104, base - 94);
  ctx.closePath(); ctx.fill();
  outlineLast(ctx);
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
  const mw = 120;
  ctx.fillStyle = '#27406e';
  roundRect(ctx, x - mw / 2, base - 128, mw, 24, 8); ctx.fill();
  outlineLast(ctx, 2.5);
  ctx.font = '900 13px system-ui'; ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe08a';
  ctx.fillText('★ GAMES ★', x, base - 111);
  ctx.textAlign = 'left';
  for (let i = 0; i < 8; i++) {
    const on = ((sec * 4) | 0) % 2 === i % 2;
    ctx.fillStyle = on ? '#ffe08a' : '#8fa3c9';
    ctx.beginPath(); ctx.arc(x - mw / 2 + 8 + i * (mw - 16) / 7, base - 130, 2.4, 0, Math.PI * 2); ctx.fill();
  }
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
  ctx.fillStyle = '#a9b3ad';
  roundRect(ctx, x - 84, base - 34, 26, 34, 5); ctx.fill(); outlineLast(ctx, 2.5);
  roundRect(ctx, x + 58, base - 34, 26, 34, 5); ctx.fill(); outlineLast(ctx, 2.5);
  const wood = ctx.createLinearGradient(x, base - 130, x, base);
  wood.addColorStop(0, '#a97b45'); wood.addColorStop(1, '#8a5f31');
  ctx.fillStyle = wood;
  roundRect(ctx, x - 79, base - 118, 16, 86, 6); ctx.fill(); outlineLast(ctx, 2.5);
  roundRect(ctx, x + 63, base - 118, 16, 86, 6); ctx.fill(); outlineLast(ctx, 2.5);
  ctx.fillStyle = wood;
  ctx.beginPath();
  ctx.moveTo(x - 92, base - 106);
  ctx.quadraticCurveTo(x, base - 148, x + 92, base - 106);
  ctx.lineTo(x + 92, base - 92);
  ctx.quadraticCurveTo(x, base - 134, x - 92, base - 92);
  ctx.closePath(); ctx.fill(); outlineLast(ctx);
  const sw = 108;
  ctx.strokeStyle = '#6f4a22'; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(x - sw / 2 + 12, base - 118); ctx.lineTo(x - sw / 2 + 16, base - 96); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + sw / 2 - 12, base - 118); ctx.lineTo(x + sw / 2 - 16, base - 96); ctx.stroke();
  const sg = ctx.createLinearGradient(x, base - 96, x, base - 66);
  sg.addColorStop(0, '#6dcf7e'); sg.addColorStop(1, '#43a457');
  ctx.fillStyle = sg;
  roundRect(ctx, x - sw / 2, base - 96, sw, 30, 8); ctx.fill(); outlineLast(ctx, 2.5);
  ctx.font = '900 15px system-ui'; ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText('× ÷ + −', x, base - 75);
  ctx.textAlign = 'left';
  drawBush(ctx, x - 96, base - 2, sec);
  drawBush(ctx, x + 96, base - 2, sec + .8);
  flag(ctx, x - 76, base - 152, 34, '#57c26b', sec);
  flag(ctx, x + 63, base - 152, 34, '#ffd75e', sec + .7);
}

/* Arcade — purple facade, glowing neon sign */
function drawArcade(ctx, b, sec) {
  const x = b.x, base = b.y;
  wallRect(ctx, x - 88, base - 96, 176, 96, 12, '#a86ef0', '#7d43c9');
  ctx.fillStyle = '#3b2a6b';
  roundRect(ctx, x - 80, base - 60, 160, 60, 10); ctx.fill();
  ctx.fillStyle = '#5b3fbf';
  roundRect(ctx, x - 96, base - 108, 192, 18, 9); ctx.fill(); outlineLast(ctx, 2.5);
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
  ctx.strokeStyle = `rgba(76,201,240,${.5 + Math.sin(sec * 5 + 1.5) * .3})`; ctx.lineWidth = 2.5;
  roundRect(ctx, x - 62, base - 146, 124, 34, 12); ctx.stroke();
  doorArch(ctx, x, base, 34, 50, '#241a4e', '#171040');
  ctx.fillStyle = `rgba(76,201,240,${.16 + Math.sin(sec * 3) * .05})`;
  ctx.beginPath(); ctx.ellipse(x, base + 4, 34, 10, 0, 0, Math.PI * 2); ctx.fill();
  const scr = ['#4cc9f0', '#ff6b5b', '#ffd75e'];
  [-58, 34].forEach((wx, wi) => {
    ctx.fillStyle = '#241a4e';
    roundRect(ctx, x + wx - 4, base - 48, 32, 26, 5); ctx.fill();
    ctx.fillStyle = scr[(wi + ((sec * 2) | 0)) % 3];
    roundRect(ctx, x + wx, base - 44, 24, 18, 3); ctx.fill();
  });
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
  ctx.fillStyle = '#1f7fa6';
  roundRect(ctx, x - 86, base - 100, 172, 18, 9); ctx.fill(); outlineLast(ctx, 2.5);
  ctx.fillStyle = '#fff';
  roundRect(ctx, x - 72, base - 72, 144, 10, 4); ctx.fill();
  for (let i = 0; i < 6; i++) {
    const ax = x - 60 + i * 24;
    ctx.fillStyle = i % 2 ? '#ff8fa3' : '#fff';
    ctx.beginPath(); ctx.arc(ax, base - 62, 12, 0, Math.PI); ctx.fill();
  }
  ctx.fillStyle = '#fff';
  roundRect(ctx, x - 64, base - 52, 52, 40, 7); ctx.fill();
  ctx.strokeStyle = INK_LINE; ctx.lineWidth = 2.5; ctx.stroke();
  const g = ctx.createLinearGradient(x - 60, base - 48, x - 16, base - 16);
  g.addColorStop(0, '#d9f4fd'); g.addColorStop(1, '#aadff2');
  ctx.fillStyle = g;
  roundRect(ctx, x - 60, base - 48, 44, 32, 5); ctx.fill();
  ctx.fillStyle = '#9b5de5';
  ctx.beginPath();
  ctx.moveTo(x - 50, base - 42); ctx.lineTo(x - 44, base - 45); ctx.lineTo(x - 32, base - 45); ctx.lineTo(x - 26, base - 42);
  ctx.lineTo(x - 30, base - 36); ctx.lineTo(x - 33, base - 38); ctx.lineTo(x - 33, base - 24); ctx.lineTo(x - 43, base - 24);
  ctx.lineTo(x - 43, base - 38); ctx.lineTo(x - 46, base - 36); ctx.closePath(); ctx.fill();
  doorArch(ctx, x + 34, base, 30, 48, '#176d92', '#0f5674');
  ctx.strokeStyle = '#6f4a22'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x + 62, base - 88); ctx.lineTo(x + 62, base - 76 + Math.sin(sec * 2) * 1.5); ctx.stroke();
  ctx.fillStyle = '#ffd75e';
  ctx.beginPath(); ctx.arc(x + 62, base - 68 + Math.sin(sec * 2) * 1.5, 10, 0, Math.PI * 2); ctx.fill();
  outlineLast(ctx, 2);
}

/* Badge Hall — little museum with pediment + columns */
function drawBadgeHall(ctx, b, sec) {
  const x = b.x, base = b.y;
  ctx.fillStyle = '#d8d3c4';
  roundRect(ctx, x - 84, base - 10, 168, 12, 4); ctx.fill(); outlineLast(ctx, 2);
  ctx.fillStyle = '#e6e1d2';
  roundRect(ctx, x - 76, base - 20, 152, 12, 4); ctx.fill(); outlineLast(ctx, 2);
  wallRect(ctx, x - 70, base - 92, 140, 74, 6, '#e9d9ae', '#d4c08d');
  ctx.fillStyle = '#fffdf4';
  [-52, -18, 16, 50].forEach(cx => {
    roundRect(ctx, x + cx - 6, base - 88, 13, 70, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(140,125,90,.45)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x + cx, base - 84); ctx.lineTo(x + cx, base - 24); ctx.stroke();
  });
  const ped = ctx.createLinearGradient(x, base - 130, x, base - 88);
  ped.addColorStop(0, '#fffdf4'); ped.addColorStop(1, '#e8e0c8');
  ctx.fillStyle = ped;
  ctx.beginPath();
  ctx.moveTo(x - 84, base - 90); ctx.lineTo(x, base - 128); ctx.lineTo(x + 84, base - 90);
  ctx.closePath(); ctx.fill(); outlineLast(ctx);
  const shine = .8 + Math.sin(sec * 2) * .2;
  ctx.fillStyle = `rgba(255,182,39,${shine})`;
  drawStar(ctx, x, base - 103, 5, 11, 4.6); ctx.fill();
  ctx.strokeStyle = '#c9880a'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = '#ffb627';
  ctx.beginPath(); ctx.moveTo(x - 7, base - 140); ctx.lineTo(x + 7, base - 140); ctx.lineTo(x + 4.6, base - 130); ctx.lineTo(x - 4.6, base - 130); ctx.closePath(); ctx.fill();
  ctx.fillRect(x - 5, base - 128, 10, 3);
  ctx.fillStyle = '#4a4433';
  roundRect(ctx, x - 11, base - 62, 22, 44, 8); ctx.fill();
}

/* Breakout+ Clubhouse — navy club with string lights */
function drawClubhouse(ctx, b, sec) {
  const x = b.x, base = b.y;
  wallRect(ctx, x - 80, base - 90, 160, 90, 12, '#33517e', '#1d3357');
  const roof = ctx.createLinearGradient(x, base - 138, x, base - 86);
  roof.addColorStop(0, '#2a4066'); roof.addColorStop(1, '#16263f');
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - 94, base - 88); ctx.lineTo(x, base - 138); ctx.lineTo(x + 94, base - 88);
  ctx.closePath(); ctx.fill(); outlineLast(ctx);
  const g2 = .6 + Math.sin(sec * 3) * .3;
  ctx.save();
  ctx.shadowColor = `rgba(255,215,94,${g2})`; ctx.shadowBlur = 16;
  ctx.fillStyle = '#ffd75e';
  roundRect(ctx, x - 4.5, base - 126, 9, 26, 4); ctx.fill();
  roundRect(ctx, x - 13, base - 117.5, 26, 9, 4); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(x - 90, base - 86); ctx.quadraticCurveTo(x - 45, base - 74, x, base - 84); ctx.quadraticCurveTo(x + 45, base - 74, x + 90, base - 86); ctx.stroke();
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const lx = x - 90 + t * 180;
    const ly = base - 86 + Math.sin(t * Math.PI) * 9;
    const on = ((sec * 3 + i) | 0) % 3 !== 0;
    ctx.fillStyle = on ? ['#ffd75e', '#ff8fa3', '#4cc9f0'][i % 3] : 'rgba(255,255,255,.3)';
    ctx.beginPath(); ctx.arc(lx, ly + 4, 2.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#101c30';
  ctx.beginPath(); ctx.arc(x - 44, base - 52, 15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `rgba(255,224,138,${.5 + Math.sin(sec * 2) * .2})`;
  ctx.beginPath(); ctx.arc(x - 44, base - 52, 11, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#101c30'; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(x - 55, base - 52); ctx.lineTo(x - 33, base - 52); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 44, base - 63); ctx.lineTo(x - 44, base - 41); ctx.stroke();
  doorArch(ctx, x + 30, base, 32, 52, '#0f1e35', '#0a1526');
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
  ctx.strokeStyle = INK_LINE; ctx.lineWidth = 2.5; ctx.stroke();
  // dark silhouette gives the cartoon outline
  ctx.fillStyle = '#2e5a33';
  ctx.beginPath();
  ctx.arc(x - 18 + sway, y - 40, 22.5, 0, Math.PI * 2);
  ctx.arc(x + 18 + sway, y - 40, 22.5, 0, Math.PI * 2);
  ctx.arc(x + sway, y - 56, 29.5, 0, Math.PI * 2);
  ctx.fill();
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
  ctx.fillStyle = '#2e5a33';
  ctx.beginPath();
  ctx.arc(x - 11 + sway, y - 6, 13.5, 0, Math.PI * 2);
  ctx.arc(x + 11 + sway, y - 6, 13.5, 0, Math.PI * 2);
  ctx.arc(x + sway, y - 12, 15.5, 0, Math.PI * 2);
  ctx.fill();
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
  const ped = ctx.createLinearGradient(x, y + 2, x, y + 26);
  ped.addColorStop(0, '#e3ddcc'); ped.addColorStop(1, '#bdb49c');
  ctx.fillStyle = ped;
  roundRect(ctx, x - 30, y + 4, 60, 20, 6); ctx.fill(); outlineLast(ctx, 2.5);
  ctx.fillStyle = 'rgba(90,74,32,.5)';
  roundRect(ctx, x - 14, y + 10, 28, 8, 3); ctx.fill();
  ctx.save();
  ctx.translate(0, bob);
  ctx.strokeStyle = '#d98e00'; ctx.lineWidth = 10; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y - 36, 19, Math.PI, 0); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y - 36, 22, Math.PI * 1.15, Math.PI * 1.6); ctx.stroke();
  const lg = ctx.createLinearGradient(x - 28, y - 38, x + 28, y + 8);
  lg.addColorStop(0, '#ffd257'); lg.addColorStop(.55, '#ffb627'); lg.addColorStop(1, '#e08f0e');
  ctx.fillStyle = lg;
  roundRect(ctx, x - 29, y - 38, 58, 47, 13); ctx.fill(); outlineLast(ctx);
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  roundRect(ctx, x - 22, y - 33, 14, 30, 7); ctx.fill();
  ctx.fillStyle = '#7a5310';
  ctx.beginPath(); ctx.arc(x, y - 19, 6.4, 0, Math.PI * 2); ctx.fill();
  roundRect(ctx, x - 2.8, y - 17, 5.6, 13, 2.8); ctx.fill();
  const sp = (sec % 2.4) / 2.4;
  if (sp < .35) {
    ctx.save(); ctx.globalAlpha = 1 - sp / .35;
    ctx.fillStyle = '#fff';
    drawStar(ctx, x + 21, y - 42, 4, 7, 2.6); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
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
