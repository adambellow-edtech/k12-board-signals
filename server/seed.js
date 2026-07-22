/* Breakout Land backend — seed data (Phase 0 acceptance: 1 teacher, 1 class,
   25 students, sample locks across >=3 standards). Run:
   node --experimental-sqlite server/seed.js */

import * as db from './db.js';
import { insertEvents } from './db.js';

const FIRST = ['Ava', 'Liam', 'Mia', 'Noah', 'Zoe', 'Kai', 'Ivy', 'Leo', 'Emma', 'Ezra',
  'Nora', 'Owen', 'Luna', 'Milo', 'Aria', 'Finn', 'Ruby', 'Jude', 'Ellie', 'Cruz',
  'Wren', 'Beau', 'Sage', 'Rey', 'Juniper'];

// Sample locks tagged across standards (mirrors the client content model).
export const SEED_LOCKS = [
  { id: 'lk-mult-1', type: 'number', standards: ['3.OA.A.1'], clue: '6 rods x 4 fish each. How many fish?', answer: '24' },
  { id: 'lk-div-1', type: 'number', standards: ['3.OA.A.3'], clue: '24 cookies shared by 3, then each eats 2. How many left each?', answer: '6' },
  { id: 'lk-time-1', type: 'number', standards: ['3.MD.A.1'], clue: 'Minutes from 3:15 to 4:00?', answer: '45' },
  { id: 'lk-frac-1', type: 'word', standards: ['4.NF.A.1'], clue: 'Equivalent to 1/2 with denominator 8?', answer: '4/8' },
  { id: 'lk-place-1', type: 'number', standards: ['2.NBT.A.1'], clue: 'Tens digit double the ones, digits sum to 9.', answer: '63' },
];

export function seed(dbFile) {
  db.openDb(dbFile);
  const teacher = db.createTeacher({ name: 'Ms. Rivera', email: 'rivera@school.example', provider: 'local' });
  const cls = db.createClass({ teacherId: teacher.id, name: 'Room 12', grade: '3', accessMode: 'school' });

  const students = FIRST.map((name, i) => {
    const s = db.createStudent({ classId: cls.id, name, avatar: { hero: i % 12 } });
    // give each student some realistic state + a few events so the roster is real
    const solved = Math.floor(Math.random() * 8);
    db.saveProgress(s.id, {
      totalKeys: 10 + solved * 12, xp: solved * 30, streak: Math.floor(Math.random() * 6),
      mathStars: {}, badges: [],
    });
    const evs = [];
    for (let k = 0; k < solved; k++) {
      const lk = SEED_LOCKS[Math.floor(Math.random() * SEED_LOCKS.length)];
      const tries = 1 + Math.floor(Math.random() * 3);
      for (let a = 0; a < tries; a++) {
        evs.push({ type: 'lock_attempt', lockId: lk.id, lockType: lk.type, standards: lk.standards, correct: a === tries - 1, attemptNo: a + 1, ts: Date.now() - Math.random() * 6e8 });
      }
      evs.push({ type: 'lock_solved', lockId: lk.id, lockType: lk.type, standards: lk.standards, attempts: tries, seconds: 30 + Math.floor(Math.random() * 120), ts: Date.now() - Math.random() * 6e8 });
    }
    if (evs.length) insertEvents(s.id, evs);
    return s;
  });

  return { teacher, class: cls, students, joinCode: cls.join_code };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = seed(process.env.BREAKOUT_DB || undefined);
  console.log(`Seeded: teacher ${out.teacher.id}, class ${out.class.id} (join ${out.joinCode}), ${out.students.length} students`);
}
