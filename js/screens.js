/* Breakout Land — screens, HUD, building interiors, teacher & parent views */

/* ---- screen management ---- */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
  const hud = document.getElementById('hud');
  hud.style.display = (id === 'world' || id === 'math') ? 'block' : 'none';
  hud.classList.toggle('math-mode', id === 'math');
}
function screenIs(id) {
  const el = document.getElementById('screen-' + id);
  return el && el.classList.contains('active');
}
function closeBuildingModal() {
  document.getElementById('building-modal').classList.remove('open');
}

/* ---- HUD ---- */
function updateHUD() {
  const li = levelInfo();
  document.getElementById('hud-name').textContent = state.player.name || 'Explorer';
  document.getElementById('hud-level').textContent = `Lv ${li.n} · ${li.name}`;
  document.getElementById('hud-keys').textContent = state.keys;
  document.getElementById('hud-arcade').textContent = `${state.arcadeMin}m`;
  document.getElementById('hud-streak').textContent = state.streak;
  document.getElementById('hud-xpbar').style.width = `${li.into}%`;

  // today's quests
  const quests = [
    ['qp-daily', state.lastDaily === todayKey()],
    ['qp-game', Object.keys(state.gamesDone).length > 0],
    ['qp-math', Object.keys(state.mathStars).length > 0],
  ];
  let done = 0;
  quests.forEach(([id, ok]) => {
    const row = document.getElementById(id);
    if (row) row.classList.toggle('done', ok);
    if (ok) done++;
  });
  const count = document.getElementById('qp-count');
  if (count) count.textContent = `${done}/3`;

  // portrait
  const chip = document.getElementById('hud-avatar');
  drawHeroPortrait(chip.getContext('2d'), chip.width, state.player.hero || 0);
}

/* ---- building router ---- */
function openBuilding(id) {
  blip(760);
  if (id === 'math') { openMathMap(); return; }
  const body = document.getElementById('bm-body');
  const title = document.getElementById('bm-title');
  const modal = document.getElementById('building-modal');
  body.innerHTML = '';
  if (id === 'daily') renderDaily(title, body);
  else if (id === 'games') renderGameHall(title, body);
  else if (id === 'arcade') renderArcade(title, body);
  else if (id === 'shop') renderShop(title, body);
  else if (id === 'badges') renderBadgeHall(title, body);
  else if (id === 'plus') renderPlus(title, body);
  modal.classList.add('open');
}

/* ---- Lock Plaza: Lock of the Day ---- */
function renderDaily(title, body) {
  title.textContent = '🔐 Lock of the Day';
  const done = state.lastDaily === todayKey();
  if (done) {
    body.innerHTML = `
      <div class="big-emoji">🎉</div>
      <p class="center"><strong>You already cracked today’s lock!</strong></p>
      <p class="center muted">Streak: ${state.streak} day${state.streak === 1 ? '' : 's'} 🔥 — come back tomorrow to keep it alive.</p>`;
    return;
  }
  body.innerHTML = `
    <p class="muted">One fresh lock every day. Crack it to grow your streak and earn <strong>10 🔑 + 25 XP + 5 arcade minutes</strong>.</p>
    <div class="reward-row"><span>🔥 Current streak: <strong>${state.streak}</strong></span></div>
    <button class="btn-big" id="daily-go">Take on today’s lock!</button>`;
  document.getElementById('daily-go').onclick = () => {
    closeBuildingModal();
    startPuzzle({
      title: 'Lock of the Day',
      ctxLabel: 'Daily challenge',
      locks: [dailyLock()],
      onWin: () => {
        completeDaily();
        toast(`+10 🔑  +25 XP  +5 arcade minutes! Streak: ${state.streak} 🔥`);
      },
    });
  };
}

