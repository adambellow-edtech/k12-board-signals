/* Breakout Land — the walkable hub island (canvas) */

const WORLD = { w: 1600, h: 1100 };

const BUILDINGS = [
  { id: 'daily',  name: 'Lock Plaza',          sub: 'Lock of the Day', x: 800,  y: 470,  w: 150, h: 120, color: '#ffb627', roof: '#e8961e', icon: 'lock' },
  { id: 'games',  name: 'Game Hall',           sub: 'Assigned games',  x: 420,  y: 560,  w: 190, h: 140, color: '#ff6b5b', roof: '#d6503f', icon: 'flag' },
  { id: 'math',   name: 'Math Trailhead',      sub: 'Breakout Math',   x: 1180, y: 400,  w: 170, h: 130, color: '#57c26b', roof: '#3da457', icon: 'math' },
  { id: 'arcade', name: 'The Arcade',          sub: 'Earned play time',x: 1220, y: 760,  w: 180, h: 140, color: '#9b5de5', roof: '#7d43c9', icon: 'joy' },
  { id: 'shop',   name: 'Style Shop',          sub: 'Spend your keys', x: 430,  y: 870,  w: 160, h: 125, color: '#4cc9f0', roof: '#2fa7d4', icon: 'shirt' },
  { id: 'badges', name: 'Badge Hall',          sub: 'Your trophies',   x: 640,  y: 330,  w: 150, h: 115, color: '#f2f0e9', roof: '#cfc9b8', icon: 'trophy' },
  { id: 'plus',   name: 'Breakout+ Clubhouse', sub: 'Bonus content',   x: 880,  y: 880,  w: 165, h: 130, color: '#27406e', roof: '#1a2c4e', icon: 'plus' },
];

const TREES = [
  [200, 300], [280, 220], [1380, 250], [1470, 340], [180, 700], [240, 1000], [1440, 980],
  [1500, 620], [700, 180], [1000, 200], [560, 1020], [1080, 1020], [130, 480], [960, 320],
];
const FLOWERS = Array.from({ length: 40 }, (_, i) => [
  180 + ((i * 173) % 1280), 260 + ((i * 271) % 760), ['#ff6b5b', '#ffd75e', '#e75480', '#9b5de5'][i % 4],
]);

