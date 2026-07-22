/* Breakout Land — analytics event bus (Phase 0 foundation).
   Every later phase emits here. Events buffer to localStorage now; a `sink`
   seam lets them POST to a server later without changing a single call site. */

const ANALYTICS_KEY = 'breakoutLandEvents.v1';

// The event schema is defined up front (per the plan) so every phase can emit
// from day one. Value arrays document the expected props for each event.
const EVENT_SCHEMA = {
  session_start:      ['role'],
  lock_attempt:       ['lockId', 'lockType', 'standards', 'correct', 'attemptNo'],
  lock_solved:        ['lockId', 'lockType', 'standards', 'attempts', 'seconds'],
  hint_used:          ['lockId', 'level'],
  streak_extended:    ['streak'],
  time_thinking_ms:   ['ms', 'context'],
  time_navigating_ms: ['ms'],
};

const analytics = {
  buffer: [],
  sessionId: null,
  sink: null,          // later: (events) => fetch('/events', ...). Left null on device.
  MAX: 500,            // ring buffer cap so localStorage never bloats

  load() {
    try {
      const raw = localStorage.getItem(ANALYTICS_KEY);
      if (raw) this.buffer = JSON.parse(raw) || [];
    } catch (e) { this.buffer = []; }
  },
  persist() {
    try { localStorage.setItem(ANALYTICS_KEY, JSON.stringify(this.buffer.slice(-this.MAX))); } catch (e) {}
  },
  newSession() {
    this.sessionId = 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    return this.sessionId;
  },
  emit(type, props = {}) {
    if (!EVENT_SCHEMA[type]) console.warn('[analytics] unknown event type:', type);
    const evt = { type, ts: Date.now(), sessionId: this.sessionId, ...props };
    this.buffer.push(evt);
    if (this.buffer.length > this.MAX) this.buffer.shift();
    this.persist();
    if (typeof this.sink === 'function') { try { this.sink([evt]); } catch (e) {} }
    if (typeof onAnalyticsEvent === 'function') onAnalyticsEvent(evt); // dev overlay hook
    return evt;
  },
  recent(n = 25) { return this.buffer.slice(-n).reverse(); },
  clear() { this.buffer = []; this.persist(); },
};

// The one call every phase uses.
function track(type, props) { return analytics.emit(type, props); }
