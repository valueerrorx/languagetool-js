# F32 review

Started 2026-10-18. Scope: uncommitted F32 (disambiguation replacer, XmlRuleDisambiguator, AbstractDisambiguator, DemoDisambiguator, AnalyzedSentence views).

## Checked
- Replacer (all actions, filter, antipatterns, copy-on-first-write, previous/readingsUnchanged): line-by-line vs Java; no behavioural divergence found except null-action (switch NPE) unreachable (handler defaults REPLACE).
- XmlRuleDisambiguator: equal; notPorted passthrough is project convention.
- AbstractDisambiguator/DemoDisambiguator/Language.js registration: equal.
- AnalyzedSentence keySet views: maps immutable after ctor, consumers order-free (RuleSet hints, TokenHint sorts merged indices) -> OK.
- Tests: xx disambiguation.xml identical to Java resource; DisambiguationRuleTest guard uses constructor.name instead of instanceof (minor).
- Runs: npm test 1st run 1 fail (GermanRulesTest testRule_commaWhitespace 5 s timeout, flaky; alone + 2nd full run green 627/0F); lint clean; X-DISAMB 79/0F/48NP; X-RULEINFRA 29/0F/9NP.
- NP masking: no swallow of notPorted in replacer/XRD; but adapters mark the whole request NP if one text hits a pending filter -> xmldg-*/xml-de/en/rmd-de whole cases unverified (oracle granularity, not port bug).
- Perf profile (fr, cpu-prof): AnalyzedSentence ctor 22% incl (indexPosTags 8% self via ATR iterator wrapper, indexLemmas 7%, makeUnmodifiable 3%), testAllReadings 11%, GC 7%, getDefaultLanguageVariant->Languages lookup ~3%, Unifier creation/JavaHashMap resize 2%.

VERDICT: ACCEPT (minors only)
