# Breakout Land: Repo Audit (Phase 0)

Date: 2026-07-22. Author: Claude Code. Scope: current state of the repo against the Product Overhaul Plan.

## 1. Stack

- **Client only.** Zero-dependency, hand-written vanilla JavaScript. No framework (no React/Vue/Svelte), no bundler, no TypeScript.
- **Rendering.** HTML5 Canvas for the walkable world and minigames. DOM + CSS for menus, modals, dashboards.
- **Styling.** One stylesheet (`css/styles.css`, ~635 lines) built on CSS custom properties. Brand tokens for the Breakout EDU palette already exist.
- **Build.** A single Node script (`scripts/build-artifact.mjs`) inlines all JS/CSS/assets into one `dist/breakout-land.html` (~1.7 MB). There is **no `package.json`**, no dependency lockfile, no CI.
- **Tests.** No committed test suite. Playwright smoke scripts have been run ad hoc from a scratchpad, not tracked in the repo.
- **Hosting.** Runs as a static file. Also published as a Claude artifact.

## 2. Folder structure

```
index.html            entry; screens + modals markup
css/styles.css        full design system + all component styles
js/data.js            ALL content (mock): locks, games, math, badges, roster, cosmetics
js/state.js           game state, economy, persistence, badge/quest logic
js/puzzles.js         lock engine, entry pads, celebration, sound, toast, confetti
js/avatar.js          sprite renderer, avatar creator, pets, portraits
js/world.js           walkable island, NPCs, sparkle keys, tutorial, camera
js/screens.js         building interiors, math map, teacher & parent dashboards, HUD, arcade
js/main.js            boot + title wiring
scripts/build-artifact.mjs   single-file build
assets/*              AI-painted world map, title, desk, trail, hero sprite sheet, logo
docs/                 consolidated source export
dist/                 single-file build output
```

## 3. Existing game loop

Cold open (title) -> pick role -> (student) avatar creator -> walkable canvas world -> approach a building or NPC or sparkle key -> open a lock puzzle -> solve -> celebration -> earn Keys/XP/arcade minutes/badges -> HUD updates -> repeat. A guided owl tutorial now walks first-timers to their first solve. Breakout Math has a node-trail map with core/review/challenge/boss nodes.

## 4. Data model

All content is a single in-memory `DATA` object literal in `js/data.js`. Keys: `heroes, trails, accessories, pets, badges, legendaryKeys, dailyLocks, npcQuests, memoryDecks, games, plusGames, mathUnits, mathProblems, mathTrail, roster, comparisons, chartColors, parentWeek`.

- **Locks are semi-data already.** A lock is `{ type, subject, clue, answer, hint }` where `type` is one of `number | word | color | direction | shape | switch`. The engine renders a pad per type and checks the answer. This is the single most reusable asset for the plan: locks are close to the "locks are data" target in section 14.
- **Runtime state** is a flat object persisted to `localStorage` under `breakoutLandSave.v2`, loaded via `Object.assign(defaultState(), saved)` so new keys migrate safely.

## 5. Auth / account provisioning

- **There is none.** "Student", "Teacher", "Parent" are three buttons on the title screen that switch client-side screens. No login, no identity, no server session.
- All progress lives in the browser's `localStorage` on one device. Clearing storage or switching devices loses everything.
- The teacher dashboard roster is **mock data** (`DATA.roster`) with the live player appended as "You". No real students feed it.

## 6. Teacher dashboard

Exists as a static, good-looking screen: roster table, a class-vs-school-vs-global comparison chart, an assign-games panel, and a Breakout+ toggle. It reads mock data and toggles `state.perms`. It is a convincing **prototype of** the dashboard the plan wants, not a functioning one.

## 7. Third-party dependencies

**None in the shipped client.** No runtime libraries at all. Dev-time: Node (for the build script) and Playwright (ad hoc, uncommitted). This is a genuine strength: nothing to security-review in the client, tiny footprint, runs on any static host.

## 8. Gap analysis against the plan

| Plan needs | Today | Gap size |
|---|---|---|
| Locks as data, multiple types | Yes (6 types) | Small: extend/retag |
| Keys economy, no skip path | Yes | Small |
| Streaks, Lock of the Day | Yes (streak, LotD) | Small: add shields/grace |
| Stealth placement / adaptivity | Partial (one attempt-based unlock rule) | Medium |
| Standards tagging (TEKS/CCSS) | Subject strings only, no codes | Medium |
| Event bus / analytics | None | Medium (client), Large (persisted) |
| Feature flags | None | Small (client) |
| Spaced repetition across days | None | Medium logic, **needs cross-session persistence** |
| Real teacher dashboard data | Mock only | **Large: needs backend** |
| Deferred signup / accounts | No accounts at all | **Large: needs backend + auth** |
| SSO (Google/Clever/ClassLink) | None | **Large: needs backend** |
| Class vs Home split, live mode | None | **Large: needs backend + realtime** |
| Breakout Pad (NFC) input | None | Large: hardware/WebUSB/WebNFC |
| COPPA/FERPA privacy posture | N/A (no data leaves device) | Depends on architecture chosen |

## 9. The one blocker that shapes everything

**This is a client-only prototype with no backend, no database, and no authentication.** Roughly the back half of the plan (real dashboard data, deferred signup, SSO, cross-day spaced repetition, class/home split, live multiplayer, procurement-grade privacy) cannot exist without server-side infrastructure that is not here today.

The plan reads as though it is evolving an established full-stack product. In reality the strong, shippable parts are the *client experience and the learning-game mechanics*; the *platform* (accounts, sync, data, admin) is greenfield.

This is not a reason to stop. It is the decision that has to be made before Phase 0's "foundation" is built, because an event bus, feature-flag system, and "log in as teacher and student" look fundamentally different in a static client versus a full-stack app. See the open question logged in DECISIONS.md.
