# F15 porter checkpoint (check pipeline core, JLanguageTool)

Sub-steps (mark [x] when done):
- [x] 1 model/support: JLanguageToolConstants.js (cycle-free constants), check/Range.js, check/ExtendedSentenceRange.js, ShortDescriptionProvider.js, patterns/RuleSet.js, rules/SameRuleGroupFilter.js, check/postFilters.js (F35 pass-through hooks), Tools.selectRules, StringUtils.abbreviate
- [x] 2 JLanguageTool.js: ctors, rule assembly hooks, enable/disable, getters, check/check2, cleanText, analysis, TextCheckCallable, positions, line/column, cancel callback
- [x] 3 adapters: oracle/adapters/_synth-rules.mjs, check2.mjs, active-rules.mjs, lt-api.mjs, analyze-raw.mjs
- [x] 4 tests: JUnit subset + block tests
- [x] 5 lint, npm test, parity, perf-watch

Notes / decisions:
- Constants moved to src/core/JLanguageToolConstants.js (re-exported by JLanguageTool.js) to avoid import cycles (AnalyzedToken*, Language*).
- Adapters build JLanguageTool with customRules=[] (Java built-ins are disabled/filtered to SYN_ by the harness, R3); check2/lt-api run with NoopDisambiguator + NoopChunker swapped in for the call (token text unaffected, R4); analyze-raw swaps only the disambiguator (post compared only where Java's disambiguator changed nothing); en raw needs the OpenNLP EnglishChunker (pending) -> analyze-en-US notPorted.
- Hooks: JLanguageTool.{remoteRuleClass,spellingCheckRuleClass,abstractPatternRuleClass,repeatedPatternRuleClass,consistencyPatternRuleClass}, RuleSet.abstractTokenBasedRuleClass; post filters src/core/check/postFilters.js (pass-through, F35); ResultCache path throws notPorted (F70); remote rules notPorted (DEV-001); ErrorRateTooHigh text-rate message needs %.0f (F35).
- After 1-3: parity X-CHECK-PIPE 41 pass, 0 fail, 22 notPorted (21 de-DE, analyze-en-US); textlevel-errors cause chains identical incl. inner JDK texts.
- Early port (needed by extendSuggestions, CORE-0082): ShortDescriptionProvider (CORE-0279 stays F37 for verification; no X-CHECK-PIPE suggestion has a description). Range/ExtendedSentenceRange/ErrorRateTooHighException ported as classes (CORE-0084/0085 verified in F35); getAllActiveOfficeRules ported (CORE-0054, F35).
- Order-free (SEMANTICS S5): disabled/enabled rule and category sets (JS Set/Map), getCategories (JavaHashMap anyway), replaceSoftHyphens HashMap (lookup only), Tools.selectRules HashSet loops (idempotent per loop). Watch: getDisabledRules() is insertion-ordered in JS; any CLI/server path printing it must sort or emulate HashSet (F21/F66).
- R6 findLineColumn reachability: only reachable with out-of-range offsets from a rule (no valid rule reaches it); reproduced incl. inner JDK texts (SIOOBE `begin 0, end N, length M`, IOOBE `Index -1 out of bounds for length 1`, RuleMatch IAE wrapped by performCheck).
- Quirks reproduced: 7-arg ctor ignores inputLogging (true); built-in rules get the raw userConfig argument (may be null); setRules(null) clears both lists then NPEs before ruleSetCache.clear(); cancel inside analyzeSentences -> IndexOutOfBoundsException in computeSentenceData; markAsParagraphEnd mutates the sentence tokens in place.
- JS-only deviations without output effect: checkAnalyzedSentence builds its AnnotatedText only when custom match filters exist; SentenceData.wordCount via getNonWhitespaceTokenCount; cleanText skips the U+FEFF split when absent; RuleSet lists are frozen copies (Collections.unmodifiableList view).

JUnit (R7):
- SameRuleGroupFilterTest: testFilter, testNoFilteringIfNotOverlapping, testNoFilteringIfDifferentRulegroups, testOverlaps ported (PatternRule -> plain Rule with the same id).
- JLanguageToolTest: testUserConfig, testCheckString, testCheckStringWithCallbackReturnsTrue/False ported ADAPTED (Demo language xx + PatternRule not ported: en-US + test rule).
- ToolsTest: testSelectRules, testSelectRulesWithEnabledOnlyAndBothRulesAndCategories ported ADAPTED (Demo rules -> test rules with the same ids/categories).
- MultiThreadedJLanguageToolTest#testTextAnalysis ADAPTED (en-US); MorfologikTaggerTest#testPositionWithIgnoredChars ADAPTED (SENT_END reading check -> isSentenceEnd()).
- SKIPPED: RuleSetTest#textHintsAreHonored, #lemmaHintsAreHonored (need PatternRule/PatternTokenBuilder, F25; block tests with a fake token-hint class instead); MultiThreadedJLanguageToolTest#testTwoRulesOnly (needs UppercaseSentenceStartRule/MultipleWhitespaceRule, F16). CheckResultsTest does not exist.

Final: lint clean; npm test 45 files / 302 tests pass; parity X-CHECK-PIPE 41 pass / 0 fail / 22 notPorted; full parity 415 pass / 0 fail / 80 notPorted (F14 baseline 374/0).
Perf: check2 en corpus ~3,300 sentences/s (perf-watch.md).
