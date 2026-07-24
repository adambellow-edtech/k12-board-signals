/* Breakout Land backend — HTTP server + REST routes. Zero dependencies:
   node:http only. Run: node --experimental-sqlite server/server.js */

import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import * as db from './db.js';
import { issueToken, verifyToken, getProvider, ssoProviders, ssoConfigured, ssoAuthorizeUrl, ssoExchange } from './auth.js';

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

/* ---- SSO (Google / Clever / ClassLink) ---- */
route('GET', '/api/auth/sso/providers', async (req, res) => {
  send(res, 200, { providers: ssoProviders().map(p => ({ id: p, configured: ssoConfigured(p) })) });
});
route('GET', '/api/auth/sso/:provider/start', async (req, res, params) => {
  const url = new URL(req.url, 'http://x');
  const role = url.searchParams.get('role') || 'teacher';
  const redirectUri = url.searchParams.get('redirect_uri') || `${process.env.PUBLIC_URL || ''}/api/auth/sso/${params.provider}/callback`;
  const state = Buffer.from(JSON.stringify({ role, n: randomUUID().slice(0, 8) })).toString('base64url');
  const authUrl = ssoAuthorizeUrl(params.provider, { redirectUri, state });
  if (!authUrl) return send(res, 404, { error: 'unknown provider' });
  send(res, 200, { url: authUrl, demo: !ssoConfigured(params.provider), state });
});
route('GET', '/api/auth/sso/:provider/callback', async (req, res, params) => {
  const url = new URL(req.url, 'http://x');
  const code = url.searchParams.get('code') || '';
  const redirectUri = `${process.env.PUBLIC_URL || ''}/api/auth/sso/${params.provider}/callback`;
  let identity;
  try { identity = await ssoExchange(params.provider, { code, redirectUri }); }
  catch (e) { return send(res, 502, { error: 'sso exchange failed' }); }
  // SSO provisions staff accounts; students join with class codes
  let teacher = identity.email ? db.getTeacherByEmail(identity.email) : null;
  if (!teacher) teacher = db.createTeacher({ name: identity.name, email: identity.email, provider: params.provider });
  const existing = db._rawDb().prepare('SELECT * FROM classes WHERE teacher_id=? LIMIT 1').get(teacher.id);
  const cls = existing || db.createClass({ teacherId: teacher.id, name: 'My Class', grade: '3' });
  const token = issueToken({ uid: teacher.id, role: 'teacher', name: teacher.name });
  if (url.searchParams.get('json')) return send(res, 200, { token, teacher, class: cls, demo: !!identity.demo });
  res.writeHead(302, { location: `${process.env.APP_URL || '/'}#sso_token=${token}` }); res.end();
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

/* ---- Class Breakout: live cooperative sessions (in-memory + SSE) ---- */
const breakouts = {}; // sid -> { sid, classId, endsAt, total, solved:{}, subs:Set<res> }
function boState(s) { return { sid: s.sid, classId: s.classId, endsAt: s.endsAt, total: s.total, solved: s.solved }; }
function broadcastBreakout(sid) {
  const s = breakouts[sid]; if (!s) return;
  const payload = `data: ${JSON.stringify(boState(s))}\n\n`;
  for (const res of s.subs) { try { res.write(payload); } catch (e) {} }
}

route('POST', '/api/classes/:id/breakout/start', async (req, res, params) => {
  const claim = auth(req);
  if (!isClassTeacher(claim, params.id)) return send(res, 403, { error: 'forbidden' });
  const { durationSec = 300, total = 5 } = await readJson(req);
  const sid = 'bo_' + randomUUID().slice(0, 8);
  breakouts[sid] = { sid, classId: params.id, endsAt: Date.now() + durationSec * 1000, total, solved: {}, subs: new Set() };
  send(res, 200, boState(breakouts[sid]));
});

route('GET', '/api/classes/:id/breakout', async (req, res, params) => {
  const claim = auth(req);
  if (!claim) return send(res, 401, { error: 'unauthorized' });
  const s = Object.values(breakouts).find(b => b.classId === params.id && b.endsAt > Date.now());
  send(res, 200, s ? boState(s) : { session: null });
});

route('POST', '/api/breakout/:sid/solve', async (req, res, params) => {
  const claim = auth(req);
  if (!claim || claim.role !== 'student') return send(res, 403, { error: 'student token required' });
  const s = breakouts[params.sid];
  if (!s) return send(res, 404, { error: 'no session' });
  const { lockIndex } = await readJson(req);
  if (s.solved[lockIndex] === undefined) s.solved[lockIndex] = claim.name || 'A classmate';
  broadcastBreakout(params.sid);
  send(res, 200, { ok: true, solved: s.solved });
});

// Server-Sent Events: live session updates (sid acts as the capability token)
route('GET', '/api/breakout/:sid/stream', async (req, res, params) => {
  const s = breakouts[params.sid];
  if (!s) return send(res, 404, { error: 'no session' });
  res.writeHead(200, {
    'content-type': 'text/event-stream', 'cache-control': 'no-cache', 'connection': 'keep-alive',
    'access-control-allow-origin': '*',
  });
  res.write(`data: ${JSON.stringify(boState(s))}\n\n`);
  s.subs.add(res);
  req.on('close', () => s.subs.delete(res));
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