/* ---- Game Hall ---- */
function renderGameHall(title, body) {
  title.textContent = '🚩 Game Hall';
  const rows = state.assigned.map(id => {
    const g = DATA.games.find(g => g.id === id);
    if (!g) return '';
    const done = state.gamesDone[g.id];
    return `
      <div class="card game-card">
        <div class="game-info">
          <h3>${g.name}</h3>
          <p class="meta">${g.subject} · Grades ${g.grade} · ~${g.minutes} min · ${g.locks.length} locks</p>
          <p class="story">${g.story}</p>
        </div>
        <div class="game-side">
          ${done
            ? `<span class="done-pill">✔ Broke out in ${Math.floor(done.seconds / 60)}m ${done.seconds % 60}s</span>
               <button class="btn-small" data-play="${g.id}">Play again</button>`
            : `<button class="btn-big" data-play="${g.id}">Play!</button>`}
        </div>
      </div>`;
  }).join('');
  body.innerHTML = `
    <p class="muted">Games assigned by <strong>Ms. Rivera</strong>. In the full version this is where the Breakout EDU digital game player opens — Breakout Land wraps it and awards your keys, XP and badges when you break out.</p>
    ${rows || '<p class="center muted">No games assigned yet — check back soon!</p>'}`;
  body.querySelectorAll('[data-play]').forEach(btn => {
    btn.onclick = () => {
      const g = DATA.games.find(g => g.id === btn.dataset.play);
      closeBuildingModal();
      startPuzzle({
        title: g.name,
        ctxLabel: g.subject,
        locks: g.locks,
        onWin: ({ attempts, seconds }) => {
          const first = !state.gamesDone[g.id];
          state.gamesDone[g.id] = { attempts, seconds };
          grant(first ? { keys: 25, xp: 60, arcade: 10 } : { keys: 5, xp: 15, arcade: 0 });
          toast(first ? '+25 🔑  +60 XP  +10 arcade minutes!' : 'Replay complete! +5 🔑 +15 XP');
        },
      });
    };
  });
}

/* ---- Arcade ---- */
function renderArcade(title, body) {
  title.textContent = '🕹️ The Arcade';
  if (!arcadeAllowed()) {
    body.innerHTML = `
      <div class="big-emoji">🔒</div>
      <p class="center"><strong>The Arcade is locked right now.</strong></p>
      <p class="center muted">Your teacher or parent has paused arcade time. Keep solving — your minutes will be waiting!</p>`;
    return;
  }
  body.innerHTML = `
    <p class="muted">You earn arcade minutes by breaking out of games. Playing <strong>Key Catcher</strong> costs <strong>5 minutes</strong> per round.</p>
    <div class="reward-row"><span>🕹️ Your bank: <strong>${state.arcadeMin} minutes</strong></span></div>
    <div class="card game-card">
      <div class="game-info">
        <h3>Key Catcher</h3>
        <p class="story">Catch falling keys, dodge the anvils! 30 seconds of pure fun.</p>
      </div>
      <div class="game-side">
        <button class="btn-big" id="kc-go" ${state.arcadeMin < 5 ? 'disabled' : ''}>${state.arcadeMin < 5 ? 'Need 5 min' : 'Play (−5 min)'}</button>
      </div>
    </div>
    <div class="card game-card soon">
      <div class="game-info"><h3>Puzzle Kart</h3><p class="story">Coming soon to the Arcade…</p></div>
    </div>`;
  const go = document.getElementById('kc-go');
  if (go && state.arcadeMin >= 5) go.onclick = () => { closeBuildingModal(); startKeyCatcher(); };
}

