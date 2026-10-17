# F25b review
Status: started
## XMLRuleHandler.js vs XMLRuleHandler.java: checked, branch-equal.
- getKnownPostagsSupplier: Java catches IOException from getAllPossibleTags; JS no catch (unreachable: base returns empty list, only ca overrides).
## StringMatcher.createWithKnownValues
- MINOR: tryCreatePostagTemplateMatcher stub returns null; Java returns a template matcher (getPossibleValues()==null, length>250 -> false) for literal/./[..]/.* alternations (e.g. "NN|VB"). JS falls to create() whose possibleValues may be non-null -> extra posHints (calcPosHints). Not observable until F27 matching; PLAN F26 must mention posHints.
## PatternRuleHandler.js: start/endElement/createRules/prepareRule/characters checked branch by branch, equal (aliasing of suggestionMatches backup reproduced).
## PatternRuleLoader.js: equal except non-Throwable JS errors (TypeError where Java NPE) not wrapped in IOException.
## RuleFilterCreator/RegexRuleFilterCreator: equal; newInstance lacks InvocationTargetException wrapping (cause differs if ctor throws; unreachable now).
## UnifierConfiguration: Java ConcurrentHashMap rejects null key -> <unification> without feature attr: Java NPE, JS accepts. CHECKING.
## Probe (scratchpad probe.mjs, live harness vs adapter, 40 inline XMLs): 31 SAME, DIFF:
- CRITICAL uniNoFeature: <unification> w/o feature -> Java NPE (ConcurrentHashMap null key) wrapped IOException; JS loads.
- CRITICAL URL.js: jmod: accepted by Java, JS unknown protocol; mailto: (empty) Java "No email address", JS ok; mailto ref dropped in Java; jar:foo!/x Java invalid url, JS ok; é:foo isValidProtocol uses Character.isLetter; IAE causes missing (port/authority errors).
- inventory CORE-0157 marked ported but RuleFilterEvaluator#getResolvedArguments absent.
- adapter patternRules: activateDefaults fakes JLanguageTool when ctor notPorted (REVIEW-NOTES: throw notPorted).
## Other checks
- PatternRuleXmlCreator: equal for valid ids; xpathLiteral cause class differs (RuntimeException vs XPathExpressionException), comment cites unreachable.md but no entry.
- DisambiguationPatternRule model: equal. DemoLanguage: ok, resources identical to Java BUT tests/resources/ gitignored (.gitignore:9 resources/) -> tests break on clean checkout.
- Tests ported: PatternRuleLoaderTest 4+1 ignore, XmlCreator 6, Handler 1: complete.
- npm test: 1 fail (SwissGermanTaggerTest timeout 5s in full run, passes alone); lint clean; parity X-RULELOAD 278/0.
## VERDICT: REJECT
CRITICAL: UnifierConfiguration null feature NPE; URL.js handler/protocol divergences; tests/resources gitignored; CORE-0157 falsely ported.
## Runde 2
Status: started
- tests 525/32skip, lint clean, parity X-RULELOAD 270/0/13 notPorted
- ConcurrentHashMap port checked vs JDK17 putVal/transfer/tryPresize/addCount: equal; null-key NPE fixture-verified (inline-unification)
- StringMatcher template matcher: branch-equal with Java 1107-1300; hybrid stub null documented PLAN F26 (note: hybrid also splits escaped '|', matching differs not only posHints)
- RuleFilterCreator/Regex: equal; ctor TypeError -> NPE without ITE layer (JS-bug only). filterRegistry: whitelisted JDK/LT class stubs; other existing classes (java.util.HashMap etc) -> 'Could not find filter class' instead of Java ctor msg, undocumented -> MINOR
- probe2 (live harness, 60 inputs): URL 15/15 SAME, XML errors 17/17 SAME, filter classes: 9 DIFF (java.util.HashMap, java.lang.Math, StringBuilder, en.AvsAnRule, Language, PatternToken, [Ljava.lang.String;, Map$Entry; Java ctor-count/args msg, JS 'Could not find filter class')
- CRITICAL p3: postag_regexp postag="N\|B": Java IOException(PatternSyntaxException 'Unexpected internal error near index 2 N\') from HybridPostagMatcher via PosToken posUnknown=matches(UNKNOWN) at load; JS loads (hybrid stub null). PLAN claims only posHints differ -> false
- Fix check items 1-8: #1 UnifierConfiguration NPE fixed (fixture); #2 URL.js rewritten, fixture-backed (tests/lib/java/fixtures/url-jdk17.json) + probe 15/15 SAME; #3 .gitignore anchored, tests/resources + src/core/resources now visible (src/core/resources: 7 plausible files, nothing foreign; must be committed, HEAD is broken without them); #4 CORE-0157 moved to F30; #5 adapter no fake (activateDefaults -> real ctor, notPorted); #6 XmlCreator XPathExpressionException + unreachable.md entries; #7 PatternRuleLoader TypeError->NPE wrapping; #8 ITE/InstantiationException in newInstance.
- MINOR: XMLRuleHandler.js:586 own listGet method and RegexPatternRule.js:20 local listGet duplicate src/lib/java/arrays.js listGet.
## Runde 2 VERDICT: REJECT
CRITICAL: StringMatcher.js tryCreateHybridPostagMatcher stub (null) vs StringMatcher.java:991-1100 - load-time divergence via PatternToken.PosToken posUnknown=matches("UNKNOWN") - postag_regexp postag="N\|B": Java IOException(PatternSyntaxException), JS loads; also "A\|UNKNOWN" posUnknown true in Java - port hybrid matcher (universe empty -> Pattern fallback), fix PLAN F26 claim, add inline fixture.
MINOR: filterRegistry.js class stubs are a fixture whitelist; any other existing class (java.util.HashMap, org.languagetool.rules.en.AvsAnRule, PatternToken, Map$Entry, arrays) -> 'Could not find filter class' instead of Java ctor message - document in DEVIATIONS/unreachable.md.
Status: done
## Runde 3
- StringMatcher.js tryCreateHybridPostagMatcher/isPlainLiteral/hybridPostagMatcher/enumeratedSetMatcher/intersectWithUniverse vs StringMatcher.java 991-1100,1342-1381: branch-equal (paren reject, null split, literal/template/unresolved partition, empty -> null, getPossibleValues null, MAX_MATCH_LENGTH, lazy resolve once, universe empty -> Pattern.compile fallback with same flags, PatternSyntaxException on first matches propagates as in Java; >30 cutoff order-independent).
- Universe: XMLRuleHandler supplier memoized, new Set(list); Language#getAllPossibleTags base [] = Java emptyList; only Catalan overrides (not ported) -> non-empty path unreachable for de/en/fr.
- listGet: XMLRuleHandler.js:3, RegexPatternRule.js:4 import from arrays.js, local copies gone. PLAN F26 note true.
- probe2 rerun: 40 SAME, p3 now SAME; 9 filter-class DIFFs documented in unreachable.md:25.
- Coverage: inline-postag-hybrid 190 ops over en-US/en-GB/de-DE/fr incl. escapes, unresolved quantifiers, invalid regex -> sufficient for the reachable paths.
- npm test 525/32skip, lint clean, parity X-RULELOAD 271/0/13 notPorted.
- MINOR: StringMatcher.js:1 header still says "postag fast paths come with F26" (outdated); StringMatcher.js:218 comment "regex path matches the same strings" false (PLAN F26 acknowledges).
## Runde 3 VERDICT: ACCEPT
Status: done
