# F15 spec critic log
Verdict: REVISE
1. Post-check chain CORE-0087 (filterMatches: ignoreRule 2nd pass, LanguageDependentRuleMatchFilter, CleanOverlappingFilter default ON CORE-0187, filterRuleMatchesAfterOverlapping, custom filters/addMatchFilter) is not mentioned in F15 although it shapes every check2 result; PLAN puts it in F35. Spec must say: in F15 or harness uses setCleanOverlappingMatches(false) and F15 JS omits them (then F35 owns the byte-level diff).
2. CORE-0050/0051/0052/0053 API surface (ctor null NPE messages, getCategories, getPatternRulesByIdAndSubId, setRules, addRule, mutation clears ruleSetCache) has no op; add "mutate then check" sequence op for cache invalidation.
3. Built-in rules: Java ctor loads en/fr built-ins (+pattern rules, not ported yet). Active-rules op must be restricted to synthetic rule ids (or enabledOnly), else uncomparable.
4. Disambiguation: flag "readings changed that synthetic rules could observe" is undefined. Synthetic rules read only token text, disambiguator never changes token text, so check2 can be compared on all requests. Define flag mechanically for analyze-raw: post-disambig dump == raw dump (incl. immunized). Prefer flag over Language subclass (AmericanEnglish not re-instantiable). Also pin getAnalyzedSentence preDisambigTokens copy (AnalyzedSentence.copyReadings) and post-disambiguation chunker as ported pass-through.
5. sentenceRanges: spec lists them but extended ranges are CORE-0084 (F35); say which. ignore ranges: how produced (synthetic rule or AnnotatedText?) unspecified.
6. Name concrete inputs: astral/emoji (UTF-16 offsets), \r\n, \n in markup, startColumn first line, interpretAs mapping with toPos-1, text-level findLineColumn binary search, text-level error path message; listener (CORE-0088) and cancel callback (CORE-0073 JUnit tests) in or out?
7. Acceptance "JUnit subset" must be enumerated; result cache (ResultCache, SimpleInputSentence) must be stated out of scope explicitly (F70), not "if listed elsewhere".
8. SEMANTICS refs missing: UTF-16 offsets, String.split(ZERO_WIDTH_NBSP) trailing empties, Pattern for ignored chars, HashMap order of getCategories, float formatting not needed.
No deviations/improvements found. No NEEDS_USER.

## Round 2
Verdict: APPROVED. R1-R8 resolve points 1-8; no new gap or deviation. Minor (non-blocking): R6 "if reachable" error path - porter should record reachability decision in F15-porter.md.
