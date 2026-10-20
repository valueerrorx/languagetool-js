# Resume (lead)
State 2026-10-21: F01-F34, F38, F44-F49, F51, F52 verified; F50, F53-F55 partial (wait on German#getRelevantRules F59 / OldSpellingRule); F35-F37, F39-F43 partial. 477/1193 verified. Full npm test green (939 pass).
F46-F55 done. Next: F56 (see PLAN.md), only on user request. Keep full npm test green after each batch.
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
