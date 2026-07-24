/* Breakout Land — screens, HUD, building interiors, teacher & parent views */

/* ---- screen management ---- */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
  const hud = document.getElementById('hud');
  hud.style.display = (id === 'world' || id === 'math') ? 'block' : 'none';
  hud.classList.toggle('math-mode', id === 'math');
  // ambient soundscape lives on the island only
  if (typeof ambient !== 'undefined') { if (id === 'world' && !muted) ambient.start(); else ambient.stop(); }
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
  const shields = state.shields || 0;
  const shieldWrap = document.getElementById('hud-shield-wrap');
  const shieldDiv = document.getElementById('hud-shield-div');
  if (shieldWrap) {
    document.getElementById('hud-shield').textContent = shields;
    shieldWrap.style.display = shields > 0 ? '' : 'none';
    if (shieldDiv) shieldDiv.style.display = shields > 0 ? '' : 'none';
  }
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

  // Five Keys of Knowledge story panel
  const slots = document.getElementById('kq-slots');
  if (slots) {
    slots.innerHTML = (DATA.legendaryKeys || []).map(k => {
      const got = hasLegendaryKey(k.id);
      return `<span class="lk-slot ${got ? 'lit' : ''}" title="${k.name} — ${k.desc}"
        style="${got ? `--kc:${k.color}` : ''}">${got ? k.icon : '🔒'}</span>`;
    }).join('');
  }
}

/* ---- Legendary key award moment (Priority 6) ---- */
function showLegendaryKeyMoment(keyId) {
  const k = (DATA.legendaryKeys || []).find(x => x.id === keyId);
  if (!k) return;
  confetti(); fanfare();
  const modal = document.getElementById('cel-modal');
  const emoji = modal.querySelector('.big-emoji');
  const prevEmoji = emoji ? emoji.textContent : '🔓';
  if (emoji) emoji.textContent = k.icon;
  document.getElementById('cel-title').textContent = '⭐ LEGENDARY KEY EARNED!';
  document.getElementById('cel-sub').textContent = k.name;
  const owned = state.legendaryKeys.length;
  document.getElementById('cel-stats').innerHTML =
    `<span>${k.desc}</span><span>🗝️ ${owned}/5 Keys of Knowledge</span>`;
  modal.classList.add('open');
  document.getElementById('cel-btn').onclick = () => {
    modal.classList.remove('open');
    if (emoji) emoji.textContent = prevEmoji;
    if (owned >= 5) setTimeout(() => toast('🎉 You have all Five Keys of Knowledge! You are a true Breakout Legend!'), 400);
  };
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
  if (typeof advanceTutorial === 'function') advanceTutorial(id);
}

/* ---- NPC side quests (Priority 4) ---- */
function openNpcQuest(npc, quest) {
  blip(720);
  const body = document.getElementById('bm-body');
  const title = document.getElementById('bm-title');
  const modal = document.getElementById('building-modal');
  title.textContent = `${quest.icon} ${quest.title}`;
  const r = quest.reward || { keys: 8, xp: 20, arcade: 3 };
  body.innerHTML = `
    <p class="muted center"><em>${npc.name} says:</em></p>
    <p class="center">${quest.intro}</p>
    <div class="reward-row"><span>Reward: <strong>${r.keys} 🔑 · ${r.xp} XP${r.arcade ? ` · ${r.arcade} arcade min` : ''}</strong></span></div>
    <button class="btn-big" id="npc-go">Help ${npc.name} solve it! 🔓</button>`;
  modal.classList.add('open');
  document.getElementById('npc-go').onclick = () => {
    closeBuildingModal();
    startPuzzle({
      title: quest.title,
      ctxLabel: `${npc.name}'s Quest`,
      locks: [quest.lock],
      celType: 'npc',
      onWin: () => {
        completeNpcQuest(npc.name, quest.reward);
        const done = npcQuestsToday().length;
        toast(`${npc.name} is thrilled! +${r.keys} 🔑 +${r.xp} XP` + (done >= DATA.npcQuests.length ? ' — all friends helped! 🎉' : ''));
      },
    });
  };
}

