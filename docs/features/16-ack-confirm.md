# 16 · On-call sees which incident an Ack will take before it is sent

Issue: #16 · Source: plan.md § 10 (product's step-2 decision) · Proof: BRIEF A5, A7 (+ confirm hooks), A10

## Outcome

When on-call clicks Ack, the board asks "Ack INC-xxxx?" naming the incident of the row that was clicked. If the list moved and the name is not the one they meant, they cancel and nothing is sent; if it is, they confirm and exactly that incident is acked, even if new incidents land while the question is open. New incidents still appear live at the top.

## Done means

| Check | Shown by | Result |
|---|---|---|
| Ack opens `confirm` naming the clicked id; nothing sent before `confirm-ack` | A5 local | match |
| `confirm-cancel` sends nothing | A5 local | match |
| A new row landing while the confirm is open does not change the acked id | A5 local | match |
| `confirm`, `confirm-ack`, `confirm-cancel` exist with their meaning; the 8 pinned hooks unchanged | A7 local | match |
| Skipping the confirm (old behaviour) is caught | mutation: A5 and A7 fail | match |
| Live on the deployed build | `./verify` after deploy (#17) | to run |

## Easy to miss

- The confirm keeps the id captured at click time; it does not re-read the row under the pointer when confirmed.
- It lives outside the list, so the 2 s redraw does not remove it; Escape cancels.
- A second Ack click while a confirm is open replaces it (one confirm at a time).

## Not proven yet

- The course replay against the new build (prove run, #17).
