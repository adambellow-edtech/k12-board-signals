/* Breakout Land backend — persistence layer (node:sqlite).
   This is the ONLY module that touches SQL. Swap SQLite for Postgres in
   production by reimplementing these functions against the same signatures. */

import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

let db;

export function openDb(file = new URL('./data/breakout.db', import.meta.url).pathname) {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  migrate();
  return db;
}

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE,
      provider TEXT NOT NULL DEFAULT 'local', created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY, teacher_id TEXT NOT NULL REFERENCES teachers(id),
      name TEXT NOT NULL, grade TEXT, join_code TEXT UNIQUE NOT NULL,
      access_mode TEXT NOT NULL DEFAULT 'school', created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY, class_id TEXT REFERENCES classes(id),
      name TEXT NOT NULL, avatar_json TEXT, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS progress (
      student_id TEXT PRIMARY KEY REFERENCES students(id),
      state_json TEXT NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id TEXT REFERENCES students(id),
      type TEXT NOT NULL, props_json TEXT, ts INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_student ON events(student_id, ts);
    CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
  `);
}

const now = () => Date.now();

/* ---- teachers ---- */
export function createTeacher({ name, email = null, provider = 'local' }) {
  const id = 't_' + randomUUID().slice(0, 8);
  db.prepare('INSERT INTO teachers(id,name,email,provider,created_at) VALUES(?,?,?,?,?)')
    .run(id, name, email, provider, now());
  return getTeacher(id);
}
export function getTeacher(id) { return db.prepare('SELECT * FROM teachers WHERE id=?').get(id); }
export function getTeacherByEmail(email) { return db.prepare('SELECT * FROM teachers WHERE email=?').get(email); }

/* ---- classes ---- */
export function createClass({ teacherId, name, grade = null, accessMode = 'school' }) {
  const id = 'c_' + randomUUID().slice(0, 8);
  const joinCode = makeJoinCode();
  db.prepare('INSERT INTO classes(id,teacher_id,name,grade,join_code,access_mode,created_at) VALUES(?,?,?,?,?,?,?)')
    .run(id, teacherId, name, grade, joinCode, accessMode, now());
  return getClass(id);
}
export function getClass(id) { return db.prepare('SELECT * FROM classes WHERE id=?').get(id); }
export function getClassByCode(code) { return db.prepare('SELECT * FROM classes WHERE join_code=?').get(code); }
export function setClassAccessMode(id, mode) {
  db.prepare('UPDATE classes SET access_mode=? WHERE id=?').run(mode, id);
  return getClass(id);
}
function makeJoinCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let code;
  do { code = Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join(''); }
  while (getClassByCode(code));
  return code;
}

/* ---- students ---- */
export function createStudent({ classId = null, name, avatar = null }) {
  const id = 's_' + randomUUID().slice(0, 8);
  db.prepare('INSERT INTO students(id,class_id,name,avatar_json,created_at) VALUES(?,?,?,?,?)')
    .run(id, classId, name, avatar ? JSON.stringify(avatar) : null, now());
  return getStudent(id);
}
export function getStudent(id) { return db.prepare('SELECT * FROM students WHERE id=?').get(id); }

/* ---- progress ---- */
export function saveProgress(studentId, state) {
  db.prepare(`INSERT INTO progress(student_id,state_json,updated_at) VALUES(?,?,?)
              ON CONFLICT(student_id) DO UPDATE SET state_json=excluded.state_json, updated_at=excluded.updated_at`)
    .run(studentId, JSON.stringify(state), now());
}
export function loadProgress(studentId) {
  const row = db.prepare('SELECT state_json,updated_at FROM progress WHERE student_id=?').get(studentId);
  return row ? { state: JSON.parse(row.state_json), updatedAt: row.updated_at } : null;
}

/* ---- events (analytics ingestion) ---- */
export function insertEvents(studentId, events) {
  const stmt = db.prepare('INSERT INTO events(student_id,type,props_json,ts) VALUES(?,?,?,?)');
  db.exec('BEGIN');
  try {
    for (const e of events) {
      const { type, ts, sessionId, ...props } = e;
      stmt.run(studentId, type, JSON.stringify({ sessionId, ...props }), ts || now());
    }
    db.exec('COMMIT');
  } catch (err) { db.exec('ROLLBACK'); throw err; }
  return events.length;
}

/* ---- roster (real teacher-dashboard data derived from progress + events) ---- */
export function classRoster(classId) {
  const students = db.prepare('SELECT id,name,avatar_json FROM students WHERE class_id=? ORDER BY name').all(classId);
  return students.map(s => {
    const prog = loadProgress(s.id);
    const state = prog ? prog.state : null;
    const last = db.prepare('SELECT MAX(ts) AS t FROM events WHERE student_id=?').get(s.id);
    const solved = db.prepare("SELECT COUNT(*) AS n FROM events WHERE student_id=? AND type='lock_solved'").get(s.id);
    const attempts = db.prepare("SELECT COUNT(*) AS n FROM events WHERE student_id=? AND type='lock_attempt'").get(s.id);
    const correct = db.prepare("SELECT COUNT(*) AS n FROM events WHERE student_id=? AND type='lock_attempt' AND json_extract(props_json,'$.correct')=1").get(s.id);
    // spaced-repetition + adaptive signals, derived from the student's saved state
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const cards = (state && state.srCards) || {};
    let mastered = 0, dueReviews = 0;
    for (const code in cards) {
      const c = cards[code];
      if (c.mastered) mastered++;
      else if (c.dueMs && c.dueMs <= startOfToday.getTime()) dueReviews++;
    }
    return {
      id: s.id, name: s.name,
      keys: state?.totalKeys ?? 0,
      xp: state?.xp ?? 0,
      streak: state?.streak ?? 0,
      locksSolved: solved.n,
      successRate: attempts.n ? correct.n / attempts.n : null,
      lastActive: last.t || null,
      mastered,
      dueReviews,
      ability: (state && typeof state.ability === 'number') ? state.ability : null,
    };
  });
}

/* per-standard mastery signal across a class, derived honestly from events */
export function classStandardMastery(classId) {
  const rows = db.prepare(`
    SELECT json_extract(e.props_json,'$.standards') AS stds,
           e.type AS type,
           json_extract(e.props_json,'$.correct') AS correct
    FROM events e JOIN students s ON s.id=e.student_id
    WHERE s.class_id=? AND e.type IN ('lock_attempt','lock_solved')
  `).all(classId);
  const agg = {};
  for (const r of rows) {
    let stds = [];
    try { stds = JSON.parse(r.stds) || []; } catch {}
    for (const code of stds) {
      const a = agg[code] || (agg[code] = { attempts: 0, correct: 0, solved: 0 });
      if (r.type === 'lock_attempt') { a.attempts++; if (r.correct) a.correct++; }
      if (r.type === 'lock_solved') a.solved++;
    }
  }
  return agg;
}

export function _rawDb() { return db; }
