/* Breakout Land — Phase 1 onboarding: deferred signup, a sub-60-second first
   solve, a stealth placement expedition, and a "commit to your quest" finish.
   The flow: opening hook -> build character -> first lock (in world.js tutorial)
   -> placement -> commit -> save. No account wall until they've invested. */

/* 1) Opening hook: a short narrative beat before the avatar creator. */
function showOpeningHook(onDone) {
  const modal = document.getElementById('hook-modal');
  modal.classList.add('open');
  document.getElementById('hook-go').onclick = () => {
    blip(760);
    modal.classList.remove('open');
    onDone && onDone();
  };
}

/* 2) Stealth placement: 3 multiple-choice problems across grade levels, framed
   as exploring. Never blocks (any tap advances), so it never feels like a test.
   Where the student lands comfortably sets their starting Math Trail grade. */
function startPlacement(onDone) {
  const items = DATA.placement;
  let idx = 0, correct = 0, hardestRight = 0;
  const modal = document.getElementById('placement-modal');
  modal.classList.add('open');

  const render = () => {
    const q = items[idx];
    document.getElementById('pl-progress').innerHTML =
      items.map((_, i) => `<span class="pl-dot ${i < idx ? 'done' : i === idx ? 'now' : ''}"></span>`).join('');
    document.getElementById('pl-story').textContent = q.story;
    document.getElementById('pl-clue').textContent = q.clue;
    const wrap = document.getElementById('pl-choices');
    wrap.classList.remove('answered');
    wrap.innerHTML = '';
    shuffle(q.choices.slice()).forEach(c => {
      const b = document.createElement('button');
      b.className = 'pl-choice';
      b.textContent = c;
      b.onclick = () => {
        if (wrap.classList.contains('answered')) return;
        wrap.classList.add('answered');
        const right = c === q.answer;
        b.classList.add(right ? 'right' : 'wrong');
        if (!right) [...wrap.children].find(x => x.textContent === String(q.answer))?.classList.add('right');
        if (right) { correct++; hardestRight = Math.max(hardestRight, q.level); blip(880); }
        else buzz();
        track('lock_attempt', { lockId: `placement:${q.level}`, lockType: 'placement', standards: q.standards || [], correct: right, attemptNo: 1 });
        setTimeout(() => {
          idx++;
          if (idx < items.length) render();
          else finish();
        }, 850);
      };
      wrap.appendChild(b);
    });
  };

  const finish = () => {
    // grade = hardest level answered correctly, floored at 2; nudged by total right
    let grade = hardestRight || 2;
    if (correct === items.length) grade = Math.min(5, grade + 1);
    grade = Math.max(2, Math.min(5, grade));
    state.mathGrade = grade;
    state.placement = { grade, score: correct };
    saveState();
    modal.classList.remove('open');
    toast(`Placement complete! Your Math Trail starts at Grade ${grade}. 🧭`);
    onDone && onDone(grade);
  };

  render();
}

/* 3) Commit to the quest: pick a daily goal, then "Start my quest!". This is the
   autonomy beat that ends onboarding and ignites Day 1. */
function startQuestCommit(onDone) {
  const modal = document.getElementById('quest-modal');
  const grid = document.getElementById('quest-goals');
  const startBtn = document.getElementById('quest-start');
  let picked = null;
  modal.classList.add('open');
  startBtn.disabled = true;

  grid.innerHTML = '';
  DATA.questGoals.forEach(g => {
    const b = document.createElement('button');
    b.className = 'quest-goal';
    b.innerHTML = `<span class="qg-icon">${g.icon}</span><span class="qg-label">${g.label}</span><span class="qg-blurb">${g.blurb}</span>`;
    b.onclick = () => {
      picked = g.id;
      [...grid.children].forEach(c => c.classList.remove('sel'));
      b.classList.add('sel'); blip(720);
      startBtn.disabled = false;
    };
    grid.appendChild(b);
  });

  startBtn.onclick = () => {
    if (!picked) return;
    state.dailyGoal = picked;
    saveState();
    fanfare(); confetti();
    modal.classList.remove('open');
    onDone && onDone(picked);
  };
}

/* Runs the placement then the commit, then finishes the tutorial. Called from
   the world tutorial once the first lock is cracked. */
function runOnboardingCalibration() {
  const toCommit = () => startQuestCommit(() => { if (typeof finishTutorial === 'function') finishTutorial(); });
  // resume gracefully: skip placement if it was already done before a reload
  if (state.placement) { toCommit(); return; }
  startPlacement(() => setTimeout(toCommit, 500));
}
