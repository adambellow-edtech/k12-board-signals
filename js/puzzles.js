/* Breakout Land — lock puzzle engine, celebration, sounds, toasts */

/* ---- tiny WebAudio chirps (no assets) ---- */
let audioCtx = null, muted = false;
function ac() {
  if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  return audioCtx;
}
function tone(freq, dur = .12, type = 'triangle', gain = .06, when = 0) {
  const ctx = ac(); if (!ctx || muted) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(gain, ctx.currentTime + when);
  g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + when + dur);
  o.connect(g); g.connect(ctx.destination);
  o.start(ctx.currentTime + when); o.stop(ctx.currentTime + when + dur + .02);
}
function blip(f = 700) { tone(f, .09, 'triangle', .05); }
function buzz() { tone(140, .18, 'sawtooth', .04); }
function fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .18, 'triangle', .07, i * .11)); }

/* ---- toast ---- */
let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

/* ---- confetti ---- */
function confetti() {
  const cv = document.getElementById('confetti');
  const ctx = cv.getContext('2d');
  cv.width = innerWidth; cv.height = innerHeight;
  cv.style.display = 'block';
  const colors = ['#ffb627', '#ff6b5b', '#2ec4b6', '#9b5de5', '#4cc9f0', '#ffd75e'];
  const bits = Array.from({ length: 140 }, () => ({
    x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * .5,
    vx: (Math.random() - .5) * 2.4, vy: 2 + Math.random() * 3.2,
    r: 3 + Math.random() * 5, a: Math.random() * Math.PI, va: (Math.random() - .5) * .3,
    c: colors[(Math.random() * colors.length) | 0], key: Math.random() < .12,
  }));
  const t0 = performance.now();
  (function loop(t) {
    ctx.clearRect(0, 0, cv.width, cv.height);
    bits.forEach(b => {
      b.x += b.vx; b.y += b.vy; b.a += b.va;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
      if (b.key) {
        ctx.fillStyle = '#ffb627';
        ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(2, -1.4, 8, 2.8); ctx.fillRect(7, 1, 2, 3); ctx.fillRect(10, 1, 2, 4);
      } else {
        ctx.fillStyle = b.c; ctx.fillRect(-b.r / 2, -b.r / 2, b.r, b.r * .6);
      }
      ctx.restore();
    });
    if (t - t0 < 2600) requestAnimationFrame(loop);
    else { cv.style.display = 'none'; }
  })(t0);
}

/* ---- lock puzzle engine ----
   Runs a sequence of locks; calls onWin({attempts, seconds}) when all open. */

const puzzle = { locks: [], idx: 0, attempts: 0, lockAttempts: 0, t0: 0, onWin: null, title: '', ctxLabel: '', celType: 'standard', entry: [] };

const COLOR_SET = [
  { id: 'red', c: '#e63946' }, { id: 'orange', c: '#f77f2f' }, { id: 'yellow', c: '#ffd75e' },
  { id: 'green', c: '#57c26b' }, { id: 'blue', c: '#3d7bd9' }, { id: 'purple', c: '#9b5de5' },
];
const DIR_SET = [
  { id: 'up', g: '▲' }, { id: 'down', g: '▼' }, { id: 'left', g: '◀' }, { id: 'right', g: '▶' },
];
const SHAPE_SET = [
  { id: 'triangle', g: '▲', c: '#ff6b5b' }, { id: 'square', g: '■', c: '#0068ff' },
  { id: 'circle', g: '●', c: '#26b59d' }, { id: 'diamond', g: '◆', c: '#ffb627' },
  { id: 'star', g: '★', c: '#9b5de5' },
];

function startPuzzle({ title, ctxLabel, locks, onWin, celType = 'standard' }) {
  Object.assign(puzzle, { locks, idx: 0, attempts: 0, lockAttempts: 0, t0: Date.now(), onWin, title, ctxLabel, celType, entry: [] });
  document.getElementById('pz-title').textContent = title;
  document.getElementById('pz-ctx').textContent = ctxLabel || '';
  document.getElementById('puzzle-modal').classList.add('open');
  renderLock();
}

