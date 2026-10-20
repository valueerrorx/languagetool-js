# Resume (lead)
State 2026-10-20: F01-F34, F38, F44-F49 verified; F50 partial (EN-0002 es/nl only, DEV-006); F35-F37, F39-F43 partial. 436/1193 verified.
F46-F50 done. User order 2: F51..F55, then STOP and report. Also: full npm test must be green (run it, fix failures via porter).
Notes: npm test now long (EnglishPatternRuleTest 190 s); parity.mjs supports LTJS_CASE=<regex>.
Rules:
- D-052 token budget: sonnet only, short prompts, no reviewer unless fixtures thin, one round.
- D-053: clearly better solution than Java allowed -> log as DEV in DEVIATIONS.md; doubtful -> ask user.
- Loop per batch: one oracle agent for 2 steps (fixtures + docs/review/Fxx-oracle.md, commits) -> porter per step (no commit, statuses, PLAN notes before " | status:") -> lead checks plan_check + commits.
- Verified only if every Java class exists and fixtures fully pass in all languages (partial = ported). Porters sometimes forget inventory updates: check with grep.
- Never `npm run parity` full (too heavy) and never `--all`; run per case.
- Commit: git add -A -- . ':!oracle/cases/X-CLI-BASIC.bak' (user deletes that dir himself), trailer Co-Authored-By/Claude-Session lines.
- Agents must leave no background wait loops.
Status cmds: python3 docs/tools/plan_check.py ; cat docs/inventory/*.md | grep -cE '\| verified \|\s*$'
