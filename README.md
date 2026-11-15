# VisuCrypto

A project for [sunhacks 9.0](https://sunhacks.io/) (November 14–15, 2026, Student Pavilion, ASU Tempe).

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

Opens a hot-reloading dev server at `http://localhost:8765/` and the account server at `http://127.0.0.1:8787`. The dev server proxies `/api` to it, so registration and learning progress work on the site. `npm run server` starts the account server on its own. Accounts are stored in `data/accounts.json` on this machine.

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload, plus the account server |
| `npm run server` | Account server only (registration and learning progress) |
| `npm run typecheck` | TypeScript check only |
| `npm test` | Cryptography checks, the account API, and the catalog ids that API accepts |
| `npm run ci` | Typecheck, tests, production build, and the self-contained page check |
| `npm run build` | Type-check, then build `dist/index.html`: one file with all JS and CSS inlined |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run artifact` | Build, then write `dist/artifact.html` (the same page without `<html>/<head>/<body>` wrappers) for publishing as a Claude artifact |

`dist/index.html` works on its own: open it from disk or upload it to any static host (GitHub Pages, Netlify, S3, a university web space). It loads nothing except Google Fonts, and falls back to system fonts without them.

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

The running pieces are a private S3 bucket, a CloudFront distribution, an on-demand Lambda function, and an on-demand DynamoDB table.

### Turn delivery on

You need an AWS account, the AWS CLI, and credentials that can create the stack the first time. Later deploys from GitHub assume a role with OpenID Connect, so the repository holds no access key.

1. Build the site and create the stack. CloudFront is global; the region you pick is where the API, the table, and the bucket live.

```bash
npm ci
npm run build
cd infra
npm ci
npx cdk bootstrap aws://ACCOUNT/REGION
npx cdk deploy --require-approval never -c githubRepo=OWNER/NAME
```

2. Copy the `DeployRoleArn` output. Trust that role from the CDK toolkit, then add the repository variables under Settings → Secrets and variables → Actions → Variables.

```bash
npx cdk bootstrap aws://ACCOUNT/REGION \
  --trust DeployRoleArn \
  --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess
```

| Variable | Value |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | The `DeployRoleArn` output |
| `AWS_REGION` | The region you bootstrapped. The workflow uses `us-west-2` when this is empty |
| `AWS_OIDC_PROVIDER_ARN` | Only when the account already has a GitHub OpenID provider. Pass the same ARN as `-c githubOidcProviderArn=...` on the first deploy |

3. Push to `main`. The delivery job deploys the stack, uploads the tested page, and requests the site and `/api/health`.

The CloudFormation execution role from that bootstrap can administer the account. That is the role CDK uses to create the bucket, the distribution, the function, and the table. The GitHub role can only assume those CDK toolkit roles, and only from a workflow running on `main`.

Destroying the stack leaves the account table and the site bucket in the account. The table holds password hashes and learning progress.

---

## Sources and caveats

- The **PSU library** (families, all-or-nothing output, benchmark numbers, open problems) is based on *SoK: Private Set Union Under Incomplete Execution: Security and Practical Performance*, which is marked as an **anonymous submission under review**. Check the venue's double-blind policy before making the site public.
- Where that SoK doesn't state a protocol's security model or output type, the site says "Not stated" rather than guessing.
- The **PSI cost chart** and the **PSI protocol chooser** are rules of thumb, not measured benchmarks.
- Paper metadata not taken from the SoK's reference list was written from memory. Please verify titles, authors and venues before citing them in your own work.
