# Decisions

One line per decision, written when it is made, not at the end of the day:

`YYYY-MM-DD — <decision> — <why> — who: human | agent (<source>)`

`who: human` only for what only the human decides: money, accounts, public exposure, actions that cannot be undone, the product's purpose and users. Everything else is `who: agent`, with its source (the request, the spec, a measure, an earlier decision); the human vetoes those in a batch, not one by one.

A changed decision gets a new line that names the one it replaces. Findings (what was seen, with its source) go in `KEEP.md`, not here.

2026-11-12 — Host the board on Cloudflare (Pages/Workers), personal account — Giovanni's answer — who: human ("ok", megadev thread)
2026-11-12 — Recording hosted as a GitHub release asset — Giovanni's answer — who: human ("ok", megadev thread)
2026-11-12 — Public repo Zapponi/mega-s03e04-show-me-when — Giovanni's answer — who: human ("ok", megadev thread)
2026-11-12 — app/config.js carries the session publicly (repo + URL) as the starter designs; recorded as a known exposure — starter README "Run it" — who: human ("record it as a known exposure in the brief")
2026-11-12 — Workers static assets (Worker `sched-prod-board`) over Pages — reuses wrangler 4.149.0 and the wr.sh personal-account pin from S03E03; both were approved — who: agent (S03E03 scripts/wr.sh, KEEP)
2026-11-12 — Build step copies app/ to dist/ and writes the git sha into the meta and footer; deploy only from a commit pushed to origin/main — R6 + README evidence "sha" — who: agent (plan R6)
2026-11-12 — Tests run Playwright 1.64.1 (the starter's pin) against a local fake incident API; the real API gets reads only, acks only in the recording — avoid acks and receipts on the course's night outside the evidence — who: agent (package.json, README)
2026-11-12 — A4 pass bar: every gap between /incidents calls ≤ 3 s over 30 s (2 s + 1 s for timer and network jitter) — no source gives a tolerance; Giovanni may veto — who: agent (plan R4, own pick)
2026-11-12 — R5 uses Intl.DateTimeFormat with the browser's locale and time zone (day, month, hour, minute; the locale's own 12/24 h); no hand-built "EU list" — "in their own order" (SCHED-4514) — who: agent (issue SCHED-4514)
2026-11-12 — Recording made with Playwright recordVideo (webm) of a scripted on-call session on the live URL, with a timestamp log per action for mm:ss — exact mm:ss and receipt per moment — who: agent (README step 1)
2026-11-12 — Build the four issues as written; the R1×R4 row-shift and time-misreading hypotheses go to "Options for product", not into the build — the report asks for options, product decides — who: agent (README step 1)
2026-11-12 — One worker at a time; one /sol-loop per step deliverable — all issues touch app.js — who: agent (AGENTS.md, models.md)
2026-11-12 — Outside actions rows 1–7 (push/PR/issues, deploy, releases, real acks in recording, prove run, both claims) — table shown in chat — who: human ("bora")
2026-11-12 — Tests lean: one Playwright spec, one test per proof check, against a local fake; ./verify once per issue and before each claim — Giovanni's guidance — who: human ("Tenha certeza que seremos eficientes em testes, sem exagerar, mas que siga as boas praticas, testar quando faz sentido")
2026-11-12 — Build plan appended below the course text in plan.md (course text unchanged, the System Diff compares against it) — kit needs plan.md at root; repo content stays as it is — who: agent (AGENTS.md)
2026-11-12 — Proof A1–A10 approved — shown in chat — who: human ("Aprovo a prova")
2026-11-12 — Plan review (Sol + Claude reviewer) accepted in full; replaces the A4 line above: request-start gaps median 1.9–2.1 s, each 1.5–3.0 s, over ~12 s, fake answers in 200 ms (agent's pick, no source gives a tolerance) — docs/reviews/2026-11-12-plan.md — who: agent (review)
2026-11-12 — Replaces the R5 line above: Intl options pinned to day/month/hour/minute '2-digit'; strings measured in Chromium (en-NZ `12/11, 04:03 pm`, de-DE `12.11., 04:03`, en-US `11/11, 10:03 PM`) — review finding 5 — who: agent (Chromium probe)
2026-11-12 — PRs merge with a merge commit, never squash, so a deployed sha stays in history — review finding 7 — who: agent (review)
flow-ok: proof-late — the kit gate read T3 checkpoint commit 8719dfe as a build; main had no commit and nothing was built; proof approved before any build (Giovanni told in chat)
flow-ok: plan-late — same false positive; plan reviewed by two families before any build (docs/reviews/2026-11-12-plan.md)
flow-ok: bundle — the three megadev "ok"s were three separate answers (host, video, repo), one per question, per .challenge/log.md (Giovanni told in chat)
2026-11-12 — Create the public repo, push the initial commit, publish issues 1 (slice 1) and 2 (product's answer, waits on the course); nothing extra required on every issue — table shown in chat — who: human ("Sim pode criar")
2026-11-12 — Publish issues #4–#9 (table numbered #3–#8 in chat; plan § 2–§ 7: bench+loader, refresh, live list+ack, times, step-1 evidence, step-1 claim); #2 blocked by #9 — split after slice 1 — who: human ("Sim", answering "posso publicar essas 6 issues (#3 a #8) no repo?")
2026-11-12 — Step-1 work merges into the integration branch `step-1` through one PR per issue (review mark + verifier each, the kit gate requires them); one /sol-loop on the whole step-1 before main — kit gate + AGENTS.md — who: agent (kit_gate)
flow-ok: issues-late — same false positive (T3 checkpoint 8719dfe); issue table approved before any build ("Sim pode criar")
flow-ok: heredoc — four heredocs wrote docs/decisions.md and scripts; file-write tool from now on (Giovanni told in chat)
2026-11-12 — Send the step-1 claim (session, step 1, board URL, .challenge/step1/report.md, release videoLink) — report and video shown in chat — who: human ("Claum", answering "Responda vai para eu mandar o claim do passo 1")
2026-11-12 — Step 2 = Ack asks to confirm, the confirm names the incident id; hooks confirm, confirm-ack, confirm-cancel — product's answer (resume-challenge ~21:42 UTC) — who: product ("New incidents stay live at the top and Ack stays on the row, but Ack asks to confirm, and the confirm names the incident id.")
2026-11-12 — In-page confirm with the three hooks, not browser confirm(): confirm() blocks the page and stops polling; the course named the hooks first — who: agent (plan § 10)
2026-11-12 — Publish issues #16–#18 (step-2 build, evidence, claim) and start step 2 with plan § 10 — table shown in chat — who: human ("Sim", answering "Responda sim para eu publicar as issues #16 a #18 e começar o passo 2 com esse plano")
2026-11-12 — Send the step-2 claim (session, step 2, productReceipt, board URL, .challenge/step2/report.md, step2-evidence-b videoLink) — report, video and prove run shown in chat — who: human ("vai", answering "Responda vai para eu mandar o claim do passo 2")
