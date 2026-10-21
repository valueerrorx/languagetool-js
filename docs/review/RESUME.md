# Resume (lead)
State 2026-10-22: F01-F74 done (F73 perf partial: warm de/en <0.8 ratio, rerun on quiet machine). 770/1193 verified; remaining ported = blocked (wave 2, DEV-001, unoracleable; see docs/review/RESIDUALS.md). D-056: detection >= Java, Java bugs fixed (DEV-013..027, oracle/deviations.json -> parity reports DEV).
Next: full npm test green, reviewer audit (docs/review/AUDIT-reviewer.md), F75 final acceptance + parity matrix; then wave 2 (es,it,sl,ru,sk,pl, D-054).
Notes: npm test now long (EnglishPatternRuleTest 190 s); parity.mjs supports LTJS_CASE=<regex>.
Rules:
- D-052 token budget: sonnet only, short prompts, no reviewer unless fixtures thin, one round.
- D-053: clearly better solution than Java allowed -> log as DEV in DEVIATIONS.md; doubtful -> ask user.
- Loop per batch: one oracle agent for 2 steps (fixtures + docs/review/Fxx-oracle.md, commits) -> porter per step (no commit, statuses, PLAN notes before " | status:") -> lead checks plan_check + commits.
- Verified only if every Java class exists and fixtures fully pass in all languages (partial = ported). W-lines: "| ids: ... | done: <note> | status: done". Porters sometimes forget inventory updates: check with grep.
- Never `npm run parity` full (too heavy) and never `--all`; run per case.
- Commit: git add -A -- . ':!oracle/cases/X-CLI-BASIC.bak' (user deletes that dir himself), trailer Co-Authored-By/Claude-Session lines.
- Agents must leave no background wait loops.
Status cmds: python3 docs/tools/plan_check.py ; cat docs/inventory/*.md | grep -cE '\| verified \|\s*$'