function closePuzzle() {
  clearInterval(puzzle.speedTimer);
  document.getElementById('puzzle-modal').classList.remove('open');
}

function renderLock() {
  const lk = puzzle.locks[puzzle.idx];
  puzzle.entry = [];
  puzzle.lockAttempts = 0;
  clearInterval(puzzle.speedTimer);
  document.getElementById('pz-step').textContent =
    puzzle.locks.length > 1 ? `Lock ${puzzle.idx + 1} of ${puzzle.locks.length}` : 'One lock stands in your way';
  document.getElementById('pz-clue').textContent = lk.clue;
  // curriculum tag: base context plus this lock's subject (Priority 6)
  const ctxEl = document.getElementById('pz-ctx');
  if (ctxEl) ctxEl.textContent = [puzzle.ctxLabel, lk.subject].filter(Boolean).join(' · ');
  document.getElementById('pz-hint').textContent = '';
  document.getElementById('pz-hint').classList.remove('show');
  const lockEl = document.getElementById('pz-lock');
  lockEl.classList.remove('open-anim', 'shake');

  const pad = document.getElementById('pz-pad');
  const disp = document.getElementById('pz-display');
  const extra = document.getElementById('pz-extra');
  pad.innerHTML = ''; disp.innerHTML = ''; if (extra) extra.innerHTML = '';

  const addKey = (label, fn, cls = '') => {
    const b = document.createElement('button');
    b.className = 'pz-key ' + cls; b.innerHTML = label; b.onclick = fn;
    pad.appendChild(b); return b;
  };

  if (lk.type === 'number') {
    disp.dataset.slots = String(lk.answer.length);
    updateEntryDisplay('digit');
    '1234567890'.split('').forEach(d =>
      addKey(d, () => { if (puzzle.entry.length < lk.answer.length) { puzzle.entry.push(d); blip(500 + puzzle.entry.length * 60); updateEntryDisplay('digit'); } }));
    addKey('⌫', () => { puzzle.entry.pop(); updateEntryDisplay('digit'); blip(300); }, 'wide');
    addKey('TRY IT', () => submitEntry(lk, puzzle.entry.join('')), 'go wide');
  } else if (lk.type === 'word') {
    disp.dataset.slots = String(lk.answer.length);
    updateEntryDisplay('letter');
    // every answer letter must stay on the pad — only pad out with extras
    const extras = pickExtraLetters(lk.answer);
    const padCount = Math.max(0, Math.max(10, lk.answer.length + 2) - lk.answer.length);
    const letters = shuffle((lk.answer + extras.slice(0, padCount)).split(''));
    letters.forEach(ch =>
      addKey(ch, () => { if (puzzle.entry.length < lk.answer.length) { puzzle.entry.push(ch); blip(520 + puzzle.entry.length * 40); updateEntryDisplay('letter'); } }));
    addKey('⌫', () => { puzzle.entry.pop(); updateEntryDisplay('letter'); blip(300); }, 'wide');
    addKey('TRY IT', () => submitEntry(lk, puzzle.entry.join('')), 'go wide');
  } else if (lk.type === 'color') {
    disp.dataset.slots = String(lk.answer.length);
    updateEntryDisplay('color');
    COLOR_SET.forEach(cs =>
      addKey(`<span class="dot" style="background:${cs.c}"></span>`, () => {
        if (puzzle.entry.length < lk.answer.length) { puzzle.entry.push(cs.id); blip(480 + puzzle.entry.length * 70); updateEntryDisplay('color'); }
      }, 'colorkey'));
    addKey('⌫', () => { puzzle.entry.pop(); updateEntryDisplay('color'); blip(300); }, 'wide');
    addKey('TRY IT', () => submitEntry(lk, puzzle.entry.join(',')), 'go wide');
  } else if (lk.type === 'direction') {
    disp.dataset.slots = String(lk.answer.length);
    updateEntryDisplay('dir');
    DIR_SET.forEach(ds =>
      addKey(ds.g, () => {
        if (puzzle.entry.length < lk.answer.length) { puzzle.entry.push(ds.id); blip(460 + puzzle.entry.length * 70); updateEntryDisplay('dir'); }
      }, 'dirkey'));
    addKey('⌫', () => { puzzle.entry.pop(); updateEntryDisplay('dir'); blip(300); }, 'wide');
    addKey('TRY IT', () => submitEntry(lk, puzzle.entry.join(',')), 'go wide');
  } else if (lk.type === 'shape') {
    disp.dataset.slots = String(lk.answer.length);
    updateEntryDisplay('shape');
    SHAPE_SET.forEach(ss =>
      addKey(`<span style="color:${ss.c}">${ss.g}</span>`, () => {
        if (puzzle.entry.length < lk.answer.length) { puzzle.entry.push(ss.id); blip(500 + puzzle.entry.length * 70); updateEntryDisplay('shape'); }
      }, 'shapekey'));
    addKey('⌫', () => { puzzle.entry.pop(); updateEntryDisplay('shape'); blip(300); }, 'wide');
    addKey('TRY IT', () => submitEntry(lk, puzzle.entry.join(',')), 'go wide');
  } else if (lk.type === 'switch') {
    // a row of toggles; flip the right ones ON
    puzzle.entry = Array(lk.answer.length).fill('0');
    disp.dataset.slots = String(lk.answer.length);
    updateEntryDisplay('switch');
    for (let i = 0; i < lk.answer.length; i++) {
      addKey(`SW ${i + 1}`, () => {
        puzzle.entry[i] = puzzle.entry[i] === '1' ? '0' : '1';
        blip(puzzle.entry[i] === '1' ? 760 : 420);
        updateEntryDisplay('switch');
      }, 'switchkey');
    }
    addKey('TRY IT', () => submitEntry(lk, puzzle.entry.join('')), 'go wide');
  } else if (lk.type === 'cipher') {
    // decode a coded message using the cipher key, then enter the word
    if (extra) {
      const legend = Object.entries(lk.cipherKey).map(([sym, ltr]) => `<span class="ci-pair"><b>${sym}</b><i>${ltr}</i></span>`).join('');
      const coded = lk.coded.split('').map(sym => `<span class="ci-sym">${sym}</span>`).join('');
      extra.innerHTML = `<div class="ci-legend">${legend}</div><div class="ci-coded">${coded}</div>`;
    }
    disp.dataset.slots = String(lk.answer.length);
    updateEntryDisplay('letter');
    const extras = pickExtraLetters(lk.answer);
    const padCount = Math.max(0, Math.max(10, lk.answer.length + 2) - lk.answer.length);
    shuffle((lk.answer + extras.slice(0, padCount)).split('')).forEach(ch =>
      addKey(ch, () => { if (puzzle.entry.length < lk.answer.length) { puzzle.entry.push(ch); blip(520 + puzzle.entry.length * 40); updateEntryDisplay('letter'); } }));
    addKey('⌫', () => { puzzle.entry.pop(); updateEntryDisplay('letter'); blip(300); }, 'wide');
    addKey('TRY IT', () => submitEntry(lk, puzzle.entry.join('')), 'go wide');
  } else if (lk.type === 'logic') {
    // deduce the right answer from the clues, then tap it
    if (extra) extra.innerHTML = `<ul class="lg-clues">${lk.clues.map(c => `<li>${c}</li>`).join('')}</ul>`;
    disp.dataset.slots = '0';
    lk.options.forEach(opt => {
      const b = addKey(opt.label, () => submitEntry(lk, opt.label), 'logickey');
      if (opt.color) { b.style.borderColor = opt.color; b.style.color = opt.color; }
    });
  } else if (lk.type === 'order') {
    // arrange the tiles into the correct sequence
    if (extra) extra.innerHTML = '<div class="ord-hint">Tap the tiles in the right order</div>';
    disp.dataset.slots = String(lk.answer.length);
    updateEntryDisplay('order');
    shuffle(lk.tiles.slice()).forEach(t =>
      addKey(t, () => { if (puzzle.entry.length < lk.answer.length) { puzzle.entry.push(t); blip(500 + puzzle.entry.length * 50); updateEntryDisplay('order'); } }, 'orderkey'));
    addKey('⌫', () => { puzzle.entry.pop(); updateEntryDisplay('order'); blip(300); }, 'wide');
    addKey('TRY IT', () => submitEntry(lk, puzzle.entry.join(',')), 'go wide');
  } else if (lk.type === 'speed') {
    runSpeedLock(lk);
  }
}

