# 18 · The course accepted the step-2 proof: the Challenge is solved

Issue: #18 · Source: plan.md § 10 · Proof: BRIEF A10

## Outcome

The course accepted the step-2 claim on 2026-11-12 at 22:25:42 UTC, so S03E04 "show me when" is solved; the debrief is saved on the Challenge page (https://hq.mega.dev/challenges/show-me-when#debrief).

## Done means

| Check | Shown by | Result |
|---|---|---|
| Step-2 report: System Diff + evidence {sha, videoLink, runUrl} | `node scripts/check-report2.mjs … <nonce>` | match: 7/7 |
| Course replay on the live build | prove run 43317683236 | match: success, unmet [] |
| Claim accepted | claim-challenge reply | match: status solved |

## Easy to miss

- The report holds no secret, but the claim body carries the session and the productReceipt: they live only in git-ignored `.challenge/`.
- A Windows text-mode rewrite turns the report into CRLF and the checker finds no evidence block; keep reports LF.

## Not proven yet

- Nothing left for this Challenge.
