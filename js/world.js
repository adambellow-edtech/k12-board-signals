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
  { name: 'Leo',  color: '#0068ff', mode: 'fish',   x: 560, y: 812, dir: -1, cfg: { hero: 7, accessory: 'none' } },
  { name: 'Maya', color: '#c914a7', mode: 'read',   x: 1268, y: 600, dir: -1, cfg: { hero: 0, accessory: 'none' } },
  { name: 'Zoe',  color: '#26b59d', mode: 'wander', cx: 990, cy: 622, r: 95, speed: .3, dir: 1, cfg: { hero: 11, accessory: 'none' } },
  { name: 'Kai',  color: '#5c25b7', mode: 'sit',    x: 590, y: 390, dir: -1, cfg: { hero: 9, accessory: 'none' } },
];

const SPARKLE_KEYS = [[865, 300], [1245, 565], [770, 705], [1445, 618], [1085, 862]];

const world = {
  cv: null, ctx: null, raf: null,
  keysDown: {}, target: null, nearBuilding: null,
  dir: 1, walking: false, t0: 0, clouds: [], birds: [], trailFx: [],
  cam: null, dustFx: [], lastDust: 0,
};

/* NPC chatter — bubbles cycle on a stagger; greeting overrides when close */
const NPC_LINES = {
  Leo: ['The fish love math jokes. 🎣', 'Caught anything? Me neither.', 'Crack the Lock of the Day yet?'],
  Maya: ['This mystery book is SO good!', 'The Badge Hall has new trophies!', 'Reading = brain superpowers.'],
  Zoe: ['Race you to the Arcade!', 'Ooh, I love your trail!', 'The Math Trail boss is TOUGH.'],
  Kai: ['Cocoa + puzzles = best day.', 'Breakout+ has secret games!', 'Stay curious, explorer.'],
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
function cameraTarget(scale) {
  const vw = world.cv.clientWidth / scale, vh = world.cv.clientHeight / scale;
  let tx = state.pos.x - vw / 2, ty = state.pos.y - vh / 2;
  tx = Math.max(0, Math.min(WORLD.w - vw, tx));
  ty = Math.max(0, Math.min(WORLD.h - vh, ty));
  return { tx, ty, vw, vh };
}
function getCamera(scale) {
  const { tx, ty, vw, vh } = cameraTarget(scale);
  if (!world.cam) world.cam = { x: tx, y: ty };
  return { x: world.cam.x, y: world.cam.y, vw, vh };
}
function updateCamera(scale) {
  const { tx, ty } = cameraTarget(scale);
  if (!world.cam) world.cam = { x: tx, y: ty };
  world.cam.x += (tx - world.cam.x) * .085;
  world.cam.y += (ty - world.cam.y) * .085;
}

function worldLoop(t) {
  if (!screenIs('world')) return;
  const sec = (t - world.t0) / 1000;
  stepPlayer();
  updateCamera(getViewScale());
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
  // eased facing: characters turn instead of snapping
  if (world.face === undefined) world.face = world.dir;
  world.face += (world.dir - world.face) * .28;

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

  // drifting cloud shadows over the island
  ctx.fillStyle = 'rgba(10,30,60,.07)';
  for (let i = 0; i < 3; i++) {
    const sx = ((sec * (14 + i * 5) + i * 700) % (WORLD.w + 700)) - 350;
    const sy = 260 + i * 260;
    ctx.beginPath(); ctx.ellipse(sx, sy, 210, 90, .2, 0, Math.PI * 2); ctx.fill();
  }

  // shoreline glints
  const GLINTS = [[760, 940], [1310, 890], [1620, 560], [330, 640], [700, 150], [1490, 300]];
  GLINTS.forEach(([gx, gy], i) => {
    const tw = Math.max(0, Math.sin(sec * 2.2 + i * 1.9));
    if (tw < .55) return;
    ctx.save(); ctx.globalAlpha = (tw - .55) * 1.8;
    ctx.fillStyle = '#ffffff';
    drawStar(ctx, gx, gy, 4, 7 * tw, 2.4 * tw); ctx.fill();
    ctx.restore();
  });

  // bees looping near the meadow flowers
  for (let i = 0; i < 2; i++) {
    const t = sec * (1.1 + i * .3) + i * 3;
    const bx = 830 + i * 380 + Math.sin(t) * 60;
    const by = 700 - i * 340 + Math.sin(t * 2) * 26;
    ctx.save(); ctx.translate(bx, by);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    const wf = Math.sin(sec * 30 + i) * 3;
    ctx.beginPath(); ctx.ellipse(-2, -5, 4, 2.2 + wf * .3, -.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd75e';
    ctx.beginPath(); ctx.ellipse(0, 0, 5, 3.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3a3348'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-1.5, -3); ctx.lineTo(-1.5, 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1.8, -2.6); ctx.lineTo(1.8, 2.6); ctx.stroke();
    ctx.restore();
  }

  // footstep dust
  if (world.walking && sec - world.lastDust > .16) {
    world.lastDust = sec;
    world.dustFx.push({ x: state.pos.x - world.dir * 10 + (Math.random() - .5) * 8, y: state.pos.y + 2, t: sec });
    if (world.dustFx.length > 14) world.dustFx.shift();
  }
  world.dustFx = world.dustFx.filter(p => sec - p.t < .55);
  world.dustFx.forEach(p => {
    const k = (sec - p.t) / .55;
    ctx.save(); ctx.globalAlpha = (1 - k) * .4;
    ctx.fillStyle = '#e8d9b2';
    ctx.beginPath(); ctx.arc(p.x, p.y - k * 6, 3 + k * 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });

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

  // walk-trail particles (Style Shop unlockable)
  if (world.walking && state.player.trail && state.player.trail !== 'no-trail' && ((sec * 30) | 0) % 3 === 0) {
    world.trailFx.push({ x: state.pos.x + (Math.random() - .5) * 16, y: state.pos.y + (Math.random() - .5) * 6, t: sec, kind: state.player.trail });
    if (world.trailFx.length > 40) world.trailFx.shift();
  }
  world.trailFx = world.trailFx.filter(p => sec - p.t < 1.1);
  world.trailFx.forEach(p => {
    const a = 1 - (sec - p.t) / 1.1;
    ctx.save(); ctx.globalAlpha = a * .85;
    if (p.kind === 'sparkle') {
      ctx.fillStyle = '#ffd75e';
      drawStar(ctx, p.x, p.y - (sec - p.t) * 18, 4, 6 * a + 2, 2.4 * a + .8); ctx.fill();
    } else if (p.kind === 'bubbles') {
      ctx.strokeStyle = '#8fdcf5'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y - (sec - p.t) * 26, 4 + a * 4, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.fillStyle = ['#ff6b5b', '#ffd75e', '#26b59d', '#0068ff', '#9b5de5'][((p.t * 10) | 0) % 5];
      ctx.beginPath(); ctx.arc(p.x, p.y - (sec - p.t) * 14, 3 + a * 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  });

  // y-sorted characters
  const drawables = [
    ...NPCS.map(n => ({ y: npcPos(n, sec).y, fn: () => drawNPC(ctx, n, sec) })),
    {
      y: state.pos.y,
      fn: () => {
        drawPet(ctx, state.pos.x - 36 * world.dir, state.pos.y + 2, 1.05, state.player.pet, sec);
        drawAvatar(ctx, state.pos.x, state.pos.y, 1.08, state.player, sec, world.walking, world.face || world.dir);
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
    const a = (n._clock !== undefined ? n._clock : sec) * n.speed + 1.4;
    return { x: n.cx + Math.cos(a) * n.r, y: n.cy + Math.sin(a) * n.r * .5 };
  }
  return { x: n.x, y: n.y };
}

function drawNPC(ctx, n, sec) {
  const p = npcPos(n, sec);
  let dir = n.dir || 1, walking = false;
  const nearPlayerNow = Math.hypot(state.pos.x - p.x, state.pos.y - p.y) < 135;
  if (n.mode === 'wander') {
    // the stroll clock only advances while nobody's chatting
    if (n._clock === undefined) { n._clock = sec; n._lastSec = sec; }
    if (!nearPlayerNow) n._clock += sec - n._lastSec;
    n._lastSec = sec;
    const a = n._clock * n.speed + 1.4;
    dir = -Math.sin(a) >= 0 ? -1 : 1;
    walking = !nearPlayerNow;
  }
  if (nearPlayerNow) dir = state.pos.x >= p.x ? 1 : -1; // turn toward the player
  if (n._face === undefined) n._face = dir;
  n._face += (dir - n._face) * .22;
  drawAvatar(ctx, p.x, p.y, .98, n.cfg, sec + p.x, walking, n._face);
  if (n.mode === 'fish') {
    // a fish jumps every ~9s; the bobber dips hard during the bite
    const cycle = sec % 9;
    const bite = cycle > 7.6 && cycle < 8.2;
    ctx.strokeStyle = '#6f4a22'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(p.x - 14, p.y - 26); ctx.lineTo(p.x - 48, p.y - 62 + (bite ? 4 : 0)); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.5;
    const bobY = p.y + 30 + (bite ? 9 : Math.sin(sec * 2.2) * 3);
    ctx.beginPath(); ctx.moveTo(p.x - 48, p.y - 62 + (bite ? 4 : 0)); ctx.lineTo(p.x - 56, bobY); ctx.stroke();
    ctx.fillStyle = '#ff6b5b';
    ctx.beginPath(); ctx.arc(p.x - 56, bobY, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x - 56, bobY + 2, 8 + (sec * 14 % 10), 0, Math.PI * 2); ctx.stroke();
    if (cycle > 7.4 && cycle < 8.1) {
      // silver fish arcs out of the water
      const ft = (cycle - 7.4) / .7;
      const fx = p.x - 56 - ft * 30, fy = p.y + 26 - Math.sin(ft * Math.PI) * 34;
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(-.8 + ft * 1.6);
      ctx.fillStyle = '#bcd8e8';
      ctx.beginPath(); ctx.ellipse(0, 0, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(14, -4); ctx.lineTo(14, 4); ctx.closePath(); ctx.fill();
      ctx.restore();
      for (let s = 0; s < 3; s++) {
        ctx.save(); ctx.globalAlpha = (1 - ft) * .8;
        ctx.fillStyle = '#dff2fb';
        ctx.beginPath(); ctx.arc(p.x - 56 + (s - 1) * 8, p.y + 26 - ft * 20 - s * 4, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
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

  // chatter: proximity greeting wins, otherwise staggered rotating lines
  const i = NPCS.indexOf(n);
  const nearPlayer = Math.hypot(state.pos.x - p.x, state.pos.y - p.y) < 135;
  const cycle = (sec + i * 5.5) % 22;
  let line = null;
  if (nearPlayer) line = `Hi, ${state.player.name || 'Explorer'}! 👋`;
  else if (cycle < 3.4) {
    const lines = NPC_LINES[n.name] || [];
    line = lines[(((sec + i * 5.5) / 22) | 0) % lines.length];
  }
  if (line) speechBubble(ctx, p.x, p.y - 146, line);
}

function speechBubble(ctx, x, y, text) {
  ctx.font = '600 12.5px system-ui, sans-serif';
  const tw = Math.min(ctx.measureText(text).width, 190);
  const w = tw + 20, h = 26;
  ctx.fillStyle = 'rgba(255,255,255,.96)';
  roundRect(ctx, x - w / 2, y - h, w, h, 12); ctx.fill();
  ctx.strokeStyle = 'rgba(0,45,114,.35)'; ctx.lineWidth = 2;
  roundRect(ctx, x - w / 2, y - h, w, h, 12); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.96)';
  ctx.beginPath();
  ctx.moveTo(x - 6, y - 1); ctx.lineTo(x + 6, y - 1); ctx.lineTo(x, y + 7);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#002d72';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y - 8, 190);
  ctx.textAlign = 'left';
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
