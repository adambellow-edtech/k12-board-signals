/* Class Breakout — a teacher-triggered, whole-class COOPERATIVE solve event.
   The class cracks one shared vault of locks together before the timer runs out.
   Cooperative, never a leaderboard (per the plan). Works offline as a demo with
   simulated classmates; when a backend is configured, solves sync to a real
   session so a whole class aggregates together. */

const EVENT_KEY = 'breakoutLandEvent.v1';
const breakout = { session: null, timer: null, simTimer: null };
const BO_CLASSMATES = ['Ava', 'Diego', 'Lily', 'Marcus', 'Nia', 'Jordan', 'Zoe', 'Kai', 'Sam'];

/* Teacher launches the event. Offline: a local flag other roles can see. Backend:
   a real session students join. */
function launchClassBreakout() {
  const dur = DATA.classBreakout.durationSec || 300;
  const ev = { endsAt: Date.now() + dur * 1000, total: DATA.classBreakout.locks.length, startedAt: Date.now() };
  try { localStorage.setItem(EVENT_KEY, JSON.stringify(ev)); } catch (e) {}
  if (typeof api !== 'undefined' && api.enabled && api.enabled() && api.startBreakout) api.startBreakout(dur);
  fanfare();
  toast('🎉 Class Breakout launched! Students can join from the island.');
}

function activeEvent() {
  try { const ev = JSON.parse(localStorage.getItem(EVENT_KEY)); if (ev && ev.endsAt > Date.now()) return ev; } catch (e) {}
  return null;
}
function endEvent() { try { localStorage.removeItem(EVENT_KEY); } catch (e) {} }

/* The world shows a join button while an event is live. */
function updateBreakoutCta() {
  const cta = document.getElementById('breakout-cta');
  if (!cta) return;
  cta.classList.toggle('show', !!activeEvent() && !(breakout.session && breakout.session.won));
}

/* Student joins the cooperative vault. */
function openClassBreakout() {
  const ev = activeEvent();
  if (!ev) { toast('No Class Breakout is live right now.'); updateBreakoutCta(); return; }
  const cfg = DATA.classBreakout;
  breakout.session = { endsAt: ev.endsAt, locks: cfg.locks, title: cfg.title, solved: {}, feed: [], won: false, lost: false };
  document.getElementById('breakout-modal').classList.add('open');
  renderBreakout();
  startBreakoutTimer();
  startBreakoutSim();
}
function closeClassBreakout() {
  clearInterval(breakout.timer); clearInterval(breakout.simTimer);
  document.getElementById('breakout-modal').classList.remove('open');
  updateBreakoutCta();
}

function startBreakoutTimer() {
  clearInterval(breakout.timer);
  breakout.timer = setInterval(() => {
    const s = breakout.session; if (!s || s.won || s.lost) return;
    const left = Math.round((s.endsAt - Date.now()) / 1000);
    const t = document.getElementById('bo-timer');
    if (t) { t.textContent = `${Math.floor(Math.max(0, left) / 60)}:${String(Math.max(0, left) % 60).padStart(2, '0')}`; t.classList.toggle('low', left <= 30); }
    if (left <= 0) breakoutTimeUp();
  }, 250);
}

/* Simulated classmates crack locks alongside you, so it feels alive offline. */
function startBreakoutSim() {
  clearInterval(breakout.simTimer);
  breakout.simTimer = setInterval(() => {
    const s = breakout.session; if (!s || s.won || s.lost) return;
    const open = s.locks.map((_, i) => i).filter(i => !s.solved[i]);
    if (open.length <= 1) return; // leave the last lock for the player to finish
    if (Math.random() < 0.55) {
      const i = open[(Math.random() * open.length) | 0];
      markBreakoutSolved(i, BO_CLASSMATES[(Math.random() * BO_CLASSMATES.length) | 0]);
    }
  }, 5000);
}

function markBreakoutSolved(i, who) {
  const s = breakout.session; if (!s || s.solved[i]) return;
  s.solved[i] = who;
  s.feed.push(`${who} cracked Lock ${i + 1}! 🔓`);
  if (typeof api !== 'undefined' && api.enabled && api.enabled() && api.solveBreakout) api.solveBreakout(i);
  renderBreakout();
  if (Object.keys(s.solved).length >= s.locks.length) breakoutWin();
}