/* Speed lock (fluency archetype): answer a rapid set of questions before the
   timer runs out. Low-stakes — running out just restarts the round. */
function runSpeedLock(lk) {
  const extra = document.getElementById('pz-extra');
  const disp = document.getElementById('pz-display');
  const pad = document.getElementById('pz-pad');
  const clue = document.getElementById('pz-clue');
  const qs = lk.questions, total = qs.length, timeLimit = lk.timeLimit || 18;
  disp.dataset.slots = '0'; disp.innerHTML = '';
  if (extra) extra.innerHTML = `<div class="sp-head"><span id="sp-count"></span><span id="sp-time"></span></div><div class="sp-track"><div class="sp-bar" id="sp-bar"></div></div>`;
  let qi = 0, tLeft = timeLimit, ended = false;

  const paint = () => {
    const bar = document.getElementById('sp-bar'), tm = document.getElementById('sp-time');
    const pct = Math.max(0, (tLeft / timeLimit) * 100);
    if (bar) { bar.style.width = pct + '%'; bar.style.background = pct < 30 ? '#e0607a' : pct < 60 ? '#f4a11e' : '#26b59d'; }
    if (tm) tm.textContent = Math.max(0, tLeft).toFixed(1) + 's';
  };
  const renderQ = () => {
    const q = qs[qi];
    clue.textContent = q.q;
    const c = document.getElementById('sp-count'); if (c) c.textContent = `Question ${qi + 1} of ${total}`;
    pad.innerHTML = '';
    shuffle(q.choices.slice()).forEach(ch => {
      const b = document.createElement('button');
      b.className = 'pz-key speedkey'; b.textContent = ch;
      b.onclick = () => {
        if (ended) return;
        if (String(ch) === String(q.answer)) {
          blip(720 + qi * 40); qi++;
          if (qi >= total) { ended = true; clearInterval(puzzle.speedTimer); puzzle.attempts++; puzzle.lockAttempts++; openLock(lk); }
          else renderQ();
        } else { buzz(); tLeft = Math.max(0.1, tLeft - 2); b.classList.add('wrong'); paint(); }
      };
      pad.appendChild(b);
    });
  };
  const startTimer = () => {
    clearInterval(puzzle.speedTimer);
    puzzle.speedTimer = setInterval(() => {
      if (ended) return;
      tLeft -= 0.1; paint();
      if (tLeft <= 0) {
        ended = true; clearInterval(puzzle.speedTimer);
        puzzle.attempts++; puzzle.lockAttempts++;
        const lockEl = document.getElementById('pz-lock');
        lockEl.classList.remove('shake'); void lockEl.offsetWidth; lockEl.classList.add('shake'); buzz();
        toast('⏱ Out of time! Take a breath and go again.');
        setTimeout(() => {
          if (!document.getElementById('puzzle-modal').classList.contains('open')) return; // player left
          qi = 0; tLeft = timeLimit; ended = false; paint(); renderQ(); startTimer();
        }, 1000);
      }
    }, 100);
  };
  paint(); renderQ(); startTimer();
}

