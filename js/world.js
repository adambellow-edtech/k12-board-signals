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

/* ============ Home Land — the plot the student designs, made walkable here ============
   The 8x4 grid in the design screen is the blueprint; on the island it becomes a
   real fenced homestead the avatar walks through. A few decor items come alive when
   you walk up, and a friend drops by to admire the build. Keys are earned by thinking,
   never bought, so this stays a place to enjoy, never a store. */
const HOME_PLOT = { cx: 1185, cy: 838, w: 348, h: 168, cols: 8, rows: 4 };
// Pip, the friendly neighbor who lives next door and admires your build (a distinct
// character so a daily-rotating islander never appears twice on screen at once)
const HOME_NEIGHBOR = { name: 'Pip', color: '#7a3fd0', cfg: { hero: 3, accessory: 'none' } };
// decor ids that do something when the explorer walks up to them
const HOME_LIVE = { flag: 'base', fountain: 'wish', balloon: 'pop' };

function homeCellXY(i) {
  const c = i % HOME_PLOT.cols, r = Math.floor(i / HOME_PLOT.cols);
  const cw = HOME_PLOT.w / HOME_PLOT.cols, ch = HOME_PLOT.h / HOME_PLOT.rows;
  return {
    x: HOME_PLOT.cx - HOME_PLOT.w / 2 + (c + 0.5) * cw,
    y: HOME_PLOT.cy - HOME_PLOT.h / 2 + (r + 0.5) * ch,
  };
}
function homeSignXY() { return { x: HOME_PLOT.cx - HOME_PLOT.w / 2 - 22, y: HOME_PLOT.cy }; }
function homeVisitorPos() { return { x: HOME_PLOT.cx + HOME_PLOT.w / 2 - 26, y: HOME_PLOT.cy - HOME_PLOT.h / 2 + 30 }; }
function homePlacedCount() { return state.home ? Object.keys(state.home.placed || {}).length : 0; }
function homeVisitor() { return HOME_NEIGHBOR; }

// Color-emoji glyphs (Noto/Apple bitmap fonts) often fail to paint via fillText when
// the canvas is scaled, as the world is. Pre-render each glyph once to an offscreen
// sprite at identity scale, then blit it with drawImage, which works under any transform.
const _emojiSprites = {};
function emojiSprite(ch) {
  if (_emojiSprites[ch]) return _emojiSprites[ch];
  const s = 72, c = document.createElement('canvas'); c.width = s; c.height = s;
  const x = c.getContext('2d');
  x.font = '58px "Noto Color Emoji","Segoe UI Emoji","Apple Color Emoji",serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(ch, s / 2, s / 2 + 2);
  _emojiSprites[ch] = c;
  return c;
}
function homeVisitorLine() {
  const n = homePlacedCount();
  if (n === 0) return 'Ooh, an empty lot! What will you build?';
  if (n < 4) return 'Cozy start! Add a few more, explorer.';
  if (n < 8) return `Wow, ${n} things! So cozy in here.`;
  return 'The coziest home on the whole island!';
}

// interactive spots on the plot (the design sign, plus any live decor); nearest within reach wins
function homeSpots() {
  const spots = [];
  const s = homeSignXY();
  spots.push({ x: s.x, y: s.y, r: 60, kind: 'design', label: 'Redesign Home 🎨' });
  const placed = (state.home && state.home.placed) || {};
  for (const k in placed) {
    const kind = HOME_LIVE[placed[k]];
    if (!kind) continue;
    const p = homeCellXY(+k);
    const label = kind === 'base' ? 'Set Home Base 🚩' : kind === 'wish' ? 'Make a Wish ⛲' : 'Pop it! 🎈';
    spots.push({ x: p.x, y: p.y, r: 48, kind, label });
  }
  return spots;
}
function homeSpotAt(x, y) {
  let best = null, bd = Infinity;
  for (const s of homeSpots()) {
    const d = Math.hypot(x - s.x, y - s.y);
    if (d < s.r && d < bd) { bd = d; best = s; }
  }
  return best;
}
function doHomeAction(spot) {
  if (!spot || !state.home) return;
  if (spot.kind === 'design') { openHomeLand(); return; }
  if (spot.kind === 'base') {
    state.home.base = { x: HOME_PLOT.cx, y: HOME_PLOT.cy + HOME_PLOT.h / 2 - 8 };
    saveState(); blip(720);
    toast('🚩 Home base set! You will start here when you visit the island.');
    return;
  }
  if (spot.kind === 'wish') {
    if (state.home.wishDay === todayKey()) { buzz(); toast('You already wished today. Come back tomorrow! ⛲'); return; }
    state.home.wishDay = todayKey();
    fanfare(); grant({ keys: 3, xp: 5 }); homeBurst(spot.x, spot.y, '#8fdcf5');
    toast('⛲ You made a wish! +3 🔑');
    return;
  }
  if (spot.kind === 'pop') {
    if (state.home.popDay === todayKey()) { buzz(); toast('This balloon already popped today! 🎈'); return; }
    state.home.popDay = todayKey();
    playSparkleChime(); grant({ xp: 5 }); homeBurst(spot.x, spot.y, '#ff6b5b');
    toast('🎈 Pop! +5 XP');
    return;
  }
}
function homeBurst(x, y, color) {
  world.homeFx = world.homeFx || [];
  const t = world.sec || 0;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    world.homeFx.push({ x, y, vx: Math.cos(a) * (46 + Math.random() * 40), vy: Math.sin(a) * (46 + Math.random() * 40) - 24, t, color });
  }
}

