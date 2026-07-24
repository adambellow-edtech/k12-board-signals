/* Breakout Land backend — API test suite. Boots the real server on a random
   port against an in-memory DB, seeds it, and exercises every route.
   Run: node --experimental-sqlite server/test.mjs */

import * as db from './db.js';
import { buildServer } from './server.js';
import { seed } from './seed.js';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error('  FAIL:', msg); } };

// in-memory DB, then seed
const seeded = seed(':memory:');
const server = buildServer().listen(0);
await new Promise(r => server.on('listening', r));
const base = `http://127.0.0.1:${server.address().port}`;
const api = async (method, path, { token, body } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
};

// health
ok((await api('GET', '/api/health')).json.ok === true, 'health returns ok');

// teacher login (local); should reuse the seeded teacher's class
const t = await api('POST', '/api/auth/teacher', { body: { name: 'Ms. Rivera', email: 'rivera@school.example' } });
ok(t.status === 200 && t.json.token, 'teacher login returns token');
ok(t.json.class && t.json.class.join_code, 'teacher login returns a class with a join code');
const teacherToken = t.json.token, classId = t.json.class.id, joinCode = t.json.class.join_code;

// roster is real (25 seeded students)
const r = await api('GET', `/api/classes/${classId}/roster`, { token: teacherToken });
ok(r.status === 200 && Array.isArray(r.json.roster), 'roster returns array');
ok(r.json.roster.length === 25, `roster has 25 students (got ${r.json.roster?.length})`);
ok(r.json.mastery && Object.keys(r.json.mastery).length >= 3, 'mastery covers >=3 standards');
ok(r.json.roster.every(s => 'successRate' in s && 'keys' in s), 'roster rows have real metrics');

// student joins via code, no account wall
const s = await api('POST', '/api/auth/student', { body: { classCode: joinCode, name: 'New Kid', avatar: { hero: 4 } } });
ok(s.status === 200 && s.json.token, 'student join returns token');
ok(s.json.class && s.json.class.id === classId, 'student joined the right class');
const studentToken = s.json.token, studentId = s.json.student.id;

// bad code rejected
ok((await api('POST', '/api/auth/student', { body: { classCode: 'ZZZZZ', name: 'x' } })).status === 404, 'bad class code rejected');

// save + load state round-trips
const state = { totalKeys: 42, xp: 120, streak: 3, badges: ['thinker'] };
ok((await api('PUT', `/api/students/${studentId}/state`, { token: studentToken, body: { state } })).status === 200, 'save state ok');
const loaded = await api('GET', `/api/students/${studentId}/state`, { token: studentToken });
ok(loaded.json.state && loaded.json.state.totalKeys === 42, 'load state round-trips');

// a student cannot write another student's state
const other = await api('POST', '/api/auth/student', { body: { classCode: joinCode, name: 'Other' } });
ok((await api('PUT', `/api/students/${studentId}/state`, { token: other.json.token, body: { state } })).status === 403, 'cross-student write forbidden');

// events ingest, then show up in roster + mastery
const events = [
  { type: 'session_start', role: 'student', ts: Date.now() },
  { type: 'lock_attempt', lockId: 'lk-div-1', lockType: 'number', standards: ['3.OA.A.3'], correct: false, attemptNo: 1, ts: Date.now() },
  { type: 'lock_attempt', lockId: 'lk-div-1', lockType: 'number', standards: ['3.OA.A.3'], correct: true, attemptNo: 2, ts: Date.now() },
  { type: 'lock_solved', lockId: 'lk-div-1', lockType: 'number', standards: ['3.OA.A.3'], attempts: 2, seconds: 40, ts: Date.now() },
];
const ing = await api('POST', '/api/events', { token: studentToken, body: { events } });
ok(ing.status === 200 && ing.json.accepted === 4, 'events ingested');
const r2 = await api('GET', `/api/classes/${classId}/roster`, { token: teacherToken });
const row = r2.json.roster.find(x => x.id === studentId);
ok(row && row.locksSolved === 1, 'new student solved-count reflects ingested event');
ok(r2.json.mastery['3.OA.A.3'] && r2.json.mastery['3.OA.A.3'].attempts >= 2, 'mastery aggregates ingested standard');

