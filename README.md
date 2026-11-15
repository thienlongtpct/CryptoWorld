# CryptoWorld

A project for [sunhacks 9.0](https://sunhacks.io/) (November 14–15, 2026, Student Pavilion, ASU Tempe).

Live at **[www.cryptoworld.wiki](https://www.cryptoworld.wiki)**.

Step-by-step animated visualizations of cryptography, from classical ciphers to the building blocks of secure two-party computation (oblivious transfer, OPRF, OKVS, VOLE, PSI, PSU), in the style of [VisuAlgo](https://visualgo.net): pick a topic, enter your own inputs, and play the protocol one line of pseudo-code at a time. Behind the visualizations sit a 48-term dictionary, PSI and PSU paper libraries, and a bibliography.

Built with **React 18 + TypeScript**, bundled by **Vite** into a single self-contained HTML file.

> **Toy parameters only.** Every demo uses small numbers so you can follow the maths. Nothing here is secure; don't reuse the code for real cryptography.

---

## Using the site

### Pages

Every page has its own address: the site's URL followed by `#` and a short name.

| Page | Link | What's there |
|---|---|---|
| Home | `#top` | Search, a “Do you know?” tip, and a grid of 30 visualization tiles filterable by group or tag |
| A visualization | `#ot`, `#okvs`, `#psi`, `#psufw`, `#rsa`, `#ecc`, … | Full-screen animated (or interactive) visualization; see below |
| Dictionary | `#terms` | All 48 terms as cards, filterable by category and searchable |
| A term's dictionary page | `#def-ot`, or `#aon`, `#lpn`, … for terms without a visualization | Meanings, formal definition, origin papers, related terms |
| Classical cryptography | `#classical` | Timeline plus Caesar, frequency analysis, Vigenère, rail fence and one-time pad demos |
| Modern cryptography | `#modern` | Timeline, symmetric vs public-key, block-cipher avalanche, modes (ECB/CBC/CTR), SHA-256, RSA, elliptic curves |
| PSI library | `#lib-psi` | Five protocol families, a "which protocol?" guide, 21 papers |
| PSU library | `#lib-psu` | Protocol families, framework explorer, all-or-nothing output, benchmarks, chooser, 19 papers, open problems |
| Bibliography | `#bib` | Timeline of 59 papers with "builds on" lineage, plus a searchable table |

Sections inside a page can be linked directly too, for example `#cl-caesar`, `#mo-ecc`, `#psu-bench` or `#pp-pt26` (one paper card in the PSU library).

### Visualization pages

Each of the 30 topics opens full-screen, laid out like VisuAlgo:

- **Top bar**: the topic's group as tabs (e.g. OT · IKNP · PCG · OPRF · OPPRF · OKVS · VOLE), the *Everything / Alice sees / Bob sees* switch, and an **e-Lecture** button with the dictionary entry and lecture notes.
- **Stage**: Alice, the public wire and Bob, filled in step by step.
- **Actions** (yellow, bottom-left): enter your own messages, sets, keys or parameters and press **Go**; the animation restarts and plays.
- **Status and code trace** (right): what is happening now, and the pseudo-code with the current line highlighted.
- **Playback bar** (bottom): speed (0.25×–4×), first / previous / play-pause / next / last, and a scrubber. Keyboard: **space** play/pause, **←** / **→** step.

Twenty-three topics are animated step by step; seven (PCG, VOLE, oblivious shuffle, AON, PSI variants, frequency analysis, hash functions) are interactive explorers inside the same layout.

### Finding things

- **Header search** (`Look up a term…`) filters the Dictionary page as you type. Press **Enter** to open the first match.
- The **search box on the home page** opens the term directly if only one matches, otherwise the filtered list.
- The **A–Z letters** (side panel on wide screens, bar under the header on phones) jump to that letter.
- On a term page, use **← previous / next →** at the bottom, or the side list of all terms.

### Reading an entry

1. **Headword**: the term, abbreviation, part of speech and category.
2. **Senses**: numbered meanings, most common first.
3. **Formal box**: who holds what, and what each party gets.
4. **Try it**: the interactive demo (click the title to fold it).
5. **Origin**: bracketed citations such as `[IKNP03]`. Click one to open that paper in the Bibliography with its lineage highlighted.
6. **See also**: related terms.

### Seeing what each party knows

The **Everything / Alice sees / Bob sees** switch is in the header and on every demo that has private values; all copies share one state.

- Choosing *Alice sees* covers every value only Bob knows with a striped block, and vice versa.
- A bar at the bottom of the screen shows which view is on; **Show everything** switches back.
- Keyboard: **A** = Alice, **B** = Bob, **E** = everything (when not typing in a field). Arrow keys move within a switch.

### Things worth trying

- **Oblivious transfer** (`#ot`): flip Bob's choice bit, step through the protocol, then view as Alice: she never learns it.
- **OKVS** (`#okvs`): insert keys, then decode a key you never inserted. It returns an ordinary-looking number.
- **PSI** (`#psi`): edit the two sets and step through the naive, DH, OPRF, VOLE + OKVS and circuit protocols. The naive one ends with a dictionary attack.
- **PSU framework explorer** (`#psu-fw`): tick *Connection drops* and stop after step 2. RPMT has already leaked the intersection size; MCRG has not.
- **Frequency analysis** (`#cl-freq`): press *Guess by frequency rank*, then fix the wrong letters by hand.
- **Modes of operation** (`#mo-modes`): ECB leaks the padlock outline; CBC and CTR don't.

---

## Development

Requires **Node.js 22** and npm. `npm test` runs the TypeScript tests with Node's type stripper, and the delivery pipeline uses the same version. The dev server and `npm run build` also run on Node 18 or later. The project pins Vite 4, so an older Node can still build the site.

```bash
npm install
```

```bash
npm run dev
```

Opens a hot-reloading dev server at `http://localhost:8765/` and the account server at `http://127.0.0.1:8787`. The dev server proxies `/api` to it, so registration and learning progress work on the site. `npm run server` starts the account server on its own. Accounts are stored in `data/accounts.json` on this machine. Set `TIGER_DATABASE_URL` (see [TigerData](#tigerdata)) to store them in Tiger Cloud Postgres instead.

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload, plus the account server |
| `npm run server` | Account server only (registration and learning progress) |
| `npm run typecheck` | TypeScript check only |
| `npm test` | Cryptography checks, the account API, and the catalog ids that API accepts |
| `npm run ci` | Typecheck, tests, production build, and the self-contained page check |
| `npm run build` | Type-check, then build `dist/index.html`: one file with all JS and CSS inlined |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run e2e` | Build, then walk the 3-minute demo in Chromium against fake sponsors (see [End-to-end demo test](#end-to-end-demo-test)) |
| `npm run e2e:live` | The same walk against a deployed site, with `E2E_BASE_URL` set |
| `npm run artifact` | Build, then write `dist/artifact.html` (the same page without `<html>/<head>/<body>` wrappers) for publishing as a Claude artifact |

### End-to-end demo test

`e2e/demo.spec.mjs` is one Playwright test that follows [DEMO_VIDEO.md](DEMO_VIDEO.md) scene by scene: sign up, step through oblivious transfer and switch to Alice's view, sort the Bridge board (one wrong row first, to see the nudge), ask the Gemini tutor, forge the seal in the Maritime workbench, run the Research Desk and wait for the daily news watch, then check the Journal's Skills and Challenges tabs.

`npm run e2e` builds the page and starts `e2e/server.mjs`. That harness serves `dist/index.html` and the real account API on one origin, with an in-memory store and fake Gemini, TinyFish and Maritime endpoints at the HTTP boundary, so the real adapters and the lab worker still run. The fake Maritime sandbox runs the learner's Python with `python3`. Nothing leaves the machine: any other outbound request fails. At the end the test reads `/__e2e/calls` to confirm every sponsor endpoint the demo mentions was hit, and that the tutor's prompt held only the permitted view.

The first time, install the browser:

```bash
npx playwright install chromium
```

Run against the live site, with the real sponsors (it creates a new `e2e_…` account each run, and spends one Maritime run and one TinyFish run):

```bash
E2E_BASE_URL=https://www.cryptoworld.wiki npm run e2e:live
```

`E2E_VIDEO=1` records the whole walk to `test-results/`, which works as a rough cut for the demo video. On failure, open the trace with `npx playwright show-trace test-results/<test>/trace.zip`.

`dist/index.html` works on its own: open it from disk or upload it to any static host (GitHub Pages, Netlify, S3, a university web space). It loads nothing except Google Fonts and the official MLH trust badge, which MLH hosts. It falls back to system fonts without the fonts.

### Project layout

```
index.html                Vite entry: fonts, <div id="root">
src/
  main.tsx                Mounts <App> inside <AppProvider>
  App.tsx                 Hash router (visualization topics take over the whole screen), titles, shortcuts, citations
  state.tsx               App-wide context: route, Alice/Bob view, search text, playground sets, selected paper
  lib/crypto.ts           Toy cryptography: modular arithmetic, toy hash, DH group, OKVS, 16-bit SPN, classical-cipher helpers
  components/
    ui.tsx                Shared UI: Lab, Pv (party panel), S (secret value), Kv, Seg, Eyes, Steps, LogBars, Html…
    Header.tsx            Header, search, A–Z bar
    DepMap.tsx            "How the entries depend on each other" map
    PapersExplorer.tsx    Bibliography timeline, lineage and table
  pages/
    Home.tsx  Terms.tsx  TermPage.tsx  ContentPage.tsx  Bibliography.tsx
  demos/
    foundations.tsx       Secret sharing, commitment, Diffie–Hellman, Paillier, zero-knowledge cave
    oblivious.tsx         OT, IKNP, PCG, OPRF, OKVS, VOLE, OPPRF, garbled gate, cuckoo hashing, shuffle
    sets.tsx              PSI playground and protocol stepper, cost chart, PSU, PSI variants
    classical.tsx         Timelines, Caesar, frequency analysis, Vigenère, rail fence, one-time pad
    modern.tsx            Block-cipher avalanche, modes of operation, SHA-256, RSA, elliptic curves
    libraries.tsx         PSU/PSI family cards, paper catalogues, framework explorer, AON, benchmarks, choosers
    index.tsx             DEMOS (entry → demo) and WIDGETS (page section → widget) registries
  data/
    entries.ts            All 48 dictionary entries
    pages.ts              Text of the Classical, Modern, PSI and PSU pages, split around their widgets
    papers.ts             Bibliography (59 papers with "builds on" links)
    libraries.ts          PSU (from the SoK) and PSI library data, including benchmark tables
  vis/
    registry.ts           The 30 topics: title, tab label, group, colour, tags, thumbnail, e-Lecture source
    Player.tsx            VisPage: top tabs, stage, action drawer, status + code trace, playback bar, e-Lecture
    kit.tsx               Stage building blocks (Party, Wire, SMsg, Hl) and useDraft for Go-to-apply inputs
    Thumb.tsx             Tile illustrations for the home grid
    topics.tsx            Topic id → page component
    topics/*.tsx          One component per topic, grouped like the home page
  styles/global.css       Site styling: Minimal UI tokens at the top (:root), then components
  styles/vis.css          Visualization pages and home grid (VisuAlgo-style colours at the top)
scripts/make-artifact.mjs Builds dist/artifact.html
scripts/check-dist.mjs    Fails the build unless dist/index.html is one self-contained page
scripts/smoke.mjs         Requests the live site and /api/health after an AWS deploy
server/                   Account API. index.mjs is the local server; lambda.mjs is the AWS entry
infra/                    AWS stack: CloudFront, private S3, Lambda, DynamoDB, GitHub role
.github/workflows/pipeline.yml  Checks on every pull request, delivery on main
legacy/                   The previous vanilla-JS version, kept for reference only
```

### How the pieces connect

- **Routing** is the URL hash (`#ot`, `#lib-psu`, …). `App.tsx` maps a hash to a page; in-page anchors such as `#cl-caesar` are routed by prefix (`cl-` → Classical, `mo-` → Modern, `psu-`/`pp-` → PSU library, `psi-`/`ip-` → PSI library, `L-` → Dictionary).
- **Entries** come from `data/entries.ts`. A full entry's `demo` field (e.g. `'w-ot'`) names a component in `DEMOS` in `demos/index.tsx`.
- **Content pages** (Classical, Modern, libraries) come from `data/pages.ts`. Each section's `widget` (its section id) names a component in `WIDGETS`.
- **Private values**: wrap them in `<S a>` (only Alice knows it) or `<S b>` (only Bob). Pass `secret` to `<Lab>` to show the per-demo perspective switch. Redaction is pure CSS on `body[data-view]`, set from `state.tsx`.
- **Rich text** in the data files is trusted, hand-written HTML rendered by `<Html>`. Citation links inside it look like `<a class="cite" data-paper="iknp03">[IKNP03]</a>`; `App.tsx` turns them into bibliography links.

### Common changes

**Add a visualization.**
1. Add the topic to `TOPICS` in `src/vis/registry.ts` (id, title, tab label, group, thumbnail kind, tags, `entry` for the e-Lecture).
2. Write a component that builds its frames and renders `<VisPage>`:

```tsx
export function MyVis() {
  const [x, xD, setXD, commitX] = useDraft('hello');      // applied on Go
  const frames = useMemo<Frame[]>(() => [
    { stage: <Party who="alice" title="Alice">{x}</Party>, status: 'Alice starts.', line: 0 },
    { stage: <Party who="alice" title="Alice">{x.toUpperCase()}</Party>, status: 'She transforms it.', line: 1 },
  ], [x]);
  return <VisPage topicId="my" code={['start', 'transform']} frames={frames}
    actions={[{ label: 'Input', form: <><input value={xD} onChange={e => setXD(e.target.value)} /><Go onClick={commitX} /></> }]} />;
}
```

3. Register it in `TOPIC_PAGES` in `src/vis/topics.tsx`. For an interactive-only topic, pass `stage={<Component />}` instead of `frames`.


**Change Bit, the cipher companion.** Bit lives in `src/bit/` and is mounted once by `World.tsx`, so it works on the map and on every Library page.
- Appearance: `art.ts` holds the palette, the 16 × 16 sprite (world and guide button) and the 32 × 32 portrait as character grids, plus the six expressions (`FACES`). Nothing is loaded at runtime.
- Dialogue: `script.ts` holds every local message (`LINES`, `placeScript`), the menu, curated gate hints (from `hints` in `dungeon/challenges.ts`) and the place detection (`placeOf`). Keep each message to one short idea; `lintScript` and `test/bit.test.ts` check links and length.
- Triggers: `tutorialFor` and `AUTO_OPEN` decide which places open a dialogue once and which only show a nudge. Seen tutorials and the instant-text setting are stored by `loadBit`/`saveBit` in `dungeon/rooms.ts`.
- Behaviour: `typewriter.ts` (graphemes, punctuation pauses, one press reveals or advances) and `BitDialogue.tsx` (keyboard capture, focus, screen-reader announcement). Free-form questions go to `POST /api/npc` with `characterId: 'bit'`, handled by `prepareGuide` in `characters/views.ts`.

**Add a short dictionary term.** Add an object to `ENTRIES` in `src/data/entries.ts`; keep the list in A–Z order of `headword`:

```ts
{
  "id": "gcm",                       // page address: #gcm
  "headword": "Galois/Counter Mode",
  "abbr": "GCM",
  "pos": "n.",
  "cat": "symmetric primitive",      // becomes a category filter automatically
  "definition": "An authenticated-encryption mode combining CTR encryption with a polynomial MAC.",
  "origin": "D. McGrew and J. Viega, 2004.",
  "seeAlso": ["blockcipher", "hash"],
  "short": true
}
```

**Add a full entry with a demo.**
1. Write the demo as a React component in one of the `src/demos/*.tsx` files, using `<Lab>`, `<Pv>`, `<S>` and `<Kv>` from `components/ui.tsx`.
2. Register it in `DEMOS` in `src/demos/index.tsx` under a key such as `'w-gcm'`.
3. Add an entry with `"short": false`, `senses`, `func` (the formal box), `prose`, `demo: "w-gcm"`, `uses`, `library`, `origin` and `seeAlso`.

**Add a paper to the bibliography.** Add to `PAPERS` in `src/data/papers.ts`:

```ts
{ "id": "abc24", "year": 2024, "label": "ABC24", "title": "Paper Title", "authors": "A. Author, B. Author",
  "venue": "Venue", "cat": "psu", "buildsOn": ["krtw19"], "note": "One-line contribution." }
```

`cat` is one of `found`, `ot`, `corr`, `oprf`, `okvs`, `psi`, `cpsi`, `psu`. To cite it from an entry, put `<a class="cite" data-paper="abc24">[ABC24]</a>` in the entry's `origin`.

**Add a paper to the PSI or PSU library.** Add to `PSI_PAPERS` or `PSU_PAPERS` in `src/data/libraries.ts`. PSU papers may include `small` (runtimes at n = 2⁴, 2⁶, 2⁸, 2¹⁰ on LAN / WAN1 / WAN2 plus communication) and `big` (runtime and communication at n = 2²⁰). They then appear in the benchmark chart, the table and the chooser automatically.

**Change colours or fonts.** Edit the tokens at the top of `src/styles/global.css` (`--accent`, `--alice-main`, `--bob-main`, `--f-display`, `--f-body`, …).

---

## From a change to AWS

`.github/workflows/pipeline.yml` is the path from a change to the running site.

On every pull request, and on every push to `main`, the check job:

1. Installs the locked dependencies.
2. Type-checks the site.
3. Runs the tests: cryptography helpers, the account API in memory, on disk, and over HTTP, the DynamoDB store against an in-memory table, and the lesson ids the API accepts.
4. Builds `dist/index.html` and checks that the page is one self-contained file.
5. Audits the dependencies that ship with the site and the account API, and the AWS toolchain, and fails on a high or critical advisory. Vite stays a dev dependency; its dev-server advisory is not part of the delivered page.
6. Type-checks and synthesizes the AWS template in `infra/`.

The same job uploads `dist/` as a build artifact. A push to `main` delivers that artifact when the repository variable `AWS_DEPLOY_ROLE_ARN` is set. Until then the delivery job stays skipped and the checks still run. Run `npm run ci` locally before you push; it is the same typecheck, test, build, and page check.

```
browser
  |
  |  https://<distribution>/
  v
CloudFront
  |-- /        private S3 bucket (dist/index.html)
  \-- /api/*   API Gateway -> Lambda -> DynamoDB
```

The site and the account API share one hostname, so the session cookie stays on the same origin the dev server already uses for `/api`. Local accounts stay in `data/accounts.json`. Accounts created on AWS are stored in DynamoDB. The session cookie is marked `Secure` in AWS, where CloudFront serves the site over HTTPS.

The running pieces are a private S3 bucket, a CloudFront distribution, an API Lambda (20s), a DynamoDB table, an SQS lab queue, and a lab-worker Lambda (Maritime runs outside the API timeout). The site and `/api/*` stay on one CloudFront hostname so session cookies remain same-origin and `Secure` in AWS.

### Placeholders (never commit real values)

```bash
TINYFISH_API_KEY="<YOUR_TINYFISH_API_KEY>"
MARITIME_API_KEY="<YOUR_MARITIME_API_KEY>"
GEMINI_API_KEY="<YOUR_EXISTING_GEMINI_API_KEY>"
GEMINI_MODEL="<YOUR_ENABLED_GEMINI_MODEL>"
AWS_REGION="<YOUR_AWS_REGION>"
AWS_PROFILE="<YOUR_AWS_PROFILE>"
AWS_DEPLOY_ROLE_ARN="<YOUR_EXISTING_AWS_DEPLOY_ROLE_ARN>"
SPONSOR_SECRET_ARN="<YOUR_SECRET_ARN_IF_USED>"
```

Preferred production path: store JSON in Secrets Manager and pass only the ARN into deploy:

```json
{
  "TINYFISH_API_KEY": "<YOUR_TINYFISH_API_KEY>",
  "MARITIME_API_KEY": "<YOUR_MARITIME_API_KEY>",
  "GEMINI_API_KEY": "<YOUR_EXISTING_GEMINI_API_KEY>",
  "GEMINI_MODEL": "<YOUR_ENABLED_GEMINI_MODEL>",
  "TIGER_DATABASE_URL": "<YOUR_TIGER_CLOUD_CONNECTION_STRING>"
}
```

`SPONSOR_SECRET_ARN` grants `secretsmanager:GetSecretValue` to the API and lab-worker Lambdas. Existing `GEMINI_API_KEY` / `GEMINI_MODEL` Lambda env settings are still honored when set. Keys must not appear in the browser bundle, git, or CI synth (synth uses empty dummy sponsor config).

### Turn delivery on

You need an AWS account, the AWS CLI, and credentials that can create the stack the first time. Later deploys from GitHub assume a role with OpenID Connect, so the repository holds no access key.

1. Build the site and create the stack. CloudFront is global; the region you pick is where the API, the table, the queue, and the bucket live.

```bash
export AWS_REGION="<YOUR_AWS_REGION>"
export AWS_PROFILE="<YOUR_AWS_PROFILE>"
npm ci
npm run ci
cd infra
npm ci
npx tsc --noEmit
npx cdk synth -c githubRepo=OWNER/NAME --no-notices
npx cdk bootstrap aws://ACCOUNT/REGION
# Optional before deploy:
# export SPONSOR_SECRET_ARN="<YOUR_SECRET_ARN_IF_USED>"
# export GEMINI_API_KEY="<YOUR_EXISTING_GEMINI_API_KEY>"
# export GEMINI_MODEL="<YOUR_ENABLED_GEMINI_MODEL>"
npx cdk deploy --require-approval never -c githubRepo=OWNER/NAME
```

2. Copy the `DeployRoleArn` output. Trust that role from the CDK toolkit, then add the repository variables / secrets under Settings → Secrets and variables → Actions.

```bash
npx cdk bootstrap aws://ACCOUNT/REGION \
  --trust DeployRoleArn \
  --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess
```

| Name | Kind | Value |
|---|---|---|
| `AWS_DEPLOY_ROLE_ARN` | Variable | `<YOUR_EXISTING_AWS_DEPLOY_ROLE_ARN>` / `DeployRoleArn` output |
| `AWS_REGION` | Variable | `<YOUR_AWS_REGION>` (workflow default `us-west-2` when empty) |
| `AWS_OIDC_PROVIDER_ARN` | Variable | Only when the account already has a GitHub OpenID provider |
| `SPONSOR_SECRET_ARN` | Secret | `<YOUR_SECRET_ARN_IF_USED>` (preferred) |
| `GEMINI_API_KEY` | Secret | `<YOUR_EXISTING_GEMINI_API_KEY>` if not only in the sponsor secret |
| `GEMINI_MODEL` | Secret | `<YOUR_ENABLED_GEMINI_MODEL>` |
| `TINYFISH_API_KEY` / `MARITIME_API_KEY` | Secret | Only if not using `SPONSOR_SECRET_ARN` |
| `TIGER_DATABASE_URL` | Secret | Only if not using `SPONSOR_SECRET_ARN`; leave empty to stay on DynamoDB |
| `SITE_DOMAINS` | Variable | Optional, e.g. `example.com,www.example.com` (see [Use your own domain](#use-your-own-domain)) |
| `SITE_CERTIFICATE_ARN` | Variable | Required with `SITE_DOMAINS`: ACM certificate ARN in **us-east-1** |

3. Push to `main`. The delivery job deploys the stack, uploads the tested page, and runs `scripts/smoke.mjs` (site + `/api/health` readiness booleans — no paid provider calls).

### Use your own domain

CloudFront has no fixed IP address. Its edge IPs change, so **don't create an A record with an IP you looked up**. Point DNS at the CloudFront hostname instead. That hostname is the `DnsTarget` stack output, something like `dxxxxxxxxxxxx.cloudfront.net`. It stays the same for the life of the distribution, so the records you create never need updating.

1. **Request a certificate in us-east-1.** CloudFront only reads certificates from that region, even though the stack runs elsewhere. In the ACM console, switch to *US East (N. Virginia)*, then choose *Request a public certificate*. List every hostname (`example.com` and `www.example.com`) and choose DNS validation. ACM shows one CNAME per hostname, named like `_abc123.example.com` with a value like `_xyz.acm-validations.aws.`. Add those CNAMEs at your DNS provider and keep them, so the certificate renews automatically. Wait for the status *Issued*. Or use the CLI:

   ```bash
   aws acm request-certificate --region us-east-1 --validation-method DNS \
     --domain-name example.com --subject-alternative-names www.example.com
   ```

2. **Deploy with the domain.** Set the repository variables `SITE_DOMAINS=example.com,www.example.com` and `SITE_CERTIFICATE_ARN=arn:aws:acm:us-east-1:…`, then push to `main`. You can also deploy by hand:

   ```bash
   npx cdk deploy -c githubRepo=OWNER/NAME \
     -c siteDomains=example.com,www.example.com \
     -c siteCertificateArn=arn:aws:acm:us-east-1:ACCOUNT:certificate/ID
   ```

   Both values are optional and must be set together. With neither set (CI synth, first bring-up), the site stays on its `cloudfront.net` hostname.

3. **Create the DNS records** at your DNS provider, using `DnsTarget` as the value:

   | Host | Type | Value |
   |---|---|---|
   | `www` | `CNAME` | `dxxxxxxxxxxxx.cloudfront.net` |
   | `@` (apex) | `ALIAS` / `ANAME` / flattened `CNAME` | `dxxxxxxxxxxxx.cloudfront.net` |

   Use whichever apex record type your provider offers. Namecheap and Porkbun call it `ALIAS`, DNSimple and others call it `ANAME`, and Cloudflare flattens a `CNAME` at `@` (set Proxy to *DNS only*). Route 53 uses an `A` record with *Alias* to the CloudFront distribution. If your provider has no apex alias at all (GoDaddy, for example), pick one of these:
   - Use the provider's *URL forwarding* to send `example.com` to `https://www.example.com`, and serve the site on `www` only.
   - Move the domain's nameservers to Route 53 or Cloudflare, which keeps the registrar.
   - As a last resort, use [CloudFront Anycast static IPs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/request-static-ips.html). These are real fixed IPs for plain `A` records, but they cost a fixed monthly fee per IP list (about $3,000/month at launch), require the *all edge locations* price class, and this stack doesn't create them.

The site and `/api/*` share the hostname you browse to, so sign-in cookies work the same on `example.com`, `www.example.com` and the `cloudfront.net` name. Accounts are shared, but each hostname keeps its own session cookie. `SiteUrl` (used by `scripts/smoke.mjs`) stays the `cloudfront.net` URL, so a deploy before DNS is ready still passes the smoke check. To check a custom hostname, run `node scripts/smoke.mjs https://www.example.com`.

### Production smoke checklist (after deploy)

1. `node scripts/smoke.mjs https://<SiteUrl>` — page `#root`, health `ok`, readiness booleans.
2. Register / sign in on the live hostname; cookie is `Secure` + same-origin `/api`.
3. Start a research job and a lab run as two different accounts; confirm cross-user GET is 404.
4. Confirm failed/expired jobs show useful UI states; authored hints still work without Gemini.
5. Complete the Forged seal submit; Journal → Skills shows server evidence (not a certification).
6. **Paid provider smoke (explicit, not CI):**

```bash
SITE_URL=https://<SiteUrl> node scripts/smoke-sponsors.mjs
```

That script performs one TinyFish research run and one Maritime lab run when `/api/health` reports them configured. If keys are unavailable, skip it and treat live verification as pending.

The CloudFormation execution role from that bootstrap can administer the account. That is the role CDK uses to create the bucket, the distribution, the functions, the queue, and the table. The GitHub role can only assume those CDK toolkit roles, and only from a workflow running on `main`.

### TinyFish

`TINYFISH_API_KEY` (env or sponsor secret) turns on three server-side uses of TinyFish browser automation. The key never reaches the page.

- **Research Desk** (`#research`, `server/research.mjs`): a learner starts a run for an approved topic or paper in `server/research-catalog.mjs`. Results are validated resource cards, cached 24 hours, 8 runs per learner per day.
- **Tutors cite research** (`server/tutor-sources.mjs`): when a learner asks a Dungeon NPC a question, the server looks up that learner's completed research for the region's topics (and the open challenge's lesson) and passes up to 4 sources to Gemini as `learnerSources`. They are marked as untrusted quoted material, and the tutor cites them as `[n]`. The reply lists only the cited sources. No TinyFish run is started here. With nothing to cite, the reply links to the matching Research Desk topic.
- **News watch** (`GET /api/news`, `server/news.mjs`, shown on the Research page): one shared run per allowlisted source (NIST CSRC news, IACR ePrint last 7 days) per UTC day, stored as research jobs owned by `system:news`. The first signed-in visit of the day starts it, later visits reuse it, polling TinyFish at most every 20 seconds. Item links must stay on the source's hosts, and headlines are tagged with related lessons by keyword. A failed day shows the latest digest from the previous 3 days and retries after an hour. Opening a headline (`POST /api/news/read`) records practice evidence. Cost is at most 2 runs a day plus retries, whatever the number of learners. Two Lambdas cold-starting at the same moment could each start a run.

### TigerData

Setting `TIGER_DATABASE_URL` to a Tiger Cloud service's connection string (in `.env` locally, or as `TIGER_DATABASE_URL` inside the `SPONSOR_SECRET_ARN` JSON on AWS) switches the account server to `server/pg-store.mjs`. Without it, nothing changes: the JSON file locally, DynamoDB on AWS. Switching does not copy existing accounts.

The store creates its tables on first use, holding a Postgres advisory lock so concurrent Lambda cold starts migrate once. When the TimescaleDB extension is available (always on Tiger Cloud):

- `evidence` is a **hypertable** partitioned by `at` in 7-day chunks. Its key is `(id, at)` because hypertable unique keys must include the time column.
- `activity_daily` is a **real-time continuous aggregate** (`time_bucket('1 day')` per user and evidence type), refreshed every 30 minutes and including rows newer than the last refresh.

On plain Postgres the same names exist as an ordinary table and view. `GET /api/activity` reads `activity_daily` for the last 30 days and returns per-day totals and a streak, shown as a strip on Journal → Skills. On other stores it returns `{ enabled: false }` and the strip stays hidden. `/api/health` reports `tigerdata: true` when this store is active.

`test/store-contract.test.mjs` runs one behaviour suite on the memory store, and also on Postgres when `TEST_TIGER_DATABASE_URL` points at a database it may wipe:

```bash
TEST_TIGER_DATABASE_URL=postgres://localhost:5432/cryptoworld_test npm test
```

Destroying the stack leaves the account table and the site bucket in the account. The table holds password hashes, learning progress, and skills evidence.

---

## Sources and caveats

- The **PSU library** (families, all-or-nothing output, benchmark numbers, open problems) is based on *SoK: Private Set Union Under Incomplete Execution: Security and Practical Performance*, which is marked as an **anonymous submission under review**. Check the venue's double-blind policy before making the site public.
- Where that SoK doesn't state a protocol's security model or output type, the site says "Not stated" rather than guessing.
- The **PSI cost chart** and the **PSI protocol chooser** are rules of thumb, not measured benchmarks.
- Paper metadata not taken from the SoK's reference list was written from memory. Please verify titles, authors and venues before citing them in your own work.
