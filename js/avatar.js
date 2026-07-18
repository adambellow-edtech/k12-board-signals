/* Breakout Land — painted hero sprites (AI-generated cast) + creator UI.
   The 12 explorers live in assets/heroes.webp (6x2 grid, 300x470 cells,
   feet anchored 10px above each cell's bottom). Accessories, pets and
   walk trails are drawn as overlays so the keys economy stays alive. */

const HERO_CELL = { w: 300, h: 470, cols: 6 };
const heroImg = new Image();
let heroReady = false;
heroImg.onload = () => { heroReady = true; };
heroImg.src = (typeof window !== 'undefined' && window.ASSETS && window.ASSETS.heroes) ? window.ASSETS.heroes : 'assets/heroes.webp';

/* per-hero forehead tone (sampled from the sheet) for blink eyelids */
let heroTones = null;
function sampleHeroTones() {
  if (heroTones || !heroReady) return;
  try {
    const cv = document.createElement('canvas');
    cv.width = heroImg.width; cv.height = heroImg.height;
    const c = cv.getContext('2d');
    c.drawImage(heroImg, 0, 0);
    heroTones = [];
    for (let k = 0; k < 12; k++) {
      const px = (k % 6) * HERO_CELL.w + 150, py = ((k / 6) | 0) * HERO_CELL.h + 132;
      const d = c.getImageData(px, py, 1, 1).data;
      heroTones.push(d[3] > 100 ? `rgb(${d[0]},${d[1]},${d[2]})` : '#e8b48c');
    }
  } catch (e) { heroTones = Array(12).fill('#e8b48c'); }
}

/**
 * Draw a hero sprite centered at x with feet at y.
 * cfg: { hero, accessory, ... } — height ≈ 118 * scale.
 * dir may be fractional (eased turn); wave=true raises a greeting hand.
 */
