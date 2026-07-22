/* Breakout Land — feature flags (Phase 0 foundation).
   New systems ship dark and roll out per class. Global defaults can be
   overridden per class id, so a pilot class can get a flag before the rest. */

const FLAGS_KEY = 'breakoutLandFlags.v1';

// Every new system gets a flag here, off by default, so it can ship dark.
const DEFAULT_FLAGS = {
  devEventLog:       false, // Phase 0: on-screen event-log overlay (backtick key)
  spacedRepetition:  false, // Phase 3
  adaptiveDifficulty:false, // Phase 3
  streakShields:     false, // Phase 5
  lockOfTheDayShare: false, // Phase 5
  classBreakoutLive: false, // Phase 6
  breakoutPadInput:  false, // Phase 6
};

const flags = {
  values: { ...DEFAULT_FLAGS },
  classOverrides: {},   // { classId: { flagName: bool } }
  activeClass: null,

  load() {
    try {
      const raw = localStorage.getItem(FLAGS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) || {};
        this.values = { ...DEFAULT_FLAGS, ...(saved.values || {}) };
        this.classOverrides = saved.classOverrides || {};
        this.activeClass = saved.activeClass || null;
      }
    } catch (e) { this.values = { ...DEFAULT_FLAGS }; }
  },
  save() {
    try {
      localStorage.setItem(FLAGS_KEY, JSON.stringify({
        values: this.values, classOverrides: this.classOverrides, activeClass: this.activeClass,
      }));
    } catch (e) {}
  },
  isOn(name, classId = this.activeClass) {
    const co = classId && this.classOverrides[classId];
    if (co && name in co) return !!co[name];
    return !!this.values[name];
  },
  set(name, val) { this.values[name] = !!val; this.save(); },
  setForClass(classId, name, val) {
    (this.classOverrides[classId] = this.classOverrides[classId] || {})[name] = !!val;
    this.save();
  },
  useClass(classId) { this.activeClass = classId; this.save(); },
};

function flagOn(name) { return flags.isOn(name); }