// per-décor animation + living-effect recipe (everything else just gets a gentle bob)
const HOME_ANIM = {
  tree: { sway: .05 }, pine: { sway: .04 }, bush: { sway: .07 }, flower: { sway: .12, petals: 1 },
  tulip: { sway: .12, petals: 1 }, planter: { sway: .05 }, mushroom: { sway: .03 }, rainbow: { big: 1, shimmer: 1 },
  balloon: { float: 8, rot: .06, string: 1 }, flag: { wave: 1 }, lantern: { glow: 1 }, star: { spin: .5, twinkle: 1 },
  pond: { ripple: 1, still: 1 }, fountain: { water: 1 }, castle: { big: 1 }, tent: {}, bench: {}, flag2: {},
};

function drawHomePlot(ctx, sec) {
  const P = HOME_PLOT;
  const x0 = P.cx - P.w / 2, y0 = P.cy - P.h / 2, w = P.w, h = P.h;
  const px0 = x0 - 18, py0 = y0 - 14, pw = w + 36, ph = h + 34;
  ctx.save();
  // layered grassy pad — gradient base, organic light patches, soft inner shading
  roundRect(ctx, px0, py0, pw, ph, 30);
  ctx.save(); ctx.clip();
  const gg = ctx.createLinearGradient(0, py0, 0, py0 + ph);
  gg.addColorStop(0, 'rgba(176,231,190,.92)'); gg.addColorStop(1, 'rgba(126,201,153,.92)');
  ctx.fillStyle = gg; ctx.fillRect(px0, py0, pw, ph);
  // dappled sunlight patches
  for (let i = 0; i < 5; i++) {
    const bx = px0 + ((i * 137 + 40) % pw), by = py0 + ((i * 83 + 30) % ph);
    const rp = ctx.createRadialGradient(bx, by, 2, bx, by, 46);
    rp.addColorStop(0, 'rgba(206,244,214,.5)'); rp.addColorStop(1, 'rgba(206,244,214,0)');
    ctx.fillStyle = rp; ctx.beginPath(); ctx.arc(bx, by, 46, 0, Math.PI * 2); ctx.fill();
  }
  // tiny wildflower speckles dotted across the lawn
  const spk = ['#ffd75e', '#ff8fb0', '#ffffff', '#c39bff'];
  for (let i = 0; i < 26; i++) {
    const sx = px0 + ((i * 71 + 17) % pw), sy = py0 + ((i * 129 + 41) % ph);
    ctx.fillStyle = spk[i % 4]; ctx.globalAlpha = .8;
    ctx.beginPath(); ctx.arc(sx, sy, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // inner top highlight + bottom shadow for a little depth
  const sh = ctx.createLinearGradient(0, py0, 0, py0 + ph);
  sh.addColorStop(0, 'rgba(255,255,255,.16)'); sh.addColorStop(.12, 'rgba(255,255,255,0)');
  sh.addColorStop(.85, 'rgba(0,40,20,0)'); sh.addColorStop(1, 'rgba(0,40,20,.14)');
  ctx.fillStyle = sh; ctx.fillRect(px0, py0, pw, ph);
  ctx.restore();
  ctx.strokeStyle = 'rgba(28,154,133,.5)'; ctx.lineWidth = 3;
  roundRect(ctx, px0, py0, pw, ph, 30); ctx.stroke();

  // stepping-stone path from the front gate to the middle of the yard
  for (let s = 0; s <= 5; s++) {
    const sy = y0 + h + 12 - s * ((h / 2 + 12) / 5);
    ctx.fillStyle = 'rgba(226,214,182,.85)';
    ctx.beginPath(); ctx.ellipse(P.cx, sy, 11, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(150,130,90,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
  }

  drawFence(ctx, px0, py0, pw, ph);
  drawHomeSign(ctx, sec);

  // décor, painted back-to-front so nearer items overlap farther ones
  const placed = (state.home && state.home.placed) || {};
  const ids = Object.keys(placed).map(Number).sort((a, b) => homeCellXY(a).y - homeCellXY(b).y);
  for (const i of ids) {
    const d = DATA.homeItems.find(x => x.id === placed[i]); if (!d) continue;
    drawDecorItem(ctx, d, homeCellXY(i), i, sec);
  }

  // ambient life over the yard: butterflies + petals drifting from flowers
  drawYardLife(ctx, sec, ids.some(i => { const d = DATA.homeItems.find(x => x.id === placed[i]); return d && HOME_ANIM[d.id] && HOME_ANIM[d.id].petals; }));

  // décor-action sparkle bursts (wishing well, balloon pop)
  world.homeFx = (world.homeFx || []).filter(pt => sec - pt.t < .8);
  world.homeFx.forEach(pt => {
    const k = (sec - pt.t) / .8;
    const bx = pt.x + pt.vx * k, by = pt.y + pt.vy * k + 60 * k * k;
    ctx.save(); ctx.globalAlpha = 1 - k; ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(bx, by, 3.5 * (1 - k) + 1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  });
  ctx.restore();
}

function drawDecorItem(ctx, d, p, i, sec) {
  const a = HOME_ANIM[d.id] || {};
  const ph = sec * 1.6 + i * 1.3;
  const sz = a.big ? 58 : 46;

  // ---- effects painted behind the sprite ----
  if (a.ripple) drawPondRipple(ctx, p.x, p.y + 8, sec + i);
  if (a.glow) drawLanternGlow(ctx, p.x, p.y - 20, sec + i);
  if (HOME_LIVE[d.id]) { // interactive items wear a soft golden halo
    const g0 = .26 + Math.sin(sec * 3 + i) * .14;
    const rg = ctx.createRadialGradient(p.x, p.y - 6, 2, p.x, p.y - 6, 36);
    rg.addColorStop(0, `rgba(255,226,122,${g0})`); rg.addColorStop(1, 'rgba(255,226,122,0)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(p.x, p.y - 6, 36, 0, Math.PI * 2); ctx.fill();
  }

  // ground contact shadow (skip for the floating balloon)
  if (!a.float) {
    ctx.fillStyle = 'rgba(0,40,20,.16)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 16, a.big ? 20 : 16, a.big ? 7 : 6, 0, 0, Math.PI * 2); ctx.fill();
  }

  const spr = emojiSprite(d.icon);
  ctx.save();
  let ay = p.y + 8;
  if (a.float) { ay -= 14 + (Math.sin(ph) * .5 + .5) * a.float; }
  ctx.translate(p.x, ay);
  if (a.sway) ctx.rotate(Math.sin(ph) * a.sway);
  if (a.rot) ctx.rotate(Math.sin(ph * 1.3) * a.rot);
  if (a.spin) ctx.rotate(sec * a.spin);
  if (a.wave) ctx.transform(1, 0, Math.sin(ph * 1.5) * .16, 1, 0, 0); // cloth flutter
  ctx.drawImage(spr, -sz / 2, -sz, sz, sz);
  ctx.restore();

  // ---- effects painted in front of the sprite ----
  if (a.string) { // balloon string dangling to the ground anchor
    ctx.strokeStyle = 'rgba(120,120,140,.7)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(p.x, p.y + 14);
    ctx.quadraticCurveTo(p.x + Math.sin(ph) * 4, p.y + 2, p.x + Math.sin(ph) * 2, ay - 4);
    ctx.stroke();
  }
  if (a.water) drawFountainWater(ctx, p.x, p.y - 22, sec + i * 1.7);
  if (a.twinkle) { const t = (sec * 1.5 + i) % 2.4; if (t < 1.2) { ctx.save(); ctx.globalAlpha = (1 - t / 1.2) * .9; ctx.fillStyle = '#fff6cf'; drawStar(ctx, p.x + 14, p.y - 30, 4, 3.4, 1.3); ctx.fill(); ctx.restore(); } }
}

function drawPondRipple(ctx, x, y, t) {
  ctx.save();
  for (let r = 0; r < 3; r++) {
    const k = (t * .5 + r / 3) % 1;
    ctx.globalAlpha = (1 - k) * .5; ctx.strokeStyle = '#bfeaff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y, 7 + k * 22, 3 + k * 10, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}
function drawLanternGlow(ctx, x, y, t) {
  const fl = .5 + Math.sin(t * 6) * .12 + Math.sin(t * 13) * .05;
  const g = ctx.createRadialGradient(x, y, 2, x, y, 42);
  g.addColorStop(0, `rgba(255,196,86,${.4 * fl})`); g.addColorStop(1, 'rgba(255,196,86,0)');
  ctx.save(); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 42, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 3; i++) { // fireflies drifting in the glow
    const ang = t * 1.2 + i * 2.1;
    const fx = x + Math.cos(ang) * 20, fy = y + Math.sin(ang * 1.3) * 13 - 4;
    ctx.globalAlpha = .35 + Math.abs(Math.sin(t * 4 + i)) * .5; ctx.fillStyle = '#fff3b0';
    ctx.beginPath(); ctx.arc(fx, fy, 1.8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function drawFountainWater(ctx, x, y, t) {
  ctx.save(); ctx.fillStyle = 'rgba(186,232,255,.92)';
  for (let i = 0; i < 8; i++) {
    const k = (t * 1.25 + i / 8) % 1;
    const ang = -Math.PI / 2 + (i - 3.5) * .26;
    const dx = Math.cos(ang) * 30 * k, dy = Math.sin(ang) * 30 * k + 34 * k * k;
    ctx.globalAlpha = (1 - k) * .9;
    ctx.beginPath(); ctx.arc(x + dx, y + dy, 2.3 * (1 - k) + .8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function drawYardLife(ctx, sec, hasFlowers) {
  const P = HOME_PLOT;
  // two butterflies wandering inside the fence
  for (let i = 0; i < 2; i++) {
    const bx = P.cx + Math.sin(sec * .8 + i * 2.3) * (P.w * .32) + (i - .5) * 40;
    const by = P.cy - 10 + Math.cos(sec * 1.1 + i * 1.7) * (P.h * .28);
    const flap = Math.abs(Math.sin(sec * 13 + i * 3));
    ctx.save(); ctx.translate(bx, by);
    ctx.fillStyle = ['#ff8fb0', '#a7d8ff'][i];
    ctx.beginPath(); ctx.ellipse(-3, 0, 4 * flap + .8, 3.6, .5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3, 0, 4 * flap + .8, 3.6, -.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a3348';
    ctx.beginPath(); ctx.ellipse(0, 0, 1, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // petals drifting down when the yard has flowers
  if (!hasFlowers) return;
  for (let i = 0; i < 5; i++) {
    const t = (sec * .35 + i * .37) % 1;
    const bx = P.cx - P.w * .3 + ((i * 97) % (P.w * .6)) + Math.sin(sec + i) * 12;
    const by = P.cy - P.h * .4 + t * P.h * .8;
    ctx.save(); ctx.globalAlpha = (1 - t) * .8; ctx.translate(bx, by); ctx.rotate(sec * 2 + i);
    ctx.fillStyle = ['#ff8fb0', '#ffc0d6', '#c39bff'][i % 3];
    ctx.beginPath(); ctx.ellipse(0, 0, 3, 1.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function picket(ctx, px, ry, pw, tall) {
  ctx.fillStyle = 'rgba(255,255,255,.94)';
  ctx.beginPath();
  ctx.moveTo(px - pw / 2, ry + 6); ctx.lineTo(px - pw / 2, ry - tall + 6);
  ctx.lineTo(px, ry - tall); ctx.lineTo(px + pw / 2, ry - tall + 6);
  ctx.lineTo(px + pw / 2, ry + 6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(120,80,40,.4)'; ctx.lineWidth = 1; ctx.stroke();
}
function drawFence(ctx, x, y, w, h) {
  ctx.save();
  const gap = 22, pw = 6;
  // soft ground shadow beneath the fence line
  ctx.fillStyle = 'rgba(0,40,20,.10)';
  ctx.beginPath(); ctx.ellipse(x + w / 2, y + h + 10, w / 2, 10, 0, 0, Math.PI * 2); ctx.fill();
  for (const ry of [y, y + h]) {
    ctx.strokeStyle = 'rgba(120,80,40,.5)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x + w, ry); ctx.stroke();
    for (let px = x + 8; px <= x + w - 8; px += gap) {
      if (ry === y + h && Math.abs(px - (x + w / 2)) < 26) continue; // front gate gap
      picket(ctx, px, ry, pw, 16);
    }
  }
  // taller posts flanking the front gate
  picket(ctx, x + w / 2 - 26, y + h, 8, 26);
  picket(ctx, x + w / 2 + 26, y + h, 8, 26);
  ctx.restore();
}

function drawHomeSign(ctx, sec) {
  const s = homeSignXY();
  ctx.save();
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(s.x - 3, s.y - 6, 6, 50);
  ctx.translate(s.x, s.y - 4); ctx.rotate(Math.sin(sec * 1.5) * .04);
  const label = `${(state.player.name || 'My')}'s Home`;
  ctx.font = '700 13px system-ui, sans-serif';
  const bw = Math.min(ctx.measureText(label).width, 130) + 40, bh = 26;
  ctx.fillStyle = '#fff7e6';
  roundRect(ctx, -bw / 2, -bh, bw, bh, 8); ctx.fill();
  ctx.strokeStyle = '#d98e00'; ctx.lineWidth = 2.5;
  roundRect(ctx, -bw / 2, -bh, bw, bh, 8); ctx.stroke();
  ctx.drawImage(emojiSprite('🏡'), -bw / 2 + 4, -bh / 2 - 10, 20, 20);
  ctx.fillStyle = '#002d72'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(label, 10, -bh / 2 + 5, 130);
  ctx.textAlign = 'left';
  ctx.restore();
}

function drawHomeVisitor(ctx, sec) {
  const v = homeVisitor(), p = homeVisitorPos();
  const dir = state.pos.x >= p.x ? 1 : -1;
  drawAvatar(ctx, p.x, p.y, .96, v.cfg, sec + p.x * 0.05, false, dir);
  namePill(ctx, p.x, p.y - 118, v.name, v.color);
  const near = Math.hypot(state.pos.x - p.x, state.pos.y - p.y) < 150;
  if (near || sec % 12 < 4) speechBubble(ctx, p.x, p.y - 146, homeVisitorLine());
}

/* Themed regions — the island is divided into subject lands (a Voronoi of these
   centers), so crossing the map teaches structure: Math to the SE, Words NW,
   Science SW, Logic NE, all around the central Plaza hub. */
const REGIONS = [
  { id: 'plaza',   name: 'Breakout Plaza', subject: 'Hub',              x: 990,  y: 545, color: '#e0a01e', icon: '🔓' },
  { id: 'number',  name: 'Number Meadow',  subject: 'Math',             x: 1200, y: 730, color: '#1c9a85', icon: '🔢' },
  { id: 'word',    name: 'Word Woods',     subject: 'Reading & Words',  x: 585,  y: 415, color: '#7a3fd0', icon: '📖' },
  { id: 'science', name: 'Discovery Shore', subject: 'Science',         x: 455,  y: 665, color: '#0068ff', icon: '🔬' },
  { id: 'logic',   name: 'Logic Lookout',  subject: 'Logic & Puzzles',  x: 1400, y: 455, color: '#e8862a', icon: '🧩' },
];
function regionAt(x, y) {
  let best = REGIONS[0], bd = Infinity;
  for (const r of REGIONS) { const d = Math.hypot(x - r.x, y - r.y); if (d < bd) { bd = d; best = r; } }
  return best;
}
let regionBannerTimer = null;
function showRegionBanner(reg) {
  const el = document.getElementById('region-banner');
  if (!el) return;
  el.style.setProperty('--rc', reg.color);
  el.innerHTML = `<span class="rb-icon">${reg.icon}</span><span class="rb-text"><b>${reg.name}</b><i>${reg.subject}</i></span>`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(regionBannerTimer);
  regionBannerTimer = setTimeout(() => el.classList.remove('show'), 3000);
}
/* A little wooden signpost marks the heart of each region on the map. */
function drawRegionSignpost(ctx, reg, sec) {
  const x = reg.x, y = reg.y, bob = Math.sin(sec * 1.6 + reg.x) * 2;
  ctx.save();
  ctx.translate(x, y + bob);
  // post
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(-3, -4, 6, 34);
  ctx.fillStyle = 'rgba(20,35,25,.18)';
  ctx.beginPath(); ctx.ellipse(0, 32, 16, 4, 0, 0, Math.PI * 2); ctx.fill();
  // sign board
  ctx.font = '800 13px "Helix","Quicksand",system-ui,sans-serif';
  const label = `${reg.icon} ${reg.name}`;
  const tw = ctx.measureText(label).width;
  const w = tw + 20, h = 26, by = -34;
  ctx.save();
  ctx.shadowColor = 'rgba(0,20,50,.35)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
  const g = ctx.createLinearGradient(0, by - h / 2, 0, by + h / 2);
  g.addColorStop(0, reg.color); g.addColorStop(1, shade(reg.color, -.22));
  ctx.fillStyle = g;
  roundRect(ctx, -w / 2, by - h / 2, w, h, 8); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2;
  roundRect(ctx, -w / 2, by - h / 2, w, h, 8); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, by + 1);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.restore();
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, r + amt * 255));
  g = Math.max(0, Math.min(255, g + amt * 255));
  b = Math.max(0, Math.min(255, b + amt * 255));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/* Guided onboarding — a friendly owl walks first-timers to their first breakout,
   then a stealth placement + quest commitment finishes the flow (onboarding.js). */
const TUTORIAL_STEPS = {
  1: { target: 'daily', say: (n) => `Welcome to the island, ${n}! I'm Ollie. 🦉 Follow the glowing path to the Lock Plaza for your very first lock!` },
};

function startTutorial() {
  if (state.tutorialStep === 0) { state.tutorialStep = 1; saveState(); }
  updateTutorialBanner();
}
function tutorialActive() { return state.tutorialStep === 1; } // only the first-lock guidance shows a path
function tutorialTarget() {
  const step = TUTORIAL_STEPS[state.tutorialStep];
  return step ? BUILDINGS.find(b => b.id === step.target) : null;
}
function updateTutorialBanner() {
  const banner = document.getElementById('tut-banner');
  if (!banner) return;
  const step = TUTORIAL_STEPS[state.tutorialStep];
  if (step) {
    document.getElementById('tut-say').textContent = step.say(state.player.name || 'Explorer');
    banner.classList.add('show');
  } else {
    banner.classList.remove('show');
  }
}
function advanceTutorial() { /* building visits no longer drive onboarding */ }

// First lock cracked -> quietly place the student, then let them commit to a quest.
function completeTutorialLock() {
  if (state.tutorialStep !== 1) return;
  state.tutorialStep = 2; // calibrating (modals take over)
  saveState();
  document.getElementById('tut-banner').classList.remove('show');
  if (typeof runOnboardingCalibration === 'function') setTimeout(runOnboardingCalibration, 350);
}

// Onboarding complete: ignite the world with a warm sign-off.
function finishTutorial() {
  state.tutorialStep = 5;
  saveState();
  updateHUD();
  const banner = document.getElementById('tut-banner');
  if (banner) {
    document.getElementById('tut-say').textContent = `Your quest begins, ${state.player.name || 'Explorer'}! Explore freely, find hidden Sparkle Keys, help your island friends, and collect the Five Keys of Knowledge. 🗝️`;
    banner.classList.add('show', 'finale');
    setTimeout(() => banner.classList.remove('show', 'finale'), 7000);
  }
}

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
  // if a home base flag is planted, start the visit there (once per page session)
  if (!world._spawned) {
    world._spawned = true;
    if (state.home && state.home.base && canWalk(state.home.base.x, state.home.base.y)) {
      state.pos.x = state.home.base.x; state.pos.y = state.home.base.y;
    }
  }
  if (state.tutorialStep === 0) startTutorial();
  else if (state.tutorialStep === 2 && typeof runOnboardingCalibration === 'function') setTimeout(runOnboardingCalibration, 400);
  else updateTutorialBanner();
  if (typeof updateBreakoutCta === 'function') updateBreakoutCta();
  // nudge about due spaced-repetition reviews, once per day
  if (typeof srDueCount === 'function' && state.tutorialStep >= 5) {
    const n = srDueCount();
    if (n > 0 && state.srNudged !== todayKey()) {
      state.srNudged = todayKey(); saveState();
      setTimeout(() => toast(`🧠 ${n} concept${n > 1 ? 's are' : ' is'} ready to review at the Lock Plaza!`), 1200);
    }
  }
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
    if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') {
      if (world.nearSparkle !== null && world.nearSparkle !== undefined || world.nearNpc || world.nearHome || world.nearBuilding) triggerNearAction();
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
    if (world.nearHome && Math.hypot(p.x - world.nearHome.x, p.y - world.nearHome.y) < world.nearHome.r) { doHomeAction(world.nearHome); return; }
    world.target = p;
  });

  document.getElementById('enter-btn').addEventListener('click', triggerNearAction);
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
  world.sec = sec;
  stepPlayer();
  // navigation-time telemetry: time spent moving around the world, flushed in
  // ~5s chunks. Paired with lock thinking-time, this is the intrinsic-integration
  // health check (thinking vs wandering) the plan asks us to instrument.
  const dt = world.lastLoopT ? t - world.lastLoopT : 0;
  world.lastLoopT = t;
  if (world.walking && dt > 0 && dt < 500) {
    world.navMs = (world.navMs || 0) + dt;
    if (world.navMs >= 5000) { track('time_navigating_ms', { ms: Math.round(world.navMs) }); world.navMs = 0; }
  }
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

  // interactive spot on the student's homestead (design sign or live décor)
  world.nearHome = homeSpotAt(state.pos.x, state.pos.y);

  // nearest uncollected sparkle key within reach
  world.nearSparkle = null;
  SPARKLE_KEYS.forEach(([kx, ky], i) => {
    if (sparkleKeyFound(i)) return;
    if (Math.hypot(state.pos.x - kx, state.pos.y - ky) < 66) world.nearSparkle = i;
  });

  // nearest island friend with a quest still available today
  world.nearNpc = null;
  const sec = world.sec || 0;
  for (const n of NPCS) {
    const p = npcPos(n, sec);
    if (Math.hypot(state.pos.x - p.x, state.pos.y - p.y) < 92) { world.nearNpc = n; break; }
  }

  // which themed region the explorer is standing in (announce on change)
  const reg = regionAt(state.pos.x, state.pos.y);
  if (!world.region || world.region.id !== reg.id) {
    const first = !world.region;
    world.region = reg;
    if (!first) showRegionBanner(reg);
    if (typeof ambient !== 'undefined') ambient.setRegion(reg.id);
  }

  const btn = document.getElementById('enter-btn');
  if (world.nearSparkle !== null) {
    btn.classList.add('show'); btn.textContent = 'Collect! ⭐';
  } else if (world.nearNpc && npcQuestFor(world.nearNpc.name) && !npcQuestDone(world.nearNpc.name)) {
    btn.classList.add('show'); btn.textContent = `Help ${world.nearNpc.name} 💬`;
  } else if (world.nearHome) {
    btn.classList.add('show'); btn.textContent = world.nearHome.label;
  } else if (world.nearBuilding) {
    btn.classList.add('show'); btn.textContent = `Enter ${world.nearBuilding.name} ✦`;
  } else {
    btn.classList.remove('show');
  }
}

// which quest belongs to an NPC (matched by name)
function npcQuestFor(name) {
  return DATA.npcQuests.find(q => q.npc === name) || null;
}

// unified action for the on-screen button / E key, respecting proximity priority
function triggerNearAction() {
  if (world.nearSparkle !== null && world.nearSparkle !== undefined) { doCollectSparkle(world.nearSparkle); return; }
  if (world.nearNpc) {
    const q = npcQuestFor(world.nearNpc.name);
    if (q && !npcQuestDone(world.nearNpc.name)) { openNpcQuest(world.nearNpc, q); return; }
  }
  if (world.nearHome) { doHomeAction(world.nearHome); return; }
  if (world.nearBuilding) openBuilding(world.nearBuilding.id);
}

function doCollectSparkle(i) {
  if (!collectSparkleKey(i)) return;
  world.nearSparkle = null;
  playSparkleChime();
  const found = sparkleKeysToday().length;
  toast(found >= 5 ? '✨ All 5 Sparkle Keys found today! +12 🔑' : `✨ Sparkle Key found! ${found}/5 today · +12 🔑`);
}

function playSparkleChime() {
  try {
    const ctxA = new (window.AudioContext || window.webkitAudioContext)();
    [523, 659, 784, 1047].forEach((f, i) => {
      const o = ctxA.createOscillator(), g = ctxA.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      const t = ctxA.currentTime + i * .08;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.18, t + .02);
      g.gain.exponentialRampToValueAtTime(.001, t + .3);
      o.connect(g); g.connect(ctxA.destination); o.start(t); o.stop(t + .32);
    });
    setTimeout(() => ctxA.close(), 800);
  } catch (e) { /* audio unavailable */ }
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

  // region signposts — landmarks that give each part of the island its identity
  // (the central Plaza is already marked by the Lock Plaza pin)
  REGIONS.forEach(r => { if (r.id !== 'plaza') drawRegionSignpost(ctx, r, sec); });

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

  // lagoon water shimmer — soft light bands rippling over the cove
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const wy = 520 + i * 26 + Math.sin(sec * 1.1 + i) * 4;
    const a = (Math.sin(sec * 1.6 + i * 1.3) * .5 + .5) * .18;
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#bfeaff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let x = 440; x <= 600; x += 12) {
      const yy = wy + Math.sin(x * .06 + sec * 2 + i) * 3;
      x === 440 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.restore();

  // floating light motes — soft golden pollen drifting through the sunbeams
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 16; i++) {
    const drift = sec * (6 + (i % 4) * 3);
    const mx = 260 + ((i * 149 + drift) % 1440);
    const my = 220 + ((i * 211) % 700) + Math.sin(sec * .5 + i * 1.7) * 26 - (drift % 60) * .3;
    const pulse = .3 + Math.abs(Math.sin(sec * 1.6 + i * 1.3)) * .7;
    const g = ctx.createRadialGradient(mx, my, 0, mx, my, 9);
    g.addColorStop(0, `rgba(255,240,170,${pulse * .55})`);
    g.addColorStop(1, 'rgba(255,240,170,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(mx, my, 9, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

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

  // tutorial: a glowing dashed path leading to the next objective
  if (tutorialActive()) {
    const tgt = tutorialTarget();
    if (tgt) {
      const dashOff = -(sec * 40) % 40;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,203,28,.85)'; ctx.lineWidth = 8; ctx.lineCap = 'round';
      ctx.setLineDash([2, 26]); ctx.lineDashOffset = dashOff;
      ctx.shadowColor = 'rgba(255,203,28,.9)'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.moveTo(state.pos.x, state.pos.y + 8); ctx.lineTo(tgt.x, tgt.y + 14); ctx.stroke();
      ctx.restore();
      // pulsing ring at the destination
      const pr = 44 + Math.sin(sec * 3) * 10;
      ctx.save();
      ctx.strokeStyle = `rgba(255,203,28,${.55 + Math.sin(sec * 3) * .25})`; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(tgt.x, tgt.y + 14, pr, pr * .5, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
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

  // floating sparkle keys — hidden daily collectibles that vanish once found
  SPARKLE_KEYS.forEach(([kx, ky], i) => {
    if (sparkleKeyFound(i)) return;
    const fl = Math.sin(sec * 2 + i * 1.7) * 6;
    const y = ky + fl;
    // radiant halo so kids can spot them across the island
    const halo = .3 + Math.sin(sec * 3 + i) * .18;
    const g = ctx.createRadialGradient(kx, y, 2, kx, y, 46);
    g.addColorStop(0, `rgba(255,226,122,${halo + .25})`);
    g.addColorStop(1, 'rgba(255,226,122,0)');
    ctx.save(); ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(kx, y, 46, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // twinkle sparkles
    for (let s = 0; s < 3; s++) {
      const a = (sec * 1.5 + i + s * 2.1) % 3;
      if (a > 1.6) continue;
      const ang = (s / 3) * Math.PI * 2 + sec;
      ctx.save(); ctx.globalAlpha = (1 - a / 1.6) * .9; ctx.fillStyle = '#fff6cf';
      drawStar(ctx, kx + Math.cos(ang) * (18 + a * 10), y + Math.sin(ang) * (14 + a * 8), 4, 3.2, 1.2); ctx.fill();
      ctx.restore();
    }
    ctx.save(); ctx.globalAlpha = .85 + Math.sin(sec * 3 + i) * .15;
    ctx.translate(kx, y); ctx.rotate(Math.sin(sec + i) * .2);
    drawKeyGlyph(ctx, 0, 0, .9, '#ffe27a');
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

  // the student's homestead: décor blueprint rendered as a walkable yard
  drawHomePlot(ctx, sec);

  // y-sorted characters
  const drawables = [
    ...NPCS.map(n => ({ y: npcPos(n, sec).y, fn: () => drawNPC(ctx, n, sec) })),
    { y: homeVisitorPos().y, fn: () => drawHomeVisitor(ctx, sec) },
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
  // sun god-rays — soft light beams fanning from the upper corner
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const sunX = W * .82, sunY = -H * .12;
  for (let i = 0; i < 5; i++) {
    const ang = 1.9 + i * .16 + Math.sin(sec * .2 + i) * .015;
    const len = H * 1.5, wdt = 46 + i * 14;
    ctx.save(); ctx.translate(sunX, sunY); ctx.rotate(ang);
    const g = ctx.createLinearGradient(0, 0, 0, len);
    const a = .05 + Math.sin(sec * .5 + i * 1.3) * .02;
    g.addColorStop(0, `rgba(255,244,190,${Math.max(0, a)})`); g.addColorStop(1, 'rgba(255,244,190,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-wdt, 0); ctx.lineTo(wdt, 0); ctx.lineTo(wdt * 2.4, len); ctx.lineTo(-wdt * 2.4, len); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // wish-star — a rare sparkle streak arcs across the sky (a little magic moment)
  const wsCycle = sec % 17;
  if (wsCycle < 1.1) {
    const p = wsCycle / 1.1;
    const wx = W * .12 + p * W * .7, wy = H * .1 + p * H * .18 - Math.sin(p * Math.PI) * 30;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const tg = ctx.createLinearGradient(wx - 60, wy - 18, wx, wy);
    tg.addColorStop(0, 'rgba(255,240,180,0)'); tg.addColorStop(1, 'rgba(255,250,210,.85)');
    ctx.strokeStyle = tg; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(wx - 60, wy - 18); ctx.lineTo(wx, wy); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,235,.95)';
    drawStar(ctx, wx, wy, 5, 6, 2.6); ctx.fill();
    ctx.restore();
  }

  // subtle region-colored wash from the lower edge, so each land feels distinct
  if (world.region) {
    const rc = world.region.color;
    const grd = ctx.createLinearGradient(0, H, 0, H * .55);
    grd.addColorStop(0, hexA(rc, .14)); grd.addColorStop(1, hexA(rc, 0));
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
  }

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
  // walk-cycle frame must advance monotonically or the legs stutter. Use a
  // stable per-NPC offset (base position), not the live x, which oscillates
  // for wanderers like Zoe and made the animation play back and forth.
  const gaitPhase = sec + (n.cx !== undefined ? n.cx : n.x) * 0.05;
  drawAvatar(ctx, p.x, p.y, .98, n.cfg, gaitPhase, walking, n._face);
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

  // quest availability marker — a bobbing "!" floats over friends who need help
  const quest = npcQuestFor(n.name);
  const questOpen = quest && !npcQuestDone(n.name);
  if (questOpen) {
    const by = p.y - 150 + Math.sin(sec * 3 + p.x) * 4;
    ctx.save();
    ctx.fillStyle = '#ffca1c';
    ctx.beginPath(); ctx.arc(p.x, by, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(p.x, by, 13, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#5c25b7'; ctx.font = '900 18px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('!', p.x, by + 6.5); ctx.textAlign = 'left';
    ctx.restore();
  }

  // chatter: proximity greeting wins, otherwise staggered rotating lines
  const i = NPCS.indexOf(n);
  const nearPlayer = Math.hypot(state.pos.x - p.x, state.pos.y - p.y) < 135;
  const cycle = (sec + i * 5.5) % 22;
  let line = null;
  if (nearPlayer) line = getNpcLine(n.name);
  else if (cycle < 3.4) {
    const lines = NPC_LINES[n.name] || [];
    line = lines[(((sec + i * 5.5) / 22) | 0) % lines.length];
  }
  if (line) speechBubble(ctx, p.x, p.y - (questOpen ? 170 : 146), line);
}

// state-aware greeting when the player is close
function getNpcLine(name) {
  const quest = npcQuestFor(name);
  if (quest && !npcQuestDone(name)) return `${quest.icon} Help me with ${quest.title}?`;
  if (quest && npcQuestDone(name)) return `Thanks for the help today! 🎉`;
  return `Hi, ${state.player.name || 'Explorer'}! 👋`;
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
