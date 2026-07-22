# Breakout Land: Decision Log

Reasonable calls made during the rebuild, plus open questions that need the owner's answer. Newest first.

## Decisions made

### D4. Architecture: client-first, backend-ready. (Owner deferred the choice; reasonable-call default.)
Build the learning value for real in the client now, behind thin persistence and service abstractions, so a real backend can slot in later without a rewrite. Rationale: it keeps the zero-dependency strength, ships real mechanics fast, and matches the plan's "extend, do not rip out" rule. What this means per capability:
- Accounts/SSO: a `Session` service with a `local` provider today (role switch + device profile). Google/Clever/ClassLink providers implement the same interface later.
- Analytics: a real client event bus now, buffering to localStorage, with a `sink` seam so events can POST to a server later.
- Spaced repetition: works per-device today off the persisted store; the same scheduler runs server-side later.
- Teacher dashboard: continues on seed data, but reads through a `roster` service so a live source can replace the seed.
Revisit if the owner later wants real cross-device accounts, which is the trigger to add a backend.

### D5. Standards: framework-agnostic model, seeded with CCSS.
Locks gain an optional `standards: [code]` field. A `STANDARDS` map (`code -> { framework, grade, strand, label }`) is seeded with a small Common Core set now. TEKS or others can be added without schema changes. Satisfies the Phase 0 seed requirement of locks across at least 3 standards.

### D1. Phase 0 proceeds as pure inspection first.

### D1. Phase 0 proceeds as pure inspection first.
The audit (AUDIT.md) requires no assumptions, so it was produced immediately. The foundation pieces (event bus, feature flags, seed data) wait on Q1 because their shape depends on the architecture answer.

### D2. Copy style.
No em-dashes anywhere in generated copy or UI text. Commas, colons, periods instead. Active, student-centered voice. (Note: existing shipped code still contains em-dashes; those will be swept during the phase that touches each string, not in a risky global find-replace.)

### D3. Locks stay data-driven.
The existing `{ type, subject, clue, answer, hint }` lock shape is the backbone for standards tagging, adaptivity, and spaced repetition. Extend it (add standard codes, difficulty, archetype) rather than replacing the engine.
