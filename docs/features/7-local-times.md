# 7 · On-call reads each incident's time in their own locale and time zone

Issue #7 (SCHED-4514, plan R5, § 6). Proven by BRIEF A6.

## Outcome

On-call no longer converts raw UTC in their head. A viewer in Auckland sees `12/11, 04:03 pm`, one in Berlin `12.11., 04:03`, one in New York `11/11, 10:03 PM` for the same incident (`2026-11-12T03:03:00.000Z`): their own zone, their own day/month order and their locale's 12/24 h clock. The full UTC value stays in the time element's `datetime` attribute for tools and the replay.

## Done means

| Check | Shown by | Result |
|---|---|---|
| en-NZ / Pacific/Auckland shows exactly `12/11, 04:03 pm` | A6 step 1, `./verify --local` | match |
| de-DE / Europe/Berlin shows exactly `12.11., 04:03` | A6 step 2 | match |
| en-US / America/New_York shows exactly `11/11, 10:03 PM` | A6 step 3 | match (plain U+0020 spaces, compared byte for byte) |
| `datetime` = `2026-11-12T03:03:00.000Z` exactly | A6, `toHaveAttribute` | match |
| Text fully visible: one line, scrollWidth not above clientWidth, ends before the Ack cell, inside the viewport | A6 `fit` checks | match (en-NZ text is 107 px wide in the 200 px column) |
| A6 fails on raw `openedAt` | mutation, board.spec.mjs:209 | fails: received `2026-11-12T03:03:00.000Z` |
| A6 fails on a hardcoded `'en-GB'` | mutation, board.spec.mjs:209 | fails: received `12/11, 16:03` |
| A6 fails when the column clips the text | mutation 60 px column, board.spec.mjs:219 | fails: scrollWidth 107 > 60 |
| A2, A3, A4, A5, A7 still pass | `./verify --local` | 6/6 passed |

## Easy to miss

- The strings depend on the browser's ICU data. They were measured in Chromium 156.0.8078.4 (Playwright 1.64.1); another browser or version may print `4:03 pm` or a narrow no-break space.
- The time shows no zone name, so the same `04:03` means different moments for different viewers (see "Not proven yet").

## Not proven yet

- Firefox and WebKit: not run (the course replay and our spec use Chromium).
- Whether the time can still be misread (INC-1223 "auckland · 04:03 on the sheet"; en-NZ `04:03 pm` with a leading zero; no zone label) is a product question, left to "Options for product" by BRIEF "Left out on purpose". Not changed here.
- The live URL still runs the earlier build; this branch is not deployed (plan § 7 deploys the whole step 1).