// teacher may read a student in their class; access control on class controls
ok((await api('GET', `/api/students/${studentId}/state`, { token: teacherToken })).status === 200, 'teacher can read own class student state');

// unauthorized paths
ok((await api('GET', '/api/me', {})).status === 401, 'no token -> 401');
ok((await api('POST', '/api/events', { token: teacherToken, body: { events: [] } })).status === 403, 'teacher token cannot post student events');

// access mode control (Always/school/Never)
const acc = await api('PUT', `/api/classes/${classId}/access`, { token: teacherToken, body: { mode: 'never' } });
ok(acc.status === 200 && acc.json.class.access_mode === 'never', 'teacher can set world access mode');

// ---- Class Breakout: live cooperative session + SSE ----
const boStart = await api('POST', `/api/classes/${classId}/breakout/start`, { token: teacherToken, body: { durationSec: 300, total: 5 } });
ok(boStart.status === 200 && boStart.json.sid, 'teacher starts a Class Breakout session');
const sid = boStart.json.sid;
ok((await api('POST', `/api/classes/${classId}/breakout/start`, { token: studentToken })).status === 403, 'student cannot start a breakout');

const boCurrent = await api('GET', `/api/classes/${classId}/breakout`, { token: studentToken });
ok(boCurrent.status === 200 && boCurrent.json.sid === sid, 'student can find the active session');

// open an SSE stream and confirm a student solve broadcasts live
const streamRes = await fetch(`${base}/api/breakout/${sid}/stream`);
const reader = streamRes.body.getReader();
const dec = new TextDecoder();
const first = dec.decode((await reader.read()).value);
ok(first.startsWith('data:') && first.includes('"solved":{}'), 'SSE sends the initial session state');

await api('POST', `/api/breakout/${sid}/solve`, { token: studentToken, body: { lockIndex: 2 } });
let update = '';
for (let i = 0; i < 5 && !update.includes('"2"'); i++) update += dec.decode((await reader.read()).value);
ok(update.includes('"2"'), 'a student solve broadcasts over SSE to subscribers');
ok((await api('POST', `/api/breakout/${sid}/solve`, { token: teacherToken, body: { lockIndex: 0 } })).status === 403, 'teacher token cannot post a solve');
try { await reader.cancel(); } catch (e) {}

// ---- SSO (demo mode, since no real client IDs in tests) ----
const ssoList = await api('GET', '/api/auth/sso/providers');
ok(ssoList.status === 200 && ssoList.json.providers.length === 3, 'lists Google, Clever, ClassLink');
ok(ssoList.json.providers.every(p => p.configured === false), 'providers report demo (unconfigured) in tests');
const gStart = await api('GET', '/api/auth/sso/google/start?role=teacher');
ok(gStart.status === 200 && gStart.json.demo === true && gStart.json.url.startsWith('demo://google'), 'google start returns a demo authorize url + state');
const gCb = await api('GET', `/api/auth/sso/google/callback?code=abc&state=${encodeURIComponent(gStart.json.state)}&json=1`);
ok(gCb.status === 200 && gCb.json.token, 'google demo callback issues a teacher token');
ok(gCb.json.teacher && gCb.json.class && gCb.json.class.join_code, 'google demo callback provisions a teacher + class');
const who = await api('GET', '/api/me', { token: gCb.json.token });
ok(who.status === 200 && who.json.user.role === 'teacher', 'SSO token authenticates as a teacher');
const cleverStart = await api('GET', '/api/auth/sso/clever/start');
ok(cleverStart.status === 200 && cleverStart.json.url.includes('clever'), 'clever start returns an authorize url');

server.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
