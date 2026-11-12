# 8 · Product can watch the board in use and see the moment an Ack lands on the wrong incident

Issue: #8 · Source: plan.md § 7 · Proof: BRIEF A1–A8

## Outcome

Product can open a 30 s recording of the live board (build 5f7ae15) and, at 00:20, see an Ack aimed at INC-4572 land on INC-6578 because a new incident pushed the rows down under the pointer; the step-1 report names the second, the code lines behind it and the options product can choose from. Anyone can re-record with `node scripts/record.mjs --fake` (no real ack) and re-check a report with `node scripts/check-report.mjs`.

## Done means

| Check | Shown by | Result |
|---|---|---|
| Whole step-1 reviewed by another family before main | PR #14 review mark (Codex gpt-6.1-sol, high + default, 2 loops) | match: no blockers |
| A1, A7, live rows on the deployed build + local spec | `./verify` | match: 4/4 (5f7ae15 on origin/main, 6 local tests) |
| Recording with one live arrival and one real ack | `node scripts/record.mjs --real` log | match: INC-5554 at 00:11, INC-1750 at 00:20, ack INC-6578 at 00:20 (aimed at INC-4572) |
| Video public, logged out | `curl -IL` + byte compare | match: 200, 2,580,908 bytes, same bytes |
| Report + evidence | `node scripts/check-report.mjs` | match: 9/9 |

## Easy to miss

- The recording does exactly one real ack (BRIEF "Outside actions" row 4); rehearsals use `--fake`.
- The report holds the full receipt: it lives in git-ignored `.challenge/step1/`; anything committed or shown is masked.
- Playwright videos show no cursor: the pink pointer and the caption are drawn by the recorder, and the release notes say so.

## Not proven yet

- Whether the course plays a webm served as `application/octet-stream` inline (it downloads and plays in a browser).
- The claim itself (#9) and product's answer (#2).
