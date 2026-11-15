# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

CryptoWorld is a sunhacks 9.0 project: VisuAlgo-style animated cryptography visualizations (classical ciphers → OT/OPRF/OKVS/VOLE/PSI/PSU), a dictionary, paper libraries, learning paths, and a pixel-art "Crypto Dungeon" world with CTF challenges and Gemini-backed NPC tutors. React 18 + TypeScript, bundled by Vite 4 into **one self-contained `dist/index.html`**, plus a small Node account API. All crypto uses toy parameters on purpose.

README.md is detailed and covers routing, data files, and recipes for adding visualizations, terms, and papers. Read it before larger changes.

## Commands

Node 22 is required for tests and the server, which run `.ts` files through `--experimental-strip-types`.

```bash
npm run dev          # Vite on :8765 + account server on 127.0.0.1:8787 (Vite proxies /api)
npm run server       # account server only
npm run typecheck    # tsc --noEmit
npm test             # node --test over test/**/*.test.ts and test/**/*.test.mjs
npm run ci           # typecheck + test + build + scripts/check-dist.mjs (same as the CI check job)
npm run build        # tsc --noEmit && vite build -> dist/index.html
npm run e2e          # build + Playwright demo walk (e2e/demo.spec.mjs) against e2e/server.mjs with fake sponsors
```

Run a single test file:

```bash
node --experimental-strip-types --test test/dungeon-api.test.mjs
```

Filter by test name with `--test-name-pattern="..."`. CI also runs `npm audit --omit=dev --audit-level=high` and, in `infra/` (its own package), `npx tsc --noEmit` and `npx cdk synth -c githubRepo=OWNER/NAME`.

## Architecture

### Client (`src/`)
- **Hash routing** in `App.tsx`. A route is matched in this order: a visualization topic (`TOPIC_PAGES` in `vis/topics.tsx`), `lesson-<id>`, `path-<id>`, a dictionary entry (`#def-<id>` forces the plain term page for a term that also has a visualization), a named page (`PAGE_TITLES`), then in-page anchors routed by prefix (`cl-`, `mo-`, `psu-`/`pp-`, `psi-`/`ip-`, `L-`).
- **The world is the shell.** `App.tsx` always returns `<World>`. For a signed-in user on any non-world route, the page (visualization, tour, or Header + page) is passed as `<World layer={…}>`. The world stays mounted, hidden, and paused (no movement, painting, or key handling) under a fixed `.cw-strip` "Back to <room or gate>" bar, so position, an open challenge, and its draft survive a trip to the Library. Every branch must keep returning `<World>` at the same tree position, or the world remounts and loses that state. `.cw-layer` offsets `.vis` and `header.bar` by `--cw-strip`.
- **Access gating** (`access.ts`): guests can open only `''`, `top`, and `world`, which render the Dungeon world. Every other route (topics, library, dictionary, lessons, paths, tours) calls `requestAccess` and needs a logged-in account (`account.tsx`, which talks to `/api`).
- **Registries connect data to components.** `vis/registry.ts` (topic metadata) → `vis/topics.tsx` (component). In `data/entries.ts`, an entry's `demo` key → `DEMOS` in `demos/index.tsx`. In `data/pages.ts`, a section's `widget` → `WIDGETS`. Visualizations render `<VisPage>` (`vis/Player.tsx`) with a `frames` array, or with `stage` for interactive-only topics. Stage helpers and `useDraft` (apply on Go) are in `vis/kit.tsx`.
- **Alice/Bob perspective**: wrap private values in `<S a>`/`<S b>`. Redaction is pure CSS on `body[data-view]`, set from `state.tsx`.
- **Rich text** in data files is trusted, hand-written HTML rendered by `<Html>`. Citations (`<a class="cite" data-paper="...">`) are turned into bibliography links in `App.tsx`.
- **Dungeon world**: `world/` holds the canvas renderer, map, movement and NPC dialogue. `world/locations.ts` is the single source for each location's display name, short label, topic subtitle, description, Bit intro, accent palette and landmark art key; rooms, cast regions, the HUD, Bit and the Gemini views read names from it, while room, region and progress ids stay stable. Landmark, prop and decor artwork lives in `world/landmarks.ts`; map markers are in `world/LocationIcon.tsx`. `dungeon/rooms.ts` holds room maps, unlock requirements and the localStorage-persisted position, drafts and resume state. `dungeon/challenges.ts` holds the *public* challenge definitions. `characters/cast.ts` defines the NPCs and regions, and `characters/views.ts` decides what each NPC may know (`prepareNpc`).

