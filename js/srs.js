/* Breakout Land — spaced-repetition engine (Phase 3, the learning moat).
   Each standard the student touches gets a memory card scheduled on an expanding
   ladder. Struggle resets it to soon; success pushes it further out; a card is
   only "mastered" after it survives the full ladder. The daily return (streak)
   is what makes the schedule actually fire. This runs on-device today and the
   same logic can run server-side later. */

const SR_LADDER = [1, 3, 7, 21, 45]; // days between reviews as a card strengthens

function srStartOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
function srCards() { return state.srCards || (state.srCards = {}); }

/* Record a review of a standard. quality: 'good' (first try), 'ok' (a couple
   tries), 'hard' (struggled). Returns the updated card. */
function srReview(code, quality) {
  if (!code) return null;
  const cards = srCards();
  let c = cards[code];
  if (!c) c = cards[code] = { reps: 0, lapses: 0, step: 0, interval: 0, dueMs: 0, lastMs: 0, mastered: false };
  c.lastMs = Date.now();
  if (quality === 'hard') {
    c.lapses++; c.step = 0; c.reps = 0; c.mastered = false;   // forgot it: bring it back soon
  } else {
    c.reps++; c.step = Math.min(SR_LADDER.length - 1, c.step + 1); // recalled: push it out
  }
  c.interval = SR_LADDER[c.step];
  c.dueMs = srStartOfToday() + c.interval * 86400000;
  if (c.step >= SR_LADDER.length - 1 && c.reps >= 4) c.mastered = true; // survived the ladder
  if (typeof saveState === 'function') saveState();
  return c;
}

// codes that are due for review today (not yet mastered)
function srDue() {
  const cards = srCards(), t = srStartOfToday();
  return Object.keys(cards).filter(code => !cards[code].mastered && cards[code].dueMs <= t);
}
function srDueCount() { return srDue().length; }

function srStatus(code) {
  const c = srCards()[code];
  if (!c) return 'new';
  if (c.mastered) return 'mastered';
  if (c.reps >= 2) return 'practicing';
  return 'learning';
}

// every standard the student has touched, with status, for the mastery view
function srSkills() {
  const cards = srCards(), t = srStartOfToday();
  return Object.keys(cards).map(code => ({
    code,
    status: srStatus(code),
    reps: cards[code].reps,
    lapses: cards[code].lapses,
    mastered: cards[code].mastered,
    due: !cards[code].mastered && cards[code].dueMs <= t,
    meta: (typeof DATA !== 'undefined' && DATA.standards && DATA.standards[code]) || {},
  })).sort((a, b) => (a.mastered - b.mastered) || (b.due - a.due));
}
function srMasteredCount() { return Object.values(srCards()).filter(c => c.mastered).length; }

// map a lock's attempt count to a review quality
function srQuality(attempts) { return attempts <= 1 ? 'good' : attempts <= 2 ? 'ok' : 'hard'; }

/* ---- adaptive difficulty: keep the student in their zone of proximal development ----
   A rolling ability estimate (a float grade) rises with fast first-try solves and
   falls when a concept is a struggle, so the Math Trail can stretch strong
   students and scaffold those who need it, without ever leaving their grade far
   behind. Seeded from the stealth placement. */
function adaptiveAbility() {
  if (typeof state.ability !== 'number') {
    state.ability = (state.placement && state.placement.grade) || state.mathGrade || 3;
  }
  return state.ability;
}
function adaptiveRecord(attempts, seconds) {
  let a = adaptiveAbility(), delta;
  if (attempts <= 1) delta = seconds <= 45 ? 0.09 : 0.05;   // recalled cleanly
  else if (attempts === 2) delta = 0.01;                    // got there
  else delta = -0.11;                                       // a real struggle
  a = Math.max(1, Math.min(5.9, a + delta));
  state.ability = a;
  if (typeof saveState === 'function') saveState();
  return a;
}
// pick the problem grade for a math node: near the chosen grade, nudged by ability
function adaptiveProblemGrade(anchor) {
  let g = Math.round(adaptiveAbility());
  g = Math.max(anchor - 1, Math.min(anchor + 1, g));
  g = Math.max(1, Math.min(5, g));
  return (typeof DATA !== 'undefined' && DATA.mathProblems[g]) ? g : anchor;
}
function adaptiveTier(anchor) {
  const g = adaptiveProblemGrade(anchor);
  return g > anchor ? 'stretch' : g < anchor ? 'support' : 'onlevel';
}