function updateEntryDisplay(kind) {
  const disp = document.getElementById('pz-display');
  const slots = parseInt(disp.dataset.slots || '4', 10);
  disp.innerHTML = '';
  for (let i = 0; i < slots; i++) {
    const s = document.createElement('span');
    s.className = 'slot';
    const v = puzzle.entry[i];
    if (kind === 'switch') {
      s.classList.add('filled', 'sw');
      s.classList.toggle('on', puzzle.entry[i] === '1');
      s.textContent = puzzle.entry[i] === '1' ? 'ON' : 'OFF';
    } else if (v !== undefined) {
      s.classList.add('filled');
      if (kind === 'color') { s.innerHTML = `<span class="dot" style="background:${COLOR_SET.find(c => c.id === v).c}"></span>`; }
      else if (kind === 'dir') { s.textContent = DIR_SET.find(d => d.id === v).g; }
      else if (kind === 'shape') { const sh = SHAPE_SET.find(t => t.id === v); s.innerHTML = `<span style="color:${sh.c}">${sh.g}</span>`; }
      else { s.textContent = v; }
    }
    disp.appendChild(s);
  }
}

function lockIdOf(lk) {
  return lk.id || `${lk.type}:${(lk.standards && lk.standards[0]) || lk.subject || 'na'}`;
}

