/* Breakout Land — chibi avatar renderer (canvas) + avatar creator UI */

function outfitColor(id) {
  const o = DATA.outfits.find(o => o.id === id);
  return o ? o.color : '#2ec4b6';
}

/**
 * Draw the avatar centered at (x, y = feet), height ≈ 86 * scale.
 * frame: animation time in seconds; walking: bool; dir: -1 left / 1 right.
 */
function drawAvatar(ctx, x, y, scale, cfg, frame = 0, walking = false, dir = 1) {
  const s = scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);

  const bob = walking ? Math.sin(frame * 12) * 2.2 * s : Math.sin(frame * 2.4) * 1.1 * s;
  const legSwing = walking ? Math.sin(frame * 12) * 7 * s : 0;
  const skin = cfg.skin, hair = cfg.hairColor, outfit = outfitColor(cfg.outfit);

  // shadow
  ctx.fillStyle = 'rgba(20,35,25,.18)';
  ctx.beginPath(); ctx.ellipse(0, 2 * s, 17 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fill();

  ctx.translate(0, bob);

  // cape (behind)
  if (cfg.accessory === 'cape') {
    ctx.fillStyle = '#d63e2e';
    ctx.beginPath();
    ctx.moveTo(-11 * s, -46 * s);
    ctx.quadraticCurveTo(-20 * s, -20 * s, -14 * s + legSwing * .4, -2 * s);
    ctx.lineTo(10 * s, -6 * s);
    ctx.quadraticCurveTo(14 * s, -26 * s, 11 * s, -46 * s);
    ctx.closePath(); ctx.fill();
  }

  // legs
  ctx.strokeStyle = '#3a3f52'; ctx.lineCap = 'round'; ctx.lineWidth = 6 * s;
  ctx.beginPath(); ctx.moveTo(-6 * s, -16 * s); ctx.lineTo(-6 * s + legSwing, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6 * s, -16 * s); ctx.lineTo(6 * s - legSwing, 0); ctx.stroke();
  // shoes
  ctx.fillStyle = '#faf6ee';
  ctx.beginPath(); ctx.ellipse(-6 * s + legSwing, 0, 5 * s, 3 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(6 * s - legSwing, 0, 5 * s, 3 * s, 0, 0, Math.PI * 2); ctx.fill();

  // body
  ctx.fillStyle = outfit;
  roundRect(ctx, -13 * s, -44 * s, 26 * s, 30 * s, 10 * s); ctx.fill();
  ctx.strokeStyle = 'rgba(40,34,56,.5)'; ctx.lineWidth = 2.2 * s; ctx.stroke();
  // shirt shading
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  roundRect(ctx, -13 * s, -44 * s, 26 * s, 9 * s, 8 * s); ctx.fill();
  if (cfg.outfit === 'star-suit') {
    ctx.fillStyle = '#ffd75e';
    drawStar(ctx, 0, -30 * s, 5, 5 * s, 2.4 * s); ctx.fill();
  }
  if (cfg.outfit === 'inventor') {
    ctx.strokeStyle = '#c9c2b2'; ctx.lineWidth = 1.6 * s;
    ctx.beginPath(); ctx.moveTo(0, -44 * s); ctx.lineTo(0, -16 * s); ctx.stroke();
  }

  // arms
  ctx.strokeStyle = outfit; ctx.lineWidth = 5.5 * s;
  const armSwing = walking ? Math.sin(frame * 12 + Math.PI) * 6 * s : 0;
  ctx.beginPath(); ctx.moveTo(-12 * s, -38 * s); ctx.lineTo(-16 * s + armSwing * .5, -22 * s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(12 * s, -38 * s); ctx.lineTo(16 * s - armSwing * .5, -22 * s); ctx.stroke();
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(-16 * s + armSwing * .5, -21 * s, 3.4 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(16 * s - armSwing * .5, -21 * s, 3.4 * s, 0, Math.PI * 2); ctx.fill();

  // head (big, chibi)
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(0, -62 * s, 19 * s, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(40,34,56,.5)'; ctx.lineWidth = 2.2 * s; ctx.stroke();

  // hair styles
  ctx.fillStyle = hair;
  const hs = cfg.hairStyle;
  if (hs === 'spiky') {
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 7 * s - 4 * s, -72 * s);
      ctx.lineTo(i * 7 * s, -88 * s - Math.abs(i) * -2 * s);
      ctx.lineTo(i * 7 * s + 4 * s, -72 * s);
      ctx.closePath(); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(0, -68 * s, 18 * s, Math.PI, 0); ctx.fill();
  } else if (hs === 'puff') {
    ctx.beginPath(); ctx.arc(0, -76 * s, 15 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-12 * s, -70 * s, 10 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(12 * s, -70 * s, 10 * s, 0, Math.PI * 2); ctx.fill();
  } else if (hs === 'long') {
    ctx.beginPath(); ctx.arc(0, -66 * s, 19.5 * s, Math.PI * .95, Math.PI * 2.05); ctx.fill();
    roundRect(ctx, -19 * s, -68 * s, 8 * s, 28 * s, 4 * s); ctx.fill();
    roundRect(ctx, 11 * s, -68 * s, 8 * s, 28 * s, 4 * s); ctx.fill();
  } else if (hs === 'buzz') {
    ctx.beginPath(); ctx.arc(0, -64 * s, 19 * s, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  } else if (hs === 'pony') {
    ctx.beginPath(); ctx.arc(0, -66 * s, 19 * s, Math.PI * .95, Math.PI * 2.05); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-16 * s, -78 * s, 6 * s, 12 * s, .6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffb627';
    ctx.beginPath(); ctx.arc(-13 * s, -72 * s, 2.6 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = hair;
  } else { // swoop
    ctx.beginPath(); ctx.arc(0, -66 * s, 19 * s, Math.PI, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(8 * s, -76 * s, 12 * s, 7 * s, -.35, 0, Math.PI * 2); ctx.fill();
  }

  // face
  ctx.fillStyle = '#22252e';
  ctx.beginPath(); ctx.arc(-6.5 * s, -62 * s, 2.4 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(6.5 * s, -62 * s, 2.4 * s, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#22252e'; ctx.lineWidth = 1.8 * s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, -57 * s, 5 * s, Math.PI * .15, Math.PI * .85); ctx.stroke();
  // cheeks
  ctx.fillStyle = 'rgba(255,120,110,.35)';
  ctx.beginPath(); ctx.arc(-11 * s, -56 * s, 3 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(11 * s, -56 * s, 3 * s, 0, Math.PI * 2); ctx.fill();

  // accessories (front)
  const acc = cfg.accessory;
  if (acc === 'cap') {
    ctx.fillStyle = '#2f6fdb';
    ctx.beginPath(); ctx.arc(0, -70 * s, 17 * s, Math.PI, 0); ctx.fill();
    roundRect(ctx, 2 * s, -74 * s, 22 * s, 5 * s, 2.5 * s); ctx.fill();
  } else if (acc === 'glasses') {
    ctx.strokeStyle = '#1d2a4d'; ctx.lineWidth = 2 * s;
    ctx.beginPath(); ctx.arc(-6.5 * s, -62 * s, 5.5 * s, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(6.5 * s, -62 * s, 5.5 * s, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-1 * s, -62 * s); ctx.lineTo(1 * s, -62 * s); ctx.stroke();
  } else if (acc === 'crown') {
    ctx.fillStyle = '#ffb627';
    ctx.beginPath();
    ctx.moveTo(-12 * s, -78 * s); ctx.lineTo(-12 * s, -90 * s); ctx.lineTo(-6 * s, -82 * s);
    ctx.lineTo(0, -92 * s); ctx.lineTo(6 * s, -82 * s); ctx.lineTo(12 * s, -90 * s); ctx.lineTo(12 * s, -78 * s);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff6b5b';
    ctx.beginPath(); ctx.arc(0, -84 * s, 2.2 * s, 0, Math.PI * 2); ctx.fill();
  } else if (acc === 'wizard') {
    ctx.fillStyle = '#5b3fbf';
    ctx.beginPath(); ctx.moveTo(-16 * s, -74 * s); ctx.lineTo(16 * s, -74 * s); ctx.lineTo(3 * s, -102 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd75e';
    drawStar(ctx, 2 * s, -86 * s, 5, 3 * s, 1.4 * s); ctx.fill();
  } else if (acc === 'headband') {
    ctx.fillStyle = '#ff6b5b';
    roundRect(ctx, -18 * s, -74 * s, 36 * s, 5 * s, 2.5 * s); ctx.fill();
  }

  ctx.restore();
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
  ctx.beginPath(); ctx.arc(0, -8 * s, 7 * s, 0, Math.PI * 2); ctx.fill();      // body
  ctx.beginPath(); ctx.arc(0, -17 * s, 5.5 * s, 0, Math.PI * 2); ctx.fill();   // head
  if (petId === 'fox' || petId === 'owl') { // ears
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
  document.getElementById('av-title').textContent = isEdit ? 'The Closet' : 'Create Your Explorer';
  document.getElementById('av-done').textContent = isEdit ? 'Save Look' : 'Start Exploring!';

  buildSwatchRow('av-skin', DATA.skins.map(c => ({ id: c, color: c })), p.skin, v => { p.skin = v; });
  buildSwatchRow('av-haircolor', DATA.hairColors.map(c => ({ id: c, color: c })), p.hairColor, v => { p.hairColor = v; });
  buildChipRow('av-hair', DATA.hairStyles, p.hairStyle, v => { p.hairStyle = v; });
  buildItemRow('av-outfit', DATA.outfits, p.outfit, v => { p.outfit = v; });
  buildItemRow('av-acc', DATA.accessories, p.accessory, v => { p.accessory = v; });
  buildItemRow('av-pet', DATA.pets, p.pet, v => { p.pet = v; });

  const cv = document.getElementById('av-canvas');
  const ctx = cv.getContext('2d');
  cancelAnimationFrame(creatorRAF);
  const t0 = performance.now();
  (function loop(t) {
    const sec = (t - t0) / 1000;
    ctx.clearRect(0, 0, cv.width, cv.height);
    // podium
    ctx.fillStyle = 'rgba(29,42,77,.08)';
    ctx.beginPath(); ctx.ellipse(cv.width / 2, cv.height - 26, 74, 16, 0, 0, Math.PI * 2); ctx.fill();
    drawAvatar(ctx, cv.width / 2, cv.height - 30, 1.9, state.player, sec, false, 1);
    drawPet(ctx, cv.width / 2 + 78, cv.height - 30, 1.6, state.player.pet, sec);
    if (document.getElementById('screen-avatar').classList.contains('active')) {
      creatorRAF = requestAnimationFrame(loop);
    }
  })(t0);
}

function buildSwatchRow(elId, items, current, onPick) {
  const el = document.getElementById(elId);
  el.innerHTML = '';
  items.forEach(it => {
    const b = document.createElement('button');
    b.className = 'swatch' + (it.id === current ? ' sel' : '');
    b.style.background = it.color;
    b.setAttribute('aria-label', it.color);
    b.onclick = () => { onPick(it.id); [...el.children].forEach(c => c.classList.remove('sel')); b.classList.add('sel'); blip(620); };
    el.appendChild(b);
  });
}

function buildChipRow(elId, items, current, onPick) {
  const el = document.getElementById(elId);
  el.innerHTML = '';
  items.forEach(it => {
    const b = document.createElement('button');
    b.className = 'chip' + (it.id === current ? ' sel' : '');
    b.textContent = it.name;
    b.onclick = () => { onPick(it.id); [...el.children].forEach(c => c.classList.remove('sel')); b.classList.add('sel'); blip(620); };
    el.appendChild(b);
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
