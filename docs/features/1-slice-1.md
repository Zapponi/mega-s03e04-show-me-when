# 1 · The board opens on its public address and names its build

Issue: #1 · Source: plan.md § 1 · Proof: BRIEF A1, A7 (slice subset)

## Outcome

On-call can open https://sched-prod-board.mega-s02e05-while-youre-away.workers.dev logged out and see tonight's incidents from the course API, newest first, and can tell which build they are looking at: the footer shows the git sha, and the build meta tag carries the same value.

## Done means

| Check | Shown by | Result |
|---|---|---|
| A1: 200 over https, meta = footer = a public commit | `./verify --slice 1` | match (720f5f5, on origin/1-slice-1) |
| A7 subset: board, incident-list, incident-row with data-id, build-sha | `./verify --slice 1` | match |
| Rows = the `/incidents` response the page consumed, same order | `./verify --slice 1` live-rows | match (8 = 8) |
| Real API `since` behaviour known | two GETs + 60 s poll, KEEP.md | full growing list; ~1 new incident / 10 s while polling |

## Easy to miss

- `scripts/build.mjs` refuses a dirty `app/` or an unpushed commit, so the footer sha always exists in the public repo.
- `sh scripts/wr.sh deploy` drops the Mahta `CLOUDFLARE_API_TOKEN` from the environment and pins the personal account id (git-ignored `.challenge/cf-account-id`).

## Not proven yet

- A1 "on origin/main": holds only after step-1 reaches main (merge commit, no squash).
- Loader, empty, ack, acked hooks: arrive with their issues.