/* ---- Lock Plaza: Lock of the Day ---- */
function renderDaily(title, body) {
  title.textContent = '🔐 Lock of the Day';
  // first-timer tutorial: a gentle 1-digit lock to teach the basics
  if (state.tutorialStep === 1) {
    body.innerHTML = `
      <p class="muted">Ollie 🦉 says: <em>Every lock has a clue. Read it, tap your answer, then press TRY IT. Let's warm up with an easy one!</em></p>
      <button class="btn-big" id="daily-go">Try my first lock! 🔓</button>`;
    document.getElementById('daily-go').onclick = () => {
      closeBuildingModal();
      startPuzzle({
        title: 'Your First Lock',
        ctxLabel: 'Tutorial',
        celType: 'firstBreak',
        locks: [{ type: 'number', subject: 'Getting started', clue: 'How many days are in one week? Tap the number, then press TRY IT!', answer: '7', hint: 'Monday, Tuesday, Wednesday… count them up!' }],
        onWin: () => {
          completeTutorialLock();
          grant({ keys: 5, xp: 10 });
          toast('You did it! +5 🔑 +10 XP — now let’s find your perfect puzzles! 🧭');
        },
      });
    };
    return;
  }
  const done = state.lastDaily === todayKey();
  const canShare = state.lastDailyResult && state.lastDailyResult.dateKey === todayKey();
  const shieldNote = (state.shields || 0) > 0
    ? `<p class="center shield-note">🛡️ <strong>${state.shields}</strong> Streak Shield${state.shields > 1 ? 's' : ''} — ${state.shields > 1 ? 'they' : 'it'} protect${state.shields > 1 ? '' : 's'} your streak if you miss a day.</p>`
    : '<p class="center muted shield-note">🛡️ Earn a Streak Shield at every 5-day streak — it saves you if you miss a day.</p>';
  const dailyHtml = done
    ? `<div class="big-emoji">🎉</div>
       <p class="center"><strong>You already cracked today’s lock!</strong></p>
       <p class="center muted">Streak: ${state.streak} day${state.streak === 1 ? '' : 's'} 🔥 — come back tomorrow to keep it alive.</p>
       ${shieldNote}
       ${canShare ? '<button class="btn-big" id="daily-share">📸 Share today’s result</button>' : ''}`
    : `<p class="muted">One fresh lock every day. Crack it to grow your streak and earn <strong>10 🔑 + 25 XP + 5 arcade minutes</strong>.</p>
       <div class="reward-row"><span>🔥 Current streak: <strong>${state.streak}</strong></span></div>
       ${shieldNote}
       <button class="btn-big" id="daily-go">Take on today’s lock!</button>`;
  body.innerHTML = dailyHtml + reviewSectionHtml();

  const shareBtn = document.getElementById('daily-share');
  if (shareBtn) shareBtn.onclick = () => showShareCard(state.lastDailyResult);

  const dailyGo = document.getElementById('daily-go');
  if (dailyGo) dailyGo.onclick = () => {
    closeBuildingModal();
    // project the streak the win will produce, so the celebration tier matches
    const projected = projectStreak();
    const celType = projected >= 7 ? 'streak7' : projected >= 3 ? 'streak3' : 'standard';
    startPuzzle({
      title: 'Lock of the Day',
      ctxLabel: 'Daily challenge',
      locks: [dailyLock()],
      celType,
      onWin: ({ attempts, seconds }) => {
        const lk = dailyLock();
        completeDaily();
        toast(`+10 🔑  +25 XP  +5 arcade minutes! Streak: ${state.streak} 🔥`);
        const milestone = [7, 30, 100].includes(state.streak) ? `${state.streak}-DAY STREAK!` : null;
        state.lastDailyResult = { dateKey: todayKey(), dateStr: shareDateStr(), seconds, tries: attempts, streak: state.streak, subject: lk.subject || 'Daily challenge', milestone };
        saveState();
        setTimeout(() => showShareCard(state.lastDailyResult), 500);
      },
    });
  };
  wireReviewSection();
}

/* ---- Review Lab: spaced repetition surfaced in the daily ritual ---- */
function reviewSectionHtml() {
  const due = srDue();
  const skills = srSkills();
  const mastered = srMasteredCount();
  const chips = skills.length
    ? skills.map(s => `<span class="skill-chip ${s.status}" title="${(s.meta.label || s.code)}${s.due ? ' · due for review' : ''}">${s.due ? '🕒 ' : s.mastered ? '✅ ' : ''}${s.code}</span>`).join('')
    : '<span class="muted">Solve locks to start building skills!</span>';
  const reviewBtn = due.length
    ? `<button class="btn-big review-btn" id="review-go">🧠 Review ${due.length} concept${due.length > 1 ? 's' : ''} — keep them fresh!</button>`
    : '<p class="center muted" style="margin-top:8px">🌟 No reviews due right now — your memory’s sharp!</p>';
  return `
    <hr class="pz-sep">
    <h3 class="shop-h" style="margin-top:14px">🧠 Your Skills${mastered ? ` · ${mastered} mastered` : ''}</h3>
    <div class="skill-strip">${chips}</div>
    ${reviewBtn}`;
}
function wireReviewSection() {
  const b = document.getElementById('review-go');
  if (b) b.onclick = reviewSession;
}
function reviewSession() {
  const due = srDue();
  const locks = due.map(code => {
    const pool = (DATA.reviewBank && DATA.reviewBank[code]) || [];
    if (!pool.length) return null;
    const lk = pool[Math.floor(Math.random() * pool.length)];
    return { ...lk, standards: [code], subject: (DATA.standards[code] || {}).strand || code };
  }).filter(Boolean).slice(0, 6);
  if (!locks.length) { toast('You’re all caught up on reviews! 🌟'); return; }
  closeBuildingModal();
  startPuzzle({
    title: 'Review Lab',
    ctxLabel: 'Keep concepts fresh',
    locks,
    onWin: () => {
      grant({ keys: 4 * locks.length, xp: 8 * locks.length });
      toast(`Reviews done — those concepts just got stronger! 🧠 +${4 * locks.length} 🔑`);
    },
  });
}

