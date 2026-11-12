# Risk classes for this project

Read by the kit's `scripts/classify-diff.mjs`. The highest class of any file wins; a file no row names is normal. Paths are globs in backticks.

For now the class changes nothing: every merge keeps its review, its mark and its row in `BRIEF.md`. Each PR body records the class, and those records decide later which class may merge without the human. Widen `low` only with that record behind it.

| Class | Paths | Why |
|---|---|---|
| low | `KEEP.md` `docs/decisions.md` `docs/reviews/**` `docs/plans/**` `sessions/**` | Bookkeeping: S02E04 PR #12 paid a full review for it |
| high | `.github/**` `.githooks/**` `.agents/**` `AGENTS.md` `CLAUDE.md` `BRIEF.md` `verify` | Process control and agent role contracts |
| high | `.env*` `*secret*` `*credential*` `*auth*` `*token*` `*payment*` `*billing*` `**/*auth*/**` `**/*secret*/**` `**/*payment*/**` `**/*billing*/**` | Security, credentials, money, as a file or a folder |
| high | `**/migrations/**` `Dockerfile` `*.tf` | Data and infrastructure: expensive or hard to see when wrong |

Add this project's own: the paths where a mistake is expensive or nobody would notice.
