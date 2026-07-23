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
