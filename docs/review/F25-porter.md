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

## Hälfte B
Status: started; read Java (PatternRuleLoader, XMLRuleHandler, PatternRuleHandler, RuleFilterCreator, RegexRuleFilterCreator, PatternRuleXmlCreator) + fixtures
Plan: XMLRuleHandler.js, PatternRuleHandler.js, PatternRuleLoader.js (registerComponent), RuleFilterCreator/RegexRuleFilterCreator + pending filter registry (filters.js), UnifierConfiguration+EquivalenceTypeLocator (pulled from F28), DisambiguationPatternRule model (pulled from F32, replace() notPorted), StringMatcher.createWithKnownValues (stubs F26), PatternRuleXmlCreator, adapter rule-load.mjs, tests
Status: written XMLRuleHandler, PatternRuleHandler, PatternRuleLoader (registered via lang/register.js), RuleFilterCreator/RegexRuleFilterCreator + filterRegistry (pending filter placeholders), UnifierConfiguration, EquivalenceTypeLocator, DisambiguationPatternRule (model), StringMatcher.createWithKnownValues (stubs), adapter rule-load.mjs (all modes). parity X-RULELOAD 241 pass / 4 fail / 33 notPorted (rest = toXML). Next: PatternRuleXmlCreator, fix 4 fails, tests, lint, docs.
Status: PatternRuleXmlCreator (own mini-DOM from scanner hooks reportContentEvents + Xerces LS filter/entity-merge semantics + xalan escaping, probed against JDK 17), URL.js rewritten (JDK URL parse), parity X-RULELOAD 277 pass / 1 fail (inline-and-or-unify: golden truncated at op 18, Java harness crashed "Null key for a Map" at <feature> without id; oracle defect, not port). inline-via-file needed normalizer for createTempFile name (oracle/lib/normalizers.mjs paths). Next: tests port, lint, full parity, docs (PLAN/inventory/perf-watch/unreachable).
Status: Hälfte B DONE. Tests ported: PatternRuleLoaderTest (4 + 1 @Ignore), PatternRuleXmlCreatorTest (6), PatternRuleHandlerTest (1), RegexPatternRuleTest bodies kept but skipped (needs F30 RepeatedPatternRuleTransformer); no Java tests exist for XMLRuleHandler/UnifierConfiguration/EquivalenceTypeLocator. Test support: tests/support/DemoLanguage.js (Demo stand-in, xx test resources copied to tests/resources/rules/xx, DemoPartialPosTagFilter placeholder). inline-and-or-unify (op 18, <feature> without id): Java loader throws nothing (HashMap accepts null key, setEquivalence only in <unification>); the crash "Null key for a Map" is Jackson serializing the dump in the harness; port also loads without error -> oracle defect, left standing. Final: lint clean, npm test 514 pass/32 skip, parity 1255 pass / 1 fail (that one) / 17 skip / 109 notPorted. Perf in perf-watch.md, PLAN notes F26/F28/F30/F32/F34, 15 inventory IDs ported.

## Hälfte B Review-Runde 1
Status: started (reading; items 1-8 from F25b-review)

Status: items 1,7,8 + XML EOF/UTF-16 decl + class stubs done; JavaConcurrentHashMap verified vs JDK17 (identical order incl. transfer/presize; tree bins throw). Next: URL.js (javap of JDK17 handlers), .gitignore, StringMatcher postag, adapter activateDefaults, tests, docs

Status: URL.js rewritten from javap (jar/mailto/default handlers, IPAddressUtil, checkHostString), 9000 random specs identical to JDK17; fixtures inline-url/-places/-errors/-unification/-toxml-quote checked individually

Status: items 1-8 done (StringMatcher postag template ported, activateDefaults no fake, /resources/ anchored: src/core/resources/* and tests/golden/X-LANGDETECT/resources now untracked-visible), tests added (URL, JavaConcurrentHashMap, F25bReviewTest). Next: lint, npm test, SwissGerman timeout, full parity

Status: DONE. lint clean, npm test 525 pass/32 skip, parity full 1248 pass/0 fail/17 skip/122 notPorted (X-RULELOAD 270/0/13 notPorted = patternrules-* until JLanguageTool ctor).

## Hälfte B Review-Runde 2
Status: tryCreateHybridPostagMatcher + intersectWithUniverse + enumeratedSetMatcher ported (StringMatcher.js, createWithKnownValues no longer throws notPorted); local listGet copies removed; PLAN F26 note corrected (only RunSequenceMatcher stub left). lint clean, parity 1249 pass/0 fail/17 skip/122 notPorted (inline-postag-hybrid green).
