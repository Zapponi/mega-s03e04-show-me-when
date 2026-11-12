# Brief — S03E04 "show me when"

Filled with the user by `/kickoff` before any build. Every session reads it after `KEEP.md`. A line still showing `<...>` is not decided yet: ask, do not guess.

Source of every line: the course statement (`README.md`, `plan.md`, `issues/SCHED-4511..4514`, `.challenge/log.md` start-challenge of 2026-11-12), the starter (`.challenge/starter-zip/`), and Giovanni's answers in the megadev thread (2026-11-12). The statement wins over everything else.

## The six lines

1. **Result:** the sched-prod incident board (`app/`) with SCHED-4511..4514 built (R1–R6 of `plan.md`, every pinned `data-testid`), deployed to a public https address on Giovanni's personal Cloudflare account, plus a recording of the board in use at a public link and the step-1 report; then, after product's answer, the board rebuilt as product decided, re-recorded, replayed by the course's unchanged `prove.yml` on GitHub Actions, and claimed as step 2. Done when the course accepts the step-2 claim. Who uses it after delivery: nobody; it is a course deliverable judged by the course ("product"). (read in README "What to send", plan "Done", log "task")
2. **Proof:** checks, tagged; `./verify` runs `must`, `./verify --slice 1` the slice, `--all` adds `keep`. Local checks run Playwright (Chromium, `playwright@1.64.1` as the starter pins) against a fake incident API; `live` checks run against the deployed URL and the real API, reads only (acks on the real API happen only in the recording, see "Outside actions").
   - `must` A1 live + build (R6, README "Deploy"): the deployed URL answers 200 over https, logged out; the build meta tag content = footer `build-sha` text = the commit the deployed assets were built from, and that commit is public in the repo (an ancestor of `origin/main`; merges are not squashed after a deploy, so the sha survives). Later checks compare against this sha, never against HEAD. Live, no ack.
   - `must` A2 open-board (R3, SCHED-4512): with the fake API answering after 1 s, `loader` is visible before the answer and gone after it; then `incident-list` shows one `incident-row` per incident, `data-id` = incident id, newest first by `openedAt`; `empty` shows only when the board holds no incident at all (a later empty poll on a non-empty board does not show it); `loader` never returns. Live: the rendered ids and order equal the `/incidents` response the page itself consumed (captured by Playwright).
   - `must` A3 live list (R1, SCHED-4511): the fake API adds an incident between two polls → it shows as the first row without a reload; rows already shown stay; no id appears twice. The fake serves both a delta page (only new incidents after `since`) and a full page, and the board is right with both; slice 1 reads the real API's `since` behaviour and writes it to KEEP.
   - `must` A4 refresh (R4, SCHED-4513): over ~12 s with the board open and the fake answering in 200 ms, the times between consecutive `/incidents` request starts have a median of 1.9–2.1 s and each lies in 1.5–3.0 s (tolerance is the agent's pick, see decisions); no full reload.
   - `must` A5 ack (R2, SCHED-4511): clicking `ack` in the row with `data-id=X` sends exactly one `GET /ack` with `id=X` and the cursor `api.js` holds; that row then shows `acked` and the other rows do not; the mark survives 3 more refreshes, also after a poll has put a new row above it (the ack's `id` is still the clicked row's `data-id`); a failed ack (fake answers 500) leaves the row not acked and says so on the page. Local only: real acks happen only in the recording.
   - `must` A6 local times (R5, SCHED-4514): format `Intl.DateTimeFormat(undefined, {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})`, measured in Chromium (Playwright 1.64.1) on 2026-11-12 for `openedAt 2026-11-12T03:03:00.000Z`: `en-NZ`/`Pacific/Auckland` → `12/11, 04:03 pm`; `de-DE`/`Europe/Berlin` → `12.11., 04:03`; `en-US`/`America/New_York` → `11/11, 10:03 PM`. The row shows exactly that text, fully visible (am/pm not cut off by the column); every time element's `datetime` attribute keeps the full UTC value exactly.
   - `must` A7 hooks (plan "Hooks", pinned): all 8 `data-testid` exist with the meaning in `plan.md`; none renamed or removed in step 1 or step 2 unless product's decision says so (then listed in "System Diff").
   - `must` A8 step-1 evidence (README "Step 1"), checked by a script before the claim: video — the link answers 200 logged out with the video bytes (after redirects), plays, and shows the footer sha = A1's sha; report — exactly the sections `## What you checked`, `## When`, `## Where`, `## Options for product`; `Where` names at least one `file:line` that exists in the repo at that sha and is the code behind what was seen; one ```` ```evidence ```` block with `flow` ∈ {open-board, ack-incident, watch-board}, `at` (mm:ss) at which the timestamp log shows that flow on screen, `receipt` = the receipt `api.js` logged for the ack at that second, `sha`, `videoLink`.
   - `must` A9 (outside, not in `./verify`) step-1 claim accepted: `claim-challenge {session, step:1, url, report, videoLink}` passes; product's answer arrives through `resume-challenge` with the `productReceipt` and a `replayNonce`.
   - `must` A10 (outside, final) step 2 (README "Step 2"): product's decision built and deployed (A1–A7 still pass, changed as decided); new recording meeting A8's video rules; `prove.yml` byte-identical to the starter's (sha256 `bc0bbd32…27f7`) at the commit the run used; Actions → prove run green with the nonce; report = `## System Diff` (behavior, UX, data, product's decision, `data-testid` hooks touched) plus one evidence block `{sha, videoLink, runUrl}` only (README:62–67), checked by a script; `claim-challenge {session, step:2, productReceipt, url, report, videoLink}` accepted.
   - **Slice 1:** A1 + A7 on the real destination: the starter with the real `config.js` and the build sha (R6) deployed to the public URL from a commit on the public repo, showing tonight's incidents from the real API (the `open-board` flow, no ack).
   Proof approved: 2026-11-12 ("Aprovo a prova" — given on A1–A10 as shown in chat before the plan review; the review's changes to A1, A2, A3, A4, A5, A6, A8, A10 only tighten checks, dropped K1, and were shown to Giovanni after)
3. **Judge:** the course and its "product". It reads the step-1 report and plays the video at `at`; opens the sealed receipt (it knows which incident was acked, when, with which cursor) and checks it against what the video shows at that second; checks `sha` against the footer in the video and the repo; later runs its replay (Playwright, `replay.mjs`, sha256-pinned) on our URL through the unchanged `prove.yml`, driving the pinned `data-testid` hooks. It would refuse: a video not reachable or not playable at the link; `at` that does not show the claimed flow; a receipt from another moment than `at`; a sha that is not the build in the video; a renamed hook; an edited `prove.yml`; "Options for product" that decide instead of offering choices; a step-2 diff that does not match product's decision. Its other internal checks are unknown. (README; prove.yml)
   Hypothesis to test in the recording, not to fix before product decides (agent reading, not a fact): R1 (new rows at the top, live) with R4 (refresh every 2 s) moves rows under the pointer, so an Ack can land on another incident than the one on-call aimed at; and times can be misread (INC-1223 "auckland · 04:03 on the sheet": 03:03Z is 04:03 in Berlin and 4:03 pm in Auckland). These are product decisions → "Options for product".
4. **Limits:** plan R1–R6 and the 8 hooks are pinned; `api.js` stays the API client (README: "keep using it"); `prove.yml` is never edited (its header and the claim check it); `start-challenge` is never called again (it deals a new night); session expires 2026-11-19T18:53Z, so step 2 must be claimed before that. Static page only (no server of our own). Cloudflare Workers Free (static assets), GitHub Free (public repo, Actions on a public repo), no money spent. Tests use a fake API, so they add no load and no acks on the course's night. Known exposure, by the starter's design: `app/config.js` holds the session and goes public in the repo and on the URL; anyone with it can read and ack tonight's incidents until it expires ("record it as a known exposure in the brief", Giovanni 2026-11-12). The session and receipts appear nowhere else committed or shown (masked). (README; prove.yml; log; plan)
5. **Access:**
   - Checked 2026-11-12: GitHub `Zapponi` logged in, scopes repo + workflow (`gh auth status`); repo `Zapponi/mega-s03e04-show-me-when` does not exist yet (`gh repo view` → not found); Cloudflare personal account through wrangler 4.149.0 OAuth on this PC (`sh scripts/wr.sh api whoami` in the S03E03 repo → one account, the personal one, never the Mahta one in the Windows env); course API `GET /incidents` → 200 in 0.22 s with 8 incidents, `access-control-allow-origin: *`; Node 24.19.0; `prove.yml` sha256 equals the starter zip's.
   - Missing: nothing for step 1. Product's replay URL and nonce arrive with product's answer.
6. **Autonomy:** after the proof and the outside-actions table are approved: work until A1–A8 pass, then stop and show Giovanni the step-1 report and video before the claim; after product answers, work until A10 is ready, then stop before the step-2 claim. Stop and report if: an outside action not listed below, a cost, a result that differs from the written expectation, a change of scope, a product decision that conflicts with a pinned hook or `prove.yml`.

## Outside actions approved

Anything not in this table asks again. Each row carries the date and the human's words. One yes to this whole table, shown as a table: add `(table)` to each row.

| Action | Where | Approved on |
|---|---|---|
| Host the board on Cloudflare Pages/Workers, personal account (never the Mahta one) | Giovanni's personal Cloudflare account | 2026-11-12 ("ok", megadev thread) |
| Publish the recording as a GitHub release asset | releases of `Zapponi/mega-s03e04-show-me-when` | 2026-11-12 ("ok", megadev thread) |
| Create the public repo (it carries `app/config.js` with the session, see Limits) | GitHub `Zapponi/mega-s03e04-show-me-when`, public | 2026-11-12 ("ok", megadev thread) |
| Push, branches, PRs, merges, issues and closing comments | `Zapponi/mega-s03e04-show-me-when` | 2026-11-12 ("bora" — Giovanni's answer to the 7-row table shown in chat) (table) |
| Deploy and redeploy the board (Worker `sched-prod-board`, static assets) | personal Cloudflare account, workers.dev | 2026-11-12 ("bora" — Giovanni's answer to the 7-row table shown in chat) (table) |
| Create releases and upload the step-1 and step-2 recordings | `Zapponi/mega-s03e04-show-me-when` releases | 2026-11-12 ("bora" — Giovanni's answer to the 7-row table shown in chat) (table) |
| Ack incidents on the real API (tonight's night) only while recording | course incident API, this session | 2026-11-12 ("bora" — Giovanni's answer to the 7-row table shown in chat) (table) |
| Run the course replay: Actions → prove → Run workflow, with product's nonce and replay URL | `Zapponi/mega-s03e04-show-me-when` Actions | 2026-11-12 ("bora" — Giovanni's answer to the 7-row table shown in chat) (table) |
| Step-1 claim `claim-challenge {session, step:1, url, report, videoLink}` | mega-challenge MCP, once, after Giovanni sees report + video | 2026-11-12 ("bora" — Giovanni's answer to the 7-row table shown in chat) (table) |
| Step-2 claim `claim-challenge {session, step:2, productReceipt, url, report, videoLink}` | mega-challenge MCP, once, after Giovanni sees report + run | 2026-11-12 ("bora" — Giovanni's answer to the 7-row table shown in chat) (table) |

Release command: the two `claim-challenge` calls (mega-challenge MCP; neither can be taken back).

## Outside services

| Service | Alternatives considered | Limit that matters (source) | Where it runs, volume with tests | At the limit | Checked from the real host |
|---|---|---|---|---|---|
| Cloudflare Workers Free, static assets (host) | Pages (also approved; Workers static assets reuse S03E03's pinned wrangler and `wr.sh`), GitHub Pages (would tie deploys to the repo's Pages settings) | static asset requests free and not counted against the Worker request limit (developers.cloudflare.com/workers/static-assets/billing-and-limitations — from memory, re-read at slice 1) | page served from Cloudflare; the board's API calls go browser → course, not through Cloudflare | page down until reset (if counted) | to do at slice 1: `curl -I` the URL |
| Course incident API (`hq.mega.dev/.../api`) | none (required) | not documented; CORS `*`, `cache-control: private, no-store` (curl 2026-11-12) | browser: 1 call / 2 s per open tab (1,800/h); local tests use a fake, 0 calls | unknown: board shows an error, keeps polling | `GET /incidents` 200 in 0.22 s from this PC, 2026-11-12 |
| GitHub (repo, release asset, Actions) | another video host (not chosen: Giovanni approved release assets) | release asset ≤ 2 GiB; Actions free on public repos (docs.github.com — from memory, re-read before upload) | ~2 videos of a few MB; 1–2 prove runs | upload refused → smaller video | to do: `curl -IL` the asset logged out → 200 + video bytes |
| mega-challenge MCP | none (required) | claims are final | 2 claims, resume calls | — | to do |

## Product signals

| Signal | Where it comes from | State |
|---|---|---|
| Telemetry | none yet: a one-off course deliverable; the console log of acks (`api.js`) only | not needed |
| User feedback | product's answer to the step-1 report (the decision for step 2) | planned (after step 1) |
| Business context | `plan.md`: on-call sees what just broke and takes it; SCHED-4514 "on-call reads it in their own time zone and gets it wrong" | read |
| Product analytics | none yet: no usage data | not needed |
| Lab or beta channel | the local fake API + Playwright; the step-1 deploy is the "lab" product judges | planned |

## Running without you

Not needed: every run is watched in this thread; nothing runs on a schedule or event.

## Pre-mortem

| Sentence of the request | How the receiver may test it | Rehearsal | Expected | Result |
|---|---|---|---|---|
| Title "show me when" / report `## When` "mm:ss in the recording" | plays the video at `at` | script lists the timestamp of each ack and of each new row in the recording | the evidence `at` shows that flow on screen, ±1 s | |
| "New incidents appear live at the top of the list, newest first" (R1, SCHED-4511) | leaves board open until a new incident arrives | fake API adds one; live: the real feed adds one every ~7 min (KEEP) | new id is row 1 within one poll (≤ 3 s), no reload, no duplicates | |
| "Ack sends the ack (`api.ack(id)`) and marks the row acked" (R2) | clicks `ack`, reads the receipt | A5 locally; one real ack in the recording | one `/ack` for that id; `acked` on that row only; receipt logged | |
| "Show a loader until incidents load" (R3) | opens with slow network | fake API 1 s delay | `loader` visible ≥ once, gone after rows; never back | |
| "The board refreshes itself every 2 seconds while open" (R4) | counts requests | A4 over 30 s | request-start gaps median 1.9–2.1 s, each 1.5–3.0 s | |
| "a viewer in Auckland and one in Berlin each see the time in their own zone, in their own order" (R5) | Playwright `timezoneId` + `locale` | A6 three contexts | exact strings of A6; `datetime` = raw UTC | |
| "The page names its build… in the head and the same sha in the footer" (R6) | reads meta + footer | A1 on the live URL | both = the deployed commit on `origin/main` | |
| "Deploy `app/` to your own public **https** address" | opens it logged out | `curl -I` + Playwright from this PC | 200, https, no login | |
| "A recording of the board in use, at a public https link… that serves the file itself" | downloads/plays the link | `curl -IL` logged out | 200 with video bytes, plays in a browser | |
| Report sections + evidence block (README step 1) | parses the report | A8 script | exact headings; evidence JSON parses; receipt equals the logged one | |
| "Change what product decided, deploy, record it again" (step 2) | compares with the decision | System Diff vs product's text | every point of the decision has a line; hooks touched listed | |
| "`.github/workflows/prove.yml` as shipped" | checks the file at the run's commit | sha256 before the run | `bc0bbd32…27f7` | |
| "`runUrl`" in step-2 evidence | opens the run | `gh run view` | run green, inputs url + nonce match | |

## Helpers

At most 1 worker at a time (all four issues touch `app/app.js` and `index.html`; parallel workers would collide). Reviews: one `/sol-loop` (Codex, another family) per deliverable — the step-1 build before the step-1 claim, the step-2 change before the step-2 claim — at most 3 loops each. The plan gets the two-family review the kickoff asks for. Each helper's brief carries the lines above it needs and its own "stop and report if".

## Left out on purpose

- Fixing the hypotheses of "Judge" (rows moving under the pointer, time misreading) before product decides: the report offers them as options; building a choice alone would decide for product.
- Double-click protection on Ack, retries, offline mode: no requirement or risk named for this board yet.
- A server or proxy of our own: the starter is a static page and the API allows CORS.
- Hiding the session from the public bundle: the starter's design (see Limits).
- Unattended runs, telemetry, analytics.

## Later

Review findings that would grow the scope go here, not into the work.