/* Key Catcher minigame */
const kc = { raf: null, score: 0, tLeft: 30, px: .5, items: [], last: 0 };
function startKeyCatcher() {
  state.arcadeMin -= 5; saveState(); updateHUD();
  const modal = document.getElementById('kc-modal');
  modal.classList.add('open');
  const cv = document.getElementById('kc-canvas');
  const ctx = cv.getContext('2d');
  Object.assign(kc, { score: 0, tLeft: 30, px: .5, items: [], last: performance.now() });
  const move = (clientX) => {
    const r = cv.getBoundingClientRect();
    kc.px = Math.max(.06, Math.min(.94, (clientX - r.left) / r.width));
  };
  cv.onpointermove = e => move(e.clientX);
  cv.onpointerdown = e => move(e.clientX);
  const keyHandler = e => {
    if (e.key === 'ArrowLeft' || e.key === 'a') kc.px = Math.max(.06, kc.px - .045);
    if (e.key === 'ArrowRight' || e.key === 'd') kc.px = Math.min(.94, kc.px + .045);
  };
  addEventListener('keydown', keyHandler);

  cancelAnimationFrame(kc.raf);
  (function loop(t) {
    const dt = Math.min(.05, (t - kc.last) / 1000); kc.last = t;
    kc.tLeft -= dt;
    const W = cv.width = cv.clientWidth, H = cv.height = cv.clientHeight;

    // spawn
    if (Math.random() < dt * 2.2) kc.items.push({ x: .08 + Math.random() * .84, y: -.05, v: .25 + Math.random() * .3, bad: Math.random() < .22 });

    ctx.fillStyle = '#1d2a4d'; ctx.fillRect(0, 0, W, H);
    // stars
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for (let i = 0; i < 24; i++) ctx.fillRect((i * 137) % W, (i * 211) % (H * .7), 2, 2);

    // items
    kc.items.forEach(it => { it.y += it.v * dt; });
    kc.items = kc.items.filter(it => {
      const ix = it.x * W, iy = it.y * H;
      const caught = it.y > .86 && it.y < .96 && Math.abs(it.x - kc.px) < .07;
      if (caught) {
        if (it.bad) { kc.score = Math.max(0, kc.score - 3); buzz(); }
        else { kc.score += 1; blip(900); }
        return false;
      }
      if (it.y > 1.05) return false;
      if (it.bad) {
        ctx.fillStyle = '#8d99ae';
        ctx.beginPath(); ctx.moveTo(ix - 12, iy); ctx.lineTo(ix + 12, iy); ctx.lineTo(ix + 7, iy + 12); ctx.lineTo(ix - 7, iy + 12); ctx.closePath(); ctx.fill();
        ctx.fillRect(ix - 4, iy - 8, 8, 8);
      } else {
        drawKeyGlyph(ctx, ix, iy, 1.1, '#ffd75e');
      }
      return true;
    });

    // catcher (player's avatar head on a cart)
    const cx = kc.px * W, cy = H * .93;
    ctx.fillStyle = '#ffb627';
    roundRect(ctx, cx - 34, cy - 8, 68, 16, 8); ctx.fill();
    drawAvatar(ctx, cx, cy - 4, .55, state.player, t / 1000, true, 1);

    // HUD
    ctx.fillStyle = '#fff'; ctx.font = '800 20px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(`🔑 ${kc.score}`, 14, 30);
    ctx.textAlign = 'right';
    ctx.fillText(`⏱ ${Math.max(0, Math.ceil(kc.tLeft))}s`, W - 14, 30);
    ctx.textAlign = 'left';

    if (kc.tLeft > 0 && modal.classList.contains('open')) {
      kc.raf = requestAnimationFrame(loop);
    } else {
      removeEventListener('keydown', keyHandler);
      if (kc.tLeft <= 0) {
        modal.classList.remove('open');
        const bonus = Math.min(10, Math.floor(kc.score / 3));
        grant({ keys: bonus, xp: kc.score });
        fanfare();
        toast(`Key Catcher: ${kc.score} keys caught! Bonus: +${bonus} 🔑 +${kc.score} XP`);
      }
    }
  })(performance.now());
  document.getElementById('kc-quit').onclick = () => { modal.classList.remove('open'); removeEventListener('keydown', keyHandler); };
}

/* ---- Style Shop ---- */
function renderShop(title, body) {
  title.textContent = '🛍️ Style Shop';
  const section = (label, items, equipKey) => `
    <h3 class="shop-h">${label}</h3>
    <div class="shop-grid">
      ${items.filter(i => !i.free).map(i => {
        const owned = itemOwned(i);
        return `<button class="shop-item ${owned ? 'owned' : ''}" data-buy="${i.id}" data-kind="${equipKey}">
          <span class="shop-name">${i.name}</span>
          <span class="shop-price">${owned ? 'Owned ✓' : `${i.price} 🔑`}</span>
        </button>`;
      }).join('')}
    </div>`;
  body.innerHTML = `
    <p class="muted">Spend your hard-earned keys! Equip anything you own in <strong>The Closet</strong> (avatar card, bottom left).</p>
    <div class="reward-row"><span>Your keys: <strong>${state.keys} 🔑</strong></span></div>
    ${section('Accessories', DATA.accessories, 'accessory')}
    ${section('Sidekick pets', DATA.pets, 'pet')}
    ${section('Walk trails', DATA.trails, 'trail')}`;
  body.querySelectorAll('[data-buy]').forEach(btn => {
    btn.onclick = () => {
      const all = [...DATA.trails, ...DATA.accessories, ...DATA.pets];
      const item = all.find(i => i.id === btn.dataset.buy);
      if (itemOwned(item)) {
        state.player[btn.dataset.kind] = item.id;
        saveState(); blip(800);
        toast(`Equipped ${item.name}!`);
        return;
      }
      if (buyItem(item)) {
        state.player[btn.dataset.kind] = item.id;
        saveState();
        fanfare(); confetti();
        toast(`You bought & equipped ${item.name}! 🎉`);
        renderShop(document.getElementById('bm-title'), document.getElementById('bm-body'));
      } else {
        buzz();
        toast(`You need ${item.price - state.keys} more keys for ${item.name}. Keep breaking out!`);
      }
    };
  });
}

