# Breakout Land: Decision Log

Reasonable calls made during the rebuild, plus open questions that need the owner's answer. Newest first.

## Decisions made

### D4. Architecture: REAL BACKEND now. (Owner decision, 2026-07-22: "go to a real backend".)
Supersedes the earlier client-first default. Stand up an actual server with persistence, accounts, analytics ingestion, and real dashboard data.

**Stack: zero npm dependencies, Node built-ins only.** Node 22 ships `node:http` (server), `node:sqlite` (DatabaseSync, persistence), and `node:crypto` (token signing). This keeps the project's zero-dependency identity on the server too, avoids native compilation, and runs anywhere Node 22+ is installed.
- **DB:** SQLite for dev via `node:sqlite`. The repository layer (`server/db.js`) is the only code that touches SQL, so Postgres swaps in for production behind the same functions.
- **Auth:** stateless signed tokens (HMAC-SHA256) with a provider abstraction. A `local` provider works today; Google / Clever / ClassLink adapters implement the same `resolveIdentity()` interface later. No passwords stored.
- **Analytics:** the client event bus gains a `sink` that POSTs batches to `POST /api/events`; the server persists them for real dashboards and (later) spaced repetition.
- **Client stays offline-tolerant:** the static single-file artifact keeps working with localStorage when no API is configured. The API turns on when `window.BREAKOUT_API` is set, so the demo build is unaffected.
- **Hosting:** this container is ephemeral, so the server is built and tested here but deployed elsewhere. Production swaps the SQLite file for managed Postgres and sets real SSO client IDs.

### D5. Standards: framework-agnostic model, seeded with CCSS.
Locks gain an optional `standards: [code]` field. A `STANDARDS` map (`code -> { framework, grade, strand, label }`) is seeded with a small Common Core set now. TEKS or others can be added without schema changes. Satisfies the Phase 0 seed requirement of locks across at least 3 standards.

### D1. Phase 0 proceeds as pure inspection first.

### D1. Phase 0 proceeds as pure inspection first.
The audit (AUDIT.md) requires no assumptions, so it was produced immediately. The foundation pieces (event bus, feature flags, seed data) wait on Q1 because their shape depends on the architecture answer.

### D2. Copy style.
No em-dashes anywhere in generated copy or UI text. Commas, colons, periods instead. Active, student-centered voice. (Note: existing shipped code still contains em-dashes; those will be swept during the phase that touches each string, not in a risky global find-replace.)

### D3. Locks stay data-driven.
The existing `{ type, subject, clue, answer, hint }` lock shape is the backbone for standards tagging, adaptivity, and spaced repetition. Extend it (add standard codes, difficulty, archetype) rather than replacing the engine.
