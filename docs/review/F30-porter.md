Status: F30 porter started; reading
Status: ported RuleFilterEvaluator, RegexRuleFilterEvaluator, RegexAntiPatternFilter, Repeated/ConsistencyTransformer, wired JLanguageTool+matcher+RegexPatternRule; next: run tests/parity, un-skip tests, port Java tests
Status: X-RULEINFRA 0 fail (hints-real NP=F34 filters, textmatch NP=F32 DisambiguationPatternRuleReplacer); added JavaHashMap#compute, arrays copyOfRange; next: full parity, tests, un-skip, Java tests, X-RULELOAD/X-RULEMATCH, plan
Status: DemoTagger ported (was missing), RegexPatternRuleTest + PatternRuleMatcherTest on Demo/JLanguageTool; next parity result, Java tests (Repeated/Consistency/RuleFilterEvaluator/RegexAntiPattern), X-RULELOAD, plan
Status: JavaHashMap#compute fixed+JDK17 corpus test; RuleFilterEvaluatorTest ported; next: re-parity, extra tests for transformers/RegexAntiPattern, X-RULELOAD, plan/inventory
Status: DONE; plan F30 [x], inventory 6 IDs ported, npm test green (617), lint clean, parity 1576 pass 0 fail (pre-final), RULEINFRA 0 fail