/* The signature lock-open beat: a satisfying mechanical release, a light flash,
   and a burst of sparks flung from the shackle. This is the product's payoff. */
function unlockChime() {
  tone(190, .12, 'square', .05);              // mechanical clunk
  tone(120, .2, 'sine', .06, .02);            // low thunk
  [523, 659, 784, 988, 1319].forEach((f, i) => tone(f, .17, 'triangle', .06, .12 + i * .05)); // rising shimmer
  tone(1568, .5, 'sine', .05, .34);           // bright ding
}
function lockOpenMoment() {
  unlockChime();
  const card = document.querySelector('#puzzle-modal .modal-card');
  const zone = document.querySelector('.pz-lock-zone');
  if (card) {
    const flash = document.createElement('div');
    flash.className = 'pz-flash';
    card.appendChild(flash);
    setTimeout(() => flash.remove(), 520);
  }
  if (zone) {
    for (let i = 0; i < 14; i++) {
      const s = document.createElement('span');
      s.className = 'lk-spark';
      const ang = (i / 14) * Math.PI * 2 + Math.random() * .4;
      const dist = 46 + Math.random() * 46;
      s.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
      s.style.setProperty('--dy', `${Math.sin(ang) * dist - 12}px`);
      s.style.animationDelay = `${Math.random() * .05}s`;
      zone.appendChild(s);
      setTimeout(() => s.remove(), 720);
    }
  }
}

/* Shared "this lock opened" path — used by the standard entry locks and by the
   speed lock. Assumes puzzle.lockAttempts is already set for this lock. */
function openLock(lk) {
  clearInterval(puzzle.speedTimer);
  lockOpenMoment();
  document.getElementById('pz-lock').classList.add('open-anim');
  if (puzzle.lockAttempts === 1) awardBadge('thinker');
  if (puzzle.lockAttempts >= 3) awardBadge('persistent');
  track('lock_solved', { lockId: lockIdOf(lk), lockType: lk.type, standards: lk.standards || [], attempts: puzzle.lockAttempts, seconds: Math.round((Date.now() - puzzle.t0) / 1000) });
  if (typeof srReview === 'function') (lk.standards || []).forEach(code => srReview(code, srQuality(puzzle.lockAttempts)));
  if (typeof adaptiveRecord === 'function') adaptiveRecord(puzzle.lockAttempts, Math.round((Date.now() - puzzle.t0) / 1000));
  setTimeout(() => {
    puzzle.idx++;
    if (puzzle.idx < puzzle.locks.length) {
      toast('Click! One down — next lock! 🔓');
      renderLock();
    } else {
      const seconds = Math.round((Date.now() - puzzle.t0) / 1000);
      track('time_thinking_ms', { ms: Date.now() - puzzle.t0, context: puzzle.title });
      closePuzzle();
      let type = puzzle.celType || 'standard';
      if (type === 'standard' && puzzle.attempts === 1) type = 'flawless';
      celebration(puzzle.title, puzzle.attempts, seconds, () => puzzle.onWin({ attempts: puzzle.attempts, seconds }), type);
    }
  }, 750);
}

