/* Breakout Land — boot & title wiring */

function boot() {
  loadState();

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

  // title avatar parade
  const cv = document.getElementById('title-canvas');
  if (cv) {
    const ctx = cv.getContext('2d');
    const cast = [
      { skin: DATA.skins[1], hairStyle: 'puff', hairColor: DATA.hairColors[0], outfit: 'tee-teal', accessory: 'none', pet: 'nopet' },
      { skin: DATA.skins[3], hairStyle: 'spiky', hairColor: DATA.hairColors[4], outfit: 'tee-gold', accessory: 'cap', pet: 'nopet' },
      { skin: DATA.skins[0], hairStyle: 'pony', hairColor: DATA.hairColors[3], outfit: 'tee-purple', accessory: 'none', pet: 'fox' },
      { skin: DATA.skins[4], hairStyle: 'swoop', hairColor: DATA.hairColors[1], outfit: 'tee-coral', accessory: 'glasses', pet: 'nopet' },
    ];
    const t0 = performance.now();
    (function loop(t) {
      const sec = (t - t0) / 1000;
      const W = cv.width = cv.clientWidth, H = cv.height = cv.clientHeight;
      ctx.clearRect(0, 0, W, H);
      cast.forEach((c, i) => {
        const x = W * (0.18 + i * 0.21) + Math.sin(sec * 1.4 + i * 2) * 6;
        drawAvatar(ctx, x, H - 14, 0.86, c, sec + i, true, i % 2 ? -1 : 1);
        if (c.pet !== 'nopet') drawPet(ctx, x + 34, H - 12, 0.8, c.pet, sec + i);
      });
      if (screenIs('title')) requestAnimationFrame(loop);
      else setTimeout(() => requestAnimationFrame(loop), 400);
    })(t0);
  }

  showScreen('title');
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
