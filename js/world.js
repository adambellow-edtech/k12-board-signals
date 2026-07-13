/* Breakout Land — the walkable island, rendered from AI-painted map art
   (Canva-generated world plate). The playable layer — avatar, NPCs,
   location pins, quests — runs on top of the painting. */

const WORLD = { w: 1920, h: 1080 };

/* The painted terrain */
const mapImg = new Image();
let mapReady = false;
mapImg.onload = () => { mapReady = true; };
mapImg.src = (typeof window !== 'undefined' && window.WORLD_MAP_SRC) ? window.WORLD_MAP_SRC : 'assets/world-map.jpg';

/* Locations anchored to landmarks in the painting */
const BUILDINGS = [
  { id: 'daily',  name: 'Lock Plaza',     icon: '🔐', x: 990,  y: 520, pinY: -66 },
  { id: 'games',  name: 'Game Hall',      icon: '🚩', x: 1330, y: 445, pinY: -96 },
  { id: 'badges', name: 'Badge Hall',     icon: '🏅', x: 737,  y: 385, pinY: -66 },
  { id: 'plus',   name: 'Breakout+ Club', icon: '✨', x: 518,  y: 345, pinY: -56 },
  { id: 'arcade', name: 'The Arcade',     icon: '🕹️', x: 1398, y: 748, pinY: -60 },
  { id: 'shop',   name: 'Style Shop',     icon: '👕', x: 636,  y: 572, pinY: -56 },
  { id: 'math',   name: 'Math Trail',     icon: '➗', x: 1148, y: 662, pinY: -58 },
];

/* Walkable land: polygon traced around the painted island, minus the
   lagoon and the plaza centerpiece */
const LAND = [
  [575, 110], [900, 95], [1150, 120], [1330, 160], [1540, 210], [1680, 310], [1745, 470],
  [1700, 630], [1600, 750], [1500, 870], [1300, 955], [1060, 985], [860, 950], [720, 895],
  [610, 830], [520, 770], [400, 730], [300, 690], [235, 590], [230, 470], [300, 375],
  [420, 300], [500, 255], [540, 180],
];
const BLOCKS = [
  { x: 510, y: 550, r: 96 },   // lagoon cove
  { x: 560, y: 610, r: 52 },   // lagoon inlet channel
  { x: 625, y: 675, r: 46 },   // channel toward the dock (dock itself stays walkable)
  { x: 990, y: 518, r: 44 },   // plaza well centerpiece
];
function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function canWalk(x, y) {
  return inPoly(x, y, LAND) && !BLOCKS.some(b => Math.hypot(x - b.x, y - b.y) < b.r);
}

/* Idle NPCs living in the painting (name pills in brand colors) */
const NPCS = [
  { name: 'Leo', color: '#0068ff', mode: 'fish', x: 560, y: 812, dir: -1,
    cfg: { skin: '#8c5a33', hairStyle: 'buzz', hairColor: '#2b2118', outfit: 'tee-teal', accessory: 'cap', pet: 'nopet' } },
  { name: 'Maya', color: '#c914a7', mode: 'read', x: 1268, y: 600, dir: -1,
    cfg: { skin: '#d99a6c', hairStyle: 'long', hairColor: '#5c3b1e', outfit: 'tee-purple', accessory: 'none', pet: 'nopet' } },
  { name: 'Zoe', color: '#26b59d', mode: 'wander', cx: 990, cy: 622, r: 95, speed: .3, dir: 1,
    cfg: { skin: '#ffd9b3', hairStyle: 'pony', hairColor: '#c94f30', outfit: 'tee-gold', accessory: 'none', pet: 'nopet' } },
  { name: 'Kai', color: '#5c25b7', mode: 'sit', x: 590, y: 390, dir: -1,
    cfg: { skin: '#b5764a', hairStyle: 'spiky', hairColor: '#2b2118', outfit: 'tee-coral', accessory: 'none', pet: 'nopet' } },
];

const SPARKLE_KEYS = [[865, 300], [1245, 565], [770, 705], [1445, 618], [1085, 862]];

const world = {
  cv: null, ctx: null, raf: null,
  keysDown: {}, target: null, nearBuilding: null,
  dir: 1, walking: false, t0: 0, clouds: [], birds: [],
};

function enterWorld() {
  showScreen('world');
  updateHUD();
  if (!world.cv) initWorld();
  // players saved before the painted-map update spawn inside the old island
  if (!canWalk(state.pos.x, state.pos.y)) { state.pos.x = 990; state.pos.y = 648; }
  world.t0 = performance.now();
  cancelAnimationFrame(world.raf);
  worldLoop(world.t0);
}

