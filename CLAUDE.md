# Đua Vịt Peti — project notes for Claude

Random character racing game ("Đua vịt") with a provably fair algorithm, open source (MIT) and free to
play at **https://duavit.peti.vn**. Built for livestreamers, events, classrooms and parties.
`peti.vn` itself is a static link hub (separate repo `peti-vn/peti.vn`) for this and future crowd-friendly party games in
the same visual style (thick ink outlines, hard shadows, Baloo 2 + Be Vietnam Pro, cream/tomato/sun palette).
All UI text is **Vietnamese**; racers are called **"nhân vật"** (not "con vật") in anything user-facing.
Contributor guide (adding characters and maps): `CONTRIBUTING.md`.

## Product model
- **Đua nhanh** `/dua-nhanh` — free, no login, runs 100% in the browser (paste up to 500 names /
  CSV, pick map + duration, race, video, results CSV). Like viral "duck racing" pickers.
- **Rooms** — creating a room requires **Google sign-in**; joining (`/r/CODE`) is free, no login.
  Host screen `/r/CODE/host`, OBS view `/r/CODE/live`, verify page `/kiem-chung`.
- Races are **purely random** and **provably fair** (seed commit/reveal). Host never influences speed.
  Cosmetic items, throws ("ném gạch"), falls, emoji reactions are **visual only** — never change results.
- Maps flagged `special: true` (e.g. the 30/4 "Dinh Độc Lập" map) are **opt-in per room**
  (`allowSpecialMaps`, off by default) and hidden in quick race unless toggled.
- Admin page `/admin` (role from `ADMIN_EMAILS`; non-admins get 404): stats, live rooms, users, ban.
- Fairness explainer `/cong-bang`; link to it wherever a commitment hash shows.
- Legal pages `/dieu-khoan` (`terms.html`) and `/quyen-rieng-tu` (`privacy.html`), linked from the
  `site-foot` footer of every public page and next to the sign-in button. The service is free, takes no
  money, sells nothing, and results have no monetary value. **The privacy policy describes exactly what
  the code stores** — when you add a cookie, a DB column, a log, a third-party request or change a
  retention time (`SESSION_DAYS`, `ROOM_IDLE_MINUTES`, backups), update `privacy.html` in the same change.

## Commands
```bash
npm install
npm start                 # node src/index.js (reads .env if present)
npm run dev               # node --watch
npm test                  # node:test, all suites in test/
npm run test:coverage
DEV_LOGIN=1 npm start     # fake sign-in at /auth/dev (ignored when NODE_ENV=production)
```
Env vars are documented in `.env.example`. Never commit `.env`, `data/` (SQLite) or `public/music/*.mp3`.
Production deploy (Docker + Caddy): `deploy/README.md`. Production refuses to start without an https
`PUBLIC_URL`; without Google credentials it starts with room creation closed (quick race, verify and
the public pages keep working) and logs a warning (`src/config.js`).

## Architecture
- `shared/` — runs in **both** Node and the browser (served at `/shared/*`):
  `catalog.js` (characters `ANIMALS`, `MAPS`, `ITEMS`, `RULES`, helpers), `race.js` (racer physics),
  `simulate.js` (fixed 50 ms step simulation), `fair.js` (seeded PRNG sfc32, SHA-256, seeds),
  `names.js` (paste/CSV name parsing).
- `src/` — server: `index.js` (env → `startServer`), `server.js` (Express routes, CSP, static),
  `sockets.js` (all Socket.IO events, per-room channels, tick/sweep), `rooms/roomManager.js`,
  `game/room.js` (one room's state machine: lobby→countdown→racing→finished, queue/slots,
  spectators, items, pause/restart), `chat.js`, `text.js` (sanitizer), `db.js` (node:sqlite +
  migrations), `auth/` (google.js, store.js, routes.js, cookies.js), `tools/backup.js` (`VACUUM INTO`).
- `public/` — vanilla ES modules, no build step. Pages: `home.html`, `index.html` (player),
  `host.html`, `live.html`, `quick.html`, `verify.html`, `fair.html` (`/cong-bang`), `admin.html`, `missing.html`.
  Rendering: `raceView.js` (canvas race, camera, minimap, effects), `track-art.js` (crowd, banners,
  flags, finish lines), `draw.js` (`PAINTERS`, `HEAD_TOP`; + `paint.js`, `painters*.js`, `scenery*.js`),
  `audio.js` (procedural music/SFX + per-map mp3 from `public/music/<mapId>.mp3`), `recorder.js` (canvas video).
  `net.js` = socket + per-room storage; `ui.js` = DOM helpers (`el`, `toast`).
