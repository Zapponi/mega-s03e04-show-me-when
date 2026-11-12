# 1 — The board on its public address, naming its build

Issue: #1 · Source: plan.md § 1 · Proof: BRIEF A1, A7 (slice subset)

## What the user can now do
- Open https://sched-prod-board.mega-s02e05-while-youre-away.workers.dev logged out and see tonight's incidents from the course API, newest first.
- Read which build they are looking at: the footer shows the git sha, and `<meta name="build">` carries the same value.

## How it is checked
`BOARD_URL=https://sched-prod-board.mega-s02e05-while-youre-away.workers.dev ./verify --slice 1` → A1 (200 over https, meta = footer = a public commit), A7 (board, incident-list, incident-row with data-id, build-sha), live-rows (rows = the response the page consumed, same order). 3/3 at build 720f5f5.

## How to ship a change
`node scripts/build.mjs` (refuses a dirty `app/` or an unpushed commit) → `sh scripts/wr.sh deploy` (personal account only).
