# F31 porter checkpoint (rule self-test infrastructure)

## Findings
- Java sources: PatternRuleTest (runTestForLanguage, validate*, testRegexSyntax, testMessages, testGrammarRulesFromXML), PatternTestTools, AbstractPatternRuleTest, RuleIdValidator, FailingDemoPatternRuleTest, DemoPatternRuleTest#testRules.
- Golden fixtures "rule-examples": only tests/golden/X-ORACLE-CHECK/rule-examples-fr-sample (fr, offset 5 limit 3, op rule-examples). No fixtures for xx / de / en. Per-example parity runner for fr needs F63 (fr rule list) - NOT invented here, reported to lead.
- XSD validation (validatePatternFile / validateRemoteRulesFile) is not ported (D-048): replaced by well-formedness parse only.
- Threads (ExecutorService) replaced by sequential loop (S9 style); error order = rule order.

## Plan / status
- [ ] tests/support/PatternTestTools.js, RuleIdValidator.js, PatternRuleTest.js (helper class)
- [ ] DemoLanguage.js: DemoWithGrammarFile, spy covers getAsURL (ruleFileExists)
- [ ] DemoPatternRuleTest#testRules un-skipped, FailingDemoPatternRuleTest, PatternRuleTest#testSupportsLanguage
- [ ] per-language skipped tests de/en/fr + PLAN notes
