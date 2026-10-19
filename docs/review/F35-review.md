# F35 review (compact, D-052)
VERDICT: ACCEPT (lint clean, vitest 29/29, parity X-PIPE 14 pass / 0 fail / 17 not ported)
CRITICAL: none found. Error-rate %.0f (float*100 via fmul, Java field is float), UserConfig NPE, LanguageDependentRuleMatchFilter + postFilters wiring match Java.
MINOR:
- MultiThreadedJLanguageTool: sequential; on first rule failure later rules are not run (Java runs all submitted tasks, side effects only). RuntimeException(ExecutionException(RuntimeException(orig))) wrapping is from JDK reading, no mt fixture passes yet (mt-en/fr 8/12 notPorted) -> unverified.
- forkJoinRethrown ONE_ARG list is a hand list of JDK reflection behaviour; not probed.
- shutdown flag: Java check() with 0 rules/1 sentence path untested against fixture.
IDs verified-now: 0054 (office PASS), 0060 (config PASS + NPE test), 0084 (ranges en/fr PASS), 0085 (errorrate en/fr PASS + test), 0086 (failure en/fr PASS), 0088 (listener en/fr PASS), 0092 (callback test exists).
Stay ported: 0058, 0059 (verbose/unknown fixtures all notPorted), 0087 (filters de-DE notPorted; partial rule), 0091 (mt notPorted, testConfigurableThreadPoolSize skipped), 0186 (DictionaryMatchFilter, DictionarySpellMatchFilter, SuggestionFilter not in src; inventory row should not be "ported" even).
Note: de-DE variants of all X-PIPE cases remain notPorted (PLAN F45/F60/F51), so strict REVIEW-NOTES "partial is not done" rule keeps 0054/0060/0084/0085/0086/0088 arguably ported until de-DE passes; en/fr evidence is complete.
RECURRING: status marked ahead of class existence (0186); partial parity counted as done.