/* ---- Badge Hall ---- */
function renderBadgeHall(title, body) {
  title.textContent = '🏅 Badge Hall';
  body.innerHTML = `
    <p class="muted">Every badge tells a story about how you think — not just what you know.</p>
    <div class="badge-grid">
      ${DATA.badges.map(b => {
        const got = state.badges.includes(b.id);
        return `<div class="badge ${got ? 'got' : ''}">
          <div class="badge-icon">${badgeGlyph(b.icon)}</div>
          <strong>${b.name}</strong>
          <span>${b.desc}</span>
        </div>`;
      }).join('')}
    </div>`;
}
function badgeGlyph(icon) {
  return { lock: '🔓', flame: '🔥', key: '🔑', math: '➗', trophy: '🏆', star: '⭐', bulb: '💡', heart: '💪' }[icon] || '🏅';
}

/* ---- Breakout+ Clubhouse ---- */
function renderPlus(title, body) {
  title.textContent = '✨ Breakout+ Clubhouse';
  if (!state.plus) {
    body.innerHTML = `
      <div class="big-emoji">🔒</div>
      <p class="center"><strong>The Clubhouse needs a Breakout+ key.</strong></p>
      <p class="center muted">Ask your teacher about Breakout+ to unlock hundreds of bonus games, seasonal events, and exclusive avatar gear.</p>`;
    return;
  }
  body.innerHTML = `
    <p class="muted">Your class has <strong>Breakout+</strong>! Bonus games, seasonal events and exclusive gear live here.</p>
    ${DATA.plusGames.map(g => `
      <div class="card game-card">
        <div class="game-info"><h3>${g.name}</h3><p class="meta">${g.subject} · Grades ${g.grade}</p></div>
        <div class="game-side"><button class="btn-small" data-plus="${g.id}">Play!</button></div>
      </div>`).join('')}`;
  body.querySelectorAll('[data-plus]').forEach(btn => {
    btn.onclick = () => {
      const g = DATA.plusGames.find(g => g.id === btn.dataset.plus);
      closeBuildingModal();
      const probs = DATA.mathProblems[3];
      const p = probs[(Math.random() * probs.length) | 0];
      startPuzzle({
        title: g.name, ctxLabel: 'Breakout+ bonus',
        locks: [{ type: 'number', clue: `${g.name} demo lock — ${p.clue}`, answer: p.answer, hint: 'Take it one step at a time.' }],
        onWin: () => { grant({ keys: 8, xp: 20, arcade: 3 }); toast('+8 🔑 +20 XP +3 arcade minutes!'); },
      });
    };
  });
}

/* ---- Breakout Math adventure map ---- */
function openMathMap() {
  showScreen('math');
  updateHUD();
  renderMathMap();
}

function nodeKey(grade, i) { return `${grade}:${i}`; }

