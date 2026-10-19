# Resume (lead)
State 2026-10-19: F01-F34, F38 verified. F35-F37 partial (see PLAN notes). User mode: one step, then ask user before next.
Next: F39 (see PLAN.md).
Rules: D-052 token budget (sonnet only, short prompts, review only where fixtures thin, one round). Loop: oracle -> porter -> reviewer (if needed) -> PLAN/INVENTORY -> commit (exclude oracle/cases/X-CLI-BASIC.bak).
Status cmds: python3 docs/tools/plan_check.py ; cat docs/inventory/*.md | grep -cE '\| verified \|\s*$'
