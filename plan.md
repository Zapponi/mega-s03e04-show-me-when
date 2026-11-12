# sched-prod incident board — plan

The on-call board for sched-prod. One page, one list: tonight's incidents, newest first, so on-call sees
what just broke and takes it.

## Flows

| flow | who | what happens |
|------|-----|--------------|
| `open-board` | on-call | opens the board; sees tonight's incidents |
| `ack-incident` | on-call | picks an incident on the board and acks it — "I've got this one" |
| `watch-board` | on-call | keeps the board open; it stays current without a reload |

## Requirements

- **R1** New incidents appear live at the top of the list, newest first.
- **R2** Each incident row has an **Ack** button. Ack sends the ack (`api.ack(id)`) and marks the row acked.
- **R3** Show a loader until incidents load.
- **R4** The board refreshes itself every 2 seconds while open.
- **R5** Times show in the viewer's local time; day before month for EU locales (dd/mm).
- **R6** The page names its build: `<meta name="build" content="<git sha>">` in the head and the same sha in the footer.

## Hooks (pinned — tests and the replay rely on them)

| `data-testid` | element |
|---------------|---------|
| `board` | the board's main area |
| `loader` | the loader (gone once incidents load) |
| `empty` | what shows when there are no incidents |
| `incident-list` | the list |
| `incident-row` | one incident row, with `data-id="<incident id>"` |
| `ack` | the Ack button in a row |
| `acked` | the acked mark in a row |
| `build-sha` | the sha in the footer |

## Done

Every issue in `issues/` delivered, deployed to a public https address, and shown working.

---

# Build plan (agent, 2026-11-12)

Everything above this line is the course's plan, unchanged; the step-2 "System Diff" compares against it.
Below is how we build it. Proof checks A1–A10 live in `BRIEF.md`. Review: `docs/reviews/2026-11-12-plan.md`. Issues: this repo's GitHub issues.

## § 1 Slice 1 — the starter on the real destination (A1, A7)
- Import the starter + kit as the first commit on `main`; create the public repo and push.
- `app/config.js` with the real `api` and `session` (known exposure, BRIEF Limits).
- `scripts/build.mjs`: copy `app/` to `dist/`, write the commit sha into `<meta name="build">` and a footer
  `data-testid="build-sha"` (R6). Refuses to build from a dirty tree or a commit not yet pushed to the
  public repo; records the deployed sha in `dist/` for later checks (compare against it, never HEAD).
- `wrangler.toml` (Worker `sched-prod-board`, static assets from `dist/`), wrangler 4.149.0 pinned,
  `scripts/wr.sh` pinning the personal account (S03E03 pattern). PRs merge with a merge commit, never
  squash, so a deployed sha stays in history.
- `./verify` skeleton: `--slice 1` runs A1 (live URL 200, meta = footer = deployed sha, public) and A7
  (the hooks the page has so far; the rest arrive with their issues).
- Read the real API twice (reads only): `GET /incidents`, then `GET /incidents?since=<cursor>`; write
  whether a `since` page is a delta or full list to KEEP.
- Done when `./verify --slice 1` passes against the deployed URL.

## § 2 Test bench (lean: test what the receiver tests, nothing more)
- `test/fake-api.mjs`: one small local fake of `/incidents` (with `since`/`cursor`) and `/ack`:
  delay, injected incident, forced 500. One Playwright spec file, one test per proof check (A2–A7),
  each driving the pinned hooks as the replay does. No unit tests for glue code, no snapshot tests.
- `./verify` runs the local spec (~seconds) plus A1/A2 live (reads only). Run it once per issue before
  its PR and once before each claim, not after every edit.

## § 3 SCHED-4512 loader (R3) → A2
`loader` until the first answer; `empty` only when the merged board holds no incident (a later empty
poll on a non-empty board shows rows, not `empty`); loader never returns on refresh.

## § 4 SCHED-4511 live list + Ack (R1, R2) → A3, A5
Keep incidents in a map by id; merge each page, delta or full (slice 1 tells which the real API sends);
render newest first by `openedAt`. `ack` button per row → `api.ack(id)` with that row's id → `acked`
mark kept in state, so it survives re-renders and new rows above it; failure shown, row stays unacked.

## § 5 SCHED-4513 refresh every 2 s (R4) → A4
Fixed-rate timer at 2000 ms calling `fetchIncidents()`; skip a tick while one request is in flight.

## § 6 SCHED-4514 local times (R5) → A6
`Intl.DateTimeFormat(undefined, {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})` in
the viewer's zone (strings measured in Chromium, BRIEF A6); full UTC in `<time datetime>`; column wide
enough for am/pm.

## § 7 Step-1 evidence (A8) and claim (A9)
`/sol-loop` on the whole build, deploy, then a Playwright recording of the board in use on the live URL,
with a per-action timestamp log (mm:ss from video start): at least one real incident arriving live (the
feed adds one about every 7 min, so record ~10 min, or start just before the next expected `openedAt`),
and one real Ack (its receipt logged with its second). Real acks only here. Pick the evidence `flow` and
`at` from the log for what we report; the report names the `file:line` behind it. Report checked by a
script (A8). Release asset upload, `curl -IL` logged out. Giovanni sees report + video → step-1 claim.

## § 8 Product's answer (waits on the course)
`resume-challenge` with the `productReceipt`; read the decision and `replayNonce`. Own issue, stays open
until the answer is in; blocks § 9.

## § 9 Step 2 (A10)
Build product's decision (new plan section first), `/sol-loop`, deploy, re-record, prove run on Actions
with the nonce (prove.yml unchanged). Step-2 report = `## System Diff` plus one evidence block
`{sha, videoLink, runUrl}` only (README:62–67), checked by a script. Giovanni sees it → step-2 claim.
