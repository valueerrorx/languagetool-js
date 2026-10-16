Status: F25a started, reading
Status: F25a design read; porting StringMatcher(partial)+Substrings, PatternToken, Match, rules
Status: Substrings, StringMatcher, JavaHashSet(+JavaHashMap.remove), Match, CaseConversionHelper written; next PatternToken, rules, builders, RuleFilter
Status: PatternToken written
Status: all model classes written (PatternRuleId, RuleFilter, RegexRuleFilter, AbstractPatternRule, AbstractTokenBasedRule, PatternRule, RegexPatternRule, builders, XmlCreator stub); next: RuleSet fix, import smoke, adapters, tests
Status: adapters done (builder, files, ruleset-hints); next tests port + lint + full parity
Status: tests ported (PatternTokenTest, RuleSetTest, StringMatcherTest, Match/Regex skips); next lint, npm test, more tests for JavaHashSet/Substrings
Status: DONE. parity 981/0/17/383, npm test 499 pass/31 skip, lint clean

## Review-Runde 1
Status: started (guavaCapacity first)
- 1 guavaCapacity: Guava 33.5.0 Maps.capacity (javap) = n<3 ? n+1 : ceil(n/0.75); only use of Guava sizing in src (Languages.js uses fixed 64). ruleset-hints-order passes.
- 2 tryCreateSequenceMatcher: RunSequenceMatcher not ported (>600 Java lines incl. hybrid postag); explicit notPorted stub returning null (F26 in PLAN).
- 3 PosToken.withMatcher added. 4 arrayGet helper (src/lib/java/arrays.js), CCE text with loader suffix (verified on JDK 17). 5 Collections.js views (unmodifiableList/Set, emptyList, asList) used in getAndGroup/getOrGroup/getExceptionList/getAntiPatterns/StringMatcher.
- Tests added in PatternModelTest. Status: DONE. parity 982/0/17/383, npm test 503 pass/31 skip, lint clean.