function renderMathMap() {
  const grade = state.mathGrade;
  const unit = DATA.mathUnits[grade];
  document.getElementById('math-unit').textContent = unit.unit;
  document.getElementById('math-skills').textContent = unit.skills;

  // grade pills
  const gp = document.getElementById('grade-pills');
  gp.innerHTML = '';
  ['K', 1, 2, 3, 4, 5].forEach(g => {
    const b = document.createElement('button');
    b.className = 'gpill' + (String(g) === String(grade) ? ' sel' : '');
    b.textContent = g === 'K' ? 'K' : `G${g}`;
    b.onclick = () => { state.mathGrade = g; saveState(); renderMathMap(); blip(650); };
    gp.appendChild(b);
  });

  // node positions along the painted trail (assets/trail.jpg, 1920x1080)
  const pts = [
    [500, 1000], [715, 905], [985, 815], [1155, 680], [1090, 545],
    [905, 455], [830, 330], [950, 225], [1115, 165], [1480, 255],
  ];

  const nodeState = i => {
    const key = nodeKey(grade, i);
    const type = DATA.mathTrail[i];
    if (state.mathStars[key]) return 'done';
    // review nodes always open; others unlock in order (previous non-review core done)
    if (type === 'review') return 'open';
    const prevCore = DATA.mathTrail.slice(0, i).map((t, j) => ({ t, j })).filter(n => n.t !== 'review').pop();
    if (!prevCore) return 'open';
    if (type === 'challenge' || type === 'boss') {
      // challenge unlocks if previous core done in ≤ 2 attempts (beating the average) — the adaptive hook
      const prevKey = nodeKey(grade, prevCore.j);
      if (!state.mathStars[prevKey]) return 'locked';
      return (state.mathAttempts[prevKey] || 9) <= 2 ? 'open' : 'locked-challenge';
    }
    return state.mathStars[nodeKey(grade, prevCore.j)] ? 'open' : 'locked';
  };

  const typeColor = { core: '#26b59d', review: '#0068ff', challenge: '#5c25b7', boss: '#ffb627' };
  const typeLabel = { core: 'Quest', review: 'Review', challenge: 'Challenge', boss: 'BOSS' };

  const nodes = DATA.mathTrail.map((type, i) => {
    const [x, y] = pts[i];
    const st = nodeState(i);
    const key = nodeKey(grade, i);
    const stars = state.mathStars[key] || 0;
    const r = type === 'boss' ? 58 : 44;
    const locked = st === 'locked' || st === 'locked-challenge';
    return `
      <g class="mnode ${st}" data-node="${i}" transform="translate(${x},${y})" tabindex="${locked ? -1 : 0}" role="button" aria-label="${typeLabel[type]} ${i + 1}">
        ${st === 'open' && type !== 'review' ? `<circle r="${r + 12}" fill="${typeColor[type]}" opacity=".3"><animate attributeName="r" values="${r + 6};${r + 18};${r + 6}" dur="1.6s" repeatCount="indefinite"/></circle>` : ''}
        <circle r="${r}" fill="${locked ? '#a9b6bc' : typeColor[type]}" stroke="#fff" stroke-width="7"/>
        <circle r="${r}" fill="none" stroke="rgba(30,40,30,.35)" stroke-width="2.5" transform="translate(0,3)"/>
        <text y="10" text-anchor="middle" font-size="${type === 'boss' ? 34 : 28}" font-weight="900" fill="#fff">${locked ? '🔒' : (st === 'done' ? '✓' : i + 1)}</text>
        <text y="${r + 30}" text-anchor="middle" font-size="20" font-weight="800" fill="#fff" stroke="rgba(20,50,25,.65)" stroke-width="4" paint-order="stroke">${typeLabel[type]}</text>
        ${stars ? `<text y="${-r - 14}" text-anchor="middle" font-size="26">${'⭐'.repeat(stars)}</text>` : ''}
      </g>`;
  }).join('');

  // dashed hop-line between consecutive stops (the painted path carries the rest)
  let links = '';
  for (let i = 1; i < pts.length; i++) {
    links += `<line x1="${pts[i - 1][0]}" y1="${pts[i - 1][1]}" x2="${pts[i][0]}" y2="${pts[i][1]}"
      stroke="rgba(255,255,255,.55)" stroke-width="5" stroke-dasharray="2 18" stroke-linecap="round"/>`;
  }
  document.getElementById('math-svg').innerHTML = links + nodes;

  document.querySelectorAll('.mnode').forEach(g => {
    const i = parseInt(g.dataset.node, 10);
    const st = nodeState(i);
    g.addEventListener('click', () => {
      if (st === 'locked') { buzz(); toast('Finish the previous quest to unlock this one!'); return; }
      if (st === 'locked-challenge') { buzz(); toast('Challenge locks open when you beat a quest in 2 tries or fewer — or when your teacher assigns it!'); return; }
      startMathNode(grade, i);
    });
  });
}

