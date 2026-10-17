# F30 review (in progress)

## Checked
- Repeated/ConsistencyPatternRuleTransformer, PatternRuleTransformer: side by side OK (JavaHashMap compute order, javaSplit, offsets).
- RuleFilterEvaluator / RegexRuleFilterEvaluator / RegexAntiPatternFilter: texts and branches equal.
- JavaHashMap#compute vs JDK17: binCount/treeify/resize equal. copyOfRange: from>length message differs from JDK (unreachable).
- (a) abstractPatternRuleClass null: only CLI printMatches [subId] / verbose (line N) affected (server subId via Rule#getSubId). All CLI goldens with [subId] (rules-no-eo, maintest-disabled, rules-disable-full, rules-default-all, rules-default-fr) are portLater -> SKIP; no plan note to un-skip.
- (d) target-step notes missing in PLAN F32/F34/F49/F58/F62/F50/F59/F63; language filters attributed to F34 wrongly (DE-0116/0118 F58, EN-0107/0108 F49, FR-0063/66/69/71 F62).
- DemoTagger: CORE-0213 verified since F13 though class missing; Language#createDefaultTagger/NoopLanguage depended on it.
- npm test 617 pass/14 skip; lint clean; parity running.
- parity (full, run by reviewer): 1576 pass, 0 fail, 17 skip, 136 not ported; NP set in RULEINFRA/RULEMATCH/RULELOAD equals porter claim.
- MINOR: Pattern.split(String(input)) turns null filter args into 'null' (Java NPE); copyOfRange from>length text; stray oracle/cases/X-CLI-BASIC.bak/; RegexAntiPatternFilter test asserts "rule R" substring of "R[1]".

VERDICT: REJECT (PLAN target-step notes missing/misattributed; CLI subId fixtures all portLater without un-skip note)
