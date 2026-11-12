# 4 · On-call sees the board is loading, then tonight's incidents, or that there are none

Issue #4 (SCHED-4512, plan R3, BRIEF A2 + A7 so far). Also adds the local test bench (`test/fake-api.mjs`, `test/board.spec.mjs`).

## Outcome

On-call opening the board sees "Loading incidents…" (`loader`) until the first answer, never a blank page. Then the list, newest first by `openedAt`. If the night has no incident at all, the board says so (`empty`) instead of showing an empty frame. Once loaded, the loader never comes back, and a later page with fewer incidents (an empty delta) does not wipe rows already shown: the board merges pages by id.

## Done means

| Check | Shown by | Result |
|---|---|---|
| fake answers after 1 s: `loader` visible before the answer, gone after | `./verify --local` → A2 step 1 | match (pass, 2026-11-12) |
| one `incident-row` per incident, `data-id` = id, newest first by `openedAt` (ids out of id order on purpose) | A2 step 1 | match: `INC-1003, INC-3002, INC-2001` |
| zero incidents → `empty` visible, `loader` gone, no rows | A2 step 2 | match |
| board with rows, later poll answers an empty delta (`since=1` → `[]`) → rows stay, no `empty`, `loader` not back during or after the poll | A2 step 3 | match |
| hooks board, loader, empty, incident-list, incident-row (with `data-id`), build-sha present | A7 (local) | match; `ack`/`acked` arrive with issue #6 |
| the spec catches a regression | mutation run: page swapped instead of merged → A2 fails; starter `app.js` → A2 and A7 fail | match (both failed as expected) |

## Easy to miss

- The real API sends the full growing list (KEEP), but the board merges by id anyway, so a delta or empty page never empties it.
- A failed first fetch keeps the loader (incidents have not loaded) and shows the error in a `role="alert"` line; the 2 s refresh (issue #5) will retry.
- Locally `build-sha` shows the `__BUILD_SHA__` marker; only `scripts/build.mjs` stamps the sha (A1 checks it live).

## Not proven yet

- A2 live (rendered ids and order equal the `/incidents` page the deployed board consumed): runs in `./verify` against the deployed URL after this reaches a deploy; not run on this branch (no deploy, no real API call in this issue).
- The "later poll" is triggered from the test through the board's own `refresh()` export, not by a timer: the 2 s timer is issue #5 (A4).