/* ---- Lock of the Day share cards (Wordle-style, screenshot-ready) ---- */
function shareDateStr() { return new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
function fmtTime(s) { const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, '0')}`; }
function perfStars(tries) { return tries <= 1 ? 3 : tries <= 2 ? 2 : 1; }
function perfWord(tries) { return tries <= 1 ? 'FLAWLESS!' : tries <= 2 ? 'GREAT SOLVE!' : 'CRACKED IT!'; }
function shareText(r) {
  const badge = r.milestone ? `🏆 ${r.milestone}\n` : '';
  const stars = '⭐'.repeat(perfStars(r.tries));
  return `Breakout Land — Lock of the Day (${r.dateStr})\n${badge}🔓 ${stars} — ${r.tries} ${r.tries === 1 ? 'try' : 'tries'} in ${fmtTime(r.seconds)}\n🔥 Streak: ${r.streak}\nThink hard. Break out. Play on!`;
}
/* A little golden open-padlock trophy bursting with light, for the share card. */
function drawLockTrophy(ctx, cx, cy, s) {
  ctx.save();
  // radiant burst
  const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, 170 * s);
  g.addColorStop(0, 'rgba(255,224,122,.55)'); g.addColorStop(1, 'rgba(255,224,122,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 170 * s, 0, Math.PI * 2); ctx.fill();
  // rays
  ctx.strokeStyle = 'rgba(255,236,150,.5)'; ctx.lineWidth = 6 * s; ctx.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 78 * s, cy + Math.sin(a) * 78 * s);
    ctx.lineTo(cx + Math.cos(a) * 112 * s, cy + Math.sin(a) * 112 * s);
    ctx.stroke();
  }
  // open shackle
  ctx.strokeStyle = '#e6b53f'; ctx.lineWidth = 15 * s; ctx.lineCap = 'round';
  ctx.save(); ctx.translate(cx - 22 * s, cy - 46 * s); ctx.rotate(-0.55);
  ctx.beginPath(); ctx.arc(0, 0, 26 * s, Math.PI * 0.72, Math.PI * 2.05); ctx.stroke();
  ctx.restore();
  // body
  const bw = 100 * s, bh = 80 * s, by = cy - 6 * s;
  const bg = ctx.createLinearGradient(cx, by, cx, by + bh);
  bg.addColorStop(0, '#ffd257'); bg.addColorStop(1, '#e79a12');
  ctx.fillStyle = bg; roundRect(ctx, cx - bw / 2, by, bw, bh, 18 * s); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; roundRect(ctx, cx - bw / 2 + 8 * s, by + 7 * s, bw - 16 * s, 12 * s, 6 * s); ctx.fill();
  // keyhole
  ctx.fillStyle = '#7a5310';
  ctx.beginPath(); ctx.arc(cx, by + 32 * s, 10 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(cx - 4.5 * s, by + 32 * s, 9 * s, 26 * s);
  // sparkles
  ctx.fillStyle = '#fff6cf';
  [[-110, -34, 9], [112, -46, 7], [96, 58, 8], [-118, 52, 6], [0, -120, 7]].forEach(([dx, dy, r]) => {
    drawStar(ctx, cx + dx * s, cy + dy * s, 4, r * s, r * .4 * s); ctx.fill();
  });
  ctx.restore();
}
function showShareCard(result) {
  if (!result) return;
  const modal = document.getElementById('share-modal');
  renderShareCard(document.getElementById('share-canvas'), result);
  modal.classList.add('open');
  document.getElementById('share-save').onclick = () => {
    const cv = document.getElementById('share-canvas');
    const a = document.createElement('a');
    a.href = cv.toDataURL('image/png'); a.download = `breakout-land-${result.dateKey || 'lock'}.png`;
    document.body.appendChild(a); a.click(); a.remove(); blip(820);
    toast('Saved! Share your breakout 🎉');
  };
  document.getElementById('share-copy').onclick = async () => {
    const txt = shareText(result);
    try { await navigator.clipboard.writeText(txt); toast('Result copied — paste it anywhere! 📋'); }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta);
      ta.select(); try { document.execCommand('copy'); } catch (e2) {} ta.remove();
      toast('Result copied! 📋');
    }
  };
  document.getElementById('share-close').onclick = () => modal.classList.remove('open');
}
function renderShareCard(cv, r) {
  const ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1c56ad'); bg.addColorStop(.55, '#0d3271'); bg.addColorStop(1, '#071d45');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const gl = ctx.createRadialGradient(W / 2, H * .1, 40, W / 2, H * .1, W * .85);
  gl.addColorStop(0, 'rgba(255,224,122,.18)'); gl.addColorStop(1, 'rgba(255,224,122,0)');
  ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 6; roundRect(ctx, 40, 40, W - 80, H - 80, 44); ctx.stroke();
  ctx.textAlign = 'center';
  ctx.font = '900 66px "Helix","Quicksand",system-ui,sans-serif'; ctx.fillStyle = '#ffd75e';
  ctx.fillText('🔓 BREAKOUT LAND', W / 2, 180);
  ctx.font = '800 40px system-ui,sans-serif'; ctx.fillStyle = '#9cc4ff';
  ctx.fillText(`LOCK OF THE DAY · ${r.dateStr}`, W / 2, 248);
  ctx.font = '900 104px "Helix","Quicksand",system-ui,sans-serif'; ctx.fillStyle = '#fff';
  ctx.fillText(r.milestone ? `🔥 ${r.milestone}` : perfWord(r.tries), W / 2, 418);
  // a golden open-lock trophy bursting with light, with a star rating for the solve
  drawLockTrophy(ctx, W / 2, 566, 1.5);
  const stars = perfStars(r.tries), sgap = 82, sy = 712;
  for (let i = 0; i < 3; i++) {
    const on = i < stars;
    ctx.save();
    ctx.fillStyle = on ? '#ffd75e' : 'rgba(255,255,255,.16)';
    if (on) { ctx.shadowColor = 'rgba(255,215,94,.7)'; ctx.shadowBlur = 22; }
    drawStar(ctx, W / 2 + (i - 1) * sgap, sy, 5, 34, 15); ctx.fill();
    ctx.restore();
  }
  const chips = [['⏱', fmtTime(r.seconds)], ['🎯', `${r.tries} ${r.tries === 1 ? 'try' : 'tries'}`], ['🔥', `${r.streak} day${r.streak === 1 ? '' : 's'}`]];
  const cw = 336, gap = 36, totalW = chips.length * cw + (chips.length - 1) * gap, x0 = (W - totalW) / 2, cy = 792, chh = 158;
  chips.forEach(([ic, val], i) => {
    const x = x0 + i * (cw + gap);
    ctx.fillStyle = 'rgba(255,255,255,.08)'; roundRect(ctx, x, cy, cw, chh, 28); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 3; roundRect(ctx, x, cy, cw, chh, 28); ctx.stroke();
    ctx.font = '64px system-ui,sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(ic, x + cw / 2, cy + 72);
    ctx.font = '800 46px "Helix",system-ui,sans-serif'; ctx.fillStyle = '#ffd75e'; ctx.fillText(val, x + cw / 2, cy + 132);
  });
  ctx.font = '700 42px system-ui,sans-serif'; ctx.fillStyle = '#bcd6ff';
  ctx.fillText(`Today’s theme: ${r.subject || 'Daily challenge'}`, W / 2, 1060);
  ctx.font = '800 48px "Helix","Quicksand",system-ui,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.92)';
  ctx.fillText('Think hard. Break out. Play on. ✦', W / 2, 1330);
  ctx.font = '600 34px system-ui,sans-serif'; ctx.fillStyle = '#9cc4ff';
  ctx.fillText('A Breakout EDU world', W / 2, 1388);
  ctx.textAlign = 'left';
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
      const firstEver = Object.keys(state.gamesDone).length === 0;
      startPuzzle({
        title: g.name,
        ctxLabel: g.subject,
        locks: g.locks,
        celType: firstEver ? 'firstBreak' : 'standard',
        onWin: ({ attempts, seconds }) => {
          const first = !state.gamesDone[g.id];
          state.gamesDone[g.id] = { attempts, seconds };
          grant(first ? { keys: 25, xp: 60, arcade: 10 } : { keys: 5, xp: 15, arcade: 0 });
          // cracking every lock in a game (multi-lock) earns the Key of Logic
          if (first && g.locks.length >= 3) awardLegendaryKey('logic');
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
    <div class="card game-card">
      <div class="game-info">
        <h3>Memory Match</h3>
        <p class="story">Flip the cards, find the pairs, beat the clock. Sharp eyes win keys!</p>
      </div>
      <div class="game-side">
        <button class="btn-big" id="mm-go" ${state.arcadeMin < 5 ? 'disabled' : ''}>${state.arcadeMin < 5 ? 'Need 5 min' : 'Play (−5 min)'}</button>
      </div>
    </div>`;
  const go = document.getElementById('kc-go');
  if (go && state.arcadeMin >= 5) go.onclick = () => { closeBuildingModal(); startKeyCatcher(); };
  const mm = document.getElementById('mm-go');
  if (mm && state.arcadeMin >= 5) mm.onclick = () => { closeBuildingModal(); startMemoryMatch(); };
}