const world = {
  cv: null, ctx: null, raf: null,
  keysDown: {}, target: null, nearBuilding: null,
  dir: 1, walking: false, t0: 0, clouds: [],
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
    x: (i * 300) % WORLD.w, y: 40 + (i * 97) % 160, s: .7 + (i % 3) * .3, v: 8 + (i % 3) * 5,
  }));

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
    const cx = (e.clientX - r.left) * (world.cv.width / r.width) / (window.devicePixelRatio || 1);
    const cy = (e.clientY - r.top) * (world.cv.height / r.height) / (window.devicePixelRatio || 1);
    return { x: cam.x + cx / scale, y: cam.y + cy / scale };
  };
  world.cv.addEventListener('pointerdown', e => {
    const p = toWorldXY(e);
    // tapped a building near the player? open it
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
  return Math.max(vw / 1100, vh / 800, .62); // zoom level: shows a comfy window onto the world
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

  // island bounds (keep off the water ring)
  state.pos.x = Math.max(120, Math.min(WORLD.w - 120, state.pos.x));
  state.pos.y = Math.max(230, Math.min(WORLD.h - 90, state.pos.y));

  // building proximity
  world.nearBuilding = null;
  for (const b of BUILDINGS) {
    const d = Math.hypot(state.pos.x - b.x, state.pos.y - (b.y + 18));
    if (d < 110) { world.nearBuilding = b; break; }
  }
  const btn = document.getElementById('enter-btn');
  if (world.nearBuilding) {
    btn.classList.add('show');
    btn.textContent = `Enter ${world.nearBuilding.name} ✦`;
  } else {
    btn.classList.remove('show');
  }
}

function drawWorld(sec) {
  const cv = world.cv, ctx = world.ctx;
  const dpr = window.devicePixelRatio || 1;
  const wpx = cv.clientWidth * dpr, hpx = cv.clientHeight * dpr;
  if (cv.width !== wpx || cv.height !== hpx) { cv.width = wpx; cv.height = hpx; }
  ctx.save();
  ctx.scale(dpr, dpr);

  const scale = getViewScale();
  const cam = getCamera(scale);

  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, cv.clientHeight);
  sky.addColorStop(0, '#8ed8f0'); sky.addColorStop(1, '#c8ecf7');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, cv.clientWidth, cv.clientHeight);

  ctx.scale(scale, scale);
  ctx.translate(-cam.x, -cam.y);

  // water ring
  ctx.fillStyle = '#4cb8dd';
  roundRect(ctx, 20, 130, WORLD.w - 40, WORLD.h - 160, 90); ctx.fill();
  // waves
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const wx = 120 + (i * 217) % (WORLD.w - 260), wy = 170 + (i * 313) % (WORLD.h - 260);
    const off = Math.sin(sec * 1.5 + i) * 4;
    ctx.beginPath(); ctx.arc(wx + off, wy, 12, Math.PI * .1, Math.PI * .9); ctx.stroke();
  }

  // island
  ctx.fillStyle = '#e9d8a6';
  roundRect(ctx, 70, 190, WORLD.w - 140, WORLD.h - 270, 80); ctx.fill();
  const grass = ctx.createLinearGradient(0, 200, 0, WORLD.h);
  grass.addColorStop(0, '#8fd07a'); grass.addColorStop(1, '#6cbb5a');
  ctx.fillStyle = grass;
  roundRect(ctx, 90, 210, WORLD.w - 180, WORLD.h - 310, 70); ctx.fill();

  // dirt paths from plaza to buildings
  ctx.strokeStyle = '#d9b980'; ctx.lineWidth = 34; ctx.lineCap = 'round';
  BUILDINGS.forEach(b => {
    ctx.beginPath(); ctx.moveTo(800, 560); ctx.quadraticCurveTo((800 + b.x) / 2, (560 + b.y) / 2 + 40, b.x, b.y + 26); ctx.stroke();
  });
  // plaza circle
  ctx.fillStyle = '#e6c98f';
  ctx.beginPath(); ctx.arc(800, 570, 90, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#d4b276'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(800, 570, 74, 0, Math.PI * 2); ctx.stroke();

  // flowers
  FLOWERS.forEach(([fx, fy, c]) => {
    if (fx > 700 && fx < 900 && fy > 470 && fy < 670) return; // keep plaza clear
    ctx.fillStyle = c;
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      ctx.beginPath(); ctx.arc(fx + Math.cos(a) * 3, fy + Math.sin(a) * 3, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ffd75e';
    ctx.beginPath(); ctx.arc(fx, fy, 2, 0, Math.PI * 2); ctx.fill();
  });

  // fountain: giant golden lock statue in the plaza
  drawLockStatue(ctx, 800, 545, sec);

  // draw entities in y-order: buildings behind/ahead of player
  const drawables = [
    ...BUILDINGS.map(b => ({ y: b.y, fn: () => drawBuilding(ctx, b, sec) })),
    ...TREES.map(([tx, ty]) => ({ y: ty, fn: () => drawTree(ctx, tx, ty, sec) })),
    {
      y: state.pos.y,
      fn: () => {
        drawPet(ctx, state.pos.x - 34 * world.dir, state.pos.y + 2, 1, state.player.pet, sec);
        drawAvatar(ctx, state.pos.x, state.pos.y, 1, state.player, sec, world.walking, world.dir);
        // name tag
        ctx.font = '700 13px system-ui, sans-serif';
        const nm = state.player.name || 'Explorer';
        const tw = ctx.measureText(nm).width;
        ctx.fillStyle = 'rgba(29,42,77,.75)';
        roundRect(ctx, state.pos.x - tw / 2 - 8, state.pos.y - 118, tw + 16, 20, 10); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(nm, state.pos.x, state.pos.y - 104);
        ctx.textAlign = 'left';
      },
    },
  ];
  drawables.sort((a, b) => a.y - b.y).forEach(d => d.fn());

  // target marker
  if (world.target) {
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3;
    const r = 10 + Math.sin(sec * 8) * 3;
    ctx.beginPath(); ctx.arc(world.target.x, world.target.y, r, 0, Math.PI * 2); ctx.stroke();
  }

  // floating sparkle keys
  for (let i = 0; i < 5; i++) {
    const kx = 300 + (i * 331) % 1100, ky = 280 + (i * 449) % 660;
    const fl = Math.sin(sec * 2 + i * 1.7) * 6;
    ctx.save(); ctx.globalAlpha = .5 + Math.sin(sec * 3 + i) * .25;
    ctx.translate(kx, ky + fl); ctx.rotate(Math.sin(sec + i) * .2);
    drawKeyGlyph(ctx, 0, 0, .8, '#ffd75e');
    ctx.restore();
  }

  ctx.restore();

  // clouds (screen space)
  ctx.save(); ctx.scale(dpr, dpr);
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  world.clouds.forEach(c => {
    const cx = (c.x + sec * c.v) % (cv.clientWidth + 260) - 130;
    ctx.beginPath();
    ctx.arc(cx, c.y, 24 * c.s, 0, Math.PI * 2);
    ctx.arc(cx + 26 * c.s, c.y + 6 * c.s, 18 * c.s, 0, Math.PI * 2);
    ctx.arc(cx - 26 * c.s, c.y + 7 * c.s, 16 * c.s, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawBuilding(ctx, b, sec) {
  const { x, y, w, h } = b;
  const bx = x - w / 2, by = y - h;

  // glow if near
  if (world.nearBuilding && world.nearBuilding.id === b.id) {
    ctx.save();
    ctx.shadowColor = '#fff28a'; ctx.shadowBlur = 26;
    ctx.fillStyle = 'rgba(255,242,138,.25)';
    roundRect(ctx, bx - 6, by - 6, w + 12, h + 12, 18); ctx.fill();
    ctx.restore();
  }

  // walls
  ctx.fillStyle = b.color;
  roundRect(ctx, bx, by + h * .28, w, h * .72, 12); ctx.fill();
  // roof
  ctx.fillStyle = b.roof;
  ctx.beginPath();
  ctx.moveTo(bx - 12, by + h * .34);
  ctx.lineTo(x, by - h * .1);
  ctx.lineTo(bx + w + 12, by + h * .34);
  ctx.closePath(); ctx.fill();
  // door
  ctx.fillStyle = 'rgba(30,25,20,.55)';
  roundRect(ctx, x - 16, y - 40, 32, 40, 8); ctx.fill();
  ctx.fillStyle = '#ffd75e';
  ctx.beginPath(); ctx.arc(x + 8, y - 20, 2.8, 0, Math.PI * 2); ctx.fill();
  // windows
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  roundRect(ctx, bx + 14, by + h * .42, 22, 18, 5); ctx.fill();
  roundRect(ctx, bx + w - 36, by + h * .42, 22, 18, 5); ctx.fill();

  // icon medallion on roof
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x, by + h * .18, 17, 0, Math.PI * 2); ctx.fill();
  drawIcon(ctx, b.icon, x, by + h * .18, 1);

  // sign
  ctx.font = '800 15px system-ui, sans-serif';
  const tw = ctx.measureText(b.name).width;
  ctx.fillStyle = '#fff7e8';
  ctx.strokeStyle = '#c9a86a'; ctx.lineWidth = 2;
  roundRect(ctx, x - tw / 2 - 12, y + 8, tw + 24, 26, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3c3325';
  ctx.textAlign = 'center';
  ctx.fillText(b.name, x, y + 26);
  ctx.textAlign = 'left';

  // lock badge if gated
  if (b.id === 'arcade' && !arcadeAllowed()) drawPadlockBadge(ctx, x + w / 2 - 8, by + h * .3);
  if (b.id === 'plus' && !state.plus) drawPadlockBadge(ctx, x + w / 2 - 8, by + h * .3);
}

function drawPadlockBadge(ctx, x, y) {
  ctx.fillStyle = '#e63946';
  ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.4;
  ctx.strokeRect(x - 5, y - 2, 10, 8);
  ctx.beginPath(); ctx.arc(x, y - 3, 4, Math.PI, 0); ctx.stroke();
}

function drawTree(ctx, x, y, sec) {
  const sway = Math.sin(sec * 1.2 + x) * 2;
  ctx.fillStyle = '#8a5a2b';
  roundRect(ctx, x - 6, y - 34, 12, 36, 5); ctx.fill();
  ctx.fillStyle = '#4da457';
  ctx.beginPath(); ctx.arc(x + sway, y - 52, 26, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x - 18 + sway, y - 38, 18, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 18 + sway, y - 38, 18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#63b96e';
  ctx.beginPath(); ctx.arc(x - 6 + sway, y - 56, 12, 0, Math.PI * 2); ctx.fill();
}

function drawLockStatue(ctx, x, y, sec) {
  const bob = Math.sin(sec * 1.6) * 3;
  // pedestal
  ctx.fillStyle = '#cfc9b8';
  roundRect(ctx, x - 26, y + 6, 52, 18, 6); ctx.fill();
  ctx.save();
  ctx.translate(0, bob);
  // shackle
  ctx.strokeStyle = '#e8961e'; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y - 34, 18, Math.PI, 0); ctx.stroke();
  // body
  ctx.fillStyle = '#ffb627';
  roundRect(ctx, x - 27, y - 36, 54, 44, 12); ctx.fill();
  ctx.fillStyle = '#8a5a10';
  ctx.beginPath(); ctx.arc(x, y - 18, 6, 0, Math.PI * 2); ctx.fill();
  roundRect(ctx, x - 2.6, y - 16, 5.2, 12, 2.5); ctx.fill();
  // sparkle
  const sp = (sec % 2.4) / 2.4;
  if (sp < .35) {
    ctx.save(); ctx.globalAlpha = 1 - sp / .35;
    ctx.fillStyle = '#fff';
    drawStar(ctx, x + 20, y - 40, 4, 7, 2.6); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawKeyGlyph(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, 6 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e9f6fb';
  ctx.beginPath(); ctx.arc(x, y, 2.6 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(x + 4 * s, y - 1.6 * s, 14 * s, 3.2 * s);
  ctx.fillRect(x + 12 * s, y + 1.6 * s, 2.6 * s, 4.5 * s);
  ctx.fillRect(x + 16 * s, y + 1.6 * s, 2.6 * s, 6 * s);
}

function drawIcon(ctx, icon, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#5a4a20'; ctx.fillStyle = '#5a4a20'; ctx.lineWidth = 2.2 * s; ctx.lineCap = 'round';
  if (icon === 'lock') {
    ctx.strokeRect(-6 * s, -2 * s, 12 * s, 9 * s);
    ctx.beginPath(); ctx.arc(0, -2 * s, 4.5 * s, Math.PI, 0); ctx.stroke();
  } else if (icon === 'flag') {
    ctx.beginPath(); ctx.moveTo(-4 * s, 8 * s); ctx.lineTo(-4 * s, -8 * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-4 * s, -8 * s); ctx.lineTo(7 * s, -5 * s); ctx.lineTo(-4 * s, -2 * s); ctx.closePath(); ctx.fill();
  } else if (icon === 'math') {
    ctx.font = `900 ${13 * s}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('×÷', 0, 1);
  } else if (icon === 'joy') {
    ctx.beginPath(); ctx.arc(0, -4 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -1 * s); ctx.lineTo(0, 5 * s); ctx.stroke();
    ctx.strokeRect(-6 * s, 5 * s, 12 * s, 4 * s);
  } else if (icon === 'shirt') {
    ctx.beginPath();
    ctx.moveTo(-7 * s, -5 * s); ctx.lineTo(-2 * s, -8 * s); ctx.lineTo(2 * s, -8 * s); ctx.lineTo(7 * s, -5 * s);
    ctx.lineTo(5 * s, -1 * s); ctx.lineTo(3 * s, -2 * s); ctx.lineTo(3 * s, 8 * s); ctx.lineTo(-3 * s, 8 * s);
    ctx.lineTo(-3 * s, -2 * s); ctx.lineTo(-5 * s, -1 * s); ctx.closePath(); ctx.fill();
  } else if (icon === 'trophy') {
    ctx.beginPath(); ctx.moveTo(-5 * s, -7 * s); ctx.lineTo(5 * s, -7 * s); ctx.lineTo(3.4 * s, 2 * s); ctx.lineTo(-3.4 * s, 2 * s); ctx.closePath(); ctx.fill();
    ctx.fillRect(-4 * s, 5 * s, 8 * s, 3 * s);
    ctx.fillRect(-1.2 * s, 2 * s, 2.4 * s, 4 * s);
  } else if (icon === 'plus') {
    ctx.font = `900 ${16 * s}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd75e';
    ctx.fillText('+', 0, 1);
  } else if (icon === 'star') {
    drawStar(ctx, 0, 0, 5, 8 * s, 3.5 * s); ctx.fill();
  }
  ctx.restore();
}