function submitEntry(lk, entered) {
  const want = Array.isArray(lk.answer) ? lk.answer.join(',') : String(lk.answer).toUpperCase();
  const got = String(entered).toUpperCase();
  puzzle.attempts++; puzzle.lockAttempts++;
  const correct = got === want.toUpperCase();
  track('lock_attempt', { lockId: lockIdOf(lk), lockType: lk.type, standards: lk.standards || [], correct, attemptNo: puzzle.lockAttempts });
  if (correct) {
    openLock(lk);
  } else {
    buzz();
    const lockEl = document.getElementById('pz-lock');
    lockEl.classList.remove('shake'); void lockEl.offsetWidth; lockEl.classList.add('shake');
    puzzle.entry = lk.type === 'switch' ? Array(lk.answer.length).fill('0') : [];
    updateEntryDisplay({ number: 'digit', word: 'letter', color: 'color', direction: 'dir', shape: 'shape', switch: 'switch' }[lk.type]);
    if (puzzle.lockAttempts >= 2 && lk.hint) {
      const h = document.getElementById('pz-hint');
      if (!h.classList.contains('show')) track('hint_used', { lockId: lockIdOf(lk), level: 1 });
      h.textContent = '💡 Hint: ' + lk.hint;
      h.classList.add('show');
    }
    toast('Not quite — look at the clue again. You’ve got this!');
  }
}

// Tiered celebration copy — the headline/emoji scale with the achievement
const CEL_TYPES = {
  standard:   { headline: 'YOU BROKE OUT!',    emoji: '🎉', fanfare: [523, 659, 784, 1047] },
  firstBreak: { headline: 'YOUR FIRST BREAKOUT!', emoji: '🥳', fanfare: [523, 659, 784, 1047, 1319] },
  flawless:   { headline: 'FLAWLESS SOLVE!',   emoji: '⭐', fanfare: [659, 784, 988, 1319] },
  streak3:    { headline: '3-DAY STREAK!',     emoji: '🔥', fanfare: [523, 659, 784, 1047] },
  streak7:    { headline: '7-DAY STREAK!',     emoji: '🏆', fanfare: [523, 659, 784, 1047, 1319, 1568] },
  boss:       { headline: 'BOSS DEFEATED!',    emoji: '👑', fanfare: [392, 523, 659, 784, 1047, 1319] },
  npc:        { headline: 'QUEST COMPLETE!',   emoji: '🤝', fanfare: [587, 740, 880, 1175] },
};

function celebration(title, attempts, seconds, onDone, type = 'standard') {
  const cel = CEL_TYPES[type] || CEL_TYPES.standard;
  confetti();
  cel.fanfare.forEach((f, i) => tone(f, .18, 'triangle', .07, i * .1));
  document.getElementById('cel-title').textContent = `${cel.emoji} ${cel.headline}`;
  document.getElementById('cel-sub').textContent = title;
  document.getElementById('cel-stats').innerHTML =
    `<span>⏱ ${Math.floor(seconds / 60)}m ${seconds % 60}s</span><span>🎯 ${attempts} ${attempts === 1 ? 'try' : 'tries'}</span>`;
  const modal = document.getElementById('cel-modal');
  modal.classList.add('open');
  document.getElementById('cel-btn').onclick = () => {
    modal.classList.remove('open');
    onDone && onDone();
  };
}

/* helpers */
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
function pickExtraLetters(word) {
  const pool = 'AEIOURSTLNM';
  let out = '';
  while (out.length < 4) { const ch = pool[(Math.random() * pool.length) | 0]; if (!word.includes(ch)) out += ch; }
  return out;
}