- `test/catalog.test.js` checks every character has a painter + `HEAD_TOP`, every map has scenery and
  a full palette, and that everything draws headless — keep it passing when adding content.

## Invariants — do not break
- **Determinism**: a race is fully defined by `(seed, entrant order, trackLength, maxMs)`.
  Only `rngFromSeed(seed)` may drive race randomness; steps are fixed `SIM_STEP_MS`; the server
  steps on the race's own clock (`race.simTime`), never on wall-clock `dt`. `test/room.test.js`
  replays a room race from its published fairness data — keep it passing.
- Seed is secret until the race is finished (`snapshot().race.fairness.seed` is null before).
- Server is authoritative; snapshots never contain tokens/host keys; rooms never leak into each
  other (`io.to(code)` only).
- Security: host keys compared with `timingSafeEqual`; sessions stored as SHA-256 hashes;
  cookies HttpOnly + SameSite=Lax (+Secure on https); state-changing POSTs check `Origin`
  (`isSameOrigin`); `safeReturnTo` prevents open redirects; dev login can't run in production;
  admin role recomputed from `ADMIN_EMAILS` on every read; CSV exports escape formulas.
- `clientIp` trusts the first `X-Forwarded-For` hop when `TRUST_PROXY=1` — safe only while port 3000
  stays unpublished behind Caddy (keep `expose`, never `ports`, in `docker-compose.yml`).
- CSP is strict (`script-src 'self'`, no inline styles/scripts). Set styles via CSSOM
  (`el(tag, { style: {...} })`), never `style=""` strings or `innerHTML`.
- Client storage is namespaced per room (`roomStorage` in `net.js`, keys `peti.<room>.<name>`).
- `RaceView` treats a changed `race.startsAt` as a new race — keep it stable within a race.

## Conventions
- Commit/push **only when asked**. Conventional commits (`feat:`, `fix:`…). **Never** add
  `Co-Authored-By: Claude`, "Generated with Claude Code", or session links anywhere.
- Small files (aim < 800 lines; `raceView.js` ~730 is the biggest). Immutable updates in game logic.
- Tests first/alongside with `node:test`; run `npm test` before reporting done. For UI changes,
  check in a real browser — start the server, then drive the pages.
- After big changes, run code + security review and fix CRITICAL/HIGH findings.

## Gotchas learned the hard way
- The file-writing tool may turn `\uXXXX` escapes into raw characters. A raw U+2028 inside a
  regex literal is a **syntax error**; raw bidi/zero-width chars are invisible bugs. Write such
  regexes from a script using `String.fromCharCode(92)` or verify with a scan afterwards.
- When patching files with scripts, assert each search string occurs **exactly once** — a
  global replace once injected code into the wrong method twice (title/duration bugs).
- `node:sqlite` prints an ExperimentalWarning; it is wrapped in `src/db.js` so the driver can be
  swapped (e.g. better-sqlite3) in one place.
- On Windows use a POSIX shell for scripts; `.gitattributes` forces LF.
- Never put Markdown/JS with backticks inside a double-quoted shell string (`node -e "..."`):
  bash runs them as commands. Write the script to a temp file and run that instead.

## Wording (no gambling vocabulary)
Never use "may rủi", "may mắn", "cầu may", "giải thưởng", "tiền thưởng", "trúng thưởng", "cược",
"bốc thăm quà"… anywhere user-facing (UI, meta tags, docs, link hub). Say **"ngẫu nhiên" / "random"**,
"thuật toán công bằng", "kiểm chứng được (provably fair)". Use cases to suggest: chọn ngẫu nhiên,
chia đội, xếp thứ tự. The only exception is the prohibition clause of `/dieu-khoan`, which must name
"đánh bạc" / "cá cược" explicitly to forbid them.

## Content boundaries
- Google is the only sign-in.
- Original art only: no copyrighted characters, brand logos or real people's likenesses.
- Do not depict real groups of people (ethnic, national, political, religious) as animals or as
  slurs. Respectful historical/cultural imagery (e.g. 30/4 tanks, flags, the evacuation helicopter)
  is fine; put sensitive themes behind `special: true`.
- User-supplied mp3 soundtracks may trigger copyright strikes on livestreams; warn, don't bundle.
- Future idea: auto commentator voice (TTS: pre-rendered phrase bank + cached name synthesis);
  check the TTS licence first and never clone a real person's voice without consent.
