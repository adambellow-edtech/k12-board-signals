/* Breakout Land backend — HTTP server + REST routes. Zero dependencies:
   node:http only. Run: node --experimental-sqlite server/server.js */

import { createServer } from 'node:http';
import * as db from './db.js';
import { issueToken, verifyToken, getProvider } from './auth.js';

const PORT = process.env.PORT || 4000;

/* ---- tiny helpers ---- */
const send = (res, status, body) => {
  const data = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization,content-type',
    'access-control-allow-methods': 'GET,PUT,POST,OPTIONS',
  });
  res.end(data);
};
const readJson = (req) => new Promise((resolve) => {
  let s = '';
  req.on('data', c => { s += c; if (s.length > 2e6) req.destroy(); });
  req.on('end', () => { try { resolve(s ? JSON.parse(s) : {}); } catch { resolve({}); } });
});
const auth = (req) => verifyToken((req.headers.authorization || '').replace(/^Bearer\s+/i, ''));

/* ---- routes ---- */
const routes = [];
const route = (method, pattern, handler) => routes.push({ method, pattern, handler });
const match = (pattern, path) => {
  const pp = pattern.split('/'), sp = path.split('/');
  if (pp.length !== sp.length) return null;
  const params = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) params[pp[i].slice(1)] = decodeURIComponent(sp[i]);
    else if (pp[i] !== sp[i]) return null;
  }
  return params;
};

route('GET', '/api/health', async (req, res) => send(res, 200, { ok: true, ts: Date.now() }));

// Teacher signs in (local or, later, SSO). Auto-provisions a first class.
route('POST', '/api/auth/teacher', async (req, res) => {
  const { provider = 'local', name, email = null, className = 'My Class', grade = '3' } = await readJson(req);
  const prov = getProvider(provider);
  if (!prov || !name) return send(res, 400, { error: 'name and valid provider required' });
  const id = await prov.resolveIdentity({ name, email });
  let teacher = id.email ? db.getTeacherByEmail(id.email) : null;
  if (!teacher) teacher = db.createTeacher({ name: id.name, email: id.email, provider });
  const existing = db._rawDb().prepare('SELECT * FROM classes WHERE teacher_id=? LIMIT 1').get(teacher.id);
  const cls = existing || db.createClass({ teacherId: teacher.id, name: className, grade });
  const token = issueToken({ uid: teacher.id, role: 'teacher', name: teacher.name });
  send(res, 200, { token, teacher, class: cls });
});

// Student joins with a class code (no account wall; deferred-signup friendly).
route('POST', '/api/auth/student', async (req, res) => {
  const { classCode, name, avatar = null } = await readJson(req);
  if (!name) return send(res, 400, { error: 'name required' });
  const cls = classCode ? db.getClassByCode(String(classCode).toUpperCase()) : null;
  if (classCode && !cls) return send(res, 404, { error: 'class code not found' });
  const student = db.createStudent({ classId: cls ? cls.id : null, name, avatar });
  const token = issueToken({ uid: student.id, role: 'student', cls: student.class_id, name });
  send(res, 200, { token, student, class: cls || null });
});

route('GET', '/api/me', async (req, res) => {
  const claim = auth(req);
  if (!claim) return send(res, 401, { error: 'unauthorized' });
  send(res, 200, { user: claim });
});

// Load / save a student's world state. Student owns theirs; their teacher may read.
route('GET', '/api/students/:id/state', async (req, res, params) => {
  const claim = auth(req);
  if (!claim) return send(res, 401, { error: 'unauthorized' });
  if (!canAccessStudent(claim, params.id)) return send(res, 403, { error: 'forbidden' });
  const prog = db.loadProgress(params.id);
  send(res, 200, { state: prog ? prog.state : null, updatedAt: prog ? prog.updatedAt : null });
});
route('PUT', '/api/students/:id/state', async (req, res, params) => {
  const claim = auth(req);
  if (!claim || claim.uid !== params.id) return send(res, 403, { error: 'forbidden' });
  const { state } = await readJson(req);
  if (!state || typeof state !== 'object') return send(res, 400, { error: 'state object required' });
  db.saveProgress(params.id, state);
  send(res, 200, { ok: true });
});

// Analytics ingestion for the calling student.
route('POST', '/api/events', async (req, res) => {
  const claim = auth(req);
  if (!claim || claim.role !== 'student') return send(res, 403, { error: 'student token required' });
  const { events } = await readJson(req);
  if (!Array.isArray(events)) return send(res, 400, { error: 'events array required' });
  const n = db.insertEvents(claim.uid, events);
  send(res, 200, { accepted: n });
});

// Real teacher-dashboard data.
route('GET', '/api/classes/:id/roster', async (req, res, params) => {
  const claim = auth(req);
  if (!isClassTeacher(claim, params.id)) return send(res, 403, { error: 'forbidden' });
  send(res, 200, { roster: db.classRoster(params.id), mastery: db.classStandardMastery(params.id) });
});
route('PUT', '/api/classes/:id/access', async (req, res, params) => {
  const claim = auth(req);
  if (!isClassTeacher(claim, params.id)) return send(res, 403, { error: 'forbidden' });
  const { mode } = await readJson(req);
  if (!['always', 'school', 'never'].includes(mode)) return send(res, 400, { error: 'mode must be always|school|never' });
  send(res, 200, { class: db.setClassAccessMode(params.id, mode) });
});

/* ---- authorization helpers ---- */
function isClassTeacher(claim, classId) {
  if (!claim || claim.role !== 'teacher') return false;
  const cls = db.getClass(classId);
  return cls && cls.teacher_id === claim.uid;
}
function canAccessStudent(claim, studentId) {
  if (!claim) return false;
  if (claim.role === 'student') return claim.uid === studentId;
  if (claim.role === 'teacher') {
    const s = db.getStudent(studentId);
    return s && s.class_id && isClassTeacher(claim, s.class_id);
  }
  return false;
}

/* ---- boot ---- */
export function buildServer() {
  return createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return send(res, 204);
    const path = req.url.split('?')[0];
    for (const r of routes) {
      if (r.method !== req.method) continue;
      const params = match(r.pattern, path);
      if (params) { try { return await r.handler(req, res, params); } catch (e) { return send(res, 500, { error: String(e && e.message || e) }); } }
    }
    send(res, 404, { error: 'not found' });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  db.openDb(process.env.BREAKOUT_DB || undefined);
  buildServer().listen(PORT, () => console.log(`Breakout Land API on :${PORT}`));
}