/* Memory Match minigame — DOM cards with 3D flips.
   Grades 3-5 use curriculum decks (match the fact to its answer); K-2 keep emoji. */
function startMemoryMatch() {
  state.arcadeMin -= 5; saveState(); updateHUD();
  const modal = document.getElementById('mm-modal');
  const grid = document.getElementById('mm-grid');
  const status = document.getElementById('mm-status');
  const heading = modal.querySelector('h2');
  modal.classList.add('open');

  const curriculum = DATA.memoryDecks && DATA.memoryDecks[state.mathGrade];
  let deck;
  if (curriculum) {
    if (heading) heading.textContent = `🃏 Memory Match — Grade ${state.mathGrade} Skills`;
    // each pair is a fact and its answer, matched by pair id
    deck = shuffle(curriculum.flatMap(([a, b], i) => [{ face: a, pid: i, text: true }, { face: b, pid: i, text: true }]));
  } else {
    if (heading) heading.textContent = '🃏 Memory Match';
    const icons = ['🔑', '🔒', '⭐', '🧪', '📘', '⚙️'];
    deck = shuffle(icons.flatMap((ic, i) => [{ face: ic, pid: i }, { face: ic, pid: i }]));
  }
  let flipped = [], matched = 0, misses = 0, lock = false;
  const t0 = Date.now();

  const tick = setInterval(() => {
    if (!modal.classList.contains('open')) { clearInterval(tick); return; }
    status.textContent = `⏱ ${Math.floor((Date.now() - t0) / 1000)}s · pairs ${matched}/6 · misses ${misses}`;
  }, 250);

  grid.innerHTML = '';
  deck.forEach((card) => {
    const el = document.createElement('button');
    el.className = 'mm-card';
    el.innerHTML = `<span class="mm-inner"><span class="mm-front">🔐</span><span class="mm-back${card.text ? ' mm-text' : ''}">${card.face}</span></span>`;
    el.onclick = () => {
      if (lock || el.classList.contains('flip') || el.classList.contains('done')) return;
      blip(640);
      el.classList.add('flip');
      flipped.push({ el, pid: card.pid });
      if (flipped.length === 2) {
        lock = true;
        const [a, b] = flipped;
        if (a.pid === b.pid) {
          setTimeout(() => {
            a.el.classList.add('done'); b.el.classList.add('done');
            matched++; blip(900); flipped = []; lock = false;
            if (matched === 6) {
              clearInterval(tick);
              const secs = Math.floor((Date.now() - t0) / 1000);
              const bonus = 8 + (secs <= 45 ? 4 : 0) + Math.max(0, 4 - Math.floor(misses / 2));
              setTimeout(() => {
                modal.classList.remove('open');
                grant({ keys: bonus, xp: 24 });
                fanfare(); confetti();
                toast(`Memory Match: all pairs in ${secs}s, ${misses} misses! +${bonus} 🔑 +24 XP`);
              }, 500);
            }
          }, 420);
        } else {
          misses++;
          setTimeout(() => {
            a.el.classList.remove('flip'); b.el.classList.remove('flip');
            buzz(); flipped = []; lock = false;
          }, 750);
        }
      }
    };
    grid.appendChild(el);
  });

  document.getElementById('mm-quit').onclick = () => { clearInterval(tick); modal.classList.remove('open'); };
}

/* Key Catcher minigame — neon arcade juice: spinning keys, catch bursts,
   floating scores, combo multiplier, rolling cart */
