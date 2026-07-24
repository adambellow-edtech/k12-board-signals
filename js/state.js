/* Breakout Land — game state, economy, persistence */

const SAVE_KEY = 'breakoutLandSave.v2';

const defaultState = () => ({
  created: false,
  player: {
    name: '',
    hero: 4,
    accessory: 'none',
    pet: 'nopet',
    trail: 'no-trail',
  },
  keys: 15,
  totalKeys: 15,
  xp: 0,
  arcadeMin: 5,
  streak: 0,
  shields: 0,               // streak shields: auto-spent to cover a missed day (cap 3)
  lastDaily: null,          // date string of last Lock of the Day completion
  unlocked: [],             // purchased item ids
  badges: [],
  gamesDone: {},            // gameId -> { minutes, attempts }
  mathStars: {},            // nodeKey (grade:index) -> stars
  mathAttempts: {},         // nodeKey -> attempts on current/last run
  mathGrade: 3,
  assigned: ['missing-mascot', 'space-escape'],
  perms: { teacherArcade: true, parentArcade: true, weeklyLimitMin: 120 },
  plus: true,               // teacher has Breakout+ (toggle in teacher view)
  pos: { x: 990, y: 648 },  // avatar position in world (just south of Lock Plaza)
  sparkleKeys: {},          // dateKey -> [collected star indexes] for the day
  npcQuests: {},            // dateKey -> [completed npc names] for the day
  legendaryKeys: [],        // ids of the Five Keys of Knowledge earned
  tutorialStep: 0,          // 0=not started, 1..4 in progress, 5=done
  dailyGoal: null,          // locks-per-day goal the student commits to in onboarding
  placement: null,          // { grade, score } from the stealth placement expedition
  srCards: {},              // spaced-repetition memory cards, keyed by standard code
  srNudged: null,           // date we last nudged about due reviews
  ability: null,            // rolling ability estimate (float grade) for adaptive difficulty
  lastDailyResult: null,    // {dateKey, seconds, tries, streak, subject, milestone} for the share card
});

let state = defaultState();

function saveState() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  if (typeof api !== 'undefined' && api.enabled && api.enabled()) api.saveState(state);
}
function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) state = Object.assign(defaultState(), JSON.parse(raw));
  } catch (e) { state = defaultState(); }
}
function resetState() {
  state = defaultState();
  saveState();
}

/* ---- economy ---- */

const LEVELS = ['Rookie Solver', 'Clue Finder', 'Puzzle Pal', 'Code Cracker', 'Lock Whisperer',
  'Escape Artist', 'Puzzle Pro', 'Master of Locks', 'Breakout Legend'];

function levelInfo() {
  const lvl = Math.min(LEVELS.length, Math.floor(state.xp / 100) + 1);
  return { n: lvl, name: LEVELS[lvl - 1], into: state.xp % 100, next: 100 };
}

function grant({ keys = 0, xp = 0, arcade = 0 }) {
  state.keys += keys;
  state.totalKeys += Math.max(0, keys);
  state.xp += xp;
  if (state.perms.teacherArcade && state.perms.parentArcade) state.arcadeMin += arcade;
  checkBadges();
  saveState();
  updateHUD();
}

function awardBadge(id) {
  if (state.badges.includes(id)) return false;
  state.badges.push(id);
  const b = DATA.badges.find(b => b.id === id);
  toast(`🏅 Badge earned: ${b ? b.name : id}!`);
  saveState();
  return true;
}

function checkBadges() {
  if (state.totalKeys >= 50) awardBadge('key-50');
  if (Object.keys(state.gamesDone).length >= 1) awardBadge('first-breakout');
  if (state.streak >= 3) awardBadge('daily-3');
  const mathDone = Object.keys(state.mathStars).length;
  if (mathDone >= 3) awardBadge('mathlete');
  if (state.unlocked.length >= 1) awardBadge('stylist');
  if (sparkleKeysToday().length >= 5) awardBadge('star-seeker');
  if (npcQuestsToday().length >= DATA.npcQuests.length) awardBadge('quest-hero');
  if (state.unlocked.length >= 1 && state.badges.length >= 3) awardLegendaryKey('creativity');
}

/* ---- sparkle keys (daily hidden collectibles) ---- */

