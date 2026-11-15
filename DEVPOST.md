**Live:** [www.cryptoworld.wiki](https://www.cryptoworld.wiki) · **Demo (3 min):** <YOUTUBE_LINK>

## Inspiration

Most people meet cryptography as a wall of notation:

$$A = g^a \bmod p, \qquad B = g^b \bmod p, \qquad K = B^a = A^b = g^{ab} \bmod p$$

Then they read sentences like "the receiver learns $$m_b$$ and nothing else, and the sender learns nothing about $$b$$." The protocols behind **oblivious transfer (OT)**, **private set intersection (PSI)**, **private set union (PSU)**, **OKVS** and **VOLE** run inside real products, such as contact discovery, password-breach checks and ad measurement. Still, almost nobody outside a research group can picture what actually happens on the wire.

[VisuAlgo](https://visualgo.net) showed that sorting and graph algorithms click once you can step through them one line at a time. We wanted that for cryptography, with one addition that matters here more than anywhere else: **who knows what**. A protocol's whole point is that Alice, Bob and Eve see different things. So we built a site where you can switch between their views and watch the other party's secrets disappear. To make people come back, we wrapped it in a pixel-art dungeon where you need real cryptography to open the doors.

## What it does

CryptoWorld is a cryptography learning world with two layers.

### The Library: step-through visualizations
- **30 animated, interactive topics**, from Caesar, Vigenère, frequency analysis and the one-time pad, through SPN block ciphers, ECB/CBC/CTR modes, SHA-256, RSA, Diffie–Hellman and elliptic curves, up to **OT, OPRF, OKVS, VOLE, PSI and PSU**.
- You choose the inputs and play the protocol **one line of pseudo-code at a time**, with each step's state drawn on stage.
- An **Alice / Bob / Eve perspective switch** redacts every value that party shouldn't know. In 1-out-of-2 OT, the sender holds $$(m_0, m_1)$$ and the receiver holds a choice bit $$b$$. Switch to Alice's view and $$b$$ is hidden. Switch to Bob's view and $$m_{1-b}$$ is hidden. "Nobody learns more than they should" becomes something you can see.
- A **49-term dictionary** with formal definitions and origin papers, **PSI and PSU paper libraries** (40 papers, a "which protocol should I use?" chooser and benchmarks), lessons, and guided learning paths.

### The Crypto Dungeon: a game world with CTF gates
- A pixel-art map of **13 named locations**, each tied to one idea: *the Ruins of Shifting Letters* (classical ciphers), *the Fountain of Hash*, *the Bridge of Shared Secrets* (key exchange), *the Citadel of Twin Keys* (public-key crypto), *the Bazaar of Veiled Choices* (OT), *the Gardens of Hidden Overlap* (PSI), and more.
- **CTF gates** guard the path to the treasure room. Some are text gates you break with a Caesar shift or XOR. Others are classification boards. On the Bridge, *"Public or Private?"* asks you to sort every Diffie–Hellman value ($$p, g, a, A, b, B, K$$) by who can see it. A wrong submission flags only the wrong rows, and the server checks every answer.
- **NPC tutors powered by Gemini.** Each character gets only a *permitted view* of what it may know, so it can guide you Socratically without ever holding the answer.
- **Bit**, a cipher companion who follows you across the world and the Library, with place-aware tutorials and free-form Q&A.
- **The forged-seal lab.** The courier's "seal" is a toy checksum:
  $$\text{seal}(w) = \sum_{i} \text{val}(w_i) \bmod 26, \qquad \text{val}(\texttt{A}) = 1, \dots, \text{val}(\texttt{Z}) = 26$$
  You write real Python, run in a **Maritime** sandbox, to find a forgery. $$\text{seal}(\texttt{LEAF}) = \text{seal}(\texttt{FLEA}) = 24$$, so the gate opens. The lesson: *a checksum is not authentication.*
- **The Research Desk** and a daily **"What's new in cryptography"** feed, powered by **TinyFish** web agents. Tutors can cite these sources, but they treat them as untrusted input, never as instructions.
- Accounts, saved progress, and a **Journal** that separates what you *practiced* from what the server *assessed*, with an activity view on top.

Opening a Library page from inside the dungeon keeps the world mounted and paused under a "Back to the Bridge" bar. Your position, the open gate and your half-typed answer are still there when you come back.

## How we built it

- **Built in Cursor.** We wrote CryptoWorld in **Cursor**, using its codebase-aware chat and inline edits to move fast across a large TypeScript codebase. That covered scaffolding new visualizations from our registry pattern, keeping client and server types in sync, and writing tests alongside features. Every toy-crypto routine was still checked by hand against worked examples, because AI-written crypto that's subtly wrong would teach the wrong lesson.
- **Frontend:** React 18 + TypeScript, bundled by Vite into **one self-contained `index.html`**, with everything inlined and CI-checked to stay between 20 KB and 5 MB. It uses hash routing, a registry that maps topics to visualization components, and a frame-based player for stepping through protocols. The Alice/Bob/Eve redaction is pure CSS on `body[data-view]`.
- **Game world:** a hand-written HTML canvas renderer for the tile map, movement, landmarks and props. Every location's name, palette and art comes from one source file.
- **Crypto:** our own toy implementations (modular arithmetic, a small DH group, a 16-bit SPN, OKVS, toy hashes) with **deliberately small parameters**, so you can follow every number by hand.
- **Backend:** a Node account API written as one transport-agnostic handler, $$\{\text{method}, \text{path}, \text{headers}, \text{body}\} \mapsto \{\text{status}, \text{headers}, \text{body}\}$$. The same code runs as a local server and on AWS Lambda. It uses scrypt password hashing, HttpOnly session cookies, and pluggable storage (JSON file, DynamoDB or Postgres) that must pass one shared contract test suite.
- **Testing and CI:** 135 unit and integration tests on Node's test runner, plus a **Playwright end-to-end test** that walks the whole demo against the real API with fake sponsor endpoints. GitHub Actions runs typecheck, tests, build, the bundle check, the e2e walk, `npm audit` and `cdk synth`, then deploys `main` and smoke-tests it.

### Sponsor technologies
- **AWS.** The stack is defined in **AWS CDK**. **CloudFront** serves the page from a **private S3** bucket and routes `/api/*` through **API Gateway → Lambda → DynamoDB** on one hostname, so session cookies stay same-origin. Maritime lab jobs go through **SQS** to a dedicated **worker Lambda**, so they aren't limited by the API timeout. Keys are kept in **Secrets Manager**. GitHub deploys through an **OIDC-assumed IAM role**, so the repo holds no AWS keys. An **ACM** certificate serves our own domain.
- **Google Gemini API.** Gemini powers every NPC tutor and Bit's answers. Before each call, `prepareNpc` builds a *permitted view*: the room, the public challenge text, curated hints and the learner's progress. The model can't leak a flag it never receives.
- **TinyFish.** Web agents power the **Research Desk** over an allowlist of sources, and a **shared daily news watch**: one run per source per day, cached for every learner. Results are cached per user, so a repeated question doesn't start a new run.
- **Maritime.** Learner-written Python runs in **Maritime ephemeral sandboxes**: create the sandbox, upload the file, run the command, read stdout and stderr, then delete it. Per-user daily limits, concurrency caps, output clipping and result caching keep it cheap and safe. A successful forgery is recorded as server-side skill evidence.
- **Tiger Data.** With `TIGER_DATABASE_URL` set, the API switches to **Tiger Cloud Postgres**. Learning events go into an **`evidence` hypertable** partitioned by time, and an **`activity_daily` continuous aggregate** powers the activity view. We didn't have to write an aggregation pipeline by hand.
- **GoDaddy Registry.** We registered **[cryptoworld.wiki](https://www.cryptoworld.wiki)**. A `.wiki` fits the project: a living, linked encyclopedia of cryptography that you explore like a world. Both the apex and `www` point at CloudFront over HTTPS.
- **Cursor.** Cursor was our development environment for the whole hackathon. Its agent and multi-file edits made broad changes practical in a weekend, like renaming the project across the client, server, infrastructure and CI, and wiring each sponsor adapter behind the same interface. Its codebase context helped us respect our own rules, such as never importing the server-only answer module from client code.

## Challenges we ran into

- **Not shipping the answers.** A CTF in a single static bundle is easy to cheat, because you can just read the JavaScript. We split challenges into *public* definitions, shared by the client and server, and a server-only module with the answers and walkthroughs that client code must never import. Boards return only the IDs of the wrong rows plus a nudge.
- **Keeping an LLM tutor from giving the game away.** Telling the model "don't reveal the flag" isn't enough. We designed the data flow so the flag is never in the prompt, and we label all web-sourced text as untrusted.
- **Sharing TypeScript between the browser and Lambda without a build step.** The server imports some `src/` modules directly through Node 22's type stripping. Those files have to stay free of React and browser APIs, and the Lambda bundle must copy every file the API touches. We learned that last one from a broken deploy.
- **Keeping the world alive across pages.** Opening a visualization used to remount the game and wipe your progress. We restructured routing so the world is always the root and every other page is a layer above a paused world.
- **Race conditions in the game loop.** Our e2e test caught a real bug: a delayed "gate cleared" timer could close a *different* gate you had just opened.
- **Long sponsor calls under API Gateway's timeout.** We moved Maritime runs onto an SQS queue with a worker Lambda and job states the client can poll.
- **Making toy crypto honest.** Parameters must be small enough to follow by hand and still mathematically correct, and everything is clearly labeled insecure.

## Accomplishments that we're proud of

- **30 interactive visualizations** in one hackathon, reaching OKVS, VOLE, PSI and PSU, topics with almost no visual teaching material anywhere.
- The **perspective switch**, which turns a privacy guarantee into something you can see. For PSI, Alice learns $$X \cap Y$$ and nothing about $$Y \setminus X$$, and the redaction shows exactly that.
- A game world **really connected to the content**: every location teaches one idea, and every gate needs that idea to open.
- **Flags that stay safe with an AI tutor in the loop**, by design rather than by prompt.
- **Six sponsor technologies in production** (AWS, Gemini, TinyFish, Maritime, Tiger Data and GoDaddy Registry), each doing a real job behind a clean adapter, each switching off cleanly when its key isn't set, and all live on our own domain. We built it all in **Cursor**.
- A production-style pipeline: a one-file page, contract-tested storage, CDK infrastructure, keyless OIDC deploys, an end-to-end demo test and post-deploy smoke tests.

## What we learned

- Protocols get much easier to follow when you track **what each party knows**, not just the values.
- LLM safety in an app is mostly **data minimization**: decide what the model is allowed to see, not just what it's told to say.
- Hypertables plus continuous aggregates are a great fit for learning analytics, keeping relational and event data in one database.
- A transport-agnostic handler let local dev, tests and Lambda share exactly the same code paths.
- Web agents and sandboxes are powerful, but they need guardrails: allowlists, rate limits, caching, and treating their output as untrusted.
- AI coding tools like **Cursor** are a force multiplier for breadth (30 visualizations, six integrations), but in cryptography a human still has to check every number, because a confident, plausible bug is the worst kind.

## What's next for CryptoWorld

- More protocols: garbled circuits, secret sharing and MPC, zero-knowledge proofs (*the Cavern of Unspoken Proofs* is waiting), and lattice and post-quantum crypto.
- More Maritime labs where learners break toy schemes in code, such as padding oracles, nonce reuse and small-exponent RSA ($$e = 3$$, $$m^3 < N$$).
- **Instructor mode:** assign learning paths to a class and see aggregate progress from the Tiger Data activity aggregates.
- Accessibility and localization passes, so the visualizations work well with screen readers and in more languages.
- Open-sourcing the visualization kit, so researchers can publish step-through animations alongside their papers.

---

<!-- Submission fields, not part of the story. -->

**Elevator pitch:** Explore cryptography as a pixel-art world: step through 30 protocols from Caesar to private set intersection, then use real crypto to open dungeon gates, with Gemini tutors that hint but can't cheat.

**Built with (25):** aws, aws-cdk, aws-lambda, amazon-cloudfront, amazon-s3, amazon-api-gateway, amazon-dynamodb, amazon-sqs, google-gemini, tinyfish, maritime, python, tiger-data, timescaledb, postgresql, godaddy-registry, cursor, react, typescript, vite, node.js, html5-canvas, cryptography, game-development, edtech
