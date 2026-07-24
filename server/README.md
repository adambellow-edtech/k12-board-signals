# Breakout Land Backend

A real backend for accounts, progress persistence, analytics ingestion, and honest teacher-dashboard data. **Zero npm dependencies**: it runs on Node 22 built-ins only (`node:http`, `node:sqlite`, `node:crypto`).

## Run

```bash
cd server
npm run seed     # creates data/breakout.db with 1 teacher, 1 class, 25 students
npm start        # serves the API on :4000
npm test         # 20-case API suite against an in-memory DB
```

Node 22.5+ is required (for `node:sqlite`). All scripts pass `--experimental-sqlite`.

## Connecting the client

The client (`../js/api.js`) is a no-op unless `window.BREAKOUT_API` is set, so the offline single-file build is unaffected. To point a hosted client at this API, inject before the app scripts:

```html
<script>
  window.BREAKOUT_API = 'https://api.breakoutland.example';
  window.BREAKOUT_CLASS_CODE = 'ABC12'; // optional: auto-join a class
</script>
```

When configured, the client registers the student on avatar creation (deferred signup: they play first), persists world state on every save, and streams analytics events in batches.

## Routes

| Method | Path | Who | Purpose |
|---|---|---|---|
| GET  | `/api/health` | any | liveness |
| POST | `/api/auth/teacher` | any | teacher sign-in (local now, SSO later), auto-provisions a class |
| POST | `/api/auth/student` | any | student join by class code, returns a token |
| GET  | `/api/me` | token | decode current identity |
| GET  | `/api/students/:id/state` | owner or their teacher | load world state |
| PUT  | `/api/students/:id/state` | owner | save world state |
| POST | `/api/events` | student | analytics ingestion (batch) |
| GET  | `/api/classes/:id/roster` | class teacher | real roster + per-standard mastery |
| PUT  | `/api/classes/:id/access` | class teacher | world access mode: `always` \| `school` \| `never` |
| POST | `/api/classes/:id/breakout/start` | class teacher | start a Class Breakout live session |
| GET  | `/api/classes/:id/breakout` | token | current live session for the class |
| POST | `/api/breakout/:sid/solve` | student | record a cooperative solve (broadcasts) |
| GET  | `/api/breakout/:sid/stream` | sid | Server-Sent Events stream of live session state |
| GET  | `/api/auth/sso/providers` | any | which SSO providers are configured |
| GET  | `/api/auth/sso/:provider/start` | any | begin an SSO login (returns the authorize URL) |
| GET  | `/api/auth/sso/:provider/callback` | any | OAuth callback → provisions a teacher, issues a token |

## SSO (Google / Clever / ClassLink)

The `auth.js` provider layer is real OAuth2, config-driven. Until a provider's
`*_CLIENT_ID` is set it runs in **demo mode** (deterministic identity, no network)
so the flow is exercisable locally and in the offline build. To go live, register
the app with each provider, set a redirect URI of
`https://your-host/api/auth/sso/<provider>/callback`, and set:

| Var | Provider |
|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google |
| `CLEVER_CLIENT_ID` / `CLEVER_CLIENT_SECRET` (+ `CLEVER_DISTRICT_ID`) | Clever |
| `CLASSLINK_CLIENT_ID` / `CLASSLINK_CLIENT_SECRET` | ClassLink |
| `PUBLIC_URL` | base URL for building redirect URIs |
| `APP_URL` | where the callback redirects back with `#sso_token=…` |

Google trusts the `id_token` returned by its token endpoint (delivered over TLS);
Clever and ClassLink use the access token to read the user profile. SSO provisions
**staff** accounts; students still join with a class code. The client shows
Sign-in-with buttons on the teacher entry and adopts the `#sso_token` on return.

## Design notes

- **`db.js` is the only SQL.** Swap SQLite for managed Postgres in production by reimplementing those functions against the same signatures. Nothing else changes.
- **Auth is stateless.** A token is an HMAC-signed claim (`node:crypto`); no passwords are stored. Set `BREAKOUT_SECRET` in production.
- **SSO is a seam.** `auth.js` exposes a `providers` map; `local` works today. Google / Clever / ClassLink each implement the same `resolveIdentity()` shape.
- **Mastery is honest.** `classStandardMastery()` is derived from real `lock_attempt` / `lock_solved` events per standard, not from a completion flag.
- **Monetization stance is enforced structurally:** there is no purchase surface anywhere in the API. Per the plan, the child is never the mark.

## Environment

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | API port |
| `BREAKOUT_DB` | `server/data/breakout.db` | SQLite file path (`:memory:` for tests) |
| `BREAKOUT_SECRET` | dev placeholder | HMAC signing key. **Set this in production.** |
