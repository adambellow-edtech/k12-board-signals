# 🔐 Breakout Land

**An immersive, playable world that wraps the Breakout EDU student experience** — students create an avatar, explore an island, crack locks, earn keys and badges, unlock avatar gear, and bank arcade minutes their teacher and parents control. Prodigy-level engagement, powered by what makes Breakout different: critical thinking, the 4Cs, and SEL — not rote quiz drills.

This repo contains the **interactive concept prototype**: a zero-dependency, single-page web app you can open in any browser. Everything is playable end-to-end with mock content; in production, the game player embeds/deep-links the existing breakoutedu.com digital games and awards rewards on completion.

## Run it

Open `index.html` in a browser — that's it. No build step, no server, no dependencies.
(Progress persists in `localStorage`; use "reset demo" on the title screen to start fresh.)

To rebuild the single-file shareable version (`dist/breakout-land.html`): `node scripts/build-artifact.mjs`

## What's in the prototype

### 🧑‍🎨 Student experience (the hybrid world)
- **Avatar creator** — name, skin, hair, outfits, accessories, sidekick pets; locked items tease the Style Shop
- **Walkable hub island** (canvas, WASD/arrows or tap-to-move) with seven destinations:
  - **Lock Plaza** — Lock of the Day + daily streak
  - **Game Hall** — teacher-assigned games (mock stand-ins for the breakoutedu.com player), full lock-cracking flow with story intros
  - **Math Trailhead** — opens the **Breakout Math** adventure map
  - **The Arcade** — spend earned minutes on Key Catcher (playable mini-game); hard-gated by teacher AND parent permission
  - **Style Shop** — spend keys on gear, equip instantly
  - **Badge Hall** — badges that reward *how* students think (first-try solves, persistence after failure)
  - **Breakout+ Clubhouse** — subscription-gated bonus catalog
- **Lock puzzle engine** — number, word, color-sequence, and direction locks with shake/pop animations, hints after two misses, confetti + "YOU BROKE OUT!" celebrations, WebAudio sound effects
- **Economy** — 🔑 keys (spend), XP → levels (Rookie Solver → Breakout Legend), 🕹️ arcade minutes (earned, permission-gated), 🔥 daily streak

### 🧮 Breakout Math (K–5, scoped & sequenced)
- Candy-Crush-style **adventure trail** per grade (K–5 selector), one sample unit each
- Node types encode the adaptive model: **Quest** (core sequence) → **Review** (remedial, always open, gently recommended after struggle) → **Challenge** (unlocks by beating a quest in ≤2 tries — "beating the average" — or by teacher assignment) → **Boss lock**
- Stars by attempt count; struggling players get nudged toward Review

### 🍎 Teacher dashboard
- Class roster with level, games, avg time, success rate, streak — the demo player appears live in the roster
- **Comparison chart**: class vs. whole school vs. all players in the same age group (avg minutes to breakout)
- One-click game assignment (appears instantly in students' Game Hall), per-student arcade permission, Breakout+ toggle

### 👪 Parent portal
- Progress summary, **4Cs + SEL growth bars** driven by real gameplay signals, weekly play minutes, newest badges
- Arcade time approval + weekly limit slider

## Repo layout

```
index.html            app shell (all screens + modals)
css/styles.css        design system: sunny gold / coral / teal / ink palette
js/data.js            mock content catalog (games, locks, math units, shop, roster)
js/state.js           game state, economy, persistence
js/avatar.js          chibi avatar renderer + creator
js/puzzles.js         lock engine, celebration, audio, confetti
js/world.js           canvas hub island: rendering, movement, camera
js/screens.js         building interiors, math map, teacher & parent views
js/main.js            boot + wiring
scripts/build-artifact.mjs   bundles everything into dist/breakout-land.html
```

## Suggested 6-month path to launch

1. **Month 1 — Validate & design.** Playtest this prototype with students/teachers; swap in real Breakout EDU branding, commission the art style (this prototype's canvas art is placeholder-by-design); finalize the economy numbers.
2. **Months 2–3 — Real integration.** Auth against Breakout EDU accounts; embed the existing digital game player with a completion callback (postMessage) that feeds the rewards engine; assignment + roster sync; Breakout+ entitlement checks.
3. **Months 3–4 — Breakout Math content.** Full K–5 scope & sequence trails, adaptive review/challenge rules server-side, time/attempt telemetry for the "beat the average" unlock.
4. **Month 5 — Dashboards & safety.** Teacher/parent portals on real data (class/school/age-group aggregates), COPPA/FERPA review, moderation of names, accessibility pass.
5. **Month 6 — Polish & pilot.** Sound/music, seasonal events, badge economy tuning, pilot cohort, launch.

---
*Interactive concept prototype — mock content throughout; no real student data.*