function sparkleKeysToday() {
  return state.sparkleKeys[todayKey()] || [];
}
function sparkleKeyFound(idx) {
  return sparkleKeysToday().includes(idx);
}
function collectSparkleKey(idx) {
  const today = todayKey();
  const list = state.sparkleKeys[today] || (state.sparkleKeys[today] = []);
  if (list.includes(idx)) return false;
  list.push(idx);
  grant({ keys: 12, xp: 15 });
  if (list.length >= 5) awardLegendaryKey('explore');
  saveState();
  return true;
}

/* ---- NPC daily side quests ---- */

function npcQuestsToday() {
  return state.npcQuests[todayKey()] || [];
}
function npcQuestDone(name) {
  return npcQuestsToday().includes(name);
}
function completeNpcQuest(name, reward) {
  const today = todayKey();
  const list = state.npcQuests[today] || (state.npcQuests[today] = []);
  if (list.includes(name)) return false;
  list.push(name);
  grant(reward || { keys: 8, xp: 20, arcade: 3 });
  if (list.length >= DATA.npcQuests.length) awardLegendaryKey('words');
  saveState();
  return true;
}

/* ---- Five Keys of Knowledge (legendary milestone keys) ---- */

function hasLegendaryKey(id) {
  return state.legendaryKeys.includes(id);
}
function awardLegendaryKey(id) {
  if (state.legendaryKeys.includes(id)) return false;
  state.legendaryKeys.push(id);
  saveState();
  if (typeof updateHUD === 'function') updateHUD();
  if (typeof showLegendaryKeyMoment === 'function') showLegendaryKeyMoment(id);
  return true;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function dailyLock() {
  // rotate through the pool by day-of-year
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 0);
  const day = Math.floor((d - start) / 86400000);
  return DATA.dailyLocks[day % DATA.dailyLocks.length];
}

/* ---- streak + humane streak shields ---- */
function parseDayKey(k) { const [y, m, d] = String(k).split('-').map(Number); return new Date(y, m - 1, d).getTime(); }
function daysSinceDaily() { return state.lastDaily ? Math.round((parseDayKey(todayKey()) - parseDayKey(state.lastDaily)) / 86400000) : null; }
// What the streak will be after today's completion (accounting for shields).
function projectStreak() {
  const gap = daysSinceDaily();
  if (gap === null) return 1;               // first ever
  if (gap <= 0) return state.streak;        // already done today
  if (gap === 1) return state.streak + 1;   // consecutive day
  return (state.shields || 0) >= (gap - 1) ? state.streak + 1 : 1; // shields can save it
}

function completeDaily() {
  const today = todayKey();
  if (state.lastDaily === today) return;
  const gap = daysSinceDaily();
  let shieldSaved = 0;
  if (gap === null || gap === 1) {
    state.streak = gap === 1 ? state.streak + 1 : 1;   // consecutive, or first ever
  } else {
    const missed = gap - 1;                            // days skipped
    if ((state.shields || 0) >= missed) {
      state.shields -= missed; shieldSaved = missed;   // shields cover the gap
      state.streak = state.streak + 1;
    } else {
      state.streak = 1;                                // not enough shields → reset
    }
  }
  state.lastDaily = today;
  // earn a shield at every 5th day, capped so it stays a safety net not a crutch
  let shieldEarned = false;
  if (state.streak > 0 && state.streak % 5 === 0 && (state.shields || 0) < 3) {
    state.shields = (state.shields || 0) + 1; shieldEarned = true;
  }
  if (typeof track === 'function') track('streak_extended', { streak: state.streak });
  grant({ keys: 10, xp: 25, arcade: 5 });
  if (shieldSaved) toast(`🛡️ Streak Shield saved your streak! Now ${state.streak} days 🔥`);
  else if (shieldEarned) toast('🛡️ You earned a Streak Shield! It protects your streak if you miss a day.');
}

function arcadeAllowed() {
  return state.perms.teacherArcade && state.perms.parentArcade;
}

function itemOwned(item) {
  return item.free || state.unlocked.includes(item.id);
}

function buyItem(item) {
  if (itemOwned(item)) return true;
  if (state.keys < item.price) return false;
  state.keys -= item.price;
  state.unlocked.push(item.id);
  checkBadges();
  saveState();
  updateHUD();
  return true;
}
