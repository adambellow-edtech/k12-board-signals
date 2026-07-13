/* Breakout Land — game state, economy, persistence */

const SAVE_KEY = 'breakoutLandSave.v1';

const defaultState = () => ({
  created: false,
  player: {
    name: '',
    skin: DATA.skins[1],
    hairStyle: 'puff',
    hairColor: DATA.hairColors[0],
    outfit: 'tee-teal',
    accessory: 'none',
    pet: 'nopet',
  },
  keys: 15,
  totalKeys: 15,
  xp: 0,
  arcadeMin: 5,
  streak: 0,
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
});

let state = defaultState();

function saveState() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
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

function completeDaily() {
  const today = todayKey();
  if (state.lastDaily === today) return;
  const y = new Date(Date.now() - 86400000);
  const yKey = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
  state.streak = (state.lastDaily === yKey) ? state.streak + 1 : 1;
  state.lastDaily = today;
  grant({ keys: 10, xp: 25, arcade: 5 });
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