function startMathNode(grade, i) {
  const type = DATA.mathTrail[i];
  const probs = DATA.mathProblems[grade];
  const count = type === 'boss' ? 3 : type === 'challenge' ? 2 : 1;
  const locks = Array.from({ length: count }, (_, j) => {
    const p = probs[(i + j) % probs.length];
    return { type: 'number', clue: p.clue, answer: p.answer, hint: 'Draw it out or count it up — you’ve got this.' };
  });
  const unit = DATA.mathUnits[grade].unit;
  startPuzzle({
    title: `${unit} — ${type === 'boss' ? 'BOSS Lock' : type === 'challenge' ? 'Challenge' : type === 'review' ? 'Review' : 'Quest'} ${i + 1}`,
    ctxLabel: `Breakout Math · Grade ${grade}`,
    locks,
    onWin: ({ attempts }) => {
      const key = nodeKey(grade, i);
      const stars = attempts <= count ? 3 : attempts <= count + 1 ? 2 : 1;
      state.mathStars[key] = Math.max(state.mathStars[key] || 0, stars);
      state.mathAttempts[key] = attempts;
      const rewards = { core: { keys: 12, xp: 30, arcade: 4 }, review: { keys: 6, xp: 15, arcade: 2 }, challenge: { keys: 20, xp: 50, arcade: 8 }, boss: { keys: 35, xp: 90, arcade: 12 } }[type];
      grant(rewards);
      if (type === 'challenge' || type === 'boss') awardBadge('challenge');
      if (attempts > count + 1) toast(`+${rewards.keys} 🔑! Tip: the Review stop on the trail is a great warm-up. 💙`);
      else toast(`${'⭐'.repeat(stars)} +${rewards.keys} 🔑 +${rewards.xp} XP +${rewards.arcade} arcade min!`);
      renderMathMap();
    },
  });
}

/* ---- Teacher dashboard ---- */
function openTeacher() {
  showScreen('teacher');
  const you = {
    name: (state.player.name || 'You') + ' ⭐you', level: levelInfo().n, keys: state.totalKeys,
    games: Object.keys(state.gamesDone).length + Object.keys(state.mathStars).length,
    avgMin: 12.0, success: 0.9, streak: state.streak, arcade: state.perms.teacherArcade,
  };
  const roster = [...DATA.roster, you];

  document.getElementById('t-roster').innerHTML = roster.map((s, i) => `
    <tr>
      <td class="t-name">${s.name}</td>
      <td>${s.level}</td>
      <td>${s.games}</td>
      <td>${s.avgMin.toFixed(1)}</td>
      <td><span class="pill ${s.success >= .85 ? 'good' : s.success >= .7 ? 'mid' : 'low'}">${Math.round(s.success * 100)}%</span></td>
      <td>${s.streak}🔥</td>
      <td><label class="switch"><input type="checkbox" data-arcade="${i}" ${s.arcade ? 'checked' : ''}><span></span></label></td>
    </tr>`).join('');

  document.querySelectorAll('[data-arcade]').forEach(cb => {
    cb.onchange = () => {
      const i = parseInt(cb.dataset.arcade, 10);
      if (i === roster.length - 1) { state.perms.teacherArcade = cb.checked; saveState(); }
      toast(cb.checked ? 'Arcade time enabled 🕹️' : 'Arcade time paused');
    };
  });

  // comparison chart: avg minutes to breakout — class vs school vs all players (age group)
  const C = DATA.chartColors;
  const maxV = Math.max(...DATA.comparisons.flatMap(c => [c.class, c.school, c.global])) * 1.15;
  document.getElementById('t-chart').innerHTML = `
    <div class="legend">
      <span><i style="background:${C.class}"></i>Your class</span>
      <span><i style="background:${C.school}"></i>Whole school</span>
      <span><i style="background:${C.global}"></i>All players, ages 8–10</span>
    </div>
    ${DATA.comparisons.map(c => `
      <div class="cmp-group">
        <div class="cmp-label">${c.game}</div>
        <div class="cmp-bars">
          ${[['class', c.class], ['school', c.school], ['global', c.global]].map(([k, v]) => `
            <div class="cmp-row">
              <div class="cmp-bar" style="width:${(v / maxV) * 100}%;background:${C[k]}" title="${v.toFixed(1)} min"></div>
              <span class="cmp-val">${v.toFixed(1)}m</span>
            </div>`).join('')}
        </div>
      </div>`).join('')}
    <p class="chart-note">Average minutes to breakout — lower is faster. Your class is beating the global average on 2 of 3 games. 🎉</p>`;

  // assignment buttons
  document.getElementById('t-assign').innerHTML = DATA.games.map(g => `
    <div class="assign-row">
      <span><strong>${g.name}</strong> <span class="meta">· ${g.subject}</span></span>
      <button class="btn-small" data-assign="${g.id}" ${state.assigned.includes(g.id) ? 'disabled' : ''}>
        ${state.assigned.includes(g.id) ? 'Assigned ✓' : 'Assign to class'}
      </button>
    </div>`).join('');
  document.querySelectorAll('[data-assign]').forEach(b => {
    b.onclick = () => {
      state.assigned.push(b.dataset.assign); saveState();
      toast('Assigned! It’s live in every student’s Game Hall.');
      openTeacher();
    };
  });

  const plusCb = document.getElementById('t-plus');
  plusCb.checked = state.plus;
  plusCb.onchange = () => { state.plus = plusCb.checked; saveState(); toast(state.plus ? 'Breakout+ active for your class ✨' : 'Breakout+ paused'); };
}

