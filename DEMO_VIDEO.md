# CryptoWorld: 3-minute demo video

The Devpost tracks **Best Use of Tiny Fish** and **Best Use of Maritime** need a video of 3 minutes or less. Record one video that covers both, plus the parts judges score (originality, complexity, functionality, design).

**Total: 2:55.** Keep it under 3:00. Judges stop at the limit.

## Before you record

- [ ] Open **https://www.cryptoworld.wiki** (or the CloudFront URL) in a clean browser window, 1920×1080, zoom 100%, bookmarks bar hidden.
- [ ] Sign in with a demo account that has the earlier gates cleared, so the Fountain of Hash is open.
- [ ] Check `/api/health`: `gemini`, `tinyfish`, `maritime` (and `tigerdata` if used) are all `true`.
- [ ] **Warm the slow calls.** Run one Research Desk question and one lab run before recording, so you know they work. Record the live run anyway, and cut the waiting in editing (see "Editing" below).
- [ ] Load the Research Desk once so today's "What's new in cryptography" feed is already fetched.
- [ ] Turn off notifications. Record with QuickTime (File → New Screen Recording) or OBS, with your mic on.

## Shot list

| Time | Screen | What to say (voice-over) |
|---|---|---|
| **0:00–0:15** | Home page, then the Crypto Dungeon map | "Cryptography is taught as a wall of math. CryptoWorld turns it into a world you explore: 30 step-by-step visualizations and a pixel-art dungeon where you need real cryptography to open the doors." |
| **0:15–0:45** | Library → **Oblivious transfer** (`#ot`). Press play, step 3–4 lines. Flip the **Alice / Bob** view switch. | "Every protocol plays one line of pseudo-code at a time, with your own inputs. The key idea is who knows what. Switch to Alice's view, and Bob's choice bit is redacted. She never learns it. We go from Caesar all the way to PSI, PSU, OKVS and VOLE." |
| **0:45–1:10** | Back to the world. Walk to the **Bridge of Shared Secrets**. Open the **"Public or Private?"** board, sort a couple of rows. Ask the NPC a question. | "Each location teaches one idea and has a gate. Here, sort every Diffie–Hellman value by who can see it. Stuck? Ask the tutor. The NPCs run on **Gemini**, but each one only gets a permitted view, so the answer is never in the prompt. It can hint, not cheat." |
| **1:10–1:50** | Walk to the **Fountain of Hash** → **Forged seal**. Show the Python lab, set `CANDIDATE = "FLEA"`, press run. Show stdout, then the gate opening. | "**Maritime** gate. The courier's seal just adds letter values mod 26. Write real Python to forge it. The code runs in a **Maritime ephemeral sandbox**, queued on AWS SQS, and runs on a worker Lambda. FLEA has the same seal as LEAF, so the gate opens. A checksum is not authentication." |
| **1:50–2:30** | Open the **Research Desk** (`#research`). Ask: "How does Apple use PSI for contact discovery?" Show the job finishing with sources. Scroll to **What's new in cryptography**. | "**TinyFish** web agents power the Research Desk. Ask a question, and an agent researches allowlisted sources and returns cited results. TinyFish also runs a shared daily news watch: one run per source per day, cached for everyone. The tutors can cite this research, treated as untrusted input." |
| **2:30–2:45** | Open the **Journal → Skills** tab (the forged seal shows as evidence), then the activity view. | "Progress is stored on the server: accounts on DynamoDB, or on **Tiger Data** with a time-series hypertable and a continuous aggregate behind the activity view." |
| **2:45–2:55** | The address bar showing **www.cryptoworld.wiki**, then the world map. | "All of it is one HTML page on CloudFront, deployed with AWS CDK. Live now at **cryptoworld.wiki**. Thanks!" |

## Editing

- Cut every wait for Gemini, Maritime or TinyFish down to about one second, and add a small "⏩ sped up" label. Don't fake results. Only trim the waiting.
- Add on-screen captions naming each sponsor as it appears: **Gemini**, **Maritime**, **TinyFish**, **AWS**, **Tiger Data**, **GoDaddy Registry (.wiki)**.
- Export 1080p MP4, upload to **YouTube (Unlisted or Public)**, and paste the link into Devpost's "Video demo link" field.

## If something fails live

- **Maritime is down:** switch the lab to `LAB_EXECUTOR=local` only for a local backup take, and say "running locally" on screen. Don't present it as Maritime.
- **TinyFish is slow:** show a job you already finished earlier (cached results), and say it's cached.