### Shared client/server modules
The server imports some `src/` files directly as TypeScript: `characters/views.ts`, `dungeon/challenges.ts`, `world/locations.ts` (through `cast.ts`), and `src/data/catalog.json` + `src/data/entries.ts`. Keep those files free of browser-only or React imports, and use explicit `.ts` extensions in their imports so Node's type stripper can load them.
- `server/allowed.mjs` builds the set of progress ids the API will accept: catalog lessons, path step ids, `px-<entryId>` (practice), and `ctf-<pathId>`. It scrapes entry ids from `entries.ts` with a regex on `"id": "..."`, so keep that quoted-JSON formatting. New lessons and paths go in `catalog.json`, which `data/paths.ts` reads on the client.

### Server (`server/`)
- `app.mjs` `createHandler({ store, allowed, secureCookie, gemini, model })` is a transport-agnostic handler (`{method, path, headers, body}` → `{status, headers, body}`). Routes: `/api/health`, `/api/me`, `/api/register`, `/api/login`, `/api/logout`, `/api/npc`, `/api/dungeon/submit`, `/api/dungeon/walkthrough`, `PUT /api/progress`. Sessions use an HttpOnly `sid` cookie, and passwords are hashed with scrypt.
- `index.mjs` is the local HTTP server. It loads `.env` and stores accounts in `data/accounts.json` through the file store in `store.mjs`. `lambda.mjs` adapts API Gateway v2 events to the same handler, backed by `dynamo-store.mjs`. When `TIGER_DATABASE_URL` is set (env or sponsor secret), `store-select.mjs` swaps in `pg-store.mjs` (TigerData Postgres: `evidence` hypertable + `activity_daily` continuous aggregate behind `GET /api/activity`). All stores must pass `test/store-contract.test.mjs`.
- Challenges come in two kinds. Text gates (`caesar`, `xor`, `vault`) take one word. Classification boards (`params.kind === 'classify'`, e.g. `wire`, the "Public or Private?" board on the Key Exchange Bridge) list rows and choices on the client. `server/dungeon.mjs` keeps the expected choice per row in `BOARDS`. A wrong board returns only the wrong row ids plus a `NUDGES` hint. The explanation comes back only on success. Only `CATACOMB_GATES` count toward the treasure room.
- `dungeon.mjs` holds the CTF answers and walkthroughs. **It must never be imported by client code**, or the flags would ship in the bundle.
- TinyFish (`tinyfish.mjs`) backs the Research Desk (`research.mjs`), the shared daily news watch (`news.mjs`, `GET /api/news`), and tutor citations (`tutor-sources.mjs` feeds a learner's cached research into `/api/npc` as untrusted `learnerSources`).
- `npc.mjs` calls the Gemini API (`GEMINI_API_KEY`, optional `GEMINI_MODEL`) with only the "permitted view" from `prepareNpc`. Without a key, NPC tutoring returns a configuration error.

### Build and deploy
- `vite-plugin-singlefile` plus a high `assetsInlineLimit` inline everything. `scripts/check-dist.mjs` fails if the output is not one page, lacks `#root`, or is outside 20 KB–5 MB, so don't add assets that load at runtime.
- `.github/workflows/pipeline.yml` runs checks on PRs and `main`. On `main`, when `AWS_DEPLOY_ROLE_ARN` is set, it deploys the CDK stack in `infra/` (CloudFront → private S3 for the page, `/api/*` → API Gateway → Lambda → DynamoDB + SQS lab worker), then runs `scripts/smoke.mjs`. Sponsor keys prefer `SPONSOR_SECRET_ARN` (Secrets Manager); synth/CI uses empty dummy config. Paid TinyFish/Maritime smoke is `scripts/smoke-sponsors.mjs` only.