const kc = { raf: null, score: 0, tLeft: 30, px: .5, items: [], fx: [], pops: [], combo: 0, best: 0, last: 0, lastPx: .5 };
function startKeyCatcher() {
  state.arcadeMin -= 5; saveState(); updateHUD();
  const modal = document.getElementById('kc-modal');
  modal.classList.add('open');
  const cv = document.getElementById('kc-canvas');
  const ctx = cv.getContext('2d');
  Object.assign(kc, { score: 0, tLeft: 30, px: .5, items: [], fx: [], pops: [], combo: 0, best: 0, last: performance.now(), lastPx: .5 });
  const move = (clientX) => {
    const r = cv.getBoundingClientRect();
    kc.px = Math.max(.06, Math.min(.94, (clientX - r.left) / r.width));
  };
  cv.onpointermove = e => move(e.clientX);
  cv.onpointerdown = e => move(e.clientX);
  const keyHandler = e => {
    if (e.key === 'ArrowLeft' || e.key === 'a') kc.px = Math.max(.06, kc.px - .05);
    if (e.key === 'ArrowRight' || e.key === 'd') kc.px = Math.min(.94, kc.px + .05);
  };
  addEventListener('keydown', keyHandler);

  const burst = (x, y, color, n = 8) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      kc.fx.push({ x, y, vx: Math.cos(a) * (60 + Math.random() * 60), vy: Math.sin(a) * (60 + Math.random() * 60) - 40, t: 0, color });
    }
  };

  cancelAnimationFrame(kc.raf);
  (function loop(t) {
    const dt = Math.min(.05, (t - kc.last) / 1000); kc.last = t;
    kc.tLeft -= dt;
    const W = cv.width = cv.clientWidth, H = cv.height = cv.clientHeight;
    const sec = t / 1000;
    const vx = (kc.px - kc.lastPx) / Math.max(dt, .001); kc.lastPx = kc.px;

    if (Math.random() < dt * 2.3) kc.items.push({ x: .08 + Math.random() * .84, y: -.05, v: .25 + Math.random() * .32, bad: Math.random() < .22, rot: Math.random() * 6 });

    // neon night backdrop
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#101c3d'); bg.addColorStop(.72, '#1d2a5c'); bg.addColorStop(1, '#2b1c5e');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for (let i = 0; i < 26; i++) {
      const twk = .3 + Math.abs(Math.sin(sec * 2 + i)) * .7;
      ctx.globalAlpha = twk * .7;
      ctx.fillRect((i * 137) % W, (i * 211) % (H * .6), 2, 2);
    }
    ctx.globalAlpha = 1;
    // scrolling neon floor grid
    ctx.strokeStyle = 'rgba(76,201,240,.35)'; ctx.lineWidth = 1.5;
    const horizon = H * .78;
    for (let i = -6; i <= 6; i++) {
      ctx.beginPath(); ctx.moveTo(W / 2 + i * W * .09, horizon); ctx.lineTo(W / 2 + i * W * .28, H); ctx.stroke();
    }
    for (let r = 0; r < 4; r++) {
      const gy = horizon + ((sec * 60 + r * (H - horizon) / 4) % (H - horizon));
      ctx.globalAlpha = .18 + .4 * (gy - horizon) / (H - horizon);
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // items (spinning keys / tumbling anvils)
    kc.items.forEach(it => { it.y += it.v * dt; it.rot += dt * 3; });
    kc.items = kc.items.filter(it => {
      const ix = it.x * W, iy = it.y * H;
      const caught = it.y > .84 && it.y < .96 && Math.abs(it.x - kc.px) < .075;
      if (caught) {
        if (it.bad) {
          kc.score = Math.max(0, kc.score - 3); kc.combo = 0; buzz();
          burst(ix, iy, '#8d99ae', 10);
          kc.pops.push({ x: ix, y: iy, t: 0, txt: '-3', color: '#ff8fa3' });
        } else {
          kc.combo++; kc.best = Math.max(kc.best, kc.combo);
          const mult = kc.combo >= 5 ? 2 : 1;
          kc.score += mult;
          blip(800 + Math.min(kc.combo, 8) * 60);
          burst(ix, iy, '#ffd75e');
          kc.pops.push({ x: ix, y: iy, t: 0, txt: `+${mult}`, color: '#ffe08a' });
          if (kc.combo === 5) kc.pops.push({ x: W / 2, y: H * .34, t: 0, txt: 'COMBO x2!', color: '#4cc9f0', big: true });
        }
        return false;
      }
      if (it.y > 1.05) { if (!it.bad) kc.combo = 0; return false; }
      ctx.save(); ctx.translate(ix, iy); ctx.rotate(Math.sin(it.rot) * .6);
      if (it.bad) {
        ctx.fillStyle = '#8d99ae';
        ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(12, 0); ctx.lineTo(7, 12); ctx.lineTo(-7, 12); ctx.closePath(); ctx.fill();
        ctx.fillRect(-4, -8, 8, 8);
        ctx.strokeStyle = 'rgba(20,20,40,.5)'; ctx.lineWidth = 2; ctx.stroke();
      } else {
        drawKeyGlyph(ctx, -6, 0, 1.15, '#ffd75e');
      }
      ctx.restore();
      return true;
    });

    // particles + score pops
    kc.fx = kc.fx.filter(p => (p.t += dt) < .6);
    kc.fx.forEach(p => {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt;
      ctx.save(); ctx.globalAlpha = 1 - p.t / .6;
      ctx.fillStyle = p.color;
      drawStar(ctx, p.x, p.y, 4, 5, 2); ctx.fill();
      ctx.restore();
    });
    kc.pops = kc.pops.filter(p => (p.t += dt) < (p.big ? 1.1 : .8));
    kc.pops.forEach(p => {
      ctx.save(); ctx.globalAlpha = 1 - p.t / (p.big ? 1.1 : .8);
      ctx.fillStyle = p.color;
      ctx.font = p.big ? '900 34px system-ui' : '900 20px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(p.txt, p.x, p.y - p.t * 46);
      ctx.restore(); ctx.textAlign = 'left';
    });

    // rolling cart + rider
    const cx = kc.px * W, cy = H * .93;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.max(-.16, Math.min(.16, vx * .25)));
    ctx.fillStyle = '#ffb627';
    roundRect(ctx, -36, -10, 72, 18, 9); ctx.fill();
    ctx.strokeStyle = 'rgba(40,34,56,.5)'; ctx.lineWidth = 2.5; ctx.stroke();
    for (const wx of [-20, 20]) {
      ctx.fillStyle = '#27406e';
      ctx.beginPath(); ctx.arc(wx, 10, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#9cc4ff'; ctx.lineWidth = 2;
      const wr = kc.px * W * .12;
      ctx.beginPath(); ctx.moveTo(wx - Math.cos(wr) * 5, 10 - Math.sin(wr) * 5); ctx.lineTo(wx + Math.cos(wr) * 5, 10 + Math.sin(wr) * 5); ctx.stroke();
    }
    drawAvatar(ctx, 0, -6, .55, state.player, sec, true, vx >= 0 ? 1 : -1);
    ctx.restore();

    // HUD
    ctx.fillStyle = '#fff'; ctx.font = '800 20px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(`🔑 ${kc.score}`, 14, 30);
    if (kc.combo >= 2) {
      ctx.fillStyle = kc.combo >= 5 ? '#4cc9f0' : '#ffe08a';
      ctx.font = '900 16px system-ui';
      ctx.fillText(`combo ${kc.combo}${kc.combo >= 5 ? ' ×2' : ''}`, 14, 54);
    }
    ctx.fillStyle = '#fff'; ctx.font = '800 20px system-ui'; ctx.textAlign = 'right';
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
        fanfare(); confetti();
        toast(`Key Catcher: ${kc.score} pts, best combo ${kc.best}! Bonus: +${bonus} 🔑 +${kc.score} XP`);
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
        const equipped = state.player[equipKey] === i.id;
        return `<button class="shop-item ${owned ? 'owned' : ''} ${equipped ? 'equipped' : ''}" data-buy="${i.id}" data-kind="${equipKey}">
          <span class="shop-preview"><canvas class="shop-canvas" width="120" height="120" data-kind="${equipKey}" data-id="${i.id}"></canvas>${equipped ? '<span class="shop-worn">Worn</span>' : ''}</span>
          <span class="shop-name">${i.name}</span>
          <span class="shop-price">${owned ? (equipped ? 'Equipped ✓' : 'Tap to wear') : `${i.price} 🔑`}</span>
        </button>`;
      }).join('')}
    </div>`;
  body.innerHTML = `
    <p class="muted">Spend your hard-earned keys, then tap anything you own to wear it. (Also in <strong>The Closet</strong>, bottom-left.)</p>
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
        renderShop(document.getElementById('bm-title'), document.getElementById('bm-body'));
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
  startShopPreviews();
}

