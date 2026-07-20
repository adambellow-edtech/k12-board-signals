# Breakout Land — full source export

Snapshot of branch `claude/breakout-land-world-app-fijx9m` at commit 86a1c70 (2026-07-19).
Repo: adambellow-edtech/k12-board-signals · Live demo artifact: claude.ai/code/artifact/5824aaf0-255b-4ace-9fe2-98ffecb0d75e

Binary art assets (assets/*.jpg, *.webp — AI-generated world/heroes/backdrops) and the generated single-file bundle (dist/breakout-land.html) are excluded; everything else is complete.

## File tree
```
.gitignore
README.md
css/styles.css
index.html
js/avatar.js
js/data.js
js/main.js
js/puzzles.js
js/screens.js
js/state.js
js/world.js
scripts/build-artifact.mjs
assets/           (world-map.jpg, title.jpg, desk.jpg, trail.jpg, heroes.webp, logo.webp — binary art)
dist/             (generated single-file demo)
```

---

## `README.md`

```markdown
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
```

---

## `index.html`

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Breakout Land — a Breakout EDU world</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%94%90%3C/text%3E%3C/svg%3E">
<link rel="stylesheet" href="css/styles.css">
</head>
<body>

<!-- ============ TITLE ============ -->
<section class="screen" id="screen-title">
  <div class="title-wrap">
    <img id="logo-img" alt="Breakout Land">
    <!-- Breakout EDU logomark (white, per brand guide: white logo over dark blue) -->
    <svg class="title-lock" viewBox="0 0 100 100" width="96" height="96" aria-hidden="true">
      <g fill="none" stroke="#ffffff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round">
        <path d="M50 33 L50 27.5 Q50 21 56.5 22.2 L72 25 Q78 26.2 78 32.5 L78 67.5 Q78 73.8 72 75 L56.5 77.8 Q50 79 50 72.5 L50 67"/>
      </g>
      <g fill="#ffffff">
        <path d="M14 50 L36 31.5 L36 42 L62 42 Q66 42 66 46 L66 54 Q66 58 62 58 L36 58 L36 68.5 Z"/>
      </g>
    </svg>
    <h1 class="title-logo">Breakout<span class="land">LAND</span></h1>
    <p class="title-tag">Think hard. Break out. Play on! ✦ A Breakout EDU world</p>
    <div class="role-row">
      <button class="role-btn role-student" id="t-student">I'm a Student<small>Explore the island!</small></button>
      <button class="role-btn role-teacher" id="t-teacher">I'm a Teacher<small>Class dashboard</small></button>
      <button class="role-btn role-parent" id="t-parent">I'm a Parent<small>Progress &amp; approvals</small></button>
    </div>
    <p class="title-foot">Interactive concept prototype · progress saves on this device · <button id="t-reset">reset demo</button></p>
  </div>
</section>

<!-- ============ AVATAR CREATOR ============ -->
<section class="screen" id="screen-avatar">
  <div class="av-wrap board">
    <div class="av-left">
      <h2 id="av-title">Create Your Explorer</h2>
      <canvas id="av-canvas" width="240" height="300"></canvas>
      <button class="btn-big" id="av-done">Start Exploring!</button>
    </div>
    <div class="av-right">
      <h3>Explorer name</h3>
      <input id="av-name" maxlength="16" placeholder="e.g. Sam the Solver" autocomplete="off">
      <h3>Pick your explorer</h3><div class="hero-grid" id="av-heroes"></div>
      <h3>Accessory</h3><div class="chip-row" id="av-acc"></div>
      <h3>Sidekick pet</h3><div class="chip-row" id="av-pet"></div>
      <h3>Walk trail</h3><div class="chip-row" id="av-trail"></div>
    </div>
  </div>
</section>

<!-- ============ WORLD ============ -->
<section class="screen" id="screen-world">
  <canvas id="world-canvas"></canvas>
  <div class="world-hint">Walk with WASD / arrows — or tap where you want to go</div>
  <button id="enter-btn">Enter</button>
</section>

<!-- ============ HUD (storybook style: navy panels) ============ -->
<div id="hud">
  <div class="navy-panel" id="quest-panel">
    <div class="qp-head">TODAY'S QUESTS <span id="qp-count">0/3</span></div>
    <div class="qp-row" id="qp-daily" title="Crack the Lock of the Day">
      <span class="qp-ico">🔐</span><div class="qp-track"><div class="qp-fill" style="background:#4c9aff"></div></div><span class="qp-check">✓</span>
    </div>
    <div class="qp-row" id="qp-game" title="Break out of an assigned game">
      <span class="qp-ico">🚩</span><div class="qp-track"><div class="qp-fill" style="background:#26b59d"></div></div><span class="qp-check">✓</span>
    </div>
    <div class="qp-row" id="qp-math" title="Clear a Breakout Math quest">
      <span class="qp-ico">➗</span><div class="qp-track"><div class="qp-fill" style="background:#a678ec"></div></div><span class="qp-check">✓</span>
    </div>
  </div>
  <div class="hud-right">
    <div class="navy-panel hud-capsule">
      <span class="cap-stat" title="Keys — spend them in the Style Shop">🔑 <b id="hud-keys">0</b></span><i class="cap-div"></i>
      <span class="cap-stat" title="Arcade minutes earned">🕹️ <b id="hud-arcade">0m</b></span><i class="cap-div"></i>
      <span class="cap-stat" title="Lock of the Day streak">🔥 <b id="hud-streak">0</b></span>
    </div>
    <button class="hud-btn" id="hud-mute" title="Sound on/off">🔊</button>
    <button class="hud-btn" id="hud-home" title="Back to title">🏠</button>
  </div>
  <div class="navy-panel" id="player-card">
    <button id="hud-closet" title="Open the Closet (edit your look)">
      <canvas id="hud-avatar" width="56" height="56"></canvas>
    </button>
    <div class="pc-info">
      <strong id="hud-name">Explorer</strong>
      <span id="hud-level">Lv 1 · Rookie Solver</span>
      <span class="hud-xp"><div id="hud-xpbar" style="width:0%"></div></span>
    </div>
  </div>
</div>

<!-- ============ MATH MAP ============ -->
<section class="screen" id="screen-math">
  <div class="math-wrap">
    <div class="math-head">
      <div>
        <h2>🧮 <span id="math-unit">Multiplication Meadow</span></h2>
        <div class="skills" id="math-skills"></div>
      </div>
      <div id="grade-pills"></div>
      <button class="back-btn" data-back-world>← Back to the island</button>
    </div>
    <div class="board math-board">
      <svg id="math-svg" viewBox="0 0 1920 1080" role="img" aria-label="Breakout Math adventure trail"></svg>
    </div>
    <div class="math-legend">
      <span><i style="background:#26b59d"></i>Quest — your math path</span>
      <span><i style="background:#0068ff"></i>Review — warm-up, always open</span>
      <span><i style="background:#5c25b7"></i>Challenge — unlock by beating a quest in ≤2 tries</span>
      <span><i style="background:#ffb627"></i>Boss lock — end of unit</span>
    </div>
  </div>
</section>

<!-- ============ TEACHER ============ -->
<section class="screen" id="screen-teacher">
  <div class="dash">
    <div class="dash-head">
      <div>
        <h2>Ms. Rivera's Class — Room 12</h2>
        <div class="sub">Breakout Land teacher dashboard · Grade 3 · 7 explorers</div>
      </div>
      <button class="back-btn" data-back-title>← Sign out</button>
    </div>
    <div class="dash-grid">
      <div class="board span2">
        <h3>Class roster</h3>
        <p class="note">The demo player appears in this roster as “⭐you” — play as a student and watch your row update.</p>
        <div class="t-table-wrap">
          <table class="t-table">
            <thead><tr><th>Explorer</th><th>Level</th><th>Games</th><th>Avg min</th><th>Success</th><th>Streak</th><th>Arcade</th></tr></thead>
            <tbody id="t-roster"></tbody>
          </table>
        </div>
      </div>
      <div class="board">
        <h3>How your class compares</h3>
        <p class="note">Average minutes to breakout, per game — vs. your school and all players in the same age group.</p>
        <div id="t-chart"></div>
      </div>
      <div class="board">
        <h3>Assign games</h3>
        <p class="note">Assignments appear instantly in every student's Game Hall on the island.</p>
        <div id="t-assign"></div>
        <div class="t-plus-row">
          <span>✨ Breakout+ for this class</span>
          <label class="switch"><input type="checkbox" id="t-plus"><span></span></label>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ============ PARENT ============ -->
<section class="screen" id="screen-parent">
  <div class="dash">
    <div class="dash-head">
      <div>
        <h2>Family Portal</h2>
        <div class="sub">Following <strong id="p-name">your explorer</strong>'s adventure in Breakout Land</div>
      </div>
      <button class="back-btn" data-back-title>← Sign out</button>
    </div>
    <div class="dash-grid">
      <div class="board">
        <div class="p-head">
          <canvas id="p-avatar" width="84" height="104"></canvas>
          <p class="muted">Breakout games build the skills tests can't measure — critical thinking, teamwork and stick-with-it grit. Here's how those are growing.</p>
        </div>
        <div class="p-summary" id="p-summary"></div>
      </div>
      <div class="board">
        <h3>4Cs &amp; SEL skill growth</h3>
        <p class="note">Signals from gameplay: first-try solves, hint use, retries and collaboration games.</p>
        <div id="p-skills"></div>
      </div>
      <div class="board">
        <h3>This week's play</h3>
        <p class="note">Minutes in Breakout Land per day.</p>
        <div class="p-week" id="p-week"></div>
      </div>
      <div class="board">
        <h3>Rewards you control</h3>
        <div class="p-controls">
          <div class="p-control-row">
            <span>🕹️ Allow earned arcade time</span>
            <label class="switch"><input type="checkbox" id="p-arcade"><span></span></label>
          </div>
          <div class="p-control-row">
            <span>Weekly limit: <span id="p-limit-val">120 min/week</span></span>
            <input type="range" id="p-limit" min="30" max="300" step="15">
          </div>
        </div>
        <h3 style="margin-top:16px">Newest badges</h3>
        <div class="badge-grid" id="p-badges"></div>
      </div>
    </div>
  </div>
</section>

<!-- ============ BUILDING MODAL ============ -->
<div class="modal" id="building-modal">
  <div class="modal-card board">
    <button class="modal-close" id="bm-close" aria-label="Close">✕</button>
    <h2 id="bm-title"></h2>
    <div id="bm-body"></div>
  </div>
</div>

<!-- ============ PUZZLE MODAL ============ -->
<div class="modal" id="puzzle-modal">
  <div class="modal-card board">
    <button class="modal-close" id="pz-close" aria-label="Close puzzle">✕</button>
    <div id="pz-ctx"></div>
    <h2 id="pz-title"></h2>
    <div id="pz-step"></div>
    <div class="pz-lock-zone">
      <div id="pz-lock"><div class="shackle"></div><div class="body"></div><div class="hole"></div></div>
    </div>
    <p id="pz-clue"></p>
    <div id="pz-hint"></div>
    <div id="pz-display"></div>
    <div id="pz-pad"></div>
  </div>
</div>

<!-- ============ CELEBRATION ============ -->
<div class="modal" id="cel-modal">
  <div class="modal-card board">
    <div class="cel-rays" aria-hidden="true"></div>
    <div class="big-emoji">🔓</div>
    <div id="cel-title">YOU BROKE OUT!</div>
    <p id="cel-sub"></p>
    <div id="cel-stats"></div>
    <button class="btn-big" id="cel-btn">Collect rewards! 🔑</button>
  </div>
</div>

<!-- ============ KEY CATCHER ============ -->
<div class="modal" id="kc-modal">
  <div class="modal-card board">
    <h2>🕹️ Key Catcher</h2>
    <p class="muted">Move with your mouse, finger, or ◀ ▶ keys. Catch keys, dodge anvils!</p>
    <canvas id="kc-canvas"></canvas>
    <button class="btn-small" id="kc-quit">Quit round</button>
  </div>
</div>

<!-- ============ MEMORY MATCH ============ -->
<div class="modal" id="mm-modal">
  <div class="modal-card board">
    <h2>🃏 Memory Match</h2>
    <p class="muted" id="mm-status">Find all 6 pairs!</p>
    <div id="mm-grid"></div>
    <button class="btn-small" id="mm-quit">Quit round</button>
  </div>
</div>

<canvas id="confetti"></canvas>
<div id="toast" role="status"></div>

<script src="js/data.js"></script>
<script src="js/state.js"></script>
<script src="js/puzzles.js"></script>
<script src="js/avatar.js"></script>
<script src="js/world.js"></script>
<script src="js/screens.js"></script>
<script src="js/main.js"></script>
</body>
</html>
```

---

## `css/styles.css`

```css
/* Breakout Land — Breakout EDU brand system (Brand Style Guide 2024).
   Chrome/UI wears the brand: Breakout Blue Dark #002d72 (primary, all copy),
   Breakout Blue Light #0068ff (headings/CTAs), Puzzling Purple #5c25b7 (accent),
   Perplexing Pink & Gamer Green as low accents. Gold/coral live only inside
   the game world as diegetic art (locks, keys, buildings). */

:root {
  --ink: #002d72;        /* Breakout Blue Dark — primary; all body copy */
  --ink-soft: #445c9e;
  --blue: #0068ff;       /* Breakout Blue Light — headings, titles, CTAs */
  --blue-deep: #0050c8;
  --purple: #5c25b7;     /* Puzzling Purple — subheads, UI accents */
  --pink: #c914a7;       /* Perplexing Pink — lower accent only */
  --green: #26b59d;      /* Gamer Green — lower accent only */
  --green-deep: #1c9a85;
  --cream: #ffffff;      /* panel surface */
  --cream-edge: #d6e2f8; /* panel edge */
  --gold: #ffb627;       /* in-world currency & lock gold (game asset) */
  --gold-deep: #d98e00;
  --coral: #ff6b5b;      /* in-world only */
  --coral-deep: #d6503f;
  --teal: #26b59d;
  --teal-deep: #1c9a85;
  --sky: #8ed8f0;
  --grass: #7cc665;
  --white: #ffffff;
  --radius: 18px;
  /* Helix (display/UI) and Gotham Book (body) with faithful fallbacks */
  --display: 'Helix', 'Quicksand', 'Avenir Next Rounded', 'Avenir Next', 'Avenir', 'Century Gothic', ui-rounded, 'Trebuchet MS', sans-serif;
  --body: 'Gotham', 'Avenir', 'Montserrat', 'Segoe UI', system-ui, sans-serif;
  --brand-grad: linear-gradient(160deg, #0068ff, #002d72);
}

* { box-sizing: border-box; }
html, body { height: 100%; }
body {
  margin: 0;
  font-family: var(--body);
  color: var(--ink);
  background: linear-gradient(180deg, #eaf2ff, #f8fbff 60%, #eef6ff);
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}
button { font-family: inherit; cursor: pointer; }
h1, h2, h3 { font-family: var(--display); text-wrap: balance; }

/* ---------- screens ---------- */
.screen { position: fixed; inset: 0; display: none; overflow: auto; }
.screen.active { display: block; }
#screen-world.active { display: block; overflow: hidden; }

/* ---------- title: white logo over the Breakout blue gradient + icon pattern ---------- */
#screen-title {
  display: none;
  place-items: center;
  text-align: center;
  background: #0a2d5c;
  overflow: hidden;
}
#screen-title::after {
  content: '';
  position: absolute; inset: -4%;
  background: var(--img-title, var(--brand-grad)) center / cover no-repeat;
  animation: kenburns 26s ease-in-out infinite alternate;
  z-index: 0;
}
@keyframes kenburns {
  from { transform: scale(1) translate(0, 0); }
  to { transform: scale(1.07) translate(-1.2%, 1%); }
}
#screen-title::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(0, 18, 48, .38), rgba(0, 18, 48, 0) 30%, rgba(0, 18, 48, 0) 58%, rgba(0, 18, 48, .5));
  z-index: 1;
}
#screen-title.active { display: grid; }
.title-wrap { z-index: 2; }
.title-lock, #logo-img { animation: logodrop .8s cubic-bezier(.2, 1.6, .4, 1) both; }
.title-logo { animation: logodrop .8s .12s cubic-bezier(.2, 1.6, .4, 1) both; }
.title-tag { animation: fadeup .6s .5s ease both; }
.role-row { animation: fadeup .6s .68s ease both; }
.title-foot { animation: fadeup .6s .85s ease both; }
@keyframes logodrop {
  from { transform: translateY(-46px) scale(.85); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}
@keyframes fadeup {
  from { transform: translateY(18px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
#logo-img { display: none; max-width: min(520px, 82vw); height: auto; filter: drop-shadow(0 14px 26px rgba(0, 15, 50, .45)); }
.has-logo #logo-img { display: inline-block; }
.has-logo .title-lock, .has-logo .title-logo { display: none; }
.title-wrap { padding: 24px; max-width: 680px; width: 100%; position: relative; }
.title-lock { animation: bob 3.2s ease-in-out infinite; display: inline-block; filter: drop-shadow(0 12px 22px rgba(0,15,50,.4)); }
@keyframes bob { 0%,100% { transform: translateY(0);} 50% { transform: translateY(-9px);} }
.title-logo {
  font-family: var(--display);
  font-weight: 800;
  font-size: clamp(42px, 8.4vw, 72px);
  letter-spacing: .5px;
  margin: 10px 0 4px;
  color: var(--white);
  text-shadow: 0 4px 0 rgba(0, 20, 60, .28), 0 14px 30px rgba(0, 15, 50, .35);
}
.title-logo .land {
  font-size: .44em;
  vertical-align: 1.28em;
  letter-spacing: 3px;
  margin-left: 8px;
  color: var(--white);
  text-shadow: 0 3px 0 rgba(0, 20, 60, .28);
}
.title-tag {
  font-size: 16px;
  color: var(--white);
  background: rgba(255, 255, 255, .14);
  border: 1.5px solid rgba(255, 255, 255, .25);
  border-radius: 999px;
  display: inline-block;
  padding: 7px 18px;
  margin-bottom: 20px;
  font-weight: 600;
}
.role-row { margin-top: 16vh; }
.role-row { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
.role-btn {
  border: 0;
  border-radius: var(--radius);
  padding: 15px 22px 13px;
  min-width: 158px;
  font-family: var(--display);
  font-weight: 800;
  font-size: 17.5px;
  color: var(--ink);
  background: var(--white);
  border-top: 6px solid var(--blue);
  box-shadow: 0 6px 0 rgba(0, 20, 60, .35), 0 16px 30px rgba(0, 15, 50, .3);
  transition: transform .08s ease, box-shadow .08s ease;
}
.role-btn small { display: block; font-family: var(--body); font-weight: 600; font-size: 12.5px; margin-top: 3px; color: var(--ink-soft); }
.role-btn:hover { transform: translateY(-2px); }
.role-btn:active { transform: translateY(2px); box-shadow: 0 2px 0 rgba(0,20,60,.35); }
.role-student { border-top-color: var(--blue); }
.role-student small { color: var(--blue); }
.role-teacher { border-top-color: var(--purple); }
.role-teacher small { color: var(--purple); }
.role-parent  { border-top-color: var(--green); }
.role-parent small { color: var(--green-deep); }
.title-foot { margin-top: 20px; font-size: 12.5px; color: rgba(255,255,255,.7); }
.title-foot button { border: 0; background: none; text-decoration: underline; color: inherit; font-size: inherit; }

/* ---------- signboard panels (shared) ---------- */
.board {
  background: var(--cream);
  border: 2.5px solid var(--cream-edge);
  border-radius: 22px;
  box-shadow: 0 8px 0 rgba(0, 45, 114, .07), 0 20px 44px rgba(0, 45, 114, .16);
  padding: 22px 24px;
}

/* ---------- avatar creator ---------- */
#screen-avatar { display: none; place-items: center; padding: 18px; }
#screen-avatar.active { display: grid; }
.av-wrap { display: flex; gap: 20px; max-width: 900px; width: 100%; align-items: stretch; flex-wrap: wrap; }
.av-left { flex: 0 0 280px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
#av-canvas { width: 240px; height: 300px; background: linear-gradient(180deg, #d9f2fa, #eef9f0); border-radius: 18px; border: 3px solid var(--cream-edge); }
.av-right { flex: 1 1 380px; min-width: 300px; max-height: 74vh; overflow-y: auto; padding-right: 6px; }
.av-right h3 { margin: 14px 0 7px; font-size: 15px; letter-spacing: .4px; text-transform: uppercase; color: var(--ink-soft); }
#av-name {
  width: 100%; padding: 12px 14px; font-size: 17px; font-weight: 700; color: var(--ink);
  border: 3px solid var(--cream-edge); border-radius: 12px; background: var(--white);
  font-family: var(--display);
}
#av-name:focus { outline: 3px solid var(--blue); border-color: var(--blue); }
.swatch-row, .chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
.hero-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 8px; }
.hero-card {
  border: 2.5px solid var(--cream-edge); background: linear-gradient(180deg, #eaf3ff, #d8ecff);
  border-radius: 14px; padding: 6px 4px 5px; display: flex; flex-direction: column; align-items: center; gap: 2px;
  transition: transform .08s ease;
}
.hero-card:hover { transform: translateY(-2px); }
.hero-card.sel { border-color: var(--blue); background: linear-gradient(180deg, #dbeaff, #bcd9ff); box-shadow: 0 0 0 2.5px rgba(0,104,255,.35); }
.hero-card canvas { width: 74px; height: 104px; }
.hero-card span { font-weight: 800; font-size: 12px; color: var(--ink); font-family: var(--display); }
.chip {
  border: 2.5px solid var(--cream-edge); background: var(--white); border-radius: 999px;
  padding: 8px 14px; font-weight: 700; font-size: 13.5px; color: var(--ink);
}
.chip.sel { background: var(--ink); color: var(--white); border-color: var(--ink); }
.chip.locked { opacity: .65; }
.chip .price { color: var(--gold-deep); }
.btn-big {
  display: block; width: 100%; margin-top: 16px; border: 0; border-radius: 16px;
  background: linear-gradient(180deg, #1f7bff, #0056d6); color: var(--white);
  font-family: var(--display); font-weight: 800; font-size: 19px; padding: 15px;
  box-shadow: 0 5px 0 #003ea0;
  transition: transform .08s ease, box-shadow .08s ease;
}
.btn-big:hover { transform: translateY(-1px); }
.btn-big:active { transform: translateY(3px); box-shadow: 0 1px 0 #003ea0; }
.btn-big:disabled { filter: grayscale(.7); opacity: .6; cursor: not-allowed; }
.btn-small {
  border: 0; border-radius: 12px; padding: 9px 16px; font-weight: 800; font-size: 13.5px;
  background: var(--blue); color: var(--white); box-shadow: 0 3px 0 var(--blue-deep);
}
.btn-small:active { transform: translateY(2px); box-shadow: none; }
.btn-small:disabled { background: #b8c4c9; box-shadow: 0 3px 0 #93a1a8; cursor: default; }

/* ---------- world ---------- */
#world-canvas { width: 100vw; height: 100vh; display: block; touch-action: none; }
#enter-btn {
  position: fixed; left: 50%; bottom: 26px; transform: translate(-50%, 80px);
  border: 0; border-radius: 999px; padding: 14px 26px;
  font-family: var(--display); font-weight: 900; font-size: 17px;
  background: var(--ink); color: var(--white);
  box-shadow: 0 4px 0 #0d1530, 0 14px 30px rgba(29,42,77,.4);
  transition: transform .2s ease; opacity: 0; pointer-events: none;
}
#enter-btn.show { transform: translate(-50%, 0); opacity: 1; pointer-events: auto; }
.world-hint {
  position: fixed; left: 50%; top: 74px; transform: translateX(-50%);
  background: rgba(0,45,114,.75); color: var(--white); font-size: 12.5px; font-weight: 600;
  padding: 6px 14px; border-radius: 999px; pointer-events: none;
}

/* ---------- HUD: chunky navy game panels (storybook style) ---------- */
#hud { position: fixed; inset: 0; display: none; pointer-events: none; z-index: 40; }
#hud > * { pointer-events: auto; }
#hud.math-mode #quest-panel, #hud.math-mode #player-card { display: none; }
.navy-panel {
  background: linear-gradient(180deg, #1c56ad, #0d3271 60%, #082554);
  border: 3px solid #041a3f;
  border-radius: 18px;
  box-shadow: inset 0 2px 0 rgba(255,255,255,.22), 0 6px 0 rgba(2,15,40,.45), 0 14px 26px rgba(0,20,60,.35);
  color: var(--white);
}
#quest-panel { position: absolute; top: 12px; left: 12px; width: 232px; padding: 10px 12px 12px; }
.qp-head {
  font-family: var(--display); font-weight: 800; font-size: 13.5px; letter-spacing: .8px;
  margin-bottom: 8px; display: flex; justify-content: space-between; align-items: baseline;
}
.qp-head span { color: #9cc4ff; font-size: 12px; font-variant-numeric: tabular-nums; }
.qp-row { display: flex; align-items: center; gap: 8px; margin: 7px 0; }
.qp-ico {
  width: 27px; height: 27px; border-radius: 50%; background: rgba(255,255,255,.92);
  display: grid; place-items: center; font-size: 13.5px; flex: 0 0 27px;
  border: 2px solid #041a3f;
}
.qp-track { flex: 1; height: 12px; border-radius: 99px; background: rgba(4,20,55,.65); overflow: hidden; border: 1.5px solid rgba(255,255,255,.14); }
.qp-fill { height: 100%; border-radius: 99px; width: 8%; transition: width .6s ease; box-shadow: inset 0 -2px 0 rgba(0,0,0,.18); }
.qp-check {
  width: 23px; height: 23px; border-radius: 50%; flex: 0 0 23px;
  display: grid; place-items: center; font-size: 13px; font-weight: 900;
  background: rgba(255,255,255,.16); color: transparent; border: 2px solid rgba(255,255,255,.22);
  transition: all .3s ease;
}
.qp-row.done .qp-check { background: var(--gold); color: #fff; border-color: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.3); animation: checkpop .45s cubic-bezier(.2, 2, .4, 1); }
@keyframes checkpop { from { transform: scale(0) rotate(-40deg); } to { transform: scale(1) rotate(0); } }
.qp-row.done .qp-fill { width: 100% !important; }

.hud-right { position: absolute; top: 12px; right: 12px; display: flex; gap: 8px; align-items: center; }
.hud-capsule { display: flex; align-items: center; gap: 10px; padding: 8px 16px; border-radius: 999px; font-variant-numeric: tabular-nums; }
.cap-stat { font-weight: 800; font-size: 14.5px; display: flex; align-items: center; gap: 5px; }
.cap-stat b { color: #ffd75e; font-family: var(--display); }
.cap-div { width: 1.5px; height: 18px; background: rgba(255,255,255,.25); }
.hud-btn {
  border: 3px solid #041a3f; background: linear-gradient(180deg, #1c56ad, #0d3271);
  width: 42px; height: 42px; border-radius: 50%; font-size: 17px;
  box-shadow: inset 0 2px 0 rgba(255,255,255,.22), 0 4px 0 rgba(2,15,40,.45);
}
.hud-btn:active { transform: translateY(2px); box-shadow: inset 0 2px 0 rgba(255,255,255,.22); }

#player-card { position: absolute; left: 12px; bottom: 14px; display: flex; align-items: center; gap: 10px; padding: 8px 16px 8px 8px; }
#hud-closet { border: 0; background: none; padding: 0; cursor: pointer; }
#hud-avatar {
  width: 56px; height: 56px; border-radius: 14px; display: block;
  background: linear-gradient(180deg, #d5e9fb, #b8ddf5);
  border: 2.5px solid var(--gold);
}
.pc-info { text-align: left; display: flex; flex-direction: column; gap: 2px; }
.pc-info strong { font-family: var(--display); font-size: 16px; line-height: 1.1; }
.pc-info span { font-size: 11px; color: #9cc4ff; font-weight: 700; }
.hud-xp { width: 110px; height: 8px; border-radius: 99px; background: rgba(4,20,55,.65); overflow: hidden; border: 1.5px solid rgba(255,255,255,.14); }
.hud-xp > div { height: 100%; background: linear-gradient(90deg, var(--green), #4c9aff); border-radius: 99px; transition: width .5s ease; }

/* ---------- modals ---------- */
.modal {
  position: fixed; inset: 0; display: none; place-items: center; z-index: 60;
  background: rgba(23, 33, 61, .45); backdrop-filter: blur(3px); padding: 18px;
}
.modal.open { display: grid; }
.modal-card { width: min(680px, 96vw); max-height: 88vh; overflow-y: auto; position: relative; animation: pop .22s ease; }
@keyframes pop { from { transform: scale(.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.modal-close {
  position: absolute; top: 10px; right: 12px; border: 0; background: var(--pink); color: #fff;
  width: 34px; height: 34px; border-radius: 50%; font-size: 16px; font-weight: 900;
  box-shadow: 0 3px 0 #9a0d80;
}
.modal-card h2 { margin: 2px 36px 10px 0; font-size: 24px; }
.muted { color: var(--ink-soft); font-size: 14px; line-height: 1.5; }
.center { text-align: center; }
.big-emoji { font-size: 56px; text-align: center; margin: 8px 0; }
.reward-row {
  display: flex; gap: 14px; flex-wrap: wrap; background: rgba(0,104,255,.08);
  border-radius: 12px; padding: 10px 14px; margin: 12px 0; font-size: 14.5px;
}
.card {
  background: var(--white); border: 2.5px solid var(--cream-edge); border-radius: 16px;
  padding: 14px 16px; margin: 12px 0;
}
.game-card { display: flex; gap: 14px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
.game-card.soon { opacity: .6; }
.game-info { flex: 1 1 300px; }
.game-info h3 { margin: 0 0 3px; font-size: 17.5px; }
.game-info .meta { margin: 0 0 6px; font-size: 12.5px; font-weight: 700; color: var(--purple); }
.game-info .story { margin: 0; font-size: 13.5px; color: var(--ink-soft); line-height: 1.45; }
.game-side { display: flex; flex-direction: column; gap: 8px; align-items: stretch; }
.game-side .btn-big { margin-top: 0; width: auto; padding: 12px 26px; font-size: 16px; }
.done-pill { font-size: 12.5px; font-weight: 800; color: #2c7a3d; background: #dff3e2; border-radius: 999px; padding: 6px 12px; text-align: center; }

/* ---------- puzzle modal: painted escape-room desk ---------- */
#puzzle-modal .modal-card {
  background: #2b1c10 var(--img-desk, none) center / cover no-repeat;
  border: 4px solid #1d1208;
  color: var(--white);
}
#puzzle-modal h2 { color: var(--white); text-shadow: 0 2px 6px rgba(0,0,0,.6); }
#pz-ctx { font-size: 12px; font-weight: 800; letter-spacing: .8px; text-transform: uppercase; color: #ffd75e; text-shadow: 0 1px 4px rgba(0,0,0,.6); }
#pz-step { font-size: 13px; font-weight: 700; color: rgba(255,244,214,.95); text-shadow: 0 1px 4px rgba(0,0,0,.55); margin-bottom: 8px; }
.pz-lock-zone { display: flex; justify-content: center; margin: 6px 0 10px; animation: locksway 3.6s ease-in-out infinite; }
@keyframes locksway { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
#pz-lock { width: 74px; height: 88px; position: relative; transition: transform .2s; }
#pz-lock.open-anim::after {
  content: '';
  position: absolute; inset: -34px;
  background: radial-gradient(circle, rgba(255, 224, 122, .95), rgba(255, 224, 122, 0) 68%);
  border-radius: 50%;
  animation: lockburst .7s ease-out both;
  pointer-events: none;
}
@keyframes lockburst { from { transform: scale(.2); opacity: 0; } 35% { opacity: 1; } to { transform: scale(1.6); opacity: 0; } }
#pz-lock .shackle {
  position: absolute; top: 0; left: 50%; transform: translateX(-50%);
  width: 44px; height: 40px; border: 9px solid #c9a86a; border-bottom: 0;
  border-radius: 26px 26px 0 0; transition: transform .5s ease, border-color .3s;
}
#pz-lock .body {
  position: absolute; bottom: 0; left: 0; right: 0; height: 56px;
  background: linear-gradient(180deg, var(--gold), #eda412); border-radius: 14px;
  box-shadow: inset 0 -5px 0 rgba(0,0,0,.14);
}
#pz-lock .hole {
  position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%);
  width: 12px; height: 20px; background: #7a5310; border-radius: 7px 7px 4px 4px;
}
#pz-lock.open-anim .shackle { transform: translateX(-50%) translateY(-14px) rotate(-24deg); border-color: #57c26b; }
#pz-lock.shake { animation: shake .4s; }
@keyframes shake { 0%,100% { transform: translateX(0);} 20% { transform: translateX(-7px);} 40% { transform: translateX(6px);} 60% { transform: translateX(-4px);} 80% { transform: translateX(3px);} }
#pz-clue {
  background: rgba(255, 250, 235, .95); border: 2.5px dashed #b08d54; border-radius: 14px;
  padding: 14px 16px; font-size: 15.5px; line-height: 1.55; margin: 0 0 12px;
  color: #3a2a10; box-shadow: 0 6px 16px rgba(0,0,0,.35);
}
#pz-hint { display: none; font-size: 13.5px; color: #8a6400; background: #fff3d1; border-radius: 10px; padding: 9px 13px; margin-bottom: 10px; }
#pz-hint.show { display: block; }
#pz-display { display: flex; gap: 8px; justify-content: center; margin-bottom: 12px; flex-wrap: wrap; }
#pz-display .slot {
  width: 42px; height: 48px; border-radius: 10px; background: var(--white);
  border: 2.5px solid var(--cream-edge); display: grid; place-items: center;
  font-family: var(--display); font-weight: 900; font-size: 22px;
}
#pz-display .slot.filled { border-color: var(--ink); background: #f2f6ff; animation: slotpop .2s cubic-bezier(.2, 1.8, .4, 1); }
@keyframes slotpop { from { transform: scale(.55); } to { transform: scale(1); } }
#pz-display .dot { width: 24px; height: 24px; border-radius: 50%; display: block; box-shadow: inset 0 -3px 0 rgba(0,0,0,.18); }
#pz-pad { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.pz-key {
  min-width: 46px; height: 46px; border: 0; border-radius: 12px; font-family: var(--display);
  font-weight: 900; font-size: 18px; background: var(--white); color: var(--ink);
  border: 2.5px solid var(--cream-edge); box-shadow: 0 3px 0 var(--cream-edge);
}
.pz-key { transition: transform .08s ease; }
.pz-key:hover { transform: translateY(-2px); }
.pz-key:active { transform: translateY(2px) scale(.92); box-shadow: none; }
.pz-key.wide { min-width: 76px; }
.pz-key.go { background: var(--blue); border-color: var(--blue-deep); box-shadow: 0 3px 0 var(--blue-deep); color: #fff; letter-spacing: .5px; }
.pz-key .dot { width: 26px; height: 26px; border-radius: 50%; display: block; margin: auto; box-shadow: inset 0 -3px 0 rgba(0,0,0,.18); }
.pz-key.colorkey, .pz-key.dirkey { font-size: 20px; }

/* ---------- celebration ---------- */
#cel-modal .modal-card { text-align: center; position: relative; overflow: hidden; }
.cel-rays {
  position: absolute; left: 50%; top: 96px; width: 460px; height: 460px;
  transform: translate(-50%, -50%);
  background: repeating-conic-gradient(rgba(255, 214, 94, .28) 0deg 14deg, transparent 14deg 28deg);
  -webkit-mask-image: radial-gradient(circle, #000 0%, transparent 62%);
  mask-image: radial-gradient(circle, #000 0%, transparent 62%);
  animation: rayspin 9s linear infinite;
  pointer-events: none;
}
@keyframes rayspin { to { transform: translate(-50%, -50%) rotate(360deg); } }
#cel-modal .big-emoji, #cel-title, #cel-sub, #cel-stats, #cel-btn { position: relative; }
#cel-title {
  font-family: var(--display); font-weight: 800; font-size: clamp(34px, 7vw, 52px); margin: 8px 0 2px;
  color: var(--blue);
  text-shadow: 0 3px 0 rgba(0,45,114,.15);
  animation: celpop .5s cubic-bezier(.2, 2.4, .5, 1);
}
@keyframes celpop { from { transform: scale(.3) rotate(-6deg); } to { transform: scale(1) rotate(0);} }
#cel-sub { font-weight: 800; font-size: 17px; color: var(--ink-soft); margin: 0 0 10px; }
#cel-stats { display: flex; gap: 18px; justify-content: center; font-weight: 800; font-size: 16px; margin-bottom: 14px; font-variant-numeric: tabular-nums; }
#confetti { position: fixed; inset: 0; z-index: 100; pointer-events: none; display: none; }

/* ---------- shop / badges ---------- */
.shop-h { margin: 16px 0 8px; font-size: 15px; text-transform: uppercase; letter-spacing: .5px; color: var(--ink-soft); }
.shop-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
.shop-item {
  border: 2.5px solid var(--cream-edge); background: var(--white); border-radius: 14px;
  padding: 12px; display: flex; flex-direction: column; gap: 5px; align-items: flex-start;
}
.shop-item:hover { border-color: var(--gold); }
.shop-item.owned { border-color: var(--teal); background: #effaf8; }
.shop-name { font-weight: 800; font-size: 14px; }
.shop-price { font-size: 12.5px; font-weight: 800; color: var(--gold-deep); }
.shop-item.owned .shop-price { color: var(--teal-deep); }
.badge-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.badge {
  background: var(--white); border: 2.5px solid var(--cream-edge); border-radius: 14px;
  padding: 14px 12px; text-align: center; display: flex; flex-direction: column; gap: 4px;
  filter: grayscale(1); opacity: .55;
}
.badge.got { filter: none; opacity: 1; border-color: var(--gold); background: #fffaef; }
.badge-icon { font-size: 30px; }
.badge strong { font-size: 13.5px; }
.badge span { font-size: 11.5px; color: var(--ink-soft); }
.badge.small { padding: 10px; }

/* ---------- math map ---------- */
#screen-math { padding: 68px 14px 20px; }
.math-wrap { max-width: 980px; margin: 0 auto; }
.math-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
.math-head h2 { margin: 0; font-size: 26px; }
.math-head .skills { font-size: 13px; color: var(--ink-soft); font-weight: 600; }
#grade-pills { display: flex; gap: 6px; flex-wrap: wrap; }
.gpill {
  border: 2.5px solid var(--cream-edge); background: var(--white); border-radius: 999px;
  min-width: 44px; padding: 8px 10px; font-family: var(--display); font-weight: 900; font-size: 14px;
}
.gpill.sel { background: var(--ink); color: var(--white); border-color: var(--ink); }
.math-board {
  padding: 10px; overflow-x: auto;
  background: #79b968 var(--img-trail, none) center / cover no-repeat;
  border-color: #3d6b34;
}
#math-svg { width: 100%; min-width: 720px; height: auto; display: block; }
.mnode { cursor: pointer; }
.mnode.locked, .mnode.locked-challenge { cursor: not-allowed; }
.mnode:focus { outline: none; }
.mnode:focus circle:first-of-type { stroke: var(--ink); }
.math-legend { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12.5px; font-weight: 700; color: var(--ink-soft); margin-top: 8px; padding: 0 6px; }
.math-legend i { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 5px; vertical-align: -1px; }

/* ---------- teacher & parent dashboards ---------- */
.dash { max-width: 1020px; margin: 0 auto; padding: 22px 16px 40px; }
.dash-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.dash-head h2 { margin: 0; font-size: 27px; }
.dash-head .sub { color: var(--ink-soft); font-size: 13.5px; font-weight: 600; }
.dash-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap: 14px; align-items: start; }
.dash .board { padding: 18px 20px; }
.dash .board h3 { margin: 0 0 10px; font-size: 17px; }
.dash .board .note { font-size: 12.5px; color: var(--ink-soft); margin: 4px 0 10px; }
.span2 { grid-column: 1 / -1; }

.t-table-wrap { overflow-x: auto; }
table.t-table { width: 100%; border-collapse: collapse; font-size: 13.5px; font-variant-numeric: tabular-nums; min-width: 560px; }
.t-table th { text-align: left; font-size: 11.5px; text-transform: uppercase; letter-spacing: .5px; color: var(--ink-soft); padding: 6px 10px; border-bottom: 2px solid var(--cream-edge); }
.t-table td { padding: 9px 10px; border-bottom: 1.5px solid #f0e8d4; }
.t-name { font-weight: 800; }
.pill { border-radius: 999px; padding: 3px 10px; font-weight: 800; font-size: 12px; }
.pill.good { background: #dff3e2; color: #226b32; }
.pill.mid { background: #fff3d1; color: #8a6400; }
.pill.low { background: #fde3e0; color: #a33225; }

.switch { position: relative; display: inline-block; width: 42px; height: 24px; }
.switch input { opacity: 0; width: 0; height: 0; }
.switch span {
  position: absolute; inset: 0; border-radius: 99px; background: #cfd8dc; transition: .2s;
}
.switch span::before {
  content: ''; position: absolute; width: 18px; height: 18px; border-radius: 50%;
  left: 3px; top: 3px; background: #fff; transition: .2s; box-shadow: 0 1px 3px rgba(0,0,0,.3);
}
.switch input:checked + span { background: var(--blue); }
.switch input:checked + span::before { transform: translateX(18px); }
.switch input:focus-visible + span { outline: 3px solid var(--purple); }

/* comparison chart */
.legend { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12.5px; font-weight: 700; margin-bottom: 12px; }
.legend i { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
.cmp-group { margin-bottom: 14px; }
.cmp-label { font-weight: 800; font-size: 13.5px; margin-bottom: 5px; }
.cmp-bars { display: flex; flex-direction: column; gap: 4px; }
.cmp-row { display: flex; align-items: center; gap: 8px; }
.cmp-bar { height: 14px; border-radius: 0 4px 4px 0; min-width: 3px; transition: width .6s ease; }
.cmp-val { font-size: 12px; font-weight: 700; color: var(--ink-soft); font-variant-numeric: tabular-nums; }
.chart-note { font-size: 12.5px; color: var(--ink-soft); margin: 10px 0 0; }

.assign-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 0; border-bottom: 1.5px solid #f0e8d4; font-size: 14px; flex-wrap: wrap; }
.assign-row .meta { color: var(--ink-soft); font-size: 12.5px; }
.t-plus-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-top: 12px; font-size: 14px; font-weight: 700; }

/* parent */
.p-head { display: flex; gap: 16px; align-items: center; margin-bottom: 4px; }
#p-avatar { width: 84px; height: 104px; background: linear-gradient(180deg,#d9f2fa,#eef9f0); border-radius: 14px; border: 2.5px solid var(--cream-edge); }
.p-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 10px; margin: 12px 0; }
.p-stat { background: var(--white); border: 2.5px solid var(--cream-edge); border-radius: 14px; padding: 12px; text-align: center; }
.p-stat strong { display: block; font-family: var(--display); font-size: 23px; font-variant-numeric: tabular-nums; }
.p-stat span { font-size: 11.5px; color: var(--ink-soft); font-weight: 700; }
.skill-row { display: flex; align-items: center; gap: 10px; margin: 9px 0; }
.skill-label { flex: 0 0 128px; font-size: 13px; font-weight: 700; }
.skill-track { flex: 1; height: 12px; border-radius: 99px; background: #ece4d0; overflow: hidden; }
.skill-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--green), var(--blue)); transition: width .7s ease; }
.skill-val { flex: 0 0 30px; text-align: right; font-size: 12.5px; font-weight: 800; color: var(--ink-soft); font-variant-numeric: tabular-nums; }
.p-week { display: flex; gap: 10px; align-items: flex-end; padding: 6px 2px 0; }
.wk-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.wk-bar { width: 100%; max-width: 34px; background: var(--teal); border-radius: 6px 6px 0 0; }
.wk-val { font-size: 11px; font-weight: 700; color: var(--ink-soft); font-variant-numeric: tabular-nums; }
.wk-day { font-size: 11px; font-weight: 700; color: var(--ink-soft); }
.p-controls { display: flex; flex-direction: column; gap: 12px; }
.p-control-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 14px; font-weight: 700; }
input[type=range] { width: 150px; accent-color: var(--teal); }

/* back buttons on dashboards */
.back-btn {
  border: 2.5px solid var(--cream-edge); background: var(--white); border-radius: 999px;
  padding: 9px 18px; font-weight: 800; font-size: 13.5px; color: var(--ink);
}

/* memory match */
#mm-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
  max-width: 420px; margin: 6px auto 12px;
}
.mm-card {
  aspect-ratio: 3 / 4; border: 0; background: none; padding: 0;
  perspective: 500px; cursor: pointer;
}
.mm-inner {
  position: relative; display: block; width: 100%; height: 100%;
  transform-style: preserve-3d; transition: transform .38s cubic-bezier(.3, 1.4, .5, 1);
}
.mm-card.flip .mm-inner { transform: rotateY(180deg); }
.mm-front, .mm-back {
  position: absolute; inset: 0; display: grid; place-items: center;
  font-size: 30px; border-radius: 12px; backface-visibility: hidden;
  border: 2.5px solid #041a3f;
}
.mm-front { background: linear-gradient(180deg, #1c56ad, #0d3271); box-shadow: inset 0 2px 0 rgba(255,255,255,.25); font-size: 22px; }
.mm-back { background: linear-gradient(180deg, #fffdf4, #ffeccf); transform: rotateY(180deg); }
.mm-card.done .mm-inner { animation: mmpop .45s cubic-bezier(.2, 2, .4, 1); }
.mm-card.done .mm-back { background: linear-gradient(180deg, #dff7e6, #b9ecc9); border-color: #1c9a56; }
@keyframes mmpop { 30% { transform: rotateY(180deg) scale(1.14); } 100% { transform: rotateY(180deg) scale(1); } }

/* switch-lock slots */
#pz-display .slot.sw { width: 52px; font-size: 12px; font-weight: 900; color: #8a94a8; background: #e8ecf4; }
#pz-display .slot.sw.on { background: #26b59d; color: #fff; border-color: #157f6d; }
.pz-key.switchkey { min-width: 56px; font-size: 13px; }
.pz-key.shapekey { font-size: 22px; }

/* key catcher */
#kc-canvas { width: 100%; height: min(60vh, 460px); border-radius: 16px; display: block; touch-action: none; }
#kc-quit { margin-top: 10px; }

/* toast */
#toast {
  position: fixed; left: 50%; bottom: 24px; transform: translate(-50%, 90px);
  background: var(--ink); color: var(--white); font-weight: 700; font-size: 14.5px;
  padding: 12px 20px; border-radius: 999px; z-index: 120; max-width: 90vw; text-align: center;
  box-shadow: 0 12px 30px rgba(29,42,77,.4); transition: transform .25s ease;
}
#toast.show { transform: translate(-50%, 0); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
@media (max-width: 640px) {
  #quest-panel { width: 180px; transform: scale(.9); transform-origin: top left; }
  .pc-info .hud-xp { width: 80px; }
  .skill-label { flex-basis: 104px; }
}
```

---

## `js/data.js`

```js
/* Breakout Land — content data (mock content standing in for the Breakout EDU catalog) */

const DATA = {
  // The painted cast (assets/heroes.webp, 6x2 grid — index = sheet position)
  heroes: [
    { name: 'Nova' }, { name: 'Miles' }, { name: 'Pip' }, { name: 'Blaze' },
    { name: 'Sunny' }, { name: 'Ash' }, { name: 'Rio' }, { name: 'Specs' },
    { name: 'Buzz' }, { name: 'Skye' }, { name: 'Scout' }, { name: 'Ziggy' },
  ],
  trails: [
    { id: 'no-trail', name: 'No Trail', free: true },
    { id: 'sparkle',  name: 'Sparkle Trail', price: 35 },
    { id: 'bubbles',  name: 'Bubble Trail',  price: 45 },
    { id: 'rainbow',  name: 'Rainbow Trail', price: 80 },
  ],
  accessories: [
    { id: 'none',     name: 'None',          free: true },
    { id: 'cap',      name: 'Ball Cap',      price: 20 },
    { id: 'glasses',  name: 'Smart Glasses', price: 20 },
    { id: 'crown',    name: 'Key Crown',     price: 60 },
    { id: 'wizard',   name: 'Wizard Hat',    price: 50 },
    { id: 'cape',     name: 'Hero Cape',     price: 70 },
    { id: 'headband', name: 'Headband',      price: 15 },
  ],
  pets: [
    { id: 'nopet', name: 'No Pet', free: true },
    { id: 'fox',   name: 'Lockfox',    price: 90,  color: '#e8743c' },
    { id: 'owl',   name: 'Puzzle Owl', price: 90,  color: '#8a6db1' },
    { id: 'bot',   name: 'Key-Bot',    price: 120, color: '#9db4c4' },
  ],

  badges: [
    { id: 'first-breakout', name: 'First Breakout!',  desc: 'Complete your first game',            icon: 'lock' },
    { id: 'daily-3',        name: 'On a Roll',        desc: '3-day Lock of the Day streak',        icon: 'flame' },
    { id: 'key-50',         name: 'Key Collector',    desc: 'Earn 50 keys in total',               icon: 'key' },
    { id: 'mathlete',       name: 'Mathlete',         desc: 'Clear 3 Breakout Math nodes',         icon: 'math' },
    { id: 'challenge',      name: 'Challenge Champ',  desc: 'Beat a purple Challenge node',        icon: 'trophy' },
    { id: 'stylist',        name: 'Style Star',       desc: 'Buy your first Style Shop item',      icon: 'star' },
    { id: 'thinker',        name: 'Critical Thinker', desc: 'Solve a lock on the first try',       icon: 'bulb' },
    { id: 'persistent',     name: 'Never Give Up',    desc: 'Solve a lock after 3+ tries',         icon: 'heart' },
  ],

  // Lock of the Day pool — rotates by date
  dailyLocks: [
    { type: 'number', clue: 'I am a two-digit number. My tens digit is double my ones digit, and my digits add up to 9. Open the lock!', answer: '63', hint: 'Try digits that add to 9 where the first is twice the second.' },
    { type: 'word', clue: 'I have keys but open no locks, I have space but no room, you can enter but not go inside. What am I?', answer: 'KEYBOARD', hint: 'You might be using one right now…' },
    { type: 'color', clue: 'Mix-up at the paint shop! Enter the colors of: the sun, the ocean, grass, and a strawberry — in that order.', answer: ['yellow', 'blue', 'green', 'red'], hint: 'Sun → Ocean → Grass → Strawberry.' },
    { type: 'direction', clue: 'The treasure map says: toward the sunrise, then toward the mountains at the top, then sunrise again, then down the waterfall.', answer: ['right', 'up', 'right', 'down'], hint: 'Sunrise = East (right). Top of a map = up.' },
    { type: 'number', clue: 'Three friends share 24 cookies equally, then each eats 2. How many cookies does each friend have left?', answer: '6', hint: '24 ÷ 3 first, then subtract.' },
    { type: 'word', clue: 'The more you take, the more you leave behind. What are they?', answer: 'STEPS', hint: 'Think about walking.' },
    { type: 'number', clue: 'A clock shows 3:15. How many minutes until 4 o’clock?', answer: '45', hint: '60 minutes in an hour.' },
    { type: 'shape', clue: 'The wizard’s door whispers: “First 3 sides, then 4 sides, then no sides at all!”', answer: ['triangle', 'square', 'circle'], hint: 'Count each shape’s sides.' },
    { type: 'switch', clue: 'The power panel hums: “Flip ON only the ODD-numbered switches.”', answer: '10101', hint: 'Odd numbers: 1, 3, 5.' },
  ],

  // Assigned games — in production these embed the breakoutedu.com digital game player
  games: [
    {
      id: 'missing-mascot',
      name: 'The Case of the Missing Mascot',
      subject: 'ELA · Inference',
      grade: '3–5',
      story: 'Boomer the school mascot costume vanished the night before the big game! Follow the clues around the gym to figure out who borrowed it — and get it back before kickoff.',
      minutes: 15,
      locks: [
        { type: 'word', clue: 'Clue #1 — A note on the locker reads: “Take the first letter of each word: Basketballs Often Occupy My Storage Try Every Rack.”', answer: 'BOOMSTER', hint: 'First letter of each word, in order.' },
        { type: 'number', clue: 'Clue #2 — The janitor saw someone at “half past three”. Enter the time as 3 digits.', answer: '330', hint: 'Half past three = 3:30.' },
      ],
    },
    {
      id: 'space-escape',
      name: 'Space Station Escape',
      subject: 'Science · Problem Solving',
      grade: '3–5',
      story: 'A meteor shower knocked out the station’s main power! Reboot three systems and reach the escape pod before oxygen runs low. Work fast, think faster.',
      minutes: 20,
      locks: [
        { type: 'color', clue: 'Reboot panel — “Power flows like a rainbow, but skip every other color starting from red.” (red, orange, yellow, green, blue, purple)', answer: ['red', 'yellow', 'blue'], hint: 'Red, skip orange, yellow, skip green…' },
        { type: 'direction', clue: 'Airlock — The floor arrows spell the route: away from the meteor (it hit the left side), then toward the flashing light above, then above again, then toward the pod on the right.', answer: ['right', 'up', 'up', 'right'], hint: 'Away from left = right.' },
        { type: 'number', clue: 'Escape pod — “Oxygen: 88%. It drops 8% every minute. Enter how many minutes until it hits 48%.”', answer: '5', hint: '88 − 48 = 40, and 40 ÷ 8 = ?' },
      ],
    },
  ],

  // Breakout+ bonus content (subscription-gated)
  plusGames: [
    { id: 'pirate-cove', name: 'Mystery at Pirate Cove', subject: 'Social Studies', grade: 'K–2' },
    { id: 'time-machine', name: 'Dr. Tock’s Time Machine', subject: 'History', grade: '3–5' },
    { id: 'code-cave', name: 'The Coding Cave', subject: 'CS · Logic', grade: '3–5' },
    { id: 'sel-island', name: 'Friendship Island', subject: 'SEL', grade: 'K–2' },
  ],

  // Breakout Math — one sample unit trail per grade band (scoped & sequenced K–5)
  mathUnits: {
    K: { unit: 'Counting Camp', skills: 'Counting to 20 · comparing groups' },
    1: { unit: 'Addition Alley', skills: 'Add & subtract within 20' },
    2: { unit: 'Place Value Peaks', skills: 'Place value · 2-digit addition' },
    3: { unit: 'Multiplication Meadow', skills: 'Multiply & divide within 100' },
    4: { unit: 'Fraction Falls', skills: 'Fraction equivalence · comparison' },
    5: { unit: 'Decimal Desert', skills: 'Decimals · volume · order of operations' },
  },

  // Math puzzle generators per grade (returns {clue, answer} for a number lock)
  mathProblems: {
    K: [
      { clue: 'Count the keys: 🔑🔑🔑🔑🔑 + 🔑🔑🔑. How many keys in all?', answer: '8' },
      { clue: 'You have 4 balloons. 2 fly away! How many are left?', answer: '2' },
      { clue: 'Count by ones: 6, 7, 8, __? Enter the missing number.', answer: '9' },
    ],
    1: [
      { clue: '7 + 6 = ? Open the lock with the sum!', answer: '13' },
      { clue: '15 − 8 = ? Enter the difference.', answer: '7' },
      { clue: 'Double 9 is…?', answer: '18' },
    ],
    2: [
      { clue: 'What is 10 more than 47?', answer: '57' },
      { clue: '36 + 25 = ? Regroup carefully!', answer: '61' },
      { clue: 'In the number 83, how many TENS are there?', answer: '8' },
    ],
    3: [
      { clue: '7 × 8 = ? The classic! Enter the product.', answer: '56' },
      { clue: '54 ÷ 6 = ? Enter the quotient.', answer: '9' },
      { clue: 'An array has 4 rows of 6 chairs. How many chairs?', answer: '24' },
    ],
    4: [
      { clue: 'Which is bigger: 3/4 or 2/3? Enter the top number of the bigger fraction.', answer: '3' },
      { clue: '1/2 = ?/8 — enter the missing numerator.', answer: '4' },
      { clue: '6 × 40 = ? Enter the product.', answer: '240' },
    ],
    5: [
      { clue: '2.5 + 1.75 = ? Enter as digits, no decimal point (e.g. 4.25 → 425).', answer: '425' },
      { clue: 'Volume of a 3 × 4 × 2 box (cubic units)?', answer: '24' },
      { clue: '(8 + 4) ÷ 2 × 3 = ? Order of operations!', answer: '18' },
    ],
  },

  // Node layout for a math trail: type sequence along the path
  mathTrail: ['core', 'core', 'review', 'core', 'challenge', 'core', 'review', 'core', 'challenge', 'boss'],

  // Mock roster for teacher dashboard (the live player is appended as "You")
  roster: [
    { name: 'Ava R.',    level: 6, keys: 142, games: 9,  avgMin: 11.2, success: 0.92, streak: 5, arcade: true },
    { name: 'Diego M.',  level: 5, keys: 118, games: 8,  avgMin: 13.9, success: 0.88, streak: 2, arcade: true },
    { name: 'Jordan P.', level: 4, keys: 87,  games: 6,  avgMin: 16.4, success: 0.71, streak: 0, arcade: false },
    { name: 'Lily C.',   level: 7, keys: 203, games: 12, avgMin: 9.8,  success: 0.95, streak: 8, arcade: true },
    { name: 'Marcus T.', level: 3, keys: 54,  games: 4,  avgMin: 18.1, success: 0.64, streak: 1, arcade: true },
    { name: 'Nia W.',    level: 5, keys: 131, games: 8,  avgMin: 12.6, success: 0.85, streak: 3, arcade: true },
  ],

  // Comparison data: average minutes to breakout, per game (class / school / all players in age group)
  comparisons: [
    { game: 'Missing Mascot',   class: 12.4, school: 14.1, global: 15.8 },
    { game: 'Space Escape',     class: 17.2, school: 16.5, global: 18.9 },
    { game: 'Mult. Meadow 1–5', class: 8.1,  school: 9.4,  global: 10.2 },
  ],
  // Brand-derived series colors (validated for CVD + contrast):
  // class = Breakout Blue Light, school = Gamer Green (darkened step), global = Puzzling Purple
  chartColors: { class: '#0068ff', school: '#1c9a85', global: '#5c25b7' },

  parentWeek: [
    { day: 'Mon', min: 22 }, { day: 'Tue', min: 15 }, { day: 'Wed', min: 30 },
    { day: 'Thu', min: 0 },  { day: 'Fri', min: 25 }, { day: 'Sat', min: 12 }, { day: 'Sun', min: 0 },
  ],
};
```

---

## `js/state.js`

```js
/* Breakout Land — game state, economy, persistence */

const SAVE_KEY = 'breakoutLandSave.v2';

const defaultState = () => ({
  created: false,
  player: {
    name: '',
    hero: 4,
    accessory: 'none',
    pet: 'nopet',
    trail: 'no-trail',
  },
  keys: 15,
  totalKeys: 15,
  xp: 0,
  arcadeMin: 5,
  streak: 0,
  lastDaily: null,          // date string of last Lock of the Day completion
  unlocked: [],             // purchased item ids
  badges: [],
  gamesDone: {},            // gameId -> { minutes, attempts }
  mathStars: {},            // nodeKey (grade:index) -> stars
  mathAttempts: {},         // nodeKey -> attempts on current/last run
  mathGrade: 3,
  assigned: ['missing-mascot', 'space-escape'],
  perms: { teacherArcade: true, parentArcade: true, weeklyLimitMin: 120 },
  plus: true,               // teacher has Breakout+ (toggle in teacher view)
  pos: { x: 990, y: 648 },  // avatar position in world (just south of Lock Plaza)
});

let state = defaultState();

function saveState() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
}
function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) state = Object.assign(defaultState(), JSON.parse(raw));
  } catch (e) { state = defaultState(); }
}
function resetState() {
  state = defaultState();
  saveState();
}

/* ---- economy ---- */

const LEVELS = ['Rookie Solver', 'Clue Finder', 'Puzzle Pal', 'Code Cracker', 'Lock Whisperer',
  'Escape Artist', 'Puzzle Pro', 'Master of Locks', 'Breakout Legend'];

function levelInfo() {
  const lvl = Math.min(LEVELS.length, Math.floor(state.xp / 100) + 1);
  return { n: lvl, name: LEVELS[lvl - 1], into: state.xp % 100, next: 100 };
}

function grant({ keys = 0, xp = 0, arcade = 0 }) {
  state.keys += keys;
  state.totalKeys += Math.max(0, keys);
  state.xp += xp;
  if (state.perms.teacherArcade && state.perms.parentArcade) state.arcadeMin += arcade;
  checkBadges();
  saveState();
  updateHUD();
}

function awardBadge(id) {
  if (state.badges.includes(id)) return false;
  state.badges.push(id);
  const b = DATA.badges.find(b => b.id === id);
  toast(`🏅 Badge earned: ${b ? b.name : id}!`);
  saveState();
  return true;
}

function checkBadges() {
  if (state.totalKeys >= 50) awardBadge('key-50');
  if (Object.keys(state.gamesDone).length >= 1) awardBadge('first-breakout');
  if (state.streak >= 3) awardBadge('daily-3');
  const mathDone = Object.keys(state.mathStars).length;
  if (mathDone >= 3) awardBadge('mathlete');
  if (state.unlocked.length >= 1) awardBadge('stylist');
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function dailyLock() {
  // rotate through the pool by day-of-year
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 0);
  const day = Math.floor((d - start) / 86400000);
  return DATA.dailyLocks[day % DATA.dailyLocks.length];
}

function completeDaily() {
  const today = todayKey();
  if (state.lastDaily === today) return;
  const y = new Date(Date.now() - 86400000);
  const yKey = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
  state.streak = (state.lastDaily === yKey) ? state.streak + 1 : 1;
  state.lastDaily = today;
  grant({ keys: 10, xp: 25, arcade: 5 });
}

function arcadeAllowed() {
  return state.perms.teacherArcade && state.perms.parentArcade;
}

function itemOwned(item) {
  return item.free || state.unlocked.includes(item.id);
}

function buyItem(item) {
  if (itemOwned(item)) return true;
  if (state.keys < item.price) return false;
  state.keys -= item.price;
  state.unlocked.push(item.id);
  checkBadges();
  saveState();
  updateHUD();
  return true;
}
```

---

## `js/puzzles.js`

```js
/* Breakout Land — lock puzzle engine, celebration, sounds, toasts */

/* ---- tiny WebAudio chirps (no assets) ---- */
let audioCtx = null, muted = false;
function ac() {
  if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  return audioCtx;
}
function tone(freq, dur = .12, type = 'triangle', gain = .06, when = 0) {
  const ctx = ac(); if (!ctx || muted) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(gain, ctx.currentTime + when);
  g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + when + dur);
  o.connect(g); g.connect(ctx.destination);
  o.start(ctx.currentTime + when); o.stop(ctx.currentTime + when + dur + .02);
}
function blip(f = 700) { tone(f, .09, 'triangle', .05); }
function buzz() { tone(140, .18, 'sawtooth', .04); }
function fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .18, 'triangle', .07, i * .11)); }

/* ---- toast ---- */
let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

/* ---- confetti ---- */
function confetti() {
  const cv = document.getElementById('confetti');
  const ctx = cv.getContext('2d');
  cv.width = innerWidth; cv.height = innerHeight;
  cv.style.display = 'block';
  const colors = ['#ffb627', '#ff6b5b', '#2ec4b6', '#9b5de5', '#4cc9f0', '#ffd75e'];
  const bits = Array.from({ length: 140 }, () => ({
    x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * .5,
    vx: (Math.random() - .5) * 2.4, vy: 2 + Math.random() * 3.2,
    r: 3 + Math.random() * 5, a: Math.random() * Math.PI, va: (Math.random() - .5) * .3,
    c: colors[(Math.random() * colors.length) | 0], key: Math.random() < .12,
  }));
  const t0 = performance.now();
  (function loop(t) {
    ctx.clearRect(0, 0, cv.width, cv.height);
    bits.forEach(b => {
      b.x += b.vx; b.y += b.vy; b.a += b.va;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
      if (b.key) {
        ctx.fillStyle = '#ffb627';
        ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(2, -1.4, 8, 2.8); ctx.fillRect(7, 1, 2, 3); ctx.fillRect(10, 1, 2, 4);
      } else {
        ctx.fillStyle = b.c; ctx.fillRect(-b.r / 2, -b.r / 2, b.r, b.r * .6);
      }
      ctx.restore();
    });
    if (t - t0 < 2600) requestAnimationFrame(loop);
    else { cv.style.display = 'none'; }
  })(t0);
}

/* ---- lock puzzle engine ----
   Runs a sequence of locks; calls onWin({attempts, seconds}) when all open. */

const puzzle = { locks: [], idx: 0, attempts: 0, lockAttempts: 0, t0: 0, onWin: null, title: '', ctxLabel: '', entry: [] };

const COLOR_SET = [
  { id: 'red', c: '#e63946' }, { id: 'orange', c: '#f77f2f' }, { id: 'yellow', c: '#ffd75e' },
  { id: 'green', c: '#57c26b' }, { id: 'blue', c: '#3d7bd9' }, { id: 'purple', c: '#9b5de5' },
];
const DIR_SET = [
  { id: 'up', g: '▲' }, { id: 'down', g: '▼' }, { id: 'left', g: '◀' }, { id: 'right', g: '▶' },
];
const SHAPE_SET = [
  { id: 'triangle', g: '▲', c: '#ff6b5b' }, { id: 'square', g: '■', c: '#0068ff' },
  { id: 'circle', g: '●', c: '#26b59d' }, { id: 'diamond', g: '◆', c: '#ffb627' },
  { id: 'star', g: '★', c: '#9b5de5' },
];

function startPuzzle({ title, ctxLabel, locks, onWin }) {
  Object.assign(puzzle, { locks, idx: 0, attempts: 0, lockAttempts: 0, t0: Date.now(), onWin, title, ctxLabel, entry: [] });
  document.getElementById('pz-title').textContent = title;
  document.getElementById('pz-ctx').textContent = ctxLabel || '';
  document.getElementById('puzzle-modal').classList.add('open');
  renderLock();
}

function closePuzzle() {
  document.getElementById('puzzle-modal').classList.remove('open');
}

function renderLock() {
  const lk = puzzle.locks[puzzle.idx];
  puzzle.entry = [];
  puzzle.lockAttempts = 0;
  document.getElementById('pz-step').textContent =
    puzzle.locks.length > 1 ? `Lock ${puzzle.idx + 1} of ${puzzle.locks.length}` : 'One lock stands in your way';
  document.getElementById('pz-clue').textContent = lk.clue;
  document.getElementById('pz-hint').textContent = '';
  document.getElementById('pz-hint').classList.remove('show');
  const lockEl = document.getElementById('pz-lock');
  lockEl.classList.remove('open-anim', 'shake');

  const pad = document.getElementById('pz-pad');
  const disp = document.getElementById('pz-display');
  pad.innerHTML = ''; disp.innerHTML = '';

  const addKey = (label, fn, cls = '') => {
    const b = document.createElement('button');
    b.className = 'pz-key ' + cls; b.innerHTML = label; b.onclick = fn;
    pad.appendChild(b); return b;
  };

  if (lk.type === 'number') {
    disp.dataset.slots = String(lk.answer.length);
    updateEntryDisplay('digit');
    '1234567890'.split('').forEach(d =>
      addKey(d, () => { if (puzzle.entry.length < lk.answer.length) { puzzle.entry.push(d); blip(500 + puzzle.entry.length * 60); updateEntryDisplay('digit'); } }));
    addKey('⌫', () => { puzzle.entry.pop(); updateEntryDisplay('digit'); blip(300); }, 'wide');
    addKey('TRY IT', () => submitEntry(lk, puzzle.entry.join('')), 'go wide');
  } else if (lk.type === 'word') {
    disp.dataset.slots = String(lk.answer.length);
    updateEntryDisplay('letter');
    // every answer letter must stay on the pad — only pad out with extras
    const extras = pickExtraLetters(lk.answer);
    const padCount = Math.max(0, Math.max(10, lk.answer.length + 2) - lk.answer.length);
    const letters = shuffle((lk.answer + extras.slice(0, padCount)).split(''));
    letters.forEach(ch =>
      addKey(ch, () => { if (puzzle.entry.length < lk.answer.length) { puzzle.entry.push(ch); blip(520 + puzzle.entry.length * 40); updateEntryDisplay('letter'); } }));
    addKey('⌫', () => { puzzle.entry.pop(); updateEntryDisplay('letter'); blip(300); }, 'wide');
    addKey('TRY IT', () => submitEntry(lk, puzzle.entry.join('')), 'go wide');
  } else if (lk.type === 'color') {
    disp.dataset.slots = String(lk.answer.length);
    updateEntryDisplay('color');
    COLOR_SET.forEach(cs =>
      addKey(`<span class="dot" style="background:${cs.c}"></span>`, () => {
        if (puzzle.entry.length < lk.answer.length) { puzzle.entry.push(cs.id); blip(480 + puzzle.entry.length * 70); updateEntryDisplay('color'); }
      }, 'colorkey'));
    addKey('⌫', () => { puzzle.entry.pop(); updateEntryDisplay('color'); blip(300); }, 'wide');
    addKey('TRY IT', () => submitEntry(lk, puzzle.entry.join(',')), 'go wide');
  } else if (lk.type === 'direction') {
    disp.dataset.slots = String(lk.answer.length);
    updateEntryDisplay('dir');
    DIR_SET.forEach(ds =>
      addKey(ds.g, () => {
        if (puzzle.entry.length < lk.answer.length) { puzzle.entry.push(ds.id); blip(460 + puzzle.entry.length * 70); updateEntryDisplay('dir'); }
      }, 'dirkey'));
    addKey('⌫', () => { puzzle.entry.pop(); updateEntryDisplay('dir'); blip(300); }, 'wide');
    addKey('TRY IT', () => submitEntry(lk, puzzle.entry.join(',')), 'go wide');
  } else if (lk.type === 'shape') {
    disp.dataset.slots = String(lk.answer.length);
    updateEntryDisplay('shape');
    SHAPE_SET.forEach(ss =>
      addKey(`<span style="color:${ss.c}">${ss.g}</span>`, () => {
        if (puzzle.entry.length < lk.answer.length) { puzzle.entry.push(ss.id); blip(500 + puzzle.entry.length * 70); updateEntryDisplay('shape'); }
      }, 'shapekey'));
    addKey('⌫', () => { puzzle.entry.pop(); updateEntryDisplay('shape'); blip(300); }, 'wide');
    addKey('TRY IT', () => submitEntry(lk, puzzle.entry.join(',')), 'go wide');
  } else if (lk.type === 'switch') {
    // a row of toggles; flip the right ones ON
    puzzle.entry = Array(lk.answer.length).fill('0');
    disp.dataset.slots = String(lk.answer.length);
    updateEntryDisplay('switch');
    for (let i = 0; i < lk.answer.length; i++) {
      addKey(`SW ${i + 1}`, () => {
        puzzle.entry[i] = puzzle.entry[i] === '1' ? '0' : '1';
        blip(puzzle.entry[i] === '1' ? 760 : 420);
        updateEntryDisplay('switch');
      }, 'switchkey');
    }
    addKey('TRY IT', () => submitEntry(lk, puzzle.entry.join('')), 'go wide');
  }
}

function updateEntryDisplay(kind) {
  const disp = document.getElementById('pz-display');
  const slots = parseInt(disp.dataset.slots || '4', 10);
  disp.innerHTML = '';
  for (let i = 0; i < slots; i++) {
    const s = document.createElement('span');
    s.className = 'slot';
    const v = puzzle.entry[i];
    if (kind === 'switch') {
      s.classList.add('filled', 'sw');
      s.classList.toggle('on', puzzle.entry[i] === '1');
      s.textContent = puzzle.entry[i] === '1' ? 'ON' : 'OFF';
    } else if (v !== undefined) {
      s.classList.add('filled');
      if (kind === 'color') { s.innerHTML = `<span class="dot" style="background:${COLOR_SET.find(c => c.id === v).c}"></span>`; }
      else if (kind === 'dir') { s.textContent = DIR_SET.find(d => d.id === v).g; }
      else if (kind === 'shape') { const sh = SHAPE_SET.find(t => t.id === v); s.innerHTML = `<span style="color:${sh.c}">${sh.g}</span>`; }
      else { s.textContent = v; }
    }
    disp.appendChild(s);
  }
}

function submitEntry(lk, entered) {
  const want = Array.isArray(lk.answer) ? lk.answer.join(',') : String(lk.answer).toUpperCase();
  const got = String(entered).toUpperCase();
  puzzle.attempts++; puzzle.lockAttempts++;
  if (got === want.toUpperCase()) {
    // lock pops open
    tone(880, .15); tone(1175, .2, 'triangle', .07, .1);
    document.getElementById('pz-lock').classList.add('open-anim');
    if (puzzle.lockAttempts === 1) awardBadge('thinker');
    if (puzzle.lockAttempts >= 3) awardBadge('persistent');
    setTimeout(() => {
      puzzle.idx++;
      if (puzzle.idx < puzzle.locks.length) {
        toast('Click! One down — next lock! 🔓');
        renderLock();
      } else {
        const seconds = Math.round((Date.now() - puzzle.t0) / 1000);
        closePuzzle();
        celebration(puzzle.title, puzzle.attempts, seconds, () => puzzle.onWin({ attempts: puzzle.attempts, seconds }));
      }
    }, 750);
  } else {
    buzz();
    const lockEl = document.getElementById('pz-lock');
    lockEl.classList.remove('shake'); void lockEl.offsetWidth; lockEl.classList.add('shake');
    puzzle.entry = lk.type === 'switch' ? Array(lk.answer.length).fill('0') : [];
    updateEntryDisplay({ number: 'digit', word: 'letter', color: 'color', direction: 'dir', shape: 'shape', switch: 'switch' }[lk.type]);
    if (puzzle.lockAttempts >= 2 && lk.hint) {
      const h = document.getElementById('pz-hint');
      h.textContent = '💡 Hint: ' + lk.hint;
      h.classList.add('show');
    }
    toast('Not quite — look at the clue again. You’ve got this!');
  }
}

function celebration(title, attempts, seconds, onDone) {
  confetti(); fanfare();
  document.getElementById('cel-title').textContent = 'YOU BROKE OUT!';
  document.getElementById('cel-sub').textContent = title;
  document.getElementById('cel-stats').innerHTML =
    `<span>⏱ ${Math.floor(seconds / 60)}m ${seconds % 60}s</span><span>🎯 ${attempts} ${attempts === 1 ? 'try' : 'tries'}</span>`;
  const modal = document.getElementById('cel-modal');
  modal.classList.add('open');
  document.getElementById('cel-btn').onclick = () => {
    modal.classList.remove('open');
    onDone && onDone();
  };
}

/* helpers */
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
function pickExtraLetters(word) {
  const pool = 'AEIOURSTLNM';
  let out = '';
  while (out.length < 4) { const ch = pool[(Math.random() * pool.length) | 0]; if (!word.includes(ch)) out += ch; }
  return out;
}
```

---

## `js/avatar.js`

```js
/* Breakout Land — painted hero sprites (AI-generated cast) + creator UI.
   The 12 explorers live in assets/heroes.webp (6x2 grid, 300x470 cells,
   feet anchored 10px above each cell's bottom). Accessories, pets and
   walk trails are drawn as overlays so the keys economy stays alive. */

const HERO_CELL = { w: 300, h: 470, cols: 6 };
const heroImg = new Image();
let heroReady = false;
heroImg.onload = () => { heroReady = true; };
heroImg.src = (typeof window !== 'undefined' && window.ASSETS && window.ASSETS.heroes) ? window.ASSETS.heroes : 'assets/heroes.webp';

/* per-hero forehead tone (sampled from the sheet) for blink eyelids */
let heroTones = null;
function sampleHeroTones() {
  if (heroTones || !heroReady) return;
  try {
    const cv = document.createElement('canvas');
    cv.width = heroImg.width; cv.height = heroImg.height;
    const c = cv.getContext('2d');
    c.drawImage(heroImg, 0, 0);
    heroTones = [];
    for (let k = 0; k < 12; k++) {
      const px = (k % 6) * HERO_CELL.w + 150, py = ((k / 6) | 0) * HERO_CELL.h + 132;
      const d = c.getImageData(px, py, 1, 1).data;
      heroTones.push(d[3] > 100 ? `rgb(${d[0]},${d[1]},${d[2]})` : '#e8b48c');
    }
  } catch (e) { heroTones = Array(12).fill('#e8b48c'); }
}

/**
 * Draw a hero sprite centered at x with feet at y.
 * cfg: { hero, accessory, ... } — height ≈ 118 * scale.
 * dir may be fractional (eased turn).
 */
function drawAvatar(ctx, x, y, scale, cfg, frame = 0, walking = false, dir = 1) {
  const hero = cfg && Number.isInteger(cfg.hero) ? Math.max(0, Math.min(11, cfg.hero)) : 0;
  const dh = 126 * scale;
  const dw = dh * (HERO_CELL.w / HERO_CELL.h);
  const col = hero % HERO_CELL.cols, row = (hero / HERO_CELL.cols) | 0;

  // eased gait: bob + tiny squash-and-stretch, gentle idle breathing
  const bob = walking ? Math.abs(Math.sin(frame * 9)) * 5 * scale : Math.sin(frame * 2.2) * 1.6 * scale;
  const lean = walking ? Math.sin(frame * 9) * .05 : 0;
  const squash = walking ? 1 + Math.sin(frame * 18) * .035 : 1 + Math.sin(frame * 2.2) * .012;
  const face = Math.abs(dir) < .22 ? (dir < 0 ? -.22 : .22) : dir; // never fully flat mid-turn

  // soft ground shadow syncs with the hop
  const shScale = 1 - (bob / (14 * scale));
  ctx.fillStyle = 'rgba(20,35,25,.22)';
  ctx.beginPath(); ctx.ellipse(x, y + 2 * scale, 20 * scale * shScale, 6 * scale * shScale, 0, 0, Math.PI * 2); ctx.fill();

  ctx.save();
  ctx.translate(x, y - bob);
  ctx.rotate(lean);
  ctx.scale(face, squash);

  // head geometry for accessory overlays (chibi grid is uniform enough)
  const headCY = -dh * .655;
  const headR = dh * .21;

  if (cfg && cfg.accessory === 'cape') {
    ctx.fillStyle = '#d63e2e';
    ctx.beginPath();
    ctx.moveTo(-dw * .22, -dh * .48);
    ctx.quadraticCurveTo(-dw * .48, -dh * .22, -dw * .34 - lean * 40, -dh * .03);
    ctx.lineTo(dw * .26, -dh * .06);
    ctx.quadraticCurveTo(dw * .34, -dh * .28, dw * .22, -dh * .48);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(40,34,56,.4)'; ctx.lineWidth = 2 * scale; ctx.stroke();
  }

  if (heroReady) {
    ctx.drawImage(heroImg, col * HERO_CELL.w, row * HERO_CELL.h, HERO_CELL.w, HERO_CELL.h, -dw / 2, -dh, dw, dh);
    // blink: skin-tone eyelids sweep down every few seconds
    sampleHeroTones();
    const bcycle = (frame * .9 + hero * 1.37) % 3.8;
    if (bcycle < .13 && heroTones) {
      ctx.fillStyle = heroTones[hero];
      const eyeY = headCY + headR * .08, eyeDX = headR * .36;
      ctx.beginPath(); ctx.ellipse(-eyeDX, eyeY, headR * .22, headR * .15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(eyeDX, eyeY, headR * .22, headR * .15, 0, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    // loading fallback: simple silhouette
    ctx.fillStyle = '#7da8d8';
    ctx.beginPath(); ctx.arc(0, headCY, headR, 0, Math.PI * 2); ctx.fill();
    roundRect(ctx, -dw * .18, -dh * .5, dw * .36, dh * .42, 8 * scale); ctx.fill();
  }

  // accessory overlays
  const acc = cfg && cfg.accessory;
  ctx.lineWidth = 2.4 * scale;
  if (acc === 'cap') {
    ctx.fillStyle = '#2f6fdb';
    ctx.beginPath(); ctx.arc(0, headCY - headR * .34, headR * .92, Math.PI, 0); ctx.fill();
    roundRect(ctx, headR * .1, headCY - headR * .62, headR * 1.35, headR * .3, headR * .15); ctx.fill();
    ctx.strokeStyle = 'rgba(40,34,56,.45)'; ctx.stroke();
  } else if (acc === 'glasses') {
    ctx.strokeStyle = '#173a6b';
    ctx.beginPath(); ctx.arc(-headR * .38, headCY + headR * .1, headR * .3, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(headR * .38, headCY + headR * .1, headR * .3, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-headR * .08, headCY + headR * .1); ctx.lineTo(headR * .08, headCY + headR * .1); ctx.stroke();
  } else if (acc === 'crown') {
    const ty = headCY - headR * .92;
    ctx.fillStyle = '#ffb627';
    ctx.beginPath();
    ctx.moveTo(-headR * .62, ty); ctx.lineTo(-headR * .62, ty - headR * .55); ctx.lineTo(-headR * .3, ty - headR * .22);
    ctx.lineTo(0, ty - headR * .62); ctx.lineTo(headR * .3, ty - headR * .22); ctx.lineTo(headR * .62, ty - headR * .55);
    ctx.lineTo(headR * .62, ty);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(40,34,56,.45)'; ctx.stroke();
    ctx.fillStyle = '#ff6b5b';
    ctx.beginPath(); ctx.arc(0, ty - headR * .18, headR * .12, 0, Math.PI * 2); ctx.fill();
  } else if (acc === 'wizard') {
    const ty = headCY - headR * .8;
    ctx.fillStyle = '#5b3fbf';
    ctx.beginPath();
    ctx.moveTo(-headR * .95, ty); ctx.lineTo(headR * .95, ty); ctx.lineTo(headR * .18, ty - headR * 1.5);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(40,34,56,.45)'; ctx.stroke();
    ctx.fillStyle = '#ffd75e';
    drawStar(ctx, headR * .1, ty - headR * .7, 5, headR * .16, headR * .075); ctx.fill();
  } else if (acc === 'headband') {
    ctx.fillStyle = '#ff6b5b';
    roundRect(ctx, -headR * .95, headCY - headR * .55, headR * 1.9, headR * .26, headR * .13); ctx.fill();
    ctx.strokeStyle = 'rgba(40,34,56,.35)'; ctx.stroke();
  }

  ctx.restore();
}

/* Head-and-shoulders portrait crop for HUD chips */
function drawHeroPortrait(ctx, size, hero) {
  const col = (hero % HERO_CELL.cols) * HERO_CELL.w, row = ((hero / HERO_CELL.cols) | 0) * HERO_CELL.h;
  ctx.clearRect(0, 0, size, size);
  if (heroReady) {
    ctx.drawImage(heroImg, col + 35, row + 15, 230, 230, 0, 0, size, size);
  }
}

function drawPet(ctx, x, y, scale, petId, frame) {
  const pet = DATA.pets.find(p => p.id === petId);
  if (!pet || petId === 'nopet') return;
  const s = scale;
  const hop = Math.abs(Math.sin(frame * 6)) * 4 * s;
  ctx.save(); ctx.translate(x, y - hop);
  ctx.fillStyle = 'rgba(20,35,25,.15)';
  ctx.beginPath(); ctx.ellipse(0, hop, 8 * s, 2.5 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = pet.color;
  ctx.beginPath(); ctx.arc(0, -8 * s, 7 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -17 * s, 5.5 * s, 0, Math.PI * 2); ctx.fill();
  if (petId === 'fox' || petId === 'owl') {
    ctx.beginPath(); ctx.moveTo(-5 * s, -20 * s); ctx.lineTo(-3 * s, -26 * s); ctx.lineTo(-1 * s, -20 * s); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(1 * s, -20 * s); ctx.lineTo(3 * s, -26 * s); ctx.lineTo(5 * s, -20 * s); ctx.closePath(); ctx.fill();
  }
  if (petId === 'bot') {
    ctx.strokeStyle = pet.color; ctx.lineWidth = 1.5 * s;
    ctx.beginPath(); ctx.moveTo(0, -22 * s); ctx.lineTo(0, -26 * s); ctx.stroke();
    ctx.fillStyle = '#ff6b5b'; ctx.beginPath(); ctx.arc(0, -27 * s, 1.6 * s, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#22252e';
  ctx.beginPath(); ctx.arc(-2 * s, -17.5 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(2 * s, -17.5 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
  // every so often the pet floats a little heart
  const hc = (frame * .8 + x * .01) % 7;
  if (hc < 1.1) {
    const t = hc / 1.1;
    ctx.save(); ctx.globalAlpha = (1 - t) * .9;
    ctx.fillStyle = '#ff7d9c';
    const hy = -26 * s - t * 22 * s, hs = (2.6 + t * 1.4) * s;
    ctx.beginPath();
    ctx.arc(-hs * .5, hy, hs * .55, 0, Math.PI * 2);
    ctx.arc(hs * .5, hy, hs * .55, 0, Math.PI * 2);
    ctx.moveTo(-hs, hy + hs * .2); ctx.lineTo(0, hy + hs * 1.4); ctx.lineTo(hs, hy + hs * .2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/* helpers */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function drawStar(ctx, cx, cy, points, outer, inner) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/* ---- Avatar creator screen ---- */

let creatorRAF = null;

function openAvatarCreator(isEdit) {
  showScreen('avatar');
  const p = state.player;
  document.getElementById('av-name').value = p.name;
  document.getElementById('av-title').textContent = isEdit ? 'The Closet' : 'Choose Your Explorer';
  document.getElementById('av-done').textContent = isEdit ? 'Save Look' : 'Start Exploring!';

  buildHeroGrid(p);
  buildItemRow('av-acc', DATA.accessories, p.accessory, v => { p.accessory = v; });
  buildItemRow('av-pet', DATA.pets, p.pet, v => { p.pet = v; });
  buildItemRow('av-trail', DATA.trails, p.trail, v => { p.trail = v; });

  const cv = document.getElementById('av-canvas');
  const ctx = cv.getContext('2d');
  cancelAnimationFrame(creatorRAF);
  const t0 = performance.now();
  (function loop(t) {
    const sec = (t - t0) / 1000;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(0,45,114,.08)';
    ctx.beginPath(); ctx.ellipse(cv.width / 2, cv.height - 26, 74, 16, 0, 0, Math.PI * 2); ctx.fill();
    drawAvatar(ctx, cv.width / 2, cv.height - 30, 1.75, state.player, sec, false, 1);
    drawPet(ctx, cv.width / 2 + 82, cv.height - 30, 1.6, state.player.pet, sec);
    if (document.getElementById('screen-avatar').classList.contains('active')) {
      creatorRAF = requestAnimationFrame(loop);
    }
  })(t0);
}

function buildHeroGrid(p) {
  const el = document.getElementById('av-heroes');
  el.innerHTML = '';
  DATA.heroes.forEach((h, i) => {
    const b = document.createElement('button');
    b.className = 'hero-card' + (i === p.hero ? ' sel' : '');
    const cv = document.createElement('canvas');
    cv.width = 74; cv.height = 104;
    b.appendChild(cv);
    const nm = document.createElement('span');
    nm.textContent = h.name;
    b.appendChild(nm);
    b.onclick = () => {
      p.hero = i;
      [...el.children].forEach(c => c.classList.remove('sel'));
      b.classList.add('sel');
      blip(620);
    };
    el.appendChild(b);
    const paint = () => {
      const c = cv.getContext('2d');
      c.clearRect(0, 0, 74, 104);
      drawAvatar(c, 37, 99, .78, { hero: i, accessory: 'none' }, 0, false, 1);
    };
    if (heroReady) paint();
    else heroImg.addEventListener('load', paint, { once: true });
  });
}

function buildItemRow(elId, items, current, onPick) {
  const el = document.getElementById(elId);
  el.innerHTML = '';
  items.forEach(it => {
    const owned = itemOwned(it);
    const b = document.createElement('button');
    b.className = 'chip' + (it.id === current ? ' sel' : '') + (owned ? '' : ' locked');
    b.innerHTML = owned ? it.name : `🔒 ${it.name} · <span class="price">${it.price}🔑</span>`;
    b.onclick = () => {
      if (!owned) { toast(`Unlock ${it.name} in the Style Shop for ${it.price} keys!`); buzz(); return; }
      onPick(it.id);
      [...el.children].forEach(c => c.classList.remove('sel')); b.classList.add('sel'); blip(620);
    };
    el.appendChild(b);
  });
}

function finishAvatar() {
  const name = document.getElementById('av-name').value.trim();
  state.player.name = name || 'Explorer';
  const first = !state.created;
  state.created = true;
  saveState();
  if (first) toast(`Welcome to Breakout Land, ${state.player.name}! 🎉`);
  enterWorld();
}
```

---

## `js/world.js`

```js
/* Breakout Land — the walkable island, rendered from AI-painted map art
   (Canva-generated world plate). The playable layer — avatar, NPCs,
   location pins, quests — runs on top of the painting. */

const WORLD = { w: 1920, h: 1080 };

/* The painted terrain */
const mapImg = new Image();
let mapReady = false;
mapImg.onload = () => { mapReady = true; };
mapImg.src = (typeof window !== 'undefined' && window.WORLD_MAP_SRC) ? window.WORLD_MAP_SRC : 'assets/world-map.jpg';

/* Locations anchored to landmarks in the painting */
const BUILDINGS = [
  { id: 'daily',  name: 'Lock Plaza',     icon: '🔐', x: 990,  y: 520, pinY: -66 },
  { id: 'games',  name: 'Game Hall',      icon: '🚩', x: 1330, y: 445, pinY: -96 },
  { id: 'badges', name: 'Badge Hall',     icon: '🏅', x: 737,  y: 385, pinY: -66 },
  { id: 'plus',   name: 'Breakout+ Club', icon: '✨', x: 518,  y: 345, pinY: -56 },
  { id: 'arcade', name: 'The Arcade',     icon: '🕹️', x: 1398, y: 748, pinY: -60 },
  { id: 'shop',   name: 'Style Shop',     icon: '👕', x: 636,  y: 572, pinY: -56 },
  { id: 'math',   name: 'Math Trail',     icon: '➗', x: 1148, y: 662, pinY: -58 },
];

/* Walkable land: polygon traced around the painted island, minus the
   lagoon and the plaza centerpiece */
const LAND = [
  [575, 110], [900, 95], [1150, 120], [1330, 160], [1540, 210], [1680, 310], [1745, 470],
  [1700, 630], [1600, 750], [1500, 870], [1300, 955], [1060, 985], [860, 950], [720, 895],
  [610, 830], [520, 770], [400, 730], [300, 690], [235, 590], [230, 470], [300, 375],
  [420, 300], [500, 255], [540, 180],
];
const BLOCKS = [
  { x: 510, y: 550, r: 96 },   // lagoon cove
  { x: 560, y: 610, r: 52 },   // lagoon inlet channel
  { x: 625, y: 675, r: 46 },   // channel toward the dock (dock itself stays walkable)
  { x: 990, y: 518, r: 44 },   // plaza well centerpiece
];
function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function canWalk(x, y) {
  return inPoly(x, y, LAND) && !BLOCKS.some(b => Math.hypot(x - b.x, y - b.y) < b.r);
}

/* Idle NPCs living in the painting (name pills in brand colors) */
const NPCS = [
  { name: 'Leo',  color: '#0068ff', mode: 'fish',   x: 560, y: 812, dir: -1, cfg: { hero: 7, accessory: 'none' } },
  { name: 'Maya', color: '#c914a7', mode: 'read',   x: 1268, y: 600, dir: -1, cfg: { hero: 0, accessory: 'none' } },
  { name: 'Zoe',  color: '#26b59d', mode: 'wander', cx: 990, cy: 622, r: 95, speed: .3, dir: 1, cfg: { hero: 11, accessory: 'none' } },
  { name: 'Kai',  color: '#5c25b7', mode: 'sit',    x: 590, y: 390, dir: -1, cfg: { hero: 9, accessory: 'none' } },
];

const SPARKLE_KEYS = [[865, 300], [1245, 565], [770, 705], [1445, 618], [1085, 862]];

const world = {
  cv: null, ctx: null, raf: null,
  keysDown: {}, target: null, nearBuilding: null,
  dir: 1, walking: false, t0: 0, clouds: [], birds: [], trailFx: [],
  cam: null, dustFx: [], lastDust: 0,
};

/* NPC chatter — bubbles cycle on a stagger; greeting overrides when close */
const NPC_LINES = {
  Leo: ['The fish love math jokes. 🎣', 'Caught anything? Me neither.', 'Crack the Lock of the Day yet?'],
  Maya: ['This mystery book is SO good!', 'The Badge Hall has new trophies!', 'Reading = brain superpowers.'],
  Zoe: ['Race you to the Arcade!', 'Ooh, I love your trail!', 'The Math Trail boss is TOUGH.'],
  Kai: ['Cocoa + puzzles = best day.', 'Breakout+ has secret games!', 'Stay curious, explorer.'],
};

function enterWorld() {
  showScreen('world');
  updateHUD();
  if (!world.cv) initWorld();
  // players saved before the painted-map update spawn inside the old island
  if (!canWalk(state.pos.x, state.pos.y)) { state.pos.x = 990; state.pos.y = 648; }
  world.t0 = performance.now();
  cancelAnimationFrame(world.raf);
  worldLoop(world.t0);
}

function initWorld() {
  world.cv = document.getElementById('world-canvas');
  world.ctx = world.cv.getContext('2d');
  world.clouds = Array.from({ length: 5 }, (_, i) => ({
    x: (i * 380) % WORLD.w, y: 30 + (i * 97) % 130, s: .7 + (i % 3) * .3, v: 8 + (i % 3) * 5,
  }));
  world.birds = Array.from({ length: 3 }, (_, i) => ({ off: i * 7.2, y: 80 + i * 50, v: 42 + i * 9 }));

  addEventListener('keydown', e => {
    if (!screenIs('world')) return;
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    world.keysDown[e.key.toLowerCase()] = true;
    if ((e.key === 'e' || e.key === 'E' || e.key === 'Enter') && world.nearBuilding) {
      openBuilding(world.nearBuilding.id);
    }
    if (e.key.startsWith('Arrow')) e.preventDefault();
  });
  addEventListener('keyup', e => { world.keysDown[e.key.toLowerCase()] = false; });

  const toWorldXY = (e) => {
    const r = world.cv.getBoundingClientRect();
    const scale = getViewScale();
    const cam = getCamera(scale);
    return { x: cam.x + (e.clientX - r.left) / scale, y: cam.y + (e.clientY - r.top) / scale };
  };
  world.cv.addEventListener('pointerdown', e => {
    const p = toWorldXY(e);
    const b = BUILDINGS.find(b => Math.hypot(p.x - b.x, p.y - (b.y + b.pinY * .5)) < 85);
    if (b && world.nearBuilding && b.id === world.nearBuilding.id) { openBuilding(b.id); return; }
    world.target = p;
  });

  document.getElementById('enter-btn').addEventListener('click', () => {
    if (world.nearBuilding) openBuilding(world.nearBuilding.id);
  });
}

function getViewScale() {
  const vw = world.cv.clientWidth, vh = world.cv.clientHeight;
  return Math.max(vw / 1240, vh / 880, .62);
}
function cameraTarget(scale) {
  const vw = world.cv.clientWidth / scale, vh = world.cv.clientHeight / scale;
  let tx = state.pos.x - vw / 2, ty = state.pos.y - vh / 2;
  tx = Math.max(0, Math.min(WORLD.w - vw, tx));
  ty = Math.max(0, Math.min(WORLD.h - vh, ty));
  return { tx, ty, vw, vh };
}
function getCamera(scale) {
  const { tx, ty, vw, vh } = cameraTarget(scale);
  if (!world.cam) world.cam = { x: tx, y: ty };
  return { x: world.cam.x, y: world.cam.y, vw, vh };
}
function updateCamera(scale) {
  const { tx, ty } = cameraTarget(scale);
  if (!world.cam) world.cam = { x: tx, y: ty };
  world.cam.x += (tx - world.cam.x) * .085;
  world.cam.y += (ty - world.cam.y) * .085;
}

function worldLoop(t) {
  if (!screenIs('world')) return;
  const sec = (t - world.t0) / 1000;
  stepPlayer();
  updateCamera(getViewScale());
  drawWorld(sec);
  world.raf = requestAnimationFrame(worldLoop);
}

function stepPlayer() {
  const sp = 4.6;
  let dx = 0, dy = 0;
  const k = world.keysDown;
  if (k['arrowleft'] || k['a']) dx -= 1;
  if (k['arrowright'] || k['d']) dx += 1;
  if (k['arrowup'] || k['w']) dy -= 1;
  if (k['arrowdown'] || k['s']) dy += 1;

  let vx = 0, vy = 0;
  if (dx || dy) {
    world.target = null;
    const len = Math.hypot(dx, dy);
    vx = (dx / len) * sp; vy = (dy / len) * sp;
  } else if (world.target) {
    const tx = world.target.x - state.pos.x, ty = world.target.y - state.pos.y;
    const d = Math.hypot(tx, ty);
    if (d < 6) { world.target = null; }
    else { vx = (tx / d) * sp; vy = (ty / d) * sp; }
  }

  world.walking = !!(vx || vy);
  if (vx) world.dir = vx > 0 ? 1 : -1;
  // eased facing: characters turn instead of snapping
  if (world.face === undefined) world.face = world.dir;
  world.face += (world.dir - world.face) * .28;

  // slide along coastline: try full move, then each axis
  const nx = state.pos.x + vx, ny = state.pos.y + vy;
  if (canWalk(nx, ny)) { state.pos.x = nx; state.pos.y = ny; }
  else if (canWalk(nx, state.pos.y)) { state.pos.x = nx; if (world.target) world.target.y = state.pos.y; }
  else if (canWalk(state.pos.x, ny)) { state.pos.y = ny; if (world.target) world.target.x = state.pos.x; }
  else { world.walking = false; world.target = null; }

  world.nearBuilding = null;
  for (const b of BUILDINGS) {
    if (Math.hypot(state.pos.x - b.x, state.pos.y - b.y) < 105) { world.nearBuilding = b; break; }
  }
  const btn = document.getElementById('enter-btn');
  if (world.nearBuilding) {
    btn.classList.add('show');
    btn.textContent = `Enter ${world.nearBuilding.name} ✦`;
  } else {
    btn.classList.remove('show');
  }
}

/* =============== rendering =============== */

function drawWorld(sec) {
  const cv = world.cv, ctx = world.ctx;
  const dpr = window.devicePixelRatio || 1;
  const wpx = Math.round(cv.clientWidth * dpr), hpx = Math.round(cv.clientHeight * dpr);
  if (cv.width !== wpx || cv.height !== hpx) { cv.width = wpx; cv.height = hpx; }
  ctx.save();
  ctx.scale(dpr, dpr);

  const scale = getViewScale();
  const cam = getCamera(scale);
  const W = cv.clientWidth, H = cv.clientHeight;

  // deep-sea fill behind/while the painting loads
  ctx.fillStyle = '#1f7fae';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-cam.x, -cam.y);

  if (mapReady) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(mapImg, 0, 0, WORLD.w, WORLD.h);
  }

  // drifting cloud shadows over the island
  ctx.fillStyle = 'rgba(10,30,60,.07)';
  for (let i = 0; i < 3; i++) {
    const sx = ((sec * (14 + i * 5) + i * 700) % (WORLD.w + 700)) - 350;
    const sy = 260 + i * 260;
    ctx.beginPath(); ctx.ellipse(sx, sy, 210, 90, .2, 0, Math.PI * 2); ctx.fill();
  }

  // shoreline glints
  const GLINTS = [[760, 940], [1310, 890], [1620, 560], [330, 640], [700, 150], [1490, 300]];
  GLINTS.forEach(([gx, gy], i) => {
    const tw = Math.max(0, Math.sin(sec * 2.2 + i * 1.9));
    if (tw < .55) return;
    ctx.save(); ctx.globalAlpha = (tw - .55) * 1.8;
    ctx.fillStyle = '#ffffff';
    drawStar(ctx, gx, gy, 4, 7 * tw, 2.4 * tw); ctx.fill();
    ctx.restore();
  });

  // bees looping near the meadow flowers
  for (let i = 0; i < 2; i++) {
    const t = sec * (1.1 + i * .3) + i * 3;
    const bx = 830 + i * 380 + Math.sin(t) * 60;
    const by = 700 - i * 340 + Math.sin(t * 2) * 26;
    ctx.save(); ctx.translate(bx, by);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    const wf = Math.sin(sec * 30 + i) * 3;
    ctx.beginPath(); ctx.ellipse(-2, -5, 4, 2.2 + wf * .3, -.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd75e';
    ctx.beginPath(); ctx.ellipse(0, 0, 5, 3.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3a3348'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-1.5, -3); ctx.lineTo(-1.5, 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1.8, -2.6); ctx.lineTo(1.8, 2.6); ctx.stroke();
    ctx.restore();
  }

  // footstep dust
  if (world.walking && sec - world.lastDust > .16) {
    world.lastDust = sec;
    world.dustFx.push({ x: state.pos.x - world.dir * 10 + (Math.random() - .5) * 8, y: state.pos.y + 2, t: sec });
    if (world.dustFx.length > 14) world.dustFx.shift();
  }
  world.dustFx = world.dustFx.filter(p => sec - p.t < .55);
  world.dustFx.forEach(p => {
    const k = (sec - p.t) / .55;
    ctx.save(); ctx.globalAlpha = (1 - k) * .4;
    ctx.fillStyle = '#e8d9b2';
    ctx.beginPath(); ctx.arc(p.x, p.y - k * 6, 3 + k * 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });

  // near-building ground glow
  if (world.nearBuilding) {
    const b = world.nearBuilding;
    const pulse = .42 + Math.sin(sec * 4) * .16;
    const g = ctx.createRadialGradient(b.x, b.y + 14, 8, b.x, b.y + 14, 120);
    g.addColorStop(0, `rgba(255,233,138,${pulse})`); g.addColorStop(1, 'rgba(255,233,138,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(b.x, b.y + 14, 120, 52, 0, 0, Math.PI * 2); ctx.fill();
  }

  // floating sparkle keys
  SPARKLE_KEYS.forEach(([kx, ky], i) => {
    const fl = Math.sin(sec * 2 + i * 1.7) * 6;
    ctx.save(); ctx.globalAlpha = .6 + Math.sin(sec * 3 + i) * .25;
    ctx.translate(kx, ky + fl); ctx.rotate(Math.sin(sec + i) * .2);
    drawKeyGlyph(ctx, 0, 0, .85, '#ffe27a');
    ctx.restore();
  });

  // walk-trail particles (Style Shop unlockable)
  if (world.walking && state.player.trail && state.player.trail !== 'no-trail' && ((sec * 30) | 0) % 3 === 0) {
    world.trailFx.push({ x: state.pos.x + (Math.random() - .5) * 16, y: state.pos.y + (Math.random() - .5) * 6, t: sec, kind: state.player.trail });
    if (world.trailFx.length > 40) world.trailFx.shift();
  }
  world.trailFx = world.trailFx.filter(p => sec - p.t < 1.1);
  world.trailFx.forEach(p => {
    const a = 1 - (sec - p.t) / 1.1;
    ctx.save(); ctx.globalAlpha = a * .85;
    if (p.kind === 'sparkle') {
      ctx.fillStyle = '#ffd75e';
      drawStar(ctx, p.x, p.y - (sec - p.t) * 18, 4, 6 * a + 2, 2.4 * a + .8); ctx.fill();
    } else if (p.kind === 'bubbles') {
      ctx.strokeStyle = '#8fdcf5'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y - (sec - p.t) * 26, 4 + a * 4, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.fillStyle = ['#ff6b5b', '#ffd75e', '#26b59d', '#0068ff', '#9b5de5'][((p.t * 10) | 0) % 5];
      ctx.beginPath(); ctx.arc(p.x, p.y - (sec - p.t) * 14, 3 + a * 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  });

  // y-sorted characters
  const drawables = [
    ...NPCS.map(n => ({ y: npcPos(n, sec).y, fn: () => drawNPC(ctx, n, sec) })),
    {
      y: state.pos.y,
      fn: () => {
        drawPet(ctx, state.pos.x - 36 * world.dir, state.pos.y + 2, 1.05, state.player.pet, sec);
        drawAvatar(ctx, state.pos.x, state.pos.y, 1.08, state.player, sec, world.walking, world.face || world.dir);
        namePill(ctx, state.pos.x, state.pos.y - 126, state.player.name || 'Explorer', '#002d72');
      },
    },
  ];
  drawables.sort((a, b) => a.y - b.y).forEach(d => d.fn());

  // location pins float above everything
  BUILDINGS.forEach((b, i) => drawLocationPin(ctx, b, sec, i));

  // target marker
  if (world.target) {
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 3;
    const r = 10 + Math.sin(sec * 8) * 3;
    ctx.beginPath(); ctx.arc(world.target.x, world.target.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath(); ctx.arc(world.target.x, world.target.y, 3.5, 0, Math.PI * 2); ctx.fill();
  }

  // butterflies over the meadows
  for (let i = 0; i < 3; i++) {
    const bx = 640 + ((i * 421) % 800) + Math.sin(sec * .7 + i * 2) * 80;
    const by = 300 + ((i * 291) % 480) + Math.cos(sec * .9 + i) * 36;
    const flap = Math.abs(Math.sin(sec * 14 + i * 3));
    ctx.save(); ctx.translate(bx, by);
    ctx.fillStyle = ['#ff8fa3', '#a7d8ff', '#ffd75e'][i];
    ctx.beginPath(); ctx.ellipse(-3, 0, 4.5 * flap + .8, 4, .5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3, 0, 4.5 * flap + .8, 4, -.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a3348';
    ctx.beginPath(); ctx.ellipse(0, 0, 1.2, 3.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  ctx.restore(); // world space

  // clouds drifting over the scene
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  world.clouds.forEach(c => {
    const cx = (c.x + sec * c.v) % (W + 280) - 140;
    ctx.beginPath();
    ctx.arc(cx, c.y, 24 * c.s, 0, Math.PI * 2);
    ctx.arc(cx + 27 * c.s, c.y + 6 * c.s, 18 * c.s, 0, Math.PI * 2);
    ctx.arc(cx - 27 * c.s, c.y + 7 * c.s, 16 * c.s, 0, Math.PI * 2);
    ctx.arc(cx + 8 * c.s, c.y - 9 * c.s, 15 * c.s, 0, Math.PI * 2);
    ctx.fill();
  });
  // birds
  ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  world.birds.forEach(b => {
    const bx = (b.off * 120 + sec * b.v) % (W + 200) - 100;
    const by = b.y + Math.sin(sec * 2 + b.off) * 8;
    const f = Math.sin(sec * 9 + b.off) * 4;
    ctx.beginPath(); ctx.moveTo(bx - 7, by - f); ctx.quadraticCurveTo(bx, by + 3, bx, by); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + 7, by - f); ctx.quadraticCurveTo(bx, by + 3, bx, by); ctx.stroke();
  });
  // warm grade + vignette
  const warm = ctx.createRadialGradient(W * .3, -H * .2, 60, W * .3, -H * .2, H * 1.4);
  warm.addColorStop(0, 'rgba(255,236,170,.12)'); warm.addColorStop(.5, 'rgba(255,236,170,.03)'); warm.addColorStop(1, 'rgba(255,236,170,0)');
  ctx.fillStyle = warm; ctx.fillRect(0, 0, W, H);
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .45, W / 2, H / 2, Math.max(W, H) * .78);
  vig.addColorStop(0, 'rgba(10,30,60,0)'); vig.addColorStop(1, 'rgba(10,30,60,.2)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

  ctx.restore(); // dpr
}

/* Floating location pin: navy pill + pointer, bobbing over the landmark */
function drawLocationPin(ctx, b, sec, i) {
  const near = world.nearBuilding && world.nearBuilding.id === b.id;
  const bob = Math.sin(sec * 2 + i * 1.1) * 4;
  const px = b.x, py = b.y + b.pinY + bob;

  ctx.font = '800 14px "Helix", "Quicksand", "Avenir Next", ui-rounded, system-ui, sans-serif';
  const label = `${b.icon} ${b.name}`;
  const tw = ctx.measureText(label).width;
  const w = tw + 24, h = 30;

  ctx.save();
  if (near) { ctx.shadowColor = 'rgba(255,224,122,.9)'; ctx.shadowBlur = 14; }
  else { ctx.shadowColor = 'rgba(0,20,50,.4)'; ctx.shadowBlur = 8; }
  const g = ctx.createLinearGradient(px, py - h, px, py);
  g.addColorStop(0, near ? '#2a6cc4' : '#1c56ad');
  g.addColorStop(1, near ? '#0d3f8f' : '#082554');
  ctx.fillStyle = g;
  roundRect(ctx, px - w / 2, py - h, w, h, 15); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = near ? '#ffd75e' : '#041a3f'; ctx.lineWidth = 2.5;
  roundRect(ctx, px - w / 2, py - h, w, h, 15); ctx.stroke();
  // pointer
  ctx.fillStyle = near ? '#0d3f8f' : '#082554';
  ctx.beginPath();
  ctx.moveTo(px - 7, py - 1); ctx.lineTo(px + 7, py - 1); ctx.lineTo(px, py + 9);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = near ? '#ffd75e' : '#041a3f'; ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(label, px, py - 10);
  ctx.textAlign = 'left';
}

/* ---- NPCs ---- */

function npcPos(n, sec) {
  if (n.mode === 'wander') {
    const a = (n._clock !== undefined ? n._clock : sec) * n.speed + 1.4;
    return { x: n.cx + Math.cos(a) * n.r, y: n.cy + Math.sin(a) * n.r * .5 };
  }
  return { x: n.x, y: n.y };
}

function drawNPC(ctx, n, sec) {
  const p = npcPos(n, sec);
  let dir = n.dir || 1, walking = false;
  const nearPlayerNow = Math.hypot(state.pos.x - p.x, state.pos.y - p.y) < 135;
  if (n.mode === 'wander') {
    // the stroll clock only advances while nobody's chatting
    if (n._clock === undefined) { n._clock = sec; n._lastSec = sec; }
    if (!nearPlayerNow) n._clock += sec - n._lastSec;
    n._lastSec = sec;
    const a = n._clock * n.speed + 1.4;
    dir = -Math.sin(a) >= 0 ? -1 : 1;
    walking = !nearPlayerNow;
  }
  if (nearPlayerNow) dir = state.pos.x >= p.x ? 1 : -1; // turn toward the player
  if (n._face === undefined) n._face = dir;
  n._face += (dir - n._face) * .22;
  drawAvatar(ctx, p.x, p.y, .98, n.cfg, sec + p.x, walking, n._face);
  if (n.mode === 'fish') {
    // a fish jumps every ~9s; the bobber dips hard during the bite
    const cycle = sec % 9;
    const bite = cycle > 7.6 && cycle < 8.2;
    ctx.strokeStyle = '#6f4a22'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(p.x - 14, p.y - 26); ctx.lineTo(p.x - 48, p.y - 62 + (bite ? 4 : 0)); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.5;
    const bobY = p.y + 30 + (bite ? 9 : Math.sin(sec * 2.2) * 3);
    ctx.beginPath(); ctx.moveTo(p.x - 48, p.y - 62 + (bite ? 4 : 0)); ctx.lineTo(p.x - 56, bobY); ctx.stroke();
    ctx.fillStyle = '#ff6b5b';
    ctx.beginPath(); ctx.arc(p.x - 56, bobY, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x - 56, bobY + 2, 8 + (sec * 14 % 10), 0, Math.PI * 2); ctx.stroke();
    if (cycle > 7.4 && cycle < 8.1) {
      // silver fish arcs out of the water
      const ft = (cycle - 7.4) / .7;
      const fx = p.x - 56 - ft * 30, fy = p.y + 26 - Math.sin(ft * Math.PI) * 34;
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(-.8 + ft * 1.6);
      ctx.fillStyle = '#bcd8e8';
      ctx.beginPath(); ctx.ellipse(0, 0, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(14, -4); ctx.lineTo(14, 4); ctx.closePath(); ctx.fill();
      ctx.restore();
      for (let s = 0; s < 3; s++) {
        ctx.save(); ctx.globalAlpha = (1 - ft) * .8;
        ctx.fillStyle = '#dff2fb';
        ctx.beginPath(); ctx.arc(p.x - 56 + (s - 1) * 8, p.y + 26 - ft * 20 - s * 4, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
  }
  if (n.mode === 'read') {
    ctx.fillStyle = '#0068ff';
    ctx.save(); ctx.translate(p.x + (n.dir || 1) * -14, p.y - 28); ctx.rotate(-.15);
    roundRect(ctx, -8, -6, 16, 12, 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 5); ctx.stroke();
    ctx.restore();
  }
  if (n.mode === 'sit') {
    ctx.fillStyle = '#ffd75e';
    roundRect(ctx, p.x - 21, p.y - 30, 9, 10, 2.5); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5;
    const st = Math.sin(sec * 3) * 2;
    ctx.beginPath(); ctx.moveTo(p.x - 16, p.y - 34); ctx.quadraticCurveTo(p.x - 14 + st, p.y - 40, p.x - 16, p.y - 46); ctx.stroke();
  }
  namePill(ctx, p.x, p.y - 118, n.name, n.color);

  // chatter: proximity greeting wins, otherwise staggered rotating lines
  const i = NPCS.indexOf(n);
  const nearPlayer = Math.hypot(state.pos.x - p.x, state.pos.y - p.y) < 135;
  const cycle = (sec + i * 5.5) % 22;
  let line = null;
  if (nearPlayer) line = `Hi, ${state.player.name || 'Explorer'}! 👋`;
  else if (cycle < 3.4) {
    const lines = NPC_LINES[n.name] || [];
    line = lines[(((sec + i * 5.5) / 22) | 0) % lines.length];
  }
  if (line) speechBubble(ctx, p.x, p.y - 146, line);
}

function speechBubble(ctx, x, y, text) {
  ctx.font = '600 12.5px system-ui, sans-serif';
  const tw = Math.min(ctx.measureText(text).width, 190);
  const w = tw + 20, h = 26;
  ctx.fillStyle = 'rgba(255,255,255,.96)';
  roundRect(ctx, x - w / 2, y - h, w, h, 12); ctx.fill();
  ctx.strokeStyle = 'rgba(0,45,114,.35)'; ctx.lineWidth = 2;
  roundRect(ctx, x - w / 2, y - h, w, h, 12); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.96)';
  ctx.beginPath();
  ctx.moveTo(x - 6, y - 1); ctx.lineTo(x + 6, y - 1); ctx.lineTo(x, y + 7);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#002d72';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y - 8, 190);
  ctx.textAlign = 'left';
}

function namePill(ctx, x, y, text, color) {
  ctx.font = '700 12.5px system-ui, sans-serif';
  const tw = ctx.measureText(text).width;
  ctx.fillStyle = color;
  roundRect(ctx, x - tw / 2 - 9, y, tw + 18, 20, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2;
  roundRect(ctx, x - tw / 2 - 9, y, tw + 18, 20, 10); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y + 14);
  ctx.textAlign = 'left';
}

function drawKeyGlyph(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, 6 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(20,20,40,.25)';
  ctx.beginPath(); ctx.arc(x, y, 2.6 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(x + 4 * s, y - 1.6 * s, 14 * s, 3.2 * s);
  ctx.fillRect(x + 12 * s, y + 1.6 * s, 2.6 * s, 4.5 * s);
  ctx.fillRect(x + 16 * s, y + 1.6 * s, 2.6 * s, 6 * s);
}
```

---

## `js/screens.js`

```js
/* Breakout Land — screens, HUD, building interiors, teacher & parent views */

/* ---- screen management ---- */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
  const hud = document.getElementById('hud');
  hud.style.display = (id === 'world' || id === 'math') ? 'block' : 'none';
  hud.classList.toggle('math-mode', id === 'math');
}
function screenIs(id) {
  const el = document.getElementById('screen-' + id);
  return el && el.classList.contains('active');
}
function closeBuildingModal() {
  document.getElementById('building-modal').classList.remove('open');
}

/* ---- HUD ---- */
function updateHUD() {
  const li = levelInfo();
  document.getElementById('hud-name').textContent = state.player.name || 'Explorer';
  document.getElementById('hud-level').textContent = `Lv ${li.n} · ${li.name}`;
  document.getElementById('hud-keys').textContent = state.keys;
  document.getElementById('hud-arcade').textContent = `${state.arcadeMin}m`;
  document.getElementById('hud-streak').textContent = state.streak;
  document.getElementById('hud-xpbar').style.width = `${li.into}%`;

  // today's quests
  const quests = [
    ['qp-daily', state.lastDaily === todayKey()],
    ['qp-game', Object.keys(state.gamesDone).length > 0],
    ['qp-math', Object.keys(state.mathStars).length > 0],
  ];
  let done = 0;
  quests.forEach(([id, ok]) => {
    const row = document.getElementById(id);
    if (row) row.classList.toggle('done', ok);
    if (ok) done++;
  });
  const count = document.getElementById('qp-count');
  if (count) count.textContent = `${done}/3`;

  // portrait
  const chip = document.getElementById('hud-avatar');
  drawHeroPortrait(chip.getContext('2d'), chip.width, state.player.hero || 0);
}

/* ---- building router ---- */
function openBuilding(id) {
  blip(760);
  if (id === 'math') { openMathMap(); return; }
  const body = document.getElementById('bm-body');
  const title = document.getElementById('bm-title');
  const modal = document.getElementById('building-modal');
  body.innerHTML = '';
  if (id === 'daily') renderDaily(title, body);
  else if (id === 'games') renderGameHall(title, body);
  else if (id === 'arcade') renderArcade(title, body);
  else if (id === 'shop') renderShop(title, body);
  else if (id === 'badges') renderBadgeHall(title, body);
  else if (id === 'plus') renderPlus(title, body);
  modal.classList.add('open');
}

/* ---- Lock Plaza: Lock of the Day ---- */
function renderDaily(title, body) {
  title.textContent = '🔐 Lock of the Day';
  const done = state.lastDaily === todayKey();
  if (done) {
    body.innerHTML = `
      <div class="big-emoji">🎉</div>
      <p class="center"><strong>You already cracked today’s lock!</strong></p>
      <p class="center muted">Streak: ${state.streak} day${state.streak === 1 ? '' : 's'} 🔥 — come back tomorrow to keep it alive.</p>`;
    return;
  }
  body.innerHTML = `
    <p class="muted">One fresh lock every day. Crack it to grow your streak and earn <strong>10 🔑 + 25 XP + 5 arcade minutes</strong>.</p>
    <div class="reward-row"><span>🔥 Current streak: <strong>${state.streak}</strong></span></div>
    <button class="btn-big" id="daily-go">Take on today’s lock!</button>`;
  document.getElementById('daily-go').onclick = () => {
    closeBuildingModal();
    startPuzzle({
      title: 'Lock of the Day',
      ctxLabel: 'Daily challenge',
      locks: [dailyLock()],
      onWin: () => {
        completeDaily();
        toast(`+10 🔑  +25 XP  +5 arcade minutes! Streak: ${state.streak} 🔥`);
      },
    });
  };
}

/* ---- Game Hall ---- */
function renderGameHall(title, body) {
  title.textContent = '🚩 Game Hall';
  const rows = state.assigned.map(id => {
    const g = DATA.games.find(g => g.id === id);
    if (!g) return '';
    const done = state.gamesDone[g.id];
    return `
      <div class="card game-card">
        <div class="game-info">
          <h3>${g.name}</h3>
          <p class="meta">${g.subject} · Grades ${g.grade} · ~${g.minutes} min · ${g.locks.length} locks</p>
          <p class="story">${g.story}</p>
        </div>
        <div class="game-side">
          ${done
            ? `<span class="done-pill">✔ Broke out in ${Math.floor(done.seconds / 60)}m ${done.seconds % 60}s</span>
               <button class="btn-small" data-play="${g.id}">Play again</button>`
            : `<button class="btn-big" data-play="${g.id}">Play!</button>`}
        </div>
      </div>`;
  }).join('');
  body.innerHTML = `
    <p class="muted">Games assigned by <strong>Ms. Rivera</strong>. In the full version this is where the Breakout EDU digital game player opens — Breakout Land wraps it and awards your keys, XP and badges when you break out.</p>
    ${rows || '<p class="center muted">No games assigned yet — check back soon!</p>'}`;
  body.querySelectorAll('[data-play]').forEach(btn => {
    btn.onclick = () => {
      const g = DATA.games.find(g => g.id === btn.dataset.play);
      closeBuildingModal();
      startPuzzle({
        title: g.name,
        ctxLabel: g.subject,
        locks: g.locks,
        onWin: ({ attempts, seconds }) => {
          const first = !state.gamesDone[g.id];
          state.gamesDone[g.id] = { attempts, seconds };
          grant(first ? { keys: 25, xp: 60, arcade: 10 } : { keys: 5, xp: 15, arcade: 0 });
          toast(first ? '+25 🔑  +60 XP  +10 arcade minutes!' : 'Replay complete! +5 🔑 +15 XP');
        },
      });
    };
  });
}

/* ---- Arcade ---- */
function renderArcade(title, body) {
  title.textContent = '🕹️ The Arcade';
  if (!arcadeAllowed()) {
    body.innerHTML = `
      <div class="big-emoji">🔒</div>
      <p class="center"><strong>The Arcade is locked right now.</strong></p>
      <p class="center muted">Your teacher or parent has paused arcade time. Keep solving — your minutes will be waiting!</p>`;
    return;
  }
  body.innerHTML = `
    <p class="muted">You earn arcade minutes by breaking out of games. Playing <strong>Key Catcher</strong> costs <strong>5 minutes</strong> per round.</p>
    <div class="reward-row"><span>🕹️ Your bank: <strong>${state.arcadeMin} minutes</strong></span></div>
    <div class="card game-card">
      <div class="game-info">
        <h3>Key Catcher</h3>
        <p class="story">Catch falling keys, dodge the anvils! 30 seconds of pure fun.</p>
      </div>
      <div class="game-side">
        <button class="btn-big" id="kc-go" ${state.arcadeMin < 5 ? 'disabled' : ''}>${state.arcadeMin < 5 ? 'Need 5 min' : 'Play (−5 min)'}</button>
      </div>
    </div>
    <div class="card game-card">
      <div class="game-info">
        <h3>Memory Match</h3>
        <p class="story">Flip the cards, find the pairs, beat the clock. Sharp eyes win keys!</p>
      </div>
      <div class="game-side">
        <button class="btn-big" id="mm-go" ${state.arcadeMin < 5 ? 'disabled' : ''}>${state.arcadeMin < 5 ? 'Need 5 min' : 'Play (−5 min)'}</button>
      </div>
    </div>`;
  const go = document.getElementById('kc-go');
  if (go && state.arcadeMin >= 5) go.onclick = () => { closeBuildingModal(); startKeyCatcher(); };
  const mm = document.getElementById('mm-go');
  if (mm && state.arcadeMin >= 5) mm.onclick = () => { closeBuildingModal(); startMemoryMatch(); };
}

/* Memory Match minigame — DOM cards with 3D flips */
function startMemoryMatch() {
  state.arcadeMin -= 5; saveState(); updateHUD();
  const modal = document.getElementById('mm-modal');
  const grid = document.getElementById('mm-grid');
  const status = document.getElementById('mm-status');
  modal.classList.add('open');

  const icons = ['🔑', '🔒', '⭐', '🧪', '📘', '⚙️'];
  const deck = shuffle([...icons, ...icons].map((ic, i) => ({ ic, id: i })));
  let flipped = [], matched = 0, misses = 0, lock = false;
  const t0 = Date.now();

  const tick = setInterval(() => {
    if (!modal.classList.contains('open')) { clearInterval(tick); return; }
    status.textContent = `⏱ ${Math.floor((Date.now() - t0) / 1000)}s · pairs ${matched}/6 · misses ${misses}`;
  }, 250);

  grid.innerHTML = '';
  deck.forEach((card) => {
    const el = document.createElement('button');
    el.className = 'mm-card';
    el.innerHTML = `<span class="mm-inner"><span class="mm-front">🔐</span><span class="mm-back">${card.ic}</span></span>`;
    el.onclick = () => {
      if (lock || el.classList.contains('flip') || el.classList.contains('done')) return;
      blip(640);
      el.classList.add('flip');
      flipped.push({ el, ic: card.ic });
      if (flipped.length === 2) {
        lock = true;
        const [a, b] = flipped;
        if (a.ic === b.ic) {
          setTimeout(() => {
            a.el.classList.add('done'); b.el.classList.add('done');
            matched++; blip(900); flipped = []; lock = false;
            if (matched === 6) {
              clearInterval(tick);
              const secs = Math.floor((Date.now() - t0) / 1000);
              const bonus = 8 + (secs <= 45 ? 4 : 0) + Math.max(0, 4 - Math.floor(misses / 2));
              setTimeout(() => {
                modal.classList.remove('open');
                grant({ keys: bonus, xp: 24 });
                fanfare(); confetti();
                toast(`Memory Match: all pairs in ${secs}s, ${misses} misses! +${bonus} 🔑 +24 XP`);
              }, 500);
            }
          }, 420);
        } else {
          misses++;
          setTimeout(() => {
            a.el.classList.remove('flip'); b.el.classList.remove('flip');
            buzz(); flipped = []; lock = false;
          }, 750);
        }
      }
    };
    grid.appendChild(el);
  });

  document.getElementById('mm-quit').onclick = () => { clearInterval(tick); modal.classList.remove('open'); };
}

/* Key Catcher minigame — neon arcade juice: spinning keys, catch bursts,
   floating scores, combo multiplier, rolling cart */
const kc = { raf: null, score: 0, tLeft: 30, px: .5, items: [], fx: [], pops: [], combo: 0, best: 0, last: 0, lastPx: .5 };
function startKeyCatcher() {
  state.arcadeMin -= 5; saveState(); updateHUD();
  const modal = document.getElementById('kc-modal');
  modal.classList.add('open');
  const cv = document.getElementById('kc-canvas');
  const ctx = cv.getContext('2d');
  Object.assign(kc, { score: 0, tLeft: 30, px: .5, items: [], fx: [], pops: [], combo: 0, best: 0, last: performance.now(), lastPx: .5 });
  const move = (clientX) => {
    const r = cv.getBoundingClientRect();
    kc.px = Math.max(.06, Math.min(.94, (clientX - r.left) / r.width));
  };
  cv.onpointermove = e => move(e.clientX);
  cv.onpointerdown = e => move(e.clientX);
  const keyHandler = e => {
    if (e.key === 'ArrowLeft' || e.key === 'a') kc.px = Math.max(.06, kc.px - .05);
    if (e.key === 'ArrowRight' || e.key === 'd') kc.px = Math.min(.94, kc.px + .05);
  };
  addEventListener('keydown', keyHandler);

  const burst = (x, y, color, n = 8) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      kc.fx.push({ x, y, vx: Math.cos(a) * (60 + Math.random() * 60), vy: Math.sin(a) * (60 + Math.random() * 60) - 40, t: 0, color });
    }
  };

  cancelAnimationFrame(kc.raf);
  (function loop(t) {
    const dt = Math.min(.05, (t - kc.last) / 1000); kc.last = t;
    kc.tLeft -= dt;
    const W = cv.width = cv.clientWidth, H = cv.height = cv.clientHeight;
    const sec = t / 1000;
    const vx = (kc.px - kc.lastPx) / Math.max(dt, .001); kc.lastPx = kc.px;

    if (Math.random() < dt * 2.3) kc.items.push({ x: .08 + Math.random() * .84, y: -.05, v: .25 + Math.random() * .32, bad: Math.random() < .22, rot: Math.random() * 6 });

    // neon night backdrop
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#101c3d'); bg.addColorStop(.72, '#1d2a5c'); bg.addColorStop(1, '#2b1c5e');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for (let i = 0; i < 26; i++) {
      const twk = .3 + Math.abs(Math.sin(sec * 2 + i)) * .7;
      ctx.globalAlpha = twk * .7;
      ctx.fillRect((i * 137) % W, (i * 211) % (H * .6), 2, 2);
    }
    ctx.globalAlpha = 1;
    // scrolling neon floor grid
    ctx.strokeStyle = 'rgba(76,201,240,.35)'; ctx.lineWidth = 1.5;
    const horizon = H * .78;
    for (let i = -6; i <= 6; i++) {
      ctx.beginPath(); ctx.moveTo(W / 2 + i * W * .09, horizon); ctx.lineTo(W / 2 + i * W * .28, H); ctx.stroke();
    }
    for (let r = 0; r < 4; r++) {
      const gy = horizon + ((sec * 60 + r * (H - horizon) / 4) % (H - horizon));
      ctx.globalAlpha = .18 + .4 * (gy - horizon) / (H - horizon);
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // items (spinning keys / tumbling anvils)
    kc.items.forEach(it => { it.y += it.v * dt; it.rot += dt * 3; });
    kc.items = kc.items.filter(it => {
      const ix = it.x * W, iy = it.y * H;
      const caught = it.y > .84 && it.y < .96 && Math.abs(it.x - kc.px) < .075;
      if (caught) {
        if (it.bad) {
          kc.score = Math.max(0, kc.score - 3); kc.combo = 0; buzz();
          burst(ix, iy, '#8d99ae', 10);
          kc.pops.push({ x: ix, y: iy, t: 0, txt: '-3', color: '#ff8fa3' });
        } else {
          kc.combo++; kc.best = Math.max(kc.best, kc.combo);
          const mult = kc.combo >= 5 ? 2 : 1;
          kc.score += mult;
          blip(800 + Math.min(kc.combo, 8) * 60);
          burst(ix, iy, '#ffd75e');
          kc.pops.push({ x: ix, y: iy, t: 0, txt: `+${mult}`, color: '#ffe08a' });
          if (kc.combo === 5) kc.pops.push({ x: W / 2, y: H * .34, t: 0, txt: 'COMBO x2!', color: '#4cc9f0', big: true });
        }
        return false;
      }
      if (it.y > 1.05) { if (!it.bad) kc.combo = 0; return false; }
      ctx.save(); ctx.translate(ix, iy); ctx.rotate(Math.sin(it.rot) * .6);
      if (it.bad) {
        ctx.fillStyle = '#8d99ae';
        ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(12, 0); ctx.lineTo(7, 12); ctx.lineTo(-7, 12); ctx.closePath(); ctx.fill();
        ctx.fillRect(-4, -8, 8, 8);
        ctx.strokeStyle = 'rgba(20,20,40,.5)'; ctx.lineWidth = 2; ctx.stroke();
      } else {
        drawKeyGlyph(ctx, -6, 0, 1.15, '#ffd75e');
      }
      ctx.restore();
      return true;
    });

    // particles + score pops
    kc.fx = kc.fx.filter(p => (p.t += dt) < .6);
    kc.fx.forEach(p => {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt;
      ctx.save(); ctx.globalAlpha = 1 - p.t / .6;
      ctx.fillStyle = p.color;
      drawStar(ctx, p.x, p.y, 4, 5, 2); ctx.fill();
      ctx.restore();
    });
    kc.pops = kc.pops.filter(p => (p.t += dt) < (p.big ? 1.1 : .8));
    kc.pops.forEach(p => {
      ctx.save(); ctx.globalAlpha = 1 - p.t / (p.big ? 1.1 : .8);
      ctx.fillStyle = p.color;
      ctx.font = p.big ? '900 34px system-ui' : '900 20px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(p.txt, p.x, p.y - p.t * 46);
      ctx.restore(); ctx.textAlign = 'left';
    });

    // rolling cart + rider
    const cx = kc.px * W, cy = H * .93;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.max(-.16, Math.min(.16, vx * .25)));
    ctx.fillStyle = '#ffb627';
    roundRect(ctx, -36, -10, 72, 18, 9); ctx.fill();
    ctx.strokeStyle = 'rgba(40,34,56,.5)'; ctx.lineWidth = 2.5; ctx.stroke();
    for (const wx of [-20, 20]) {
      ctx.fillStyle = '#27406e';
      ctx.beginPath(); ctx.arc(wx, 10, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#9cc4ff'; ctx.lineWidth = 2;
      const wr = kc.px * W * .12;
      ctx.beginPath(); ctx.moveTo(wx - Math.cos(wr) * 5, 10 - Math.sin(wr) * 5); ctx.lineTo(wx + Math.cos(wr) * 5, 10 + Math.sin(wr) * 5); ctx.stroke();
    }
    drawAvatar(ctx, 0, -6, .55, state.player, sec, true, vx >= 0 ? 1 : -1);
    ctx.restore();

    // HUD
    ctx.fillStyle = '#fff'; ctx.font = '800 20px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(`🔑 ${kc.score}`, 14, 30);
    if (kc.combo >= 2) {
      ctx.fillStyle = kc.combo >= 5 ? '#4cc9f0' : '#ffe08a';
      ctx.font = '900 16px system-ui';
      ctx.fillText(`combo ${kc.combo}${kc.combo >= 5 ? ' ×2' : ''}`, 14, 54);
    }
    ctx.fillStyle = '#fff'; ctx.font = '800 20px system-ui'; ctx.textAlign = 'right';
    ctx.fillText(`⏱ ${Math.max(0, Math.ceil(kc.tLeft))}s`, W - 14, 30);
    ctx.textAlign = 'left';

    if (kc.tLeft > 0 && modal.classList.contains('open')) {
      kc.raf = requestAnimationFrame(loop);
    } else {
      removeEventListener('keydown', keyHandler);
      if (kc.tLeft <= 0) {
        modal.classList.remove('open');
        const bonus = Math.min(10, Math.floor(kc.score / 3));
        grant({ keys: bonus, xp: kc.score });
        fanfare(); confetti();
        toast(`Key Catcher: ${kc.score} pts, best combo ${kc.best}! Bonus: +${bonus} 🔑 +${kc.score} XP`);
      }
    }
  })(performance.now());
  document.getElementById('kc-quit').onclick = () => { modal.classList.remove('open'); removeEventListener('keydown', keyHandler); };
}

/* ---- Style Shop ---- */
function renderShop(title, body) {
  title.textContent = '🛍️ Style Shop';
  const section = (label, items, equipKey) => `
    <h3 class="shop-h">${label}</h3>
    <div class="shop-grid">
      ${items.filter(i => !i.free).map(i => {
        const owned = itemOwned(i);
        return `<button class="shop-item ${owned ? 'owned' : ''}" data-buy="${i.id}" data-kind="${equipKey}">
          <span class="shop-name">${i.name}</span>
          <span class="shop-price">${owned ? 'Owned ✓' : `${i.price} 🔑`}</span>
        </button>`;
      }).join('')}
    </div>`;
  body.innerHTML = `
    <p class="muted">Spend your hard-earned keys! Equip anything you own in <strong>The Closet</strong> (avatar card, bottom left).</p>
    <div class="reward-row"><span>Your keys: <strong>${state.keys} 🔑</strong></span></div>
    ${section('Accessories', DATA.accessories, 'accessory')}
    ${section('Sidekick pets', DATA.pets, 'pet')}
    ${section('Walk trails', DATA.trails, 'trail')}`;
  body.querySelectorAll('[data-buy]').forEach(btn => {
    btn.onclick = () => {
      const all = [...DATA.trails, ...DATA.accessories, ...DATA.pets];
      const item = all.find(i => i.id === btn.dataset.buy);
      if (itemOwned(item)) {
        state.player[btn.dataset.kind] = item.id;
        saveState(); blip(800);
        toast(`Equipped ${item.name}!`);
        return;
      }
      if (buyItem(item)) {
        state.player[btn.dataset.kind] = item.id;
        saveState();
        fanfare(); confetti();
        toast(`You bought & equipped ${item.name}! 🎉`);
        renderShop(document.getElementById('bm-title'), document.getElementById('bm-body'));
      } else {
        buzz();
        toast(`You need ${item.price - state.keys} more keys for ${item.name}. Keep breaking out!`);
      }
    };
  });
}

/* ---- Badge Hall ---- */
function renderBadgeHall(title, body) {
  title.textContent = '🏅 Badge Hall';
  body.innerHTML = `
    <p class="muted">Every badge tells a story about how you think — not just what you know.</p>
    <div class="badge-grid">
      ${DATA.badges.map(b => {
        const got = state.badges.includes(b.id);
        return `<div class="badge ${got ? 'got' : ''}">
          <div class="badge-icon">${badgeGlyph(b.icon)}</div>
          <strong>${b.name}</strong>
          <span>${b.desc}</span>
        </div>`;
      }).join('')}
    </div>`;
}
function badgeGlyph(icon) {
  return { lock: '🔓', flame: '🔥', key: '🔑', math: '➗', trophy: '🏆', star: '⭐', bulb: '💡', heart: '💪' }[icon] || '🏅';
}

/* ---- Breakout+ Clubhouse ---- */
function renderPlus(title, body) {
  title.textContent = '✨ Breakout+ Clubhouse';
  if (!state.plus) {
    body.innerHTML = `
      <div class="big-emoji">🔒</div>
      <p class="center"><strong>The Clubhouse needs a Breakout+ key.</strong></p>
      <p class="center muted">Ask your teacher about Breakout+ to unlock hundreds of bonus games, seasonal events, and exclusive avatar gear.</p>`;
    return;
  }
  body.innerHTML = `
    <p class="muted">Your class has <strong>Breakout+</strong>! Bonus games, seasonal events and exclusive gear live here.</p>
    ${DATA.plusGames.map(g => `
      <div class="card game-card">
        <div class="game-info"><h3>${g.name}</h3><p class="meta">${g.subject} · Grades ${g.grade}</p></div>
        <div class="game-side"><button class="btn-small" data-plus="${g.id}">Play!</button></div>
      </div>`).join('')}`;
  body.querySelectorAll('[data-plus]').forEach(btn => {
    btn.onclick = () => {
      const g = DATA.plusGames.find(g => g.id === btn.dataset.plus);
      closeBuildingModal();
      const probs = DATA.mathProblems[3];
      const p = probs[(Math.random() * probs.length) | 0];
      startPuzzle({
        title: g.name, ctxLabel: 'Breakout+ bonus',
        locks: [{ type: 'number', clue: `${g.name} demo lock — ${p.clue}`, answer: p.answer, hint: 'Take it one step at a time.' }],
        onWin: () => { grant({ keys: 8, xp: 20, arcade: 3 }); toast('+8 🔑 +20 XP +3 arcade minutes!'); },
      });
    };
  });
}

/* ---- Breakout Math adventure map ---- */
function openMathMap() {
  showScreen('math');
  updateHUD();
  renderMathMap();
}

function nodeKey(grade, i) { return `${grade}:${i}`; }

function renderMathMap() {
  const grade = state.mathGrade;
  const unit = DATA.mathUnits[grade];
  document.getElementById('math-unit').textContent = unit.unit;
  document.getElementById('math-skills').textContent = unit.skills;

  // grade pills
  const gp = document.getElementById('grade-pills');
  gp.innerHTML = '';
  ['K', 1, 2, 3, 4, 5].forEach(g => {
    const b = document.createElement('button');
    b.className = 'gpill' + (String(g) === String(grade) ? ' sel' : '');
    b.textContent = g === 'K' ? 'K' : `G${g}`;
    b.onclick = () => { state.mathGrade = g; saveState(); renderMathMap(); blip(650); };
    gp.appendChild(b);
  });

  // node positions along the painted trail (assets/trail.jpg, 1920x1080)
  const pts = [
    [500, 1000], [715, 905], [985, 815], [1155, 680], [1090, 545],
    [905, 455], [830, 330], [950, 225], [1115, 165], [1480, 255],
  ];

  const nodeState = i => {
    const key = nodeKey(grade, i);
    const type = DATA.mathTrail[i];
    if (state.mathStars[key]) return 'done';
    // review nodes always open; others unlock in order (previous non-review core done)
    if (type === 'review') return 'open';
    const prevCore = DATA.mathTrail.slice(0, i).map((t, j) => ({ t, j })).filter(n => n.t !== 'review').pop();
    if (!prevCore) return 'open';
    if (type === 'challenge' || type === 'boss') {
      // challenge unlocks if previous core done in ≤ 2 attempts (beating the average) — the adaptive hook
      const prevKey = nodeKey(grade, prevCore.j);
      if (!state.mathStars[prevKey]) return 'locked';
      return (state.mathAttempts[prevKey] || 9) <= 2 ? 'open' : 'locked-challenge';
    }
    return state.mathStars[nodeKey(grade, prevCore.j)] ? 'open' : 'locked';
  };

  const typeColor = { core: '#26b59d', review: '#0068ff', challenge: '#5c25b7', boss: '#ffb627' };
  const typeLabel = { core: 'Quest', review: 'Review', challenge: 'Challenge', boss: 'BOSS' };

  const nodes = DATA.mathTrail.map((type, i) => {
    const [x, y] = pts[i];
    const st = nodeState(i);
    const key = nodeKey(grade, i);
    const stars = state.mathStars[key] || 0;
    const r = type === 'boss' ? 58 : 44;
    const locked = st === 'locked' || st === 'locked-challenge';
    return `
      <g class="mnode ${st}" data-node="${i}" transform="translate(${x},${y})" tabindex="${locked ? -1 : 0}" role="button" aria-label="${typeLabel[type]} ${i + 1}">
        ${st === 'open' && type !== 'review' ? `<circle r="${r + 12}" fill="${typeColor[type]}" opacity=".3"><animate attributeName="r" values="${r + 6};${r + 18};${r + 6}" dur="1.6s" repeatCount="indefinite"/></circle>` : ''}
        <circle r="${r}" fill="${locked ? '#a9b6bc' : typeColor[type]}" stroke="#fff" stroke-width="7"/>
        <circle r="${r}" fill="none" stroke="rgba(30,40,30,.35)" stroke-width="2.5" transform="translate(0,3)"/>
        <text y="10" text-anchor="middle" font-size="${type === 'boss' ? 34 : 28}" font-weight="900" fill="#fff">${locked ? '🔒' : (st === 'done' ? '✓' : i + 1)}</text>
        <text y="${r + 30}" text-anchor="middle" font-size="20" font-weight="800" fill="#fff" stroke="rgba(20,50,25,.65)" stroke-width="4" paint-order="stroke">${typeLabel[type]}</text>
        ${stars ? `<text y="${-r - 14}" text-anchor="middle" font-size="26">${'⭐'.repeat(stars)}</text>` : ''}
      </g>`;
  }).join('');

  // dashed hop-line between consecutive stops (the painted path carries the rest)
  let links = '';
  for (let i = 1; i < pts.length; i++) {
    links += `<line x1="${pts[i - 1][0]}" y1="${pts[i - 1][1]}" x2="${pts[i][0]}" y2="${pts[i][1]}"
      stroke="rgba(255,255,255,.55)" stroke-width="5" stroke-dasharray="2 18" stroke-linecap="round"/>`;
  }
  document.getElementById('math-svg').innerHTML = links + nodes;

  document.querySelectorAll('.mnode').forEach(g => {
    const i = parseInt(g.dataset.node, 10);
    const st = nodeState(i);
    g.addEventListener('click', () => {
      if (st === 'locked') { buzz(); toast('Finish the previous quest to unlock this one!'); return; }
      if (st === 'locked-challenge') { buzz(); toast('Challenge locks open when you beat a quest in 2 tries or fewer — or when your teacher assigns it!'); return; }
      startMathNode(grade, i);
    });
  });
}

function startMathNode(grade, i) {
  const type = DATA.mathTrail[i];
  const probs = DATA.mathProblems[grade];
  const count = type === 'boss' ? 3 : type === 'challenge' ? 2 : 1;
  const locks = Array.from({ length: count }, (_, j) => {
    const p = probs[(i + j) % probs.length];
    return { type: 'number', clue: p.clue, answer: p.answer, hint: 'Draw it out or count it up — you’ve got this.' };
  });
  const unit = DATA.mathUnits[grade].unit;
  startPuzzle({
    title: `${unit} — ${type === 'boss' ? 'BOSS Lock' : type === 'challenge' ? 'Challenge' : type === 'review' ? 'Review' : 'Quest'} ${i + 1}`,
    ctxLabel: `Breakout Math · Grade ${grade}`,
    locks,
    onWin: ({ attempts }) => {
      const key = nodeKey(grade, i);
      const stars = attempts <= count ? 3 : attempts <= count + 1 ? 2 : 1;
      state.mathStars[key] = Math.max(state.mathStars[key] || 0, stars);
      state.mathAttempts[key] = attempts;
      const rewards = { core: { keys: 12, xp: 30, arcade: 4 }, review: { keys: 6, xp: 15, arcade: 2 }, challenge: { keys: 20, xp: 50, arcade: 8 }, boss: { keys: 35, xp: 90, arcade: 12 } }[type];
      grant(rewards);
      if (type === 'challenge' || type === 'boss') awardBadge('challenge');
      if (attempts > count + 1) toast(`+${rewards.keys} 🔑! Tip: the Review stop on the trail is a great warm-up. 💙`);
      else toast(`${'⭐'.repeat(stars)} +${rewards.keys} 🔑 +${rewards.xp} XP +${rewards.arcade} arcade min!`);
      renderMathMap();
    },
  });
}

/* ---- Teacher dashboard ---- */
function openTeacher() {
  showScreen('teacher');
  const you = {
    name: (state.player.name || 'You') + ' ⭐you', level: levelInfo().n, keys: state.totalKeys,
    games: Object.keys(state.gamesDone).length + Object.keys(state.mathStars).length,
    avgMin: 12.0, success: 0.9, streak: state.streak, arcade: state.perms.teacherArcade,
  };
  const roster = [...DATA.roster, you];

  document.getElementById('t-roster').innerHTML = roster.map((s, i) => `
    <tr>
      <td class="t-name">${s.name}</td>
      <td>${s.level}</td>
      <td>${s.games}</td>
      <td>${s.avgMin.toFixed(1)}</td>
      <td><span class="pill ${s.success >= .85 ? 'good' : s.success >= .7 ? 'mid' : 'low'}">${Math.round(s.success * 100)}%</span></td>
      <td>${s.streak}🔥</td>
      <td><label class="switch"><input type="checkbox" data-arcade="${i}" ${s.arcade ? 'checked' : ''}><span></span></label></td>
    </tr>`).join('');

  document.querySelectorAll('[data-arcade]').forEach(cb => {
    cb.onchange = () => {
      const i = parseInt(cb.dataset.arcade, 10);
      if (i === roster.length - 1) { state.perms.teacherArcade = cb.checked; saveState(); }
      toast(cb.checked ? 'Arcade time enabled 🕹️' : 'Arcade time paused');
    };
  });

  // comparison chart: avg minutes to breakout — class vs school vs all players (age group)
  const C = DATA.chartColors;
  const maxV = Math.max(...DATA.comparisons.flatMap(c => [c.class, c.school, c.global])) * 1.15;
  document.getElementById('t-chart').innerHTML = `
    <div class="legend">
      <span><i style="background:${C.class}"></i>Your class</span>
      <span><i style="background:${C.school}"></i>Whole school</span>
      <span><i style="background:${C.global}"></i>All players, ages 8–10</span>
    </div>
    ${DATA.comparisons.map(c => `
      <div class="cmp-group">
        <div class="cmp-label">${c.game}</div>
        <div class="cmp-bars">
          ${[['class', c.class], ['school', c.school], ['global', c.global]].map(([k, v]) => `
            <div class="cmp-row">
              <div class="cmp-bar" style="width:${(v / maxV) * 100}%;background:${C[k]}" title="${v.toFixed(1)} min"></div>
              <span class="cmp-val">${v.toFixed(1)}m</span>
            </div>`).join('')}
        </div>
      </div>`).join('')}
    <p class="chart-note">Average minutes to breakout — lower is faster. Your class is beating the global average on 2 of 3 games. 🎉</p>`;

  // assignment buttons
  document.getElementById('t-assign').innerHTML = DATA.games.map(g => `
    <div class="assign-row">
      <span><strong>${g.name}</strong> <span class="meta">· ${g.subject}</span></span>
      <button class="btn-small" data-assign="${g.id}" ${state.assigned.includes(g.id) ? 'disabled' : ''}>
        ${state.assigned.includes(g.id) ? 'Assigned ✓' : 'Assign to class'}
      </button>
    </div>`).join('');
  document.querySelectorAll('[data-assign]').forEach(b => {
    b.onclick = () => {
      state.assigned.push(b.dataset.assign); saveState();
      toast('Assigned! It’s live in every student’s Game Hall.');
      openTeacher();
    };
  });

  const plusCb = document.getElementById('t-plus');
  plusCb.checked = state.plus;
  plusCb.onchange = () => { state.plus = plusCb.checked; saveState(); toast(state.plus ? 'Breakout+ active for your class ✨' : 'Breakout+ paused'); };
}

/* ---- Parent portal ---- */
function openParent() {
  showScreen('parent');
  const li = levelInfo();
  const name = state.player.name || 'Your explorer';
  document.getElementById('p-summary').innerHTML = `
    <div class="p-stat"><strong>${li.n}</strong><span>Level — ${li.name}</span></div>
    <div class="p-stat"><strong>${state.streak}🔥</strong><span>Daily streak</span></div>
    <div class="p-stat"><strong>${Object.keys(state.gamesDone).length + Object.keys(state.mathStars).length}</strong><span>Games broken out</span></div>
    <div class="p-stat"><strong>${state.badges.length}</strong><span>Badges earned</span></div>`;
  document.getElementById('p-name').textContent = name;

  // avatar
  const cv = document.getElementById('p-avatar');
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  drawAvatar(ctx, cv.width / 2, cv.height - 10, 1.0, state.player, 0, false, 1);

  // 4Cs + SEL — grows with actual play (base + earned)
  const solved = Object.keys(state.mathStars).length + Object.keys(state.gamesDone).length * 2;
  const firstTries = state.badges.includes('thinker') ? 12 : 0;
  const persist = state.badges.includes('persistent') ? 14 : 0;
  const skills = [
    ['Critical Thinking', Math.min(96, 38 + solved * 6 + firstTries)],
    ['Persistence',       Math.min(96, 34 + solved * 5 + persist)],
    ['Creativity',        Math.min(96, 30 + solved * 5)],
    ['Collaboration',     Math.min(96, 42 + solved * 3)],
    ['Communication',     Math.min(96, 36 + solved * 4)],
  ];
  document.getElementById('p-skills').innerHTML = skills.map(([label, v]) => `
    <div class="skill-row">
      <span class="skill-label">${label}</span>
      <div class="skill-track"><div class="skill-fill" style="width:${v}%"></div></div>
      <span class="skill-val">${v}</span>
    </div>`).join('');

  // week chart (single series)
  const maxMin = Math.max(...DATA.parentWeek.map(d => d.min), 1);
  document.getElementById('p-week').innerHTML = DATA.parentWeek.map(d => `
    <div class="wk-col" title="${d.min} min">
      <span class="wk-val">${d.min || ''}</span>
      <div class="wk-bar" style="height:${(d.min / maxMin) * 72 + 2}px"></div>
      <span class="wk-day">${d.day}</span>
    </div>`).join('');

  const badges = state.badges.slice(-4).map(id => DATA.badges.find(b => b.id === id)).filter(Boolean);
  document.getElementById('p-badges').innerHTML = badges.length
    ? badges.map(b => `<div class="badge got small"><div class="badge-icon">${badgeGlyph(b.icon)}</div><strong>${b.name}</strong></div>`).join('')
    : '<p class="muted">Badges will appear here as they’re earned.</p>';

  const cb = document.getElementById('p-arcade');
  cb.checked = state.perms.parentArcade;
  cb.onchange = () => {
    state.perms.parentArcade = cb.checked; saveState();
    toast(cb.checked ? 'Arcade time approved 🕹️' : 'Arcade time paused');
  };
  const lim = document.getElementById('p-limit');
  lim.value = state.perms.weeklyLimitMin;
  document.getElementById('p-limit-val').textContent = `${state.perms.weeklyLimitMin} min/week`;
  lim.oninput = () => {
    state.perms.weeklyLimitMin = parseInt(lim.value, 10); saveState();
    document.getElementById('p-limit-val').textContent = `${state.perms.weeklyLimitMin} min/week`;
  };
}
```

---

## `js/main.js`

```js
/* Breakout Land — boot & title wiring */

function boot() {
  loadState();

  // painted art assets (inlined as data URIs in the single-file build)
  const A = (typeof window !== 'undefined' && window.ASSETS) || {};
  const abs = (p) => p.startsWith('data:') ? p : new URL(p, document.baseURI).href;
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty('--img-title', `url("${abs(A.title || 'assets/title.jpg')}")`);
  rootStyle.setProperty('--img-desk', `url("${abs(A.desk || 'assets/desk.jpg')}")`);
  rootStyle.setProperty('--img-trail', `url("${abs(A.trail || 'assets/trail.jpg')}")`);

  // new Breakout Land logo (swaps in automatically once assets/logo.webp exists)
  const logoImg = document.getElementById('logo-img');
  if (logoImg) {
    logoImg.onload = () => document.querySelector('.title-wrap').classList.add('has-logo');
    logoImg.onerror = () => logoImg.remove();
    logoImg.src = A.logo || 'assets/logo.webp';
  }

  // title buttons
  document.getElementById('t-student').onclick = () => {
    blip(700);
    state.created ? enterWorld() : openAvatarCreator(false);
  };
  document.getElementById('t-teacher').onclick = () => { blip(700); openTeacher(); };
  document.getElementById('t-parent').onclick = () => { blip(700); openParent(); };

  // avatar creator done
  document.getElementById('av-done').onclick = finishAvatar;

  // HUD buttons
  document.getElementById('hud-closet').onclick = () => openAvatarCreator(true);
  document.getElementById('hud-home').onclick = () => showScreen('title');
  document.getElementById('hud-mute').onclick = (e) => {
    muted = !muted;
    e.currentTarget.textContent = muted ? '🔇' : '🔊';
  };

  // back-to-world buttons
  document.querySelectorAll('[data-back-world]').forEach(b => b.onclick = () => enterWorld());
  document.querySelectorAll('[data-back-title]').forEach(b => b.onclick = () => showScreen('title'));

  // modal close buttons
  document.getElementById('bm-close').onclick = closeBuildingModal;
  document.getElementById('pz-close').onclick = closePuzzle;
  document.getElementById('building-modal').addEventListener('pointerdown', e => {
    if (e.target === e.currentTarget) closeBuildingModal();
  });

  // demo reset
  document.getElementById('t-reset').onclick = () => {
    resetState();
    toast('Demo progress reset — fresh start!');
  };

  // Esc closes modals
  addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeBuildingModal();
      closePuzzle();
      document.getElementById('cel-modal').classList.remove('open');
    }
  });

  showScreen('title');
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
```

---

## `scripts/build-artifact.mjs`

```js
/* Builds dist/breakout-land.html — a single self-contained fragment
   (no doctype/html/head/body wrapper) suitable for claude.ai Artifact
   publishing or pasting into any host page. `node scripts/build-artifact.mjs` */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const html = read('index.html');
let body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
body = body.replace(/^<script src="[^"]+"><\/script>\s*$/gm, '').trimEnd();

const css = read('css/styles.css');
const js = ['js/data.js', 'js/state.js', 'js/puzzles.js', 'js/avatar.js', 'js/world.js', 'js/screens.js', 'js/main.js']
  .map(read).join('\n\n');
const b64 = (p, mime) => `data:${mime};base64,${readFileSync(join(root, p)).toString('base64')}`;
const assets = {
  heroes: b64('assets/heroes.webp', 'image/webp'),
  title: b64('assets/title.jpg', 'image/jpeg'),
  desk: b64('assets/desk.jpg', 'image/jpeg'),
  trail: b64('assets/trail.jpg', 'image/jpeg'),
};
if (existsSync(join(root, 'assets/logo.webp'))) assets.logo = b64('assets/logo.webp', 'image/webp');

const out = `<title>Breakout Land — a Breakout EDU world</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>
${css}
</style>
${body}
<script>
window.WORLD_MAP_SRC = '${b64('assets/world-map.jpg', 'image/jpeg')}';
window.ASSETS = ${JSON.stringify(assets)};
</script>
<script>
${js}
</script>
`;

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/breakout-land.html'), out);
console.log(`dist/breakout-land.html written (${(out.length / 1024).toFixed(0)} KB)`);
```

---

## `.gitignore`

```text
node_modules/
.DS_Store
```
