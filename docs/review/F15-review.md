# F15 review log
- [x] ctors, mutators (cache clear everywhere), check/check2/cleanText, filterMatches order, ignoreRule, level/tone, analysis, performCheck, TextCheckCallable, line/col, selectRules, RuleSet, SameRuleGroupFilter, Range/ExtendedSentenceRange: no divergence found on reachable paths.
- finding: RuleSet.hinted shortcut (byToken/byLemma empty) returns all rules even if a classified hint had no lowerCaseValues (Java excludes it) - minor/latent.
- finding: getDisabledRules insertion-ordered (Java HashSet).
- finding: ErrorRateTooHigh text-level message throws notPorted (pending F35).
- TODO: adapters (noop disambiguator), tests, positions through AnnotatedText.
- adapters: noop disambiguator/chunker cannot mask a pipeline bug: JLanguageTool.java has no immunization code (only rules/disambiguator read it); analyze-raw compares post/pre only for unchanged sentences, so preDisambig copy under a mutating disambiguator is untested (TESTS).
- verify: npm test 302 pass, lint clean, parity X-CHECK-PIPE 41/0/22 notPorted.
- VERDICT: ACCEPT (minors only).
