# F29 review
Status: started, docs read
- tests/lint/parity run (see final)
- PatternRuleMatcher.js vs Java: all methods present (monitorActiveRules/getCurrentRules deferred F70 SRV-0175); createRuleMatch/formatMatches/concat*/combineLists/phraseLen/translateElementNo line-by-line equal so far
- MatchState.js vs Java: equal; RuleWithMaxFilter equal
- npm test 603 pass (1 flaky fail on first run, not reproduced x3), lint clean, X-RULEMATCH 114/4np, SEQMATCH 91, UNIFY 38
- adapters call port; tests support classes match Java; DemoPatternRuleTest/PatternRuleMatcherTest ok
- open: disambiguated-sentence paths, CommandLineTools usage, oracle notes
- disamb/chunk/immunize-only paths: filterReadings chunk/immunize copy (disamb only, F32), antipattern re-run via notPorted DisambiguationPatternRule#replace (F32), preDisambig tokens path identical code; no divergence found, unoracled
- method gap scan PatternRuleMatcher/MatchState/RuleWithMaxFilter/Match#createState: complete (getCurrentRules/monitorActiveRules -> F70 SRV-0175)
- minors: flaky test once; match-state.mjs:1 dangling header; F70 note on suggestionMatches state lifetime
VERDICT: ACCEPT
