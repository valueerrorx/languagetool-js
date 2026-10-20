# Resume (lead)
State 2026-10-20: F01-F34, F38, F44, F45 verified; F35-F37, F39-F43 partial (see PLAN notes). 355 verified.
User order: do F46..F50, then STOP and report (German, terse).
Next: F46 (see PLAN.md).
Rules:
- D-052 token budget: sonnet only, short prompts, no reviewer unless fixtures thin, one round.
- D-053: clearly better solution than Java allowed -> log as DEV in DEVIATIONS.md; doubtful -> ask user.
- Loop per batch: one oracle agent for 2 steps (fixtures + docs/review/Fxx-oracle.md, commits) -> porter per step (no commit, statuses, PLAN notes before " | status:") -> lead checks plan_check + commits.
- Verified only if every Java class exists and fixtures fully pass in all languages (partial = ported). Porters sometimes forget inventory updates: check with grep.
- Never `npm run parity` full (too heavy) and never `--all`; run per case.
- Commit: git add -A -- . ':!oracle/cases/X-CLI-BASIC.bak' (user deletes that dir himself), trailer Co-Authored-By/Claude-Session lines.
- Agents must leave no background wait loops.
Status cmds: python3 docs/tools/plan_check.py ; cat docs/inventory/*.md | grep -cE '\| verified \|\s*$'