function drawAvatar(ctx, x, y, scale, cfg, frame = 0, walking = false, dir = 1, wave = false) {
  const hero = cfg && Number.isInteger(cfg.hero) ? Math.max(0, Math.min(11, cfg.hero)) : 0;
  const dh = 126 * scale;
  const dw = dh * (HERO_CELL.w / HERO_CELL.h);
  const col = hero % HERO_CELL.cols, row = (hero / HERO_CELL.cols) | 0;

  // eased gait: bob + tiny squash-and-stretch, gentle idle breathing
  const bob = walking ? Math.abs(Math.sin(frame * 9)) * 5 * scale : Math.sin(frame * 2.2) * 1.6 * scale;
  const lean = walking ? Math.sin(frame * 9) * .05 : 0;
  const squash = walking ? 1 + Math.sin(frame * 18) * .035 : 1 + Math.sin(frame * 2.2) * .012;
  const face = Math.abs(dir) < .22 ? (dir < 0 ? -.22 : .22) : dir; // never fully flat mid-turn

  // soft ground shadow syncs with the hop
  const shScale = 1 - (bob / (14 * scale));
  ctx.fillStyle = 'rgba(20,35,25,.22)';
  ctx.beginPath(); ctx.ellipse(x, y + 2 * scale, 20 * scale * shScale, 6 * scale * shScale, 0, 0, Math.PI * 2); ctx.fill();

  ctx.save();
  ctx.translate(x, y - bob);
  ctx.rotate(lean);
  ctx.scale(face, squash);

  // head geometry for accessory overlays (chibi grid is uniform enough)
  const headCY = -dh * .655;
  const headR = dh * .21;

  if (cfg && cfg.accessory === 'cape') {
    ctx.fillStyle = '#d63e2e';
    ctx.beginPath();
    ctx.moveTo(-dw * .22, -dh * .48);
    ctx.quadraticCurveTo(-dw * .48, -dh * .22, -dw * .34 - lean * 40, -dh * .03);
    ctx.lineTo(dw * .26, -dh * .06);
    ctx.quadraticCurveTo(dw * .34, -dh * .28, dw * .22, -dh * .48);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(40,34,56,.4)'; ctx.lineWidth = 2 * scale; ctx.stroke();
  }

  if (heroReady) {
    ctx.drawImage(heroImg, col * HERO_CELL.w, row * HERO_CELL.h, HERO_CELL.w, HERO_CELL.h, -dw / 2, -dh, dw, dh);
    // blink: skin-tone eyelids sweep down every few seconds
    sampleHeroTones();
    const bcycle = (frame * .9 + hero * 1.37) % 3.8;
    if (bcycle < .13 && heroTones) {
      ctx.fillStyle = heroTones[hero];
      const eyeY = headCY + headR * .08, eyeDX = headR * .36;
      ctx.beginPath(); ctx.ellipse(-eyeDX, eyeY, headR * .22, headR * .15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(eyeDX, eyeY, headR * .22, headR * .15, 0, 0, Math.PI * 2); ctx.fill();
    }
    // wave: a friendly raised hand wiggling hello
    if (wave) {
      const wa = -2.2 + Math.sin(frame * 9) * .45;
      const sx = dw * .34, sy = -dh * .42;
      ctx.strokeStyle = heroTones ? heroTones[hero] : '#e8b48c';
      ctx.lineWidth = 7 * scale; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(wa) * headR * 1.15, sy + Math.sin(wa) * headR * 1.15);
      ctx.stroke();
      ctx.fillStyle = heroTones ? heroTones[hero] : '#e8b48c';
      ctx.beginPath();
      ctx.arc(sx + Math.cos(wa) * headR * 1.3, sy + Math.sin(wa) * headR * 1.3, 5.5 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,34,56,.35)'; ctx.lineWidth = 1.6 * scale; ctx.stroke();
    }
  } else {
    // loading fallback: simple silhouette
    ctx.fillStyle = '#7da8d8';
    ctx.beginPath(); ctx.arc(0, headCY, headR, 0, Math.PI * 2); ctx.fill();
    roundRect(ctx, -dw * .18, -dh * .5, dw * .36, dh * .42, 8 * scale); ctx.fill();
  }

  // accessory overlays
  const acc = cfg && cfg.accessory;
  ctx.lineWidth = 2.4 * scale;
  if (acc === 'cap') {
    ctx.fillStyle = '#2f6fdb';
    ctx.beginPath(); ctx.arc(0, headCY - headR * .34, headR * .92, Math.PI, 0); ctx.fill();
    roundRect(ctx, headR * .1, headCY - headR * .62, headR * 1.35, headR * .3, headR * .15); ctx.fill();
    ctx.strokeStyle = 'rgba(40,34,56,.45)'; ctx.stroke();
  } else if (acc === 'glasses') {
    ctx.strokeStyle = '#173a6b';
    ctx.beginPath(); ctx.arc(-headR * .38, headCY + headR * .1, headR * .3, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(headR * .38, headCY + headR * .1, headR * .3, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-headR * .08, headCY + headR * .1); ctx.lineTo(headR * .08, headCY + headR * .1); ctx.stroke();
  } else if (acc === 'crown') {
    const ty = headCY - headR * .92;
    ctx.fillStyle = '#ffb627';
    ctx.beginPath();
    ctx.moveTo(-headR * .62, ty); ctx.lineTo(-headR * .62, ty - headR * .55); ctx.lineTo(-headR * .3, ty - headR * .22);
    ctx.lineTo(0, ty - headR * .62); ctx.lineTo(headR * .3, ty - headR * .22); ctx.lineTo(headR * .62, ty - headR * .55);
    ctx.lineTo(headR * .62, ty);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(40,34,56,.45)'; ctx.stroke();
    ctx.fillStyle = '#ff6b5b';
    ctx.beginPath(); ctx.arc(0, ty - headR * .18, headR * .12, 0, Math.PI * 2); ctx.fill();
  } else if (acc === 'wizard') {
    const ty = headCY - headR * .8;
    ctx.fillStyle = '#5b3fbf';
    ctx.beginPath();
    ctx.moveTo(-headR * .95, ty); ctx.lineTo(headR * .95, ty); ctx.lineTo(headR * .18, ty - headR * 1.5);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(40,34,56,.45)'; ctx.stroke();
    ctx.fillStyle = '#ffd75e';
    drawStar(ctx, headR * .1, ty - headR * .7, 5, headR * .16, headR * .075); ctx.fill();
  } else if (acc === 'headband') {
    ctx.fillStyle = '#ff6b5b';
    roundRect(ctx, -headR * .95, headCY - headR * .55, headR * 1.9, headR * .26, headR * .13); ctx.fill();
    ctx.strokeStyle = 'rgba(40,34,56,.35)'; ctx.stroke();
  }

  ctx.restore();
}

/* Head-and-shoulders portrait crop for HUD chips */
function drawHeroPortrait(ctx, size, hero) {
  const col = (hero % HERO_CELL.cols) * HERO_CELL.w, row = ((hero / HERO_CELL.cols) | 0) * HERO_CELL.h;
  ctx.clearRect(0, 0, size, size);
  if (heroReady) {
    ctx.drawImage(heroImg, col + 35, row + 15, 230, 230, 0, 0, size, size);
  }
}

function drawPet(ctx, x, y, scale, petId, frame) {
  const pet = DATA.pets.find(p => p.id === petId);
  if (!pet || petId === 'nopet') return;
  const s = scale;
  const hop = Math.abs(Math.sin(frame * 6)) * 4 * s;
  ctx.save(); ctx.translate(x, y - hop);
  ctx.fillStyle = 'rgba(20,35,25,.15)';
  ctx.beginPath(); ctx.ellipse(0, hop, 8 * s, 2.5 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = pet.color;
  ctx.beginPath(); ctx.arc(0, -8 * s, 7 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -17 * s, 5.5 * s, 0, Math.PI * 2); ctx.fill();
  if (petId === 'fox' || petId === 'owl') {
    ctx.beginPath(); ctx.moveTo(-5 * s, -20 * s); ctx.lineTo(-3 * s, -26 * s); ctx.lineTo(-1 * s, -20 * s); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(1 * s, -20 * s); ctx.lineTo(3 * s, -26 * s); ctx.lineTo(5 * s, -20 * s); ctx.closePath(); ctx.fill();
  }
  if (petId === 'bot') {
    ctx.strokeStyle = pet.color; ctx.lineWidth = 1.5 * s;
    ctx.beginPath(); ctx.moveTo(0, -22 * s); ctx.lineTo(0, -26 * s); ctx.stroke();
    ctx.fillStyle = '#ff6b5b'; ctx.beginPath(); ctx.arc(0, -27 * s, 1.6 * s, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#22252e';
  ctx.beginPath(); ctx.arc(-2 * s, -17.5 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(2 * s, -17.5 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
  // every so often the pet floats a little heart
  const hc = (frame * .8 + x * .01) % 7;
  if (hc < 1.1) {
    const t = hc / 1.1;
    ctx.save(); ctx.globalAlpha = (1 - t) * .9;
    ctx.fillStyle = '#ff7d9c';
    const hy = -26 * s - t * 22 * s, hs = (2.6 + t * 1.4) * s;
    ctx.beginPath();
    ctx.arc(-hs * .5, hy, hs * .55, 0, Math.PI * 2);
    ctx.arc(hs * .5, hy, hs * .55, 0, Math.PI * 2);
    ctx.moveTo(-hs, hy + hs * .2); ctx.lineTo(0, hy + hs * 1.4); ctx.lineTo(hs, hy + hs * .2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/* helpers */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function drawStar(ctx, cx, cy, points, outer, inner) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/* ---- Avatar creator screen ---- */

let creatorRAF = null;

function openAvatarCreator(isEdit) {
  showScreen('avatar');
  const p = state.player;
  document.getElementById('av-name').value = p.name;
  document.getElementById('av-title').textContent = isEdit ? 'The Closet' : 'Choose Your Explorer';
  document.getElementById('av-done').textContent = isEdit ? 'Save Look' : 'Start Exploring!';

  buildHeroGrid(p);
  buildItemRow('av-acc', DATA.accessories, p.accessory, v => { p.accessory = v; });
  buildItemRow('av-pet', DATA.pets, p.pet, v => { p.pet = v; });
  buildItemRow('av-trail', DATA.trails, p.trail, v => { p.trail = v; });

  const cv = document.getElementById('av-canvas');
  const ctx = cv.getContext('2d');
  cancelAnimationFrame(creatorRAF);
  const t0 = performance.now();
  (function loop(t) {
    const sec = (t - t0) / 1000;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(0,45,114,.08)';
    ctx.beginPath(); ctx.ellipse(cv.width / 2, cv.height - 26, 74, 16, 0, 0, Math.PI * 2); ctx.fill();
    drawAvatar(ctx, cv.width / 2, cv.height - 30, 1.75, state.player, sec, false, 1);
    drawPet(ctx, cv.width / 2 + 82, cv.height - 30, 1.6, state.player.pet, sec);
    if (document.getElementById('screen-avatar').classList.contains('active')) {
      creatorRAF = requestAnimationFrame(loop);
    }
  })(t0);
}

function buildHeroGrid(p) {
  const el = document.getElementById('av-heroes');
  el.innerHTML = '';
  DATA.heroes.forEach((h, i) => {
    const b = document.createElement('button');
    b.className = 'hero-card' + (i === p.hero ? ' sel' : '');
    const cv = document.createElement('canvas');
    cv.width = 74; cv.height = 104;
    b.appendChild(cv);
    const nm = document.createElement('span');
    nm.textContent = h.name;
    b.appendChild(nm);
    b.onclick = () => {
      p.hero = i;
      [...el.children].forEach(c => c.classList.remove('sel'));
      b.classList.add('sel');
      blip(620);
    };
    el.appendChild(b);
    const paint = () => {
      const c = cv.getContext('2d');
      c.clearRect(0, 0, 74, 104);
      drawAvatar(c, 37, 99, .78, { hero: i, accessory: 'none' }, 0, false, 1);
    };
    if (heroReady) paint();
    else heroImg.addEventListener('load', paint, { once: true });
  });
}

function buildItemRow(elId, items, current, onPick) {
  const el = document.getElementById(elId);
  el.innerHTML = '';
  items.forEach(it => {
    const owned = itemOwned(it);
    const b = document.createElement('button');
    b.className = 'chip' + (it.id === current ? ' sel' : '') + (owned ? '' : ' locked');
    b.innerHTML = owned ? it.name : `🔒 ${it.name} · <span class="price">${it.price}🔑</span>`;
    b.onclick = () => {
      if (!owned) { toast(`Unlock ${it.name} in the Style Shop for ${it.price} keys!`); buzz(); return; }
      onPick(it.id);
      [...el.children].forEach(c => c.classList.remove('sel')); b.classList.add('sel'); blip(620);
    };
    el.appendChild(b);
  });
}

function finishAvatar() {
  const name = document.getElementById('av-name').value.trim();
  state.player.name = name || 'Explorer';
  const first = !state.created;
  state.created = true;
  saveState();
  if (first) toast(`Welcome to Breakout Land, ${state.player.name}! 🎉`);
  enterWorld();
}
