# Resume (lead)
State 2026-10-22: wave 1 + wave 2 (W01-W42) done, 9 languages. 1071 verified; 8 ported: CLI-0045/SRV-0015 cannot be oracled, SRV-0181/CORE-0233 DEV-001, CORE-0266 test rules, CORE-0423/0424/0426 only used by out-of-scope languages. npm test 1294 pass.
Done: final parity sweep (docs/review/FINAL-parity-sweep.md), 0 real fails; perf rounds 1-4: all 9 languages >= Java (CLI and warm). Open: nothing mandatory.
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

W42 todo:
- DEV-026 also applies to it/ru/es etc.: a null LM gives an empty list (it currently throws an NPE; IT-0052 rulelist-direct needs a deviations.json entry).
- cli `--list` / rule-file-list: Java lists about 40 languages. Needs a dev006 listCut in the cli comparator (it/sk/sl cli-rule-file-list).
- Corpus: only de/en/fr exist. W42 should fetch it/pl/sl/sk/ru/es texts (oracle/scripts/fetch-corpus.mjs + gen-corpus.mjs) and run an X-CORPUS run for each.
- Harness note: chained X-CHUNK, X-ENCHUNK and X-DECHUNK runs fail because chunk-run.mjs mutates the shared MultiWordChunker.getInstance cache. Run each ID on its own, or let the adapter use new MultiWordChunker(). This is not a src bug.
