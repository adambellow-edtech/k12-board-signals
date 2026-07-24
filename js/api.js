/* Breakout Land — client API adapter (backend seam).
   No-op unless window.BREAKOUT_API is set, so the offline single-file build is
   completely unaffected. When configured, it joins the student, persists world
   state, and streams analytics events to the backend. */

const api = {
  base: null,
  token: null,
  studentId: null,
  _queue: [],
  _saveTimer: null,

  init() {
    this.base = (typeof window !== 'undefined' && window.BREAKOUT_API) || null;
    try {
      this.token = localStorage.getItem('breakoutLandToken');
      this.studentId = localStorage.getItem('breakoutLandStudentId');
    } catch (e) {}
    if (this.base) setInterval(() => this.flush(), 5000);
    return !!this.base;
  },
  enabled() { return !!this.base; },

  async _req(method, path, body, token = this.token) {
    const res = await fetch(this.base + path, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, json: await res.json().catch(() => null) };
  },

  // Teacher session (kept separate from the student token).
  teacherToken: null,
  teacherClass: null,
  async loginTeacher(name, className, email) {
    if (!this.base) return null;
    const r = await this._req('POST', '/api/auth/teacher', { name, className, email }, null);
    if (r.status === 200 && r.json.token) {
      this.teacherToken = r.json.token; this.teacherClass = r.json.class;
      return r.json;
    }
    return null;
  },
  async fetchRoster() {
    if (!this.base || !this.teacherClass) return null;
    const r = await this._req('GET', `/api/classes/${this.teacherClass.id}/roster`, null, this.teacherToken);
    return r.status === 200 ? r.json : null;
  },

  // Class Breakout live sessions (best-effort; the offline demo simulates locally).
  _boSid: null,
  async startBreakout(durationSec) {
    if (!this.base || !this.teacherToken || !this.teacherClass) return null;
    const r = await this._req('POST', `/api/classes/${this.teacherClass.id}/breakout/start`, { durationSec }, this.teacherToken);
    if (r.status === 200) this._boSid = r.json.sid;
    return r.json;
  },
  solveBreakout(lockIndex) {
    if (!this.base || !this.token || !this._boSid) return;
    this._req('POST', `/api/breakout/${this._boSid}/solve`, { lockIndex }, this.token).catch(() => {});
  },

  // Deferred signup: the student plays first, then we save what they built.
  async joinAsStudent(name, avatar, classCode) {
    if (!this.base) return null;
    const r = await this._req('POST', '/api/auth/student', { name, avatar, classCode });
    if (r.status === 200 && r.json.token) {
      this.token = r.json.token; this.studentId = r.json.student.id;
      try {
        localStorage.setItem('breakoutLandToken', this.token);
        localStorage.setItem('breakoutLandStudentId', this.studentId);
      } catch (e) {}
      return r.json;
    }
    return null;
  },

  // Persist world state (debounced so rapid grants coalesce into one write).
  saveState(state) {
    if (!this.base || !this.token) return;
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      this._req('PUT', `/api/students/${this.studentId}/state`, { state }).catch(() => {});
    }, 800);
  },
  async loadState() {
    if (!this.base || !this.token) return null;
    const r = await this._req('GET', `/api/students/${this.studentId}/state`).catch(() => null);
    return r && r.status === 200 ? r.json.state : null;
  },

  // Analytics sink: queue events, flush in batches.
  push(events) { if (this.base && this.token) this._queue.push(...events); },
  flush() {
    if (!this.base || !this.token || !this._queue.length) return;
    const batch = this._queue.splice(0, this._queue.length);
    this._req('POST', '/api/events', { events: batch }).catch(() => { this._queue.unshift(...batch); });
  },
};