function attemptBreakoutLock(i) {
  const s = breakout.session; if (!s || s.solved[i]) return;
  const lk = s.locks[i];
  startPuzzle({
    title: `Vault Lock ${i + 1}`,
    ctxLabel: 'Class Breakout',
    locks: [lk],
    onWin: () => { grant({ keys: 6, xp: 12 }); markBreakoutSolved(i, state.player.name || 'You'); },
  });
}

function breakoutWin() {
  const s = breakout.session; if (!s || s.won) return;
  s.won = true; endEvent();
  clearInterval(breakout.timer); clearInterval(breakout.simTimer);
  awardBadge('team-player');
  grant({ keys: 30, xp: 60, arcade: 8 });
  fanfare(); confetti();
  renderBreakout();
}
function breakoutTimeUp() {
  const s = breakout.session; if (!s || s.won || s.lost) return;
  s.lost = true; endEvent();
  clearInterval(breakout.timer); clearInterval(breakout.simTimer);
  renderBreakout();
}

function renderBreakout() {
  const s = breakout.session; if (!s) return;
  const body = document.getElementById('breakout-body');
  const total = s.locks.length, done = Object.keys(s.solved).length;
  const left = Math.max(0, Math.round((s.endsAt - Date.now()) / 1000));
  const timer = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;

  if (s.won) {
    body.innerHTML = `
      <div class="bo-end">
        <div class="big-emoji">🏆</div>
        <h2>VAULT CRACKED!</h2>
        <p class="center">Your whole class cracked all ${total} locks together. Teamwork! 🎉</p>
        <p class="center muted">+30 🔑 +60 XP +8 arcade minutes · Team Player badge earned</p>
        <button class="btn-big" id="bo-done">Back to the island</button>
      </div>`;
    document.getElementById('bo-done').onclick = closeClassBreakout;
    return;
  }
  if (s.lost) {
    body.innerHTML = `
      <div class="bo-end">
        <div class="big-emoji">⏱️</div>
        <h2>Time’s up!</h2>
        <p class="center">The class cracked <strong>${done} / ${total}</strong> locks together — great teamwork! Try again next time.</p>
        <button class="btn-big" id="bo-done">Back to the island</button>
      </div>`;
    document.getElementById('bo-done').onclick = closeClassBreakout;
    return;
  }

  const tiles = s.locks.map((lk, i) => {
    const by = s.solved[i];
    return `<button class="bo-lock ${by ? 'done' : ''}" data-bo="${i}" ${by ? 'disabled' : ''}>
      <span class="bo-lock-ico">${by ? '🔓' : '🔒'}</span>
      <span class="bo-lock-n">Lock ${i + 1}</span>
      <span class="bo-lock-by">${by ? (by === (state.player.name || 'You') ? 'You!' : by) : 'Tap to crack'}</span>
    </button>`;
  }).join('');
  const nextOpen = s.locks.map((_, i) => i).find(i => !s.solved[i]);

  body.innerHTML = `
    <div class="bo-head">
      <div><h2>🎉 Class Breakout</h2><p class="bo-sub">${s.title} — crack all ${total} locks together!</p></div>
      <div class="bo-timer ${left <= 30 ? 'low' : ''}" id="bo-timer">${timer}</div>
    </div>
    <div class="bo-progress"><div class="bo-fill" style="width:${(done / total) * 100}%"></div></div>
    <div class="bo-count">${done} / ${total} locks cracked by the class</div>
    <div class="bo-locks">${tiles}</div>
    ${nextOpen !== undefined ? `<button class="btn-big" id="bo-next">🔓 Crack Lock ${nextOpen + 1}!</button>` : ''}
    <div class="bo-feed">${(s.feed.slice(-4).reverse().map(f => `<div>${f}</div>`).join('')) || '<div class="muted">The vault awaits… crack the first lock!</div>'}</div>`;

  body.querySelectorAll('[data-bo]').forEach(b => b.onclick = () => attemptBreakoutLock(parseInt(b.dataset.bo, 10)));
  const nb = document.getElementById('bo-next');
  if (nb && nextOpen !== undefined) nb.onclick = () => attemptBreakoutLock(nextOpen);
}
