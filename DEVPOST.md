**Live site:** [www.cryptoworld.wiki](https://www.cryptoworld.wiki) · **Demo video (3 min):** <YOUTUBE_LINK>

## Inspiration

Most people learn cryptography from a wall of math notation: `g^a mod p`, "the receiver learns m_b and nothing else", "the sender learns nothing about b". The protocols behind private set intersection (PSI), private set union (PSU), oblivious transfer (OT), and VOLE are used in real products, such as contact discovery, password-breach checks, and ad measurement. Still, almost nobody outside a research group can picture what actually happens on the wire.

[VisuAlgo](https://visualgo.net) showed that sorting and graph algorithms click once you can step through them one line at a time. We wanted the same thing for cryptography, with one addition that matters a lot here: **who knows what**. A protocol's whole point is that Alice and Bob see different things. So we built a site where you can switch between Alice's and Bob's view and watch the other party's secrets get redacted. To get people to come back, we wrapped it in a pixel-art dungeon where you need real cryptography to open the doors.

## What it does

CryptoWorld ([www.cryptoworld.wiki](https://www.cryptoworld.wiki)) is a cryptography learning world with two layers.

**The Library: VisuAlgo-style visualizations**
- **30 animated, interactive topics**, from Caesar, Vigenère, rail fence, frequency analysis and the one-time pad, through SPN block ciphers, ECB/CBC/CTR modes, SHA-256, RSA, Diffie–Hellman and elliptic curves, up to **OT, OPRF, OKVS, VOLE, PSI and PSU**.
- You enter your own inputs and play the protocol **one line of pseudo-code at a time**, with each step's state drawn on stage.
- An **Alice / Bob / Eve perspective switch** redacts every value that party shouldn't know, so "Bob never learns Alice's set" is something you can see.
- A **49-term dictionary** with formal definitions and origin papers, **PSI and PSU paper libraries** (40 papers with a "which protocol should I use?" chooser and benchmarks), a bibliography, lessons, and guided learning paths.

**The Crypto Dungeon: a game world with CTF gates**
- A pixel-art map of 13 named locations: *the Ruins of Shifting Letters* (classical ciphers), *the Fountain of Hash*, *the Bridge of Shared Secrets* (key exchange), *the Citadel of Twin Keys* (public-key crypto), *the Bazaar of Veiled Choices* (oblivious transfer), *the Gardens of Hidden Overlap* (PSI), and more. Each one has landmark art and its own NPCs.
- **CTF challenges** gate the path to the treasure room. Some are text gates you break with a Caesar shift or XOR. Others are classification boards, like "Public or Private?" on the Bridge, where you sort every Diffie–Hellman value by who can see it. The server checks every answer, so the flags never ship to the browser.
- **NPC tutors powered by Gemini.** Each character only receives a "permitted view" of what they're allowed to know. They hint and Socratically guide you without handing out the answer.
- **Bit**, a cipher companion who follows you across the world and the Library. Bit has typewriter dialogue, place-aware tutorials, and free-form Q&A.
- **The Forge / Fountain of Hash lab.** You write real Python to forge a collision on a toy courier "seal". The code runs in a **Maritime** sandbox, and the result shows why a checksum isn't authentication.
- **The Research Desk and a daily "What's new in cryptography" feed** powered by **TinyFish** web agents. TinyFish sources can then be cited by the tutors as untrusted context.
- Accounts, saved progress, a skills journal backed by server-side evidence, and an activity view.

When you open a Library page from inside the dungeon, the world stays mounted and paused under a "Back to the Bridge" bar. Your position, open challenge, and half-typed answer are all still there when you come back.

## How we built it

- **Frontend:** React 18 + TypeScript, bundled by Vite into **one self-contained `index.html`** (everything inlined, CI-checked to stay between 20 KB and 5 MB). Hash routing, a registry that maps topic metadata to visualization components, and a frame-based `<VisPage>` player for stepping through protocols. Alice/Bob redaction is pure CSS on `body[data-view]`.
- **Game world:** a hand-written canvas renderer for the tile map, movement, landmarks and props. Location names, palettes, and descriptions come from a single source file, and drafts and position are persisted locally.
- **Crypto:** our own toy implementations (modular arithmetic, a DH group, a 16-bit SPN, OKVS, toy hashes) with **deliberately small parameters** so every number can be followed by hand.
- **Backend:** a small Node account API written as a transport-agnostic handler (`{method, path, headers, body} → {status, headers, body}`). The same code runs as a local HTTP server and as an AWS Lambda. It uses scrypt password hashing, HttpOnly session cookies, and a pluggable store (JSON file, DynamoDB, or Postgres) that has to pass one shared contract test suite.
- **Testing and CI:** Node's built-in test runner over 21 test files covering the crypto helpers, the API in memory, on disk and over HTTP, each store, and Bit's script lint. A GitHub Actions pipeline runs typecheck, tests, build, the bundle check, `npm audit` and `cdk synth`, then deploys and smoke-tests `main`.

### Sponsor technologies

- **AWS (Best Use of AWS).** The whole app is deployed with **AWS CDK**. **CloudFront** serves the page from a **private S3** bucket and routes `/api/*` through **API Gateway → Lambda** to **DynamoDB**, all on one hostname so session cookies stay same-origin and `Secure`. Long-running Maritime lab jobs go through an **SQS** queue to a dedicated **lab-worker Lambda** so they aren't bound by the API timeout. Sponsor keys live in **Secrets Manager**. GitHub Actions deploys through an **OIDC-assumed IAM role**, so the repo holds no AWS access keys. An **ACM** certificate in us-east-1 puts the site on our own domain, **[www.cryptoworld.wiki](https://www.cryptoworld.wiki)**, with the apex and `www` pointed at the CloudFront distribution.
- **Google Gemini API (MLH Best Use of Gemini API).** Gemini powers every NPC tutor and Bit's free-form answers. Before each call, `prepareNpc` builds a *permitted view* containing only what that character may know: the room, the public challenge text, curated hints, and the learner's progress. That means the model can't leak CTF flags, because it never receives them. TinyFish research is passed in as clearly labeled *untrusted* learner sources so the tutor can cite it without obeying it.
- **TinyFish (Best Use of Tiny Fish).** TinyFish web agents power the **Research Desk**, where a learner asks a crypto question and gets a sourced research job over an allowlist of sources. They also run the **shared daily news watch**: one run per source per UTC day, cached and served to every signed-in learner. Results are cached per user with fingerprints so repeat questions don't re-run.
- **Maritime (Best Use of Maritime).** The Forge / Fountain of Hash **code lab** runs learner-written Python in **Maritime ephemeral sandboxes** through the REST API (create a sandbox, run the command, read stdout and stderr), with per-user daily limits, concurrency caps, output clipping, and result caching. A successful forged seal is recorded as server-side **skill evidence**.
- **GoDaddy Registry (MLH Best Domain Name from GoDaddy Registry).** We registered **cryptoworld.wiki** for the live site at **[https://www.cryptoworld.wiki](https://www.cryptoworld.wiki)**. A `.wiki` fits what the project is: a living, linked encyclopedia of cryptography with a 49-term dictionary, paper libraries and learning paths, wrapped in a world you explore. DNS points `www` and the apex at CloudFront, and an ACM certificate serves both over HTTPS. The site and `/api/*` share the hostname, so sign-in cookies stay same-origin.
- **Tiger Data (MLH Best Use of Tiger Data).** When `TIGER_DATABASE_URL` is set, the API swaps to a **Tiger Cloud Postgres** store. Users, sessions, progress, and research and lab jobs are relational tables. Learning events go into an **`evidence` hypertable** partitioned by time, and a real-time **`activity_daily` continuous aggregate** feeds `GET /api/activity` for the learner activity view, with no aggregation pipeline written by hand.

## Challenges we ran into

- **Not shipping the answers.** A CTF in a single-file static bundle is easy to cheat: just read the JS. We split challenges into *public* definitions (shared by client and server) and a server-only `dungeon.mjs` holding the answers and walkthroughs, which client code must never import. Classification boards return only the IDs of the wrong rows plus a nudge, and the explanation only appears once you've succeeded.
- **Keeping an LLM tutor from giving the game away.** Prompting the model to "not reveal the flag" isn't enough. We had to design the data flow so the flag is never in the prompt at all, and treat any web-sourced text as untrusted.
- **Sharing TypeScript between the browser and Lambda without a build step.** The server imports some `src/` modules directly through Node 22's `--experimental-strip-types`. That meant keeping those files free of React and browser APIs, using explicit `.ts` imports, and making sure the Lambda bundle copies every file the API touches. We found that last one the hard way, after a broken deploy.
- **Keeping the world alive across pages.** Opening a visualization used to remount the game and wipe your position and draft. We restructured routing so `<World>` is always the root and every other page renders as a layer above a paused world.
- **Long-running sponsor calls under API Gateway's timeout.** Maritime runs can take longer than an API Lambda should wait, so we moved them onto an SQS queue with a worker Lambda and pollable job states.
- **Making toy crypto honest.** Parameters have to be small enough to follow by hand but still correct. We also label everything clearly as insecure so nobody copies it into real code.

## Accomplishments that we're proud of

- **30 interactive visualizations** in one weekend, reaching all the way to PSI, PSU, OKVS and VOLE, topics with almost no visual teaching material anywhere.
- The **Alice/Bob/Eve perspective switch**, which makes privacy guarantees something you can see instead of something you have to take on faith.
- A **game world that's really connected to the content**: every location maps to a topic, and every gate needs the idea that location teaches.
- **Flags that are safe even with an AI tutor in the loop**, by design and not just by prompt.
- **One codebase with five sponsor integrations**: AWS, Gemini, TinyFish, Maritime, and Tiger Data, live on our own domain, [cryptoworld.wiki](https://www.cryptoworld.wiki). Each one does a real job in the product, sits behind a clean adapter, and degrades gracefully when its key isn't configured.
- A production-style pipeline: one-file page, contract-tested storage backends, CDK infrastructure, keyless OIDC deploys, and post-deploy smoke tests.

## What we learned

- Cryptographic protocols are much easier to understand once you track **knowledge per party** rather than just the values.
- LLM safety in an app is mostly about **data minimization**: decide what the model is allowed to see, not just what it's told to say.
- Time-series Postgres (hypertables plus continuous aggregates) is a great fit for learning analytics. It keeps relational data and event data in one database.
- Writing the API as a transport-agnostic handler made local dev, tests, and Lambda share exactly the same code paths.
- Web agents (TinyFish) and sandboxes (Maritime) are powerful, but they need guardrails such as allowlists, rate limits, caching, and treating their output as untrusted.

## What's next for CryptoWorld

- More protocols: garbled circuits, secret sharing and MPC, zero-knowledge proofs (*the Cavern of Unspoken Proofs* is waiting), and lattice and post-quantum crypto.
- More dungeon gates and Maritime labs where learners break toy schemes in code, such as padding oracles, nonce reuse, and small-exponent RSA.
- Instructor mode: assign learning paths to a class and see aggregate progress from the Tiger Data activity aggregates.
- Accessibility and localization passes so the visualizations work well with screen readers and in more languages.
- Open-sourcing the visualization kit so researchers can publish step-through animations alongside their papers.
