/* Breakout Land — boot & title wiring */

function boot() {
  loadState();

  // painted art assets (inlined as data URIs in the single-file build)
  const A = (typeof window !== 'undefined' && window.ASSETS) || {};
  const abs = (p) => p.startsWith('data:') ? p : new URL(p, document.baseURI).href;
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty('--img-title', `url("${abs(A.title || 'assets/title.jpg')}")`);
  rootStyle.setProperty('--img-desk', `url("${abs(A.desk || 'assets/desk.jpg')}")`);
  rootStyle.setProperty('--img-trail', `url("${abs(A.trail || 'assets/trail.jpg')}")`);

  // title buttons
  document.getElementById('t-student').onclick = () => {
    blip(700);
    state.created ? enterWorld() : openAvatarCreator(false);
  };
  document.getElementById('t-teacher').onclick = () => { blip(700); openTeacher(); };
  document.getElementById('t-parent').onclick = () => { blip(700); openParent(); };

  // avatar creator done
  document.getElementById('av-done').onclick = finishAvatar;

  // HUD buttons
  document.getElementById('hud-closet').onclick = () => openAvatarCreator(true);
  document.getElementById('hud-home').onclick = () => showScreen('title');
  document.getElementById('hud-mute').onclick = (e) => {
    muted = !muted;
    e.currentTarget.textContent = muted ? '🔇' : '🔊';
  };

  // back-to-world buttons
  document.querySelectorAll('[data-back-world]').forEach(b => b.onclick = () => enterWorld());
  document.querySelectorAll('[data-back-title]').forEach(b => b.onclick = () => showScreen('title'));

  // modal close buttons
  document.getElementById('bm-close').onclick = closeBuildingModal;
  document.getElementById('pz-close').onclick = closePuzzle;
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
    }
  });

  showScreen('title');
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