function initWorld() {
  world.cv = document.getElementById('world-canvas');
  world.ctx = world.cv.getContext('2d');
  world.clouds = Array.from({ length: 5 }, (_, i) => ({
    x: (i * 380) % WORLD.w, y: 30 + (i * 97) % 130, s: .7 + (i % 3) * .3, v: 8 + (i % 3) * 5,
  }));
  world.birds = Array.from({ length: 3 }, (_, i) => ({ off: i * 7.2, y: 80 + i * 50, v: 42 + i * 9 }));

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
    const b = BUILDINGS.find(b => Math.hypot(p.x - b.x, p.y - (b.y + b.pinY * .5)) < 85);
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
  const sp = 4.6;
  let dx = 0, dy = 0;
  const k = world.keysDown;
  if (k['arrowleft'] || k['a']) dx -= 1;
  if (k['arrowright'] || k['d']) dx += 1;
  if (k['arrowup'] || k['w']) dy -= 1;
  if (k['arrowdown'] || k['s']) dy += 1;

  let vx = 0, vy = 0;
  if (dx || dy) {
    world.target = null;
    const len = Math.hypot(dx, dy);
    vx = (dx / len) * sp; vy = (dy / len) * sp;
  } else if (world.target) {
    const tx = world.target.x - state.pos.x, ty = world.target.y - state.pos.y;
    const d = Math.hypot(tx, ty);
    if (d < 6) { world.target = null; }
    else { vx = (tx / d) * sp; vy = (ty / d) * sp; }
  }

  world.walking = !!(vx || vy);
  if (vx) world.dir = vx > 0 ? 1 : -1;

  // slide along coastline: try full move, then each axis
  const nx = state.pos.x + vx, ny = state.pos.y + vy;
  if (canWalk(nx, ny)) { state.pos.x = nx; state.pos.y = ny; }
  else if (canWalk(nx, state.pos.y)) { state.pos.x = nx; if (world.target) world.target.y = state.pos.y; }
  else if (canWalk(state.pos.x, ny)) { state.pos.y = ny; if (world.target) world.target.x = state.pos.x; }
  else { world.walking = false; world.target = null; }

  world.nearBuilding = null;
  for (const b of BUILDINGS) {
    if (Math.hypot(state.pos.x - b.x, state.pos.y - b.y) < 105) { world.nearBuilding = b; break; }
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

  // deep-sea fill behind/while the painting loads
  ctx.fillStyle = '#1f7fae';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-cam.x, -cam.y);

  if (mapReady) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(mapImg, 0, 0, WORLD.w, WORLD.h);
  }

  // near-building ground glow
  if (world.nearBuilding) {
    const b = world.nearBuilding;
    const pulse = .42 + Math.sin(sec * 4) * .16;
    const g = ctx.createRadialGradient(b.x, b.y + 14, 8, b.x, b.y + 14, 120);
    g.addColorStop(0, `rgba(255,233,138,${pulse})`); g.addColorStop(1, 'rgba(255,233,138,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(b.x, b.y + 14, 120, 52, 0, 0, Math.PI * 2); ctx.fill();
  }

  // floating sparkle keys
  SPARKLE_KEYS.forEach(([kx, ky], i) => {
    const fl = Math.sin(sec * 2 + i * 1.7) * 6;
    ctx.save(); ctx.globalAlpha = .6 + Math.sin(sec * 3 + i) * .25;
    ctx.translate(kx, ky + fl); ctx.rotate(Math.sin(sec + i) * .2);
    drawKeyGlyph(ctx, 0, 0, .85, '#ffe27a');
    ctx.restore();
  });

  // y-sorted characters
  const drawables = [
    ...NPCS.map(n => ({ y: npcPos(n, sec).y, fn: () => drawNPC(ctx, n, sec) })),
    {
      y: state.pos.y,
      fn: () => {
        drawPet(ctx, state.pos.x - 36 * world.dir, state.pos.y + 2, 1.05, state.player.pet, sec);
        drawAvatar(ctx, state.pos.x, state.pos.y, 1.08, state.player, sec, world.walking, world.dir);
        namePill(ctx, state.pos.x, state.pos.y - 126, state.player.name || 'Explorer', '#002d72');
      },
    },
  ];
  drawables.sort((a, b) => a.y - b.y).forEach(d => d.fn());

  // location pins float above everything
  BUILDINGS.forEach((b, i) => drawLocationPin(ctx, b, sec, i));

  // target marker
  if (world.target) {
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 3;
    const r = 10 + Math.sin(sec * 8) * 3;
    ctx.beginPath(); ctx.arc(world.target.x, world.target.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath(); ctx.arc(world.target.x, world.target.y, 3.5, 0, Math.PI * 2); ctx.fill();
  }

  // butterflies over the meadows
  for (let i = 0; i < 3; i++) {
    const bx = 640 + ((i * 421) % 800) + Math.sin(sec * .7 + i * 2) * 80;
    const by = 300 + ((i * 291) % 480) + Math.cos(sec * .9 + i) * 36;
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

  // clouds drifting over the scene
  ctx.fillStyle = 'rgba(255,255,255,.75)';
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
  ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  world.birds.forEach(b => {
    const bx = (b.off * 120 + sec * b.v) % (W + 200) - 100;
    const by = b.y + Math.sin(sec * 2 + b.off) * 8;
    const f = Math.sin(sec * 9 + b.off) * 4;
    ctx.beginPath(); ctx.moveTo(bx - 7, by - f); ctx.quadraticCurveTo(bx, by + 3, bx, by); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + 7, by - f); ctx.quadraticCurveTo(bx, by + 3, bx, by); ctx.stroke();
  });
  // warm grade + vignette
  const warm = ctx.createRadialGradient(W * .3, -H * .2, 60, W * .3, -H * .2, H * 1.4);
  warm.addColorStop(0, 'rgba(255,236,170,.12)'); warm.addColorStop(.5, 'rgba(255,236,170,.03)'); warm.addColorStop(1, 'rgba(255,236,170,0)');
  ctx.fillStyle = warm; ctx.fillRect(0, 0, W, H);
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .45, W / 2, H / 2, Math.max(W, H) * .78);
  vig.addColorStop(0, 'rgba(10,30,60,0)'); vig.addColorStop(1, 'rgba(10,30,60,.2)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

  ctx.restore(); // dpr
}

/* Floating location pin: navy pill + pointer, bobbing over the landmark */
function drawLocationPin(ctx, b, sec, i) {
  const near = world.nearBuilding && world.nearBuilding.id === b.id;
  const bob = Math.sin(sec * 2 + i * 1.1) * 4;
  const px = b.x, py = b.y + b.pinY + bob;

  ctx.font = '800 14px "Helix", "Quicksand", "Avenir Next", ui-rounded, system-ui, sans-serif';
  const label = `${b.icon} ${b.name}`;
  const tw = ctx.measureText(label).width;
  const w = tw + 24, h = 30;

  ctx.save();
  if (near) { ctx.shadowColor = 'rgba(255,224,122,.9)'; ctx.shadowBlur = 14; }
  else { ctx.shadowColor = 'rgba(0,20,50,.4)'; ctx.shadowBlur = 8; }
  const g = ctx.createLinearGradient(px, py - h, px, py);
  g.addColorStop(0, near ? '#2a6cc4' : '#1c56ad');
  g.addColorStop(1, near ? '#0d3f8f' : '#082554');
  ctx.fillStyle = g;
  roundRect(ctx, px - w / 2, py - h, w, h, 15); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = near ? '#ffd75e' : '#041a3f'; ctx.lineWidth = 2.5;
  roundRect(ctx, px - w / 2, py - h, w, h, 15); ctx.stroke();
  // pointer
  ctx.fillStyle = near ? '#0d3f8f' : '#082554';
  ctx.beginPath();
  ctx.moveTo(px - 7, py - 1); ctx.lineTo(px + 7, py - 1); ctx.lineTo(px, py + 9);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = near ? '#ffd75e' : '#041a3f'; ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(label, px, py - 10);
  ctx.textAlign = 'left';
}

/* ---- NPCs ---- */

function npcPos(n, sec) {
  if (n.mode === 'wander') {
    const a = sec * n.speed + 1.4;
    return { x: n.cx + Math.cos(a) * n.r, y: n.cy + Math.sin(a) * n.r * .5 };
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
  drawAvatar(ctx, p.x, p.y, .98, n.cfg, sec + p.x, walking, dir);
  if (n.mode === 'fish') {
    ctx.strokeStyle = '#6f4a22'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(p.x - 14, p.y - 26); ctx.lineTo(p.x - 48, p.y - 62); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.5;
    const bobY = p.y + 30 + Math.sin(sec * 2.2) * 3;
    ctx.beginPath(); ctx.moveTo(p.x - 48, p.y - 62); ctx.lineTo(p.x - 56, bobY); ctx.stroke();
    ctx.fillStyle = '#ff6b5b';
    ctx.beginPath(); ctx.arc(p.x - 56, bobY, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x - 56, bobY + 2, 8 + (sec * 14 % 10), 0, Math.PI * 2); ctx.stroke();
  }
  if (n.mode === 'read') {
    ctx.fillStyle = '#0068ff';
    ctx.save(); ctx.translate(p.x + (n.dir || 1) * -14, p.y - 28); ctx.rotate(-.15);
    roundRect(ctx, -8, -6, 16, 12, 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 5); ctx.stroke();
    ctx.restore();
  }
  if (n.mode === 'sit') {
    ctx.fillStyle = '#ffd75e';
    roundRect(ctx, p.x - 21, p.y - 30, 9, 10, 2.5); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5;
    const st = Math.sin(sec * 3) * 2;
    ctx.beginPath(); ctx.moveTo(p.x - 16, p.y - 34); ctx.quadraticCurveTo(p.x - 14 + st, p.y - 40, p.x - 16, p.y - 46); ctx.stroke();
  }
  namePill(ctx, p.x, p.y - 118, n.name, n.color);
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
