# 6 · On-call sees new incidents land at the top and takes one with Ack

Issue #6 (SCHED-4511, plan R1 + R2, BRIEF A3 + A5, A7 completed).

## Outcome

On-call with the board open sees a new incident appear as the first row within one 2 s refresh, without a reload; rows already shown stay, and no incident shows twice. Each row has an **Ack** button: a click acks that row's incident through the unchanged `app/api.js` (latest cursor, receipt logged to the console) and the row then shows **Acked** in place of the button. The mark stays through every refresh and when new rows land above it. If the ack fails, the row stays not acked, says "Ack failed: …" in the row, and the button stays for a retry.

## Done means

| Check | Shown by | Result |
|---|---|---|
| fake adds an incident between two polls → it is row 1 within one poll, no reload, old rows stay, no id twice; with full pages (the real API, KEEP) and delta pages | `./verify --local` → A3 (loop over `full`, `delta`) | match: `INC-0999, INC-1003, INC-3002, INC-2001` in both modes; 1 navigation; marker kept (2026-11-12) |
| click `ack` in row `data-id=X` → exactly one `/ack` with `id=X` and the latest cursor the fake handed out before the ack arrived | A5 step 1 (fake's `acks` and `cursors` logs) | match; console shows `ack INC-3002 … fake-receipt-1` |
| row X shows `acked`, its `ack` button gone, the other rows keep theirs | A5 step 2 | match |
| the mark survives 3 more refreshes, also after a new row lands above it; still one ack, id X | A5 step 3 | match |
| a forced 500 on `/ack` → row not acked, error in the row, survives a refresh; retry acks it | A5 step 4 | match: acks `[X, Y, Y]` |
| all 8 hooks present (`ack` in every row, `acked` after a click) | A7 | match |
| A5 catches a DOM-only mark | mutation: on success write `acked` into the row's DOM, no state → A5 fails at `test/board.spec.mjs:137` (mark gone after the next re-render) | match (failed as expected, restored) |
| A3 catches pages replacing instead of merging | mutation: `incidents.clear()` before each merge → A3 `delta pages` fails at `test/board.spec.mjs:83` (only `INC-0999` left); the `full pages` step passes | match (failed as expected, restored) |

## Easy to miss

- The id comes from the clicked row's `data-id` at click time, not from a closure made at render, so a row that moved still acks its own incident.
- The whole list is redrawn every 2 s (`innerHTML`); the acked mark and the ack error come back from the board's state (`acked`, `ackErrors` maps by id). The global `role="alert"` status line is cleared by each good poll, so an ack error is shown in the row instead.
- The real API's full pages would hide a page-swap bug: only the delta mode catches it (mutation above).
- On purpose, no extra protection (BRIEF "Judge" and "Left out on purpose"): rows still move under the pointer when a new incident lands, the button is not disabled while an ack is in flight, no confirm. These are options for product.

## Not proven yet

- Ack against the real API and the deployed URL: not run (real acks happen only in the recording, BRIEF "Outside actions").
- A click whose press and release straddle a 2 s re-render: the button is replaced under the pointer and the browser may drop the click. Not tested; part of the rows-move hypothesis for product.