/* ---- Parent portal ---- */
function openParent() {
  showScreen('parent');
  const li = levelInfo();
  const name = state.player.name || 'Your explorer';
  document.getElementById('p-summary').innerHTML = `
    <div class="p-stat"><strong>${li.n}</strong><span>Level — ${li.name}</span></div>
    <div class="p-stat"><strong>${state.streak}🔥</strong><span>Daily streak</span></div>
    <div class="p-stat"><strong>${Object.keys(state.gamesDone).length + Object.keys(state.mathStars).length}</strong><span>Games broken out</span></div>
    <div class="p-stat"><strong>${state.badges.length}</strong><span>Badges earned</span></div>`;
  document.getElementById('p-name').textContent = name;

  // avatar
  const cv = document.getElementById('p-avatar');
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  drawAvatar(ctx, cv.width / 2, cv.height - 10, 1.0, state.player, 0, false, 1);

  // 4Cs + SEL — grows with actual play (base + earned)
  const solved = Object.keys(state.mathStars).length + Object.keys(state.gamesDone).length * 2;
  const firstTries = state.badges.includes('thinker') ? 12 : 0;
  const persist = state.badges.includes('persistent') ? 14 : 0;
  const skills = [
    ['Critical Thinking', Math.min(96, 38 + solved * 6 + firstTries)],
    ['Persistence',       Math.min(96, 34 + solved * 5 + persist)],
    ['Creativity',        Math.min(96, 30 + solved * 5)],
    ['Collaboration',     Math.min(96, 42 + solved * 3)],
    ['Communication',     Math.min(96, 36 + solved * 4)],
  ];
  document.getElementById('p-skills').innerHTML = skills.map(([label, v]) => `
    <div class="skill-row">
      <span class="skill-label">${label}</span>
      <div class="skill-track"><div class="skill-fill" style="width:${v}%"></div></div>
      <span class="skill-val">${v}</span>
    </div>`).join('');

  // week chart (single series)
  const maxMin = Math.max(...DATA.parentWeek.map(d => d.min), 1);
  document.getElementById('p-week').innerHTML = DATA.parentWeek.map(d => `
    <div class="wk-col" title="${d.min} min">
      <span class="wk-val">${d.min || ''}</span>
      <div class="wk-bar" style="height:${(d.min / maxMin) * 72 + 2}px"></div>
      <span class="wk-day">${d.day}</span>
    </div>`).join('');

  const badges = state.badges.slice(-4).map(id => DATA.badges.find(b => b.id === id)).filter(Boolean);
  document.getElementById('p-badges').innerHTML = badges.length
    ? badges.map(b => `<div class="badge got small"><div class="badge-icon">${badgeGlyph(b.icon)}</div><strong>${b.name}</strong></div>`).join('')
    : '<p class="muted">Badges will appear here as they’re earned.</p>';

  const cb = document.getElementById('p-arcade');
  cb.checked = state.perms.parentArcade;
  cb.onchange = () => {
    state.perms.parentArcade = cb.checked; saveState();
    toast(cb.checked ? 'Arcade time approved 🕹️' : 'Arcade time paused');
  };
  const lim = document.getElementById('p-limit');
  lim.value = state.perms.weeklyLimitMin;
  document.getElementById('p-limit-val').textContent = `${state.perms.weeklyLimitMin} min/week`;
  lim.oninput = () => {
    state.perms.weeklyLimitMin = parseInt(lim.value, 10); saveState();
    document.getElementById('p-limit-val').textContent = `${state.perms.weeklyLimitMin} min/week`;
  };
}