/* Animated shop previews: each cosmetic renders a live little sprite so kids
   see exactly what they are buying (accessory on the hero, the pet, the trail). */
function startShopPreviews() {
  cancelAnimationFrame(window._shopRaf);
  const t0 = performance.now();
  const draw = (now) => {
    const modalOpen = document.getElementById('building-modal').classList.contains('open');
    const canvases = document.querySelectorAll('.shop-canvas');
    if (!modalOpen || !canvases.length) return; // stop when shop closes
    const sec = (now - t0) / 1000;
    canvases.forEach(cv => {
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      const kind = cv.dataset.kind, id = cv.dataset.id;
      if (kind === 'accessory') {
        drawAvatar(ctx, 60, 112, 0.62, { hero: state.player.hero, accessory: id }, sec, false, 1);
      } else if (kind === 'pet') {
        drawPet(ctx, 60, 92, 2.6, id, sec);
      } else if (kind === 'trail') {
        drawTrailPreview(ctx, id, sec, cv.width, cv.height);
      }
    });
    window._shopRaf = requestAnimationFrame(draw);
  };
  window._shopRaf = requestAnimationFrame(draw);
}

/* A little emitter loops across the tile leaving the trail, so the motion reads. */
function drawTrailPreview(ctx, kind, sec, w, h) {
  const cx = w / 2 + Math.sin(sec * 1.6) * (w * 0.3);
  const cy = h / 2 + Math.sin(sec * 3.2) * 6;
  const dir = Math.cos(sec * 1.6) >= 0 ? 1 : -1;
  for (let i = 0; i < 16; i++) {
    const age = i / 16;                    // 0 = freshest
    const px = cx - dir * age * (w * 0.34);
    const py = cy + Math.sin(sec * 3.2 - age * 2) * 6 - age * 4;
    const a = 1 - age;
    ctx.save(); ctx.globalAlpha = a * 0.9;
    if (kind === 'sparkle') {
      ctx.fillStyle = '#ffd75e';
      drawStar(ctx, px, py, 4, 6 * a + 1.5, 2.4 * a + 0.6); ctx.fill();
    } else if (kind === 'bubbles') {
      ctx.strokeStyle = '#8fdcf5'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py, 4 + a * 5, 0, Math.PI * 2); ctx.stroke();
    } else { // rainbow
      ctx.fillStyle = ['#ff6b5b', '#ffd75e', '#26b59d', '#0068ff', '#9b5de5'][i % 5];
      ctx.beginPath(); ctx.arc(px, py, 3 + a * 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  // the little wisp doing the emitting
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,45,114,.3)'; ctx.lineWidth = 2; ctx.stroke();
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
  const lvl = (typeof adaptiveAbility === 'function') ? ` · 🎯 Challenge level ${adaptiveAbility().toFixed(1)}` : '';
  document.getElementById('math-skills').textContent = unit.skills + lvl;

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
  // adaptive difficulty: pick each problem's grade near the trail grade, nudged
  // by rolling ability. Reviews lean easier; challenges & bosses lean harder.
  const base = (typeof adaptiveProblemGrade === 'function') ? adaptiveProblemGrade(grade) : grade;
  const locks = Array.from({ length: count }, (_, j) => {
    let pg = base;
    if (type === 'review') pg = Math.max(1, Math.min(base, grade));
    else if (type === 'challenge' || type === 'boss') pg = Math.min(5, Math.max(base, grade));
    const pool = DATA.mathProblems[pg] || probs;
    const p = pool[(i + j) % pool.length];
    const tier = pg > grade ? `Stretch · Grade ${pg}` : pg < grade ? `Warm-up · Grade ${pg}` : null;
    return { type: 'number', clue: p.clue, answer: p.answer, subject: tier, hint: 'Draw it out or count it up — you’ve got this.' };
  });
  const unit = DATA.mathUnits[grade].unit;
  startPuzzle({
    title: `${unit} — ${type === 'boss' ? 'BOSS Lock' : type === 'challenge' ? 'Challenge' : type === 'review' ? 'Review' : 'Quest'} ${i + 1}`,
    ctxLabel: `Breakout Math · Grade ${grade}`,
    locks,
    celType: type === 'boss' ? 'boss' : 'standard',
    onWin: ({ attempts }) => {
      const key = nodeKey(grade, i);
      const firstClear = !state.mathStars[key];
      const stars = attempts <= count ? 3 : attempts <= count + 1 ? 2 : 1;
      state.mathStars[key] = Math.max(state.mathStars[key] || 0, stars);
      state.mathAttempts[key] = attempts;
      const rewards = { core: { keys: 12, xp: 30, arcade: 4 }, review: { keys: 6, xp: 15, arcade: 2 }, challenge: { keys: 20, xp: 50, arcade: 8 }, boss: { keys: 35, xp: 90, arcade: 12 } }[type];
      grant(rewards);
      if (type === 'challenge' || type === 'boss') awardBadge('challenge');
      if (type === 'boss' && firstClear) awardLegendaryKey('math');
      if (attempts > count + 1) toast(`+${rewards.keys} 🔑! Tip: the Review stop on the trail is a great warm-up. 💙`);
      else toast(`${'⭐'.repeat(stars)} +${rewards.keys} 🔑 +${rewards.xp} XP +${rewards.arcade} arcade min!`);
      renderMathMap();
    },
  });
}

/* Class summary: the three questions a teacher actually asks, answered from
   real gameplay signals — who needs help, who is ready to move up, who hasn't
   started. Deliberately not "who logged in". */
function renderClassSummary(rows) {
  const host = document.getElementById('t-summary');
  if (!host) return;
  const played = rows.filter(r => r.lastDays !== null && r.lastDays !== undefined);
  const notPlayed = rows.filter(r => r.lastDays === null || r.lastDays === undefined);
  const needsHelp = played.filter(r => (r.success != null && r.success < 0.72) || (r.due || 0) >= 5);
  const readyUp = played.filter(r => (r.ability || 0) >= 4.3 && (r.success == null || r.success >= 0.85));
  const names = a => a.length ? a.slice(0, 3).map(r => r.name.replace(' ⭐you', '')).join(', ') + (a.length > 3 ? ` +${a.length - 3}` : '') : '—';
  const card = (icon, label, arr, cls) => `
    <div class="tsum ${cls}">
      <div class="tsum-top"><span class="tsum-ico">${icon}</span><span class="tsum-n">${arr.length}</span></div>
      <div class="tsum-label">${label}</div>
      <div class="tsum-names">${names(arr)}</div>
    </div>`;
  host.innerHTML = `
    <h3>Where your class needs you</h3>
    <p class="note">Honest signals from real gameplay — mastery and struggle, not just who logged in.</p>
    <div class="tsum-row">
      ${card('🆘', 'Needs a hand', needsHelp, 'help')}
      ${card('🚀', 'Ready to level up', readyUp, 'up')}
      ${card('💤', 'Not started yet', notPlayed, 'idle')}
    </div>`;
}

/* ---- Teacher sign-in (SSO) ---- */
const SSO_PROVIDERS = [
  { id: 'google', label: 'Google', color: '#4285F4', mark: 'G' },
  { id: 'clever', label: 'Clever', color: '#436CF7', mark: 'C' },
  { id: 'classlink', label: 'ClassLink', color: '#f68b1f', mark: 'CL' },
];
function openTeacherSignin() {
  const modal = document.getElementById('signin-modal');
  const wrap = document.getElementById('sso-btns');
  wrap.innerHTML = '';
  SSO_PROVIDERS.forEach(p => {
    const b = document.createElement('button');
    b.className = 'sso-btn';
    b.innerHTML = `<span class="sso-mark" style="background:${p.color}">${p.mark}</span> Sign in with ${p.label}`;
    b.onclick = () => ssoSignIn(p);
    wrap.appendChild(b);
  });
  document.getElementById('signin-demo').onclick = () => { modal.classList.remove('open'); openTeacher(); };
  document.getElementById('signin-close').onclick = () => modal.classList.remove('open');
  modal.classList.add('open');
}
function ssoSignIn(p) {
  blip(720);
  if (typeof api !== 'undefined' && api.enabled && api.enabled()) {
    // live: ask the backend for the provider's authorize URL, then redirect
    fetch(`${api.base}/api/auth/sso/${p.id}/start?role=teacher&redirect_uri=${encodeURIComponent(location.origin + '/api/auth/sso/' + p.id + '/callback')}`)
      .then(r => r.json())
      .then(j => {
        if (j.url && !j.demo) { location.href = j.url; }
        else { toast(`${p.label}: demo sign-in (no client ID configured).`); document.getElementById('signin-modal').classList.remove('open'); openTeacher(); }
      })
      .catch(() => { document.getElementById('signin-modal').classList.remove('open'); openTeacher(); });
  } else {
    // offline demo: proceed to the dashboard
    toast(`Signed in with ${p.label} (demo). Production uses real ${p.label} SSO.`);
    document.getElementById('signin-modal').classList.remove('open');
    openTeacher();
  }
}

/* ---- Teacher dashboard ---- */
function openTeacher() {
  showScreen('teacher');
  const you = {
    name: (state.player.name || 'You') + ' ⭐you', level: levelInfo().n, keys: state.totalKeys,
    games: Object.keys(state.gamesDone).length + Object.keys(state.mathStars).length,
    avgMin: 12.0, success: 0.9, streak: state.streak, arcade: state.perms.teacherArcade, lastDays: 0,
    mastered: (typeof srMasteredCount === 'function') ? srMasteredCount() : 0,
    due: (typeof srDueCount === 'function') ? srDueCount() : 0,
    ability: (typeof adaptiveAbility === 'function') ? adaptiveAbility() : (state.mathGrade || 3),
    you: true,
  };
  const roster = [...DATA.roster, you];

  renderClassSummary(roster);
  document.getElementById('t-roster').innerHTML = roster.map((s, i) => `
    <tr>
      <td class="t-name">${s.name}</td>
      <td>${s.level}</td>
      <td>${s.games}</td>
      <td>${s.success == null ? '<span class="pill mid">—</span>' : `<span class="pill ${s.success >= .85 ? 'good' : s.success >= .7 ? 'mid' : 'low'}">${Math.round(s.success * 100)}%</span>`}</td>
      <td>${s.mastered ? `<b>${s.mastered}</b>` : '0'}</td>
      <td>${s.due ? `<span class="due-pill2">${s.due}</span>` : '—'}</td>
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
  const boBtn = document.getElementById('t-breakout');
  if (boBtn) boBtn.onclick = () => { if (typeof launchClassBreakout === 'function') launchClassBreakout(); };

  // If a backend is configured, replace the mock roster with live class data.
  if (typeof api !== 'undefined' && api.enabled && api.enabled()) loadLiveTeacherData();
}

/* Pulls the real roster + per-standard mastery from the backend and swaps it in
   for the seed data. Falls back silently to the mock view on any failure. */
async function loadLiveTeacherData() {
  try {
    if (!api.teacherToken) await api.loginTeacher(state.player.name || 'Teacher', 'My Class', window.BREAKOUT_TEACHER_EMAIL || null);
    const data = await api.fetchRoster();
    if (!data || !screenIs('teacher')) return;
    const fmtAgo = (ts) => {
      if (!ts) return 'never';
      const m = Math.round((Date.now() - ts) / 60000);
      if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`;
      const h = Math.round(m / 60); if (h < 24) return `${h}h ago`;
      return `${Math.round(h / 24)}d ago`;
    };
    const rows = data.roster.map(s => ({
      name: s.name,
      level: 1 + Math.floor((s.xp || 0) / 100),
      solved: s.locksSolved,
      success: s.successRate,
      streak: s.streak,
      keys: s.keys,
      mastered: s.mastered || 0,
      due: s.dueReviews || 0,
      ability: s.ability || 3,
      lastActive: s.lastActive || null,
      lastDays: s.lastActive ? Math.floor((Date.now() - s.lastActive) / 86400000) : null,
    }));
    renderClassSummary(rows);
    document.getElementById('t-roster').innerHTML = rows.map(s => {
      const succ = s.success;
      const pill = succ == null ? 'mid' : succ >= .85 ? 'good' : succ >= .7 ? 'mid' : 'low';
      return `<tr>
        <td class="t-name">${s.name}</td>
        <td>${s.level}</td>
        <td>${s.solved}</td>
        <td>${fmtAgo(s.lastActive)}</td>
        <td><span class="pill ${pill}">${succ == null ? '—' : Math.round(succ * 100) + '%'}</span></td>
        <td>${s.mastered ? `<b>${s.mastered}</b>` : '0'}</td>
        <td>${s.due ? `<span class="due-pill2">${s.due}</span>` : '—'}</td>
        <td>${s.streak}🔥</td>
        <td>${s.keys} 🔑</td>
      </tr>`;
    }).join('');
    const head = document.querySelector('#screen-teacher .t-table thead tr');
    if (head) head.innerHTML = '<th>Explorer</th><th>Level</th><th>Solved</th><th>Last active</th><th>Success</th><th>Mastered</th><th>Due</th><th>Streak</th><th>Keys</th>';
    renderMasteryPanel(data.mastery);
  } catch (e) { /* keep the mock view */ }
}

/* Honest per-standard mastery, derived from real solve events (not completion). */
function renderMasteryPanel(mastery) {
  const host = document.getElementById('t-chart');
  if (!host || !mastery) return;
  const codes = Object.keys(mastery);
  if (!codes.length) return;
  const rows = codes.map(code => {
    const m = mastery[code];
    const rate = m.attempts ? m.correct / m.attempts : 0;
    const meta = (DATA.standards && DATA.standards[code]) || {};
    const band = rate >= .85 ? 'good' : rate >= .6 ? 'mid' : 'low';
    return `<div class="cmp-group">
      <div class="cmp-label" title="${meta.label || ''}">${code}${meta.strand ? ` · ${meta.strand}` : ''}</div>
      <div class="mastery-track"><div class="mastery-fill ${band}" style="width:${Math.round(rate * 100)}%"></div></div>
      <div class="mastery-meta">${Math.round(rate * 100)}% correct · ${m.solved} solved</div>
    </div>`;
  }).join('');
  host.insertAdjacentHTML('afterbegin',
    `<div class="live-badge">● Live class data</div><h4 class="mastery-h">Mastery by standard</h4>${rows}`);
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
