/* Breakout Land — boot & title wiring */

function boot() {
  loadState();

  // Phase 0 foundation: feature flags + analytics event bus come up first so
  // every system can emit from day one.
  flags.load();
  analytics.load();
  analytics.newSession();
  // backend seam: only active when window.BREAKOUT_API is configured
  if (api.init()) {
    analytics.sink = (events) => api.push(events);
    addEventListener('visibilitychange', () => { if (document.hidden) api.flush(); });
  }
  track('session_start', { role: state.created ? 'student' : 'new' });
  setupDevOverlay();

  // returning from an SSO redirect: the backend hands back a teacher token in the
  // URL fragment. Adopt it and jump straight to the dashboard.
  const m = location.hash.match(/sso_token=([^&]+)/);
  if (m && typeof api !== 'undefined') {
    api.teacherToken = decodeURIComponent(m[1]);
    history.replaceState(null, '', location.pathname + location.search);
    if (typeof openTeacher === 'function') setTimeout(openTeacher, 0);
  }

  // painted art assets (inlined as data URIs in the single-file build)
  const A = (typeof window !== 'undefined' && window.ASSETS) || {};
  const abs = (p) => p.startsWith('data:') ? p : new URL(p, document.baseURI).href;
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty('--img-title', `url("${abs(A.title || 'assets/title.jpg')}")`);
  rootStyle.setProperty('--img-desk', `url("${abs(A.desk || 'assets/desk.jpg')}")`);
  rootStyle.setProperty('--img-trail', `url("${abs(A.trail || 'assets/trail.jpg')}")`);

  // new Breakout Land logo (swaps in automatically once assets/logo.webp exists)
  const logoImg = document.getElementById('logo-img');
  if (logoImg) {
    logoImg.onload = () => document.querySelector('.title-wrap').classList.add('has-logo');
    logoImg.onerror = () => logoImg.remove();
    logoImg.src = A.logo || 'assets/logo.webp';
  }

  // title buttons
  document.getElementById('t-student').onclick = () => {
    blip(700);
    if (state.created) { enterWorld(); return; }
    // first-timers: opening narrative hook, then build a character (deferred signup)
    showOpeningHook(() => openAvatarCreator(false));
  };
  document.getElementById('t-teacher').onclick = () => { blip(700); openTeacherSignin(); };
  document.getElementById('t-parent').onclick = () => { blip(700); openParent(); };

  // avatar creator done
  document.getElementById('av-done').onclick = finishAvatar;

  // HUD buttons
  document.getElementById('hud-closet').onclick = () => openAvatarCreator(true);
  document.getElementById('hud-worlds').onclick = () => openWorldMap();
  document.getElementById('hud-home').onclick = () => showScreen('title');
  document.getElementById('hud-mute').onclick = (e) => {
    muted = !muted;
    e.currentTarget.textContent = muted ? '🔇' : '🔊';
    if (typeof ambient !== 'undefined') ambient.syncMute();
  };

  // back-to-world buttons
  document.querySelectorAll('[data-back-world]').forEach(b => b.onclick = () => enterWorld());
  document.querySelectorAll('[data-back-title]').forEach(b => b.onclick = () => showScreen('title'));

  // modal close buttons
  document.getElementById('bm-close').onclick = closeBuildingModal;
  document.getElementById('pz-close').onclick = closePuzzle;
  document.getElementById('breakout-close').onclick = closeClassBreakout;
  document.getElementById('breakout-cta').onclick = openClassBreakout;
  document.getElementById('building-modal').addEventListener('pointerdown', e => {
    if (e.target === e.currentTarget) closeBuildingModal();
  });

  // demo reset
  document.getElementById('t-reset').onclick = () => {
    resetState();
    toast('Demo progress reset — fresh start!');
  };

  // Esc closes modals
  addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeBuildingModal();
      closePuzzle();
      document.getElementById('cel-modal').classList.remove('open');
      document.getElementById('share-modal').classList.remove('open');
    }
  });

  showScreen('title');
}

/* ---- dev event-log overlay (Phase 0) ----
   Toggle with the backtick key. Never shown to students by default; it is a
   developer/teammate tool so the event bus is visible while building. */
let devLogEl = null;
function setupDevOverlay() {
  addEventListener('keydown', e => {
    if (e.key === '`' || e.key === '~') { e.preventDefault(); toggleDevLog(); }
  });
}
function toggleDevLog() {
  if (!devLogEl) {
    devLogEl = document.createElement('div');
    devLogEl.id = 'dev-eventlog';
    devLogEl.style.cssText = 'position:fixed;right:8px;bottom:8px;width:340px;max-height:52vh;overflow:auto;z-index:9999;background:rgba(4,20,55,.94);color:#cfe3ff;font:11px/1.45 ui-monospace,Menlo,monospace;border:2px solid #0068ff;border-radius:12px;padding:8px 10px;box-shadow:0 10px 30px rgba(0,0,0,.5)';
    document.body.appendChild(devLogEl);
  }
  const open = devLogEl.style.display !== 'none' && devLogEl.dataset.open === '1';
  devLogEl.dataset.open = open ? '0' : '1';
  devLogEl.style.display = open ? 'none' : 'block';
  if (!open) renderDevLog();
}
function renderDevLog() {
  if (!devLogEl || devLogEl.dataset.open !== '1') return;
  const rows = analytics.recent(40).map(e => {
    const time = new Date(e.ts).toLocaleTimeString();
    const extra = Object.entries(e).filter(([k]) => !['type', 'ts', 'sessionId'].includes(k))
      .map(([k, v]) => `${k}=${Array.isArray(v) ? '[' + v.join(',') + ']' : v}`).join(' ');
    return `<div><b style="color:#7fd6ff">${e.type}</b> <span style="color:#8aa">${time}</span><br><span style="color:#bfe">${extra}</span></div>`;
  }).join('<hr style="border:none;border-top:1px solid rgba(255,255,255,.1);margin:4px 0">');
  devLogEl.innerHTML = `<div style="font-weight:700;color:#fff;margin-bottom:6px">📊 Event log (${analytics.buffer.length}) · backtick to hide</div>${rows || '<i>no events yet</i>'}`;
}
// live-update the overlay whenever an event fires
function onAnalyticsEvent() { renderDevLog(); }

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
