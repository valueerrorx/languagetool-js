# Resume (lead)
State 2026-10-19: F01-F34, F38 verified. F35-F37, F39, F40 partial (see PLAN notes). F40 util interrupt cases = DEV-007 (skip as deviation). User mode: ask before each step.
Next: F42 (see PLAN.md). F41 partial (CORE-0233 ML parts todo).
Rules: D-052 token budget (sonnet only, short prompts, review only where fixtures thin, one round). Loop: oracle -> porter -> reviewer (if needed) -> PLAN/INVENTORY -> commit (exclude oracle/cases/X-CLI-BASIC.bak).
Status cmds: python3 docs/tools/plan_check.py ; cat docs/inventory/*.md | grep -cE '\| verified \|\s*$'
