# 5 · On-call leaves the board open and it stays current without a reload

Issue #5 (SCHED-4513, plan R4, BRIEF A4).

## Outcome

On-call can keep the board open: every 2 s it asks the incident API again (through the unchanged `app/api.js`, so the cursor stays current) and merges the answer into the list. Nothing reloads the page, the loader never comes back, and a slow answer never causes a second request on top of it. If a request fails, the board says so and tries again on the next tick.

## Done means

| Check | Shown by | Result |
|---|---|---|
| request starts every 2 s over ~12 s, fake answering in 200 ms: median 1.9–2.1 s, each gap 1.5–3.0 s | `./verify --local` → A4 | match: gaps `2.007 1.994 2.012 1.990 2.001 2.006`, median 2.003 s, n=6 (2026-11-12) |
| no full reload | A4: one main-frame navigation; a `window` marker set after load survives 12 s | match |
| the refresh is the board's own (no help from the test); a delta poll keeps rows, loader not back | A2 step 3, now driven by the timer: 2nd request carries `since=1`, 3rd `since=2` (proves the 2nd was applied before the 3rd started) | match |
| A4 catches a wrong cadence | mutation `REFRESH_MS = 1000` → A4 fails (median 1.000 < 1.9); `REFRESH_MS = 3500` → A4 fails (3 gaps of 3.50 s, fewer than 5 in 12 s; each gap > 3.0 too) | match (both failed as expected, file restored) |

## Easy to miss

- Fixed rate (`setInterval`), not "2 s after the last answer": with a 200 ms answer the gaps stay at 2.0 s instead of 2.2 s.
- A tick during an in-flight request is skipped (`refresh()` returns the pending promise), so a slow API never stacks requests; the next request starts at the following tick.
- A failed request leaves the rows and shows the error in the `role="alert"` line; the next good answer clears it.
- The timer is never stopped: the board polls while the tab is open (1,800 requests/h per open tab, BRIEF "Outside services").

## Not proven yet

- The error-then-recover path (500, then 200) has no test of its own; the code keeps the interval running regardless of the outcome.
- Cadence against the real API and the deployed URL: not run on this branch (no deploy, no real API calls in this issue). The pre-mortem's 30 s run is for `/rehearse`.
