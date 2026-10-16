# F25a review\nStatus: started
## Checked
- RuleSet.hinted: ok vs Java.
- Substrings: ok.
- StringMatcher: parser ok; guavaCapacity uses old Guava formula `(int)(n/0.75f+1f)`, Guava 33.5 uses `(int)Math.ceil(n/0.75)` (n=3 -> 4 vs 5 -> table 4 vs 8) -> HashSet order of case-insensitive getPossibleValues differs; consumers (hints, GermanChunker formHints) look order-free -> MINOR. Sequence fast path silently replaced by regex (F26 note) -> MINOR.
- JavaHashSet/JavaHashMap.remove: ok (tree bins not modelled, pre-existing).
- guavaCapacity divergence confirmed: Java Sets.newHashSet(sorted) for `der|die|eine` (ci) -> [der, eine, die], JS -> [der, die, eine]. Feeds TokenHint.lowerCaseValues order/hashCode -> tokenHints tie order -> RuleSet firstHint. API-invisible (hints are necessary conditions) -> MINOR.
- PatternToken: ok; PosToken(String,boolean,StringMatcher) overload missing ("see withMatcher" dangling) -> MINOR (needed by XMLRuleHandler F25b).
- Match, CaseConversionHelper, AbstractPatternRule, AbstractTokenBasedRule: ok.
- PatternRule, RegexPatternRule, builders, PatternRuleId, RegexRuleFilter: ok.
- RuleFilter.getPosition/isMatchAtSentenceStart: raw tokens[i] at i==length -> TypeError instead of Java AIOOBE (RECURRING REVIEW-NOTES bounds) -> MINOR; CCE message hand-built w/o module suffix -> MINOR.
- Escalated guavaCapacity to CRITICAL: Java probe (LT jars) PatternRule [tokenRegex('abc|abd|abe'), tokenRegex('der|die|eine')] tokenHints = 0[abe, abd, abc] 1[der, eine, die]; JS = 1[der, die, eine] 0[abd, abc, abe] -> different firstHint -> RuleSet.textHinted(...).rulesForSentence(sentence "der") Java [] vs JS [rule] (ruleset-hints oracle op output). API matches unaffected (canBeIgnoredFor).
- Tests: StringMatcherTest/PatternTokenTest/RuleSetTest faithful; MatchTest/RegexPatternRuleTest skipped with step reasons. npm test 499/31 skip, lint clean.
- Stray untracked oracle/cases/X-CLI-BASIC.bak/ -> MINOR.

VERDICT: REJECT (1 CRITICAL: guavaCapacity formula vs Guava 33.5)

## Runde 2
- 1 guavaCapacity: now `n<3 ? n+1 : ceil(n/0.75)` = Guava 33.5 Maps.capacity; ruleset-hints-order fixture passes; tests in PatternModelTest. FIXED.
- 2 tryCreateSequenceMatcher stub: PLAN.md:49 lists "StringMatcher sequence/postag fast paths (F26)" -> note exists. But comment claim "regex path matches the same strings" is FALSE. Java probe (LT jars, JDK 17, ci=true): `a+[σ]`/"aς" seq=false regex=true; `a+[μ]`/"aµ" false/true; `x.*[σ]b`/"xςb" false/true; `a+[\w]`/"aK" seq=true regex=false. JS returns regex result in all 4 (true,true,true,false). Cause: Java class predicate folds via cp/lower(cp)/upper(cp) vs java.util.regex SingleU lower(upper(cp)); extras (\w,\d,\s) case-folded in class. Not reachable today (PatternRule#match F27 notPorted, no other StringMatcher consumer) -> MINOR now; F26 must port RunSequenceMatcher verbatim, comment must be corrected, fixtures with these 4 cases.
- 3 PosToken.withMatcher: matches Java package-private ctor. FIXED.
- 4 RuleFilter arrayGet + CCE text with "unnamed module of loader 'app'": matches Java. FIXED.
- 5 Collections.js: probed unmodifiableList/emptyList/asList/unmodifiableSet: isArray/JSON/map/spread/concat ok, writes through for asList set, UOE on mutators. Residual unreachable deviations: emptyList().sort() throws UOE (Java EmptyList.sort no-op); asList index set >= length throws UOE (Java AIOOBE from set(i)); proxy.constructor is a bound fn (!== Array). RuleSet.js still uses own Object.freeze copy instead of Collections.unmodifiableList (TypeError instead of UOE on mutation). X-PROBE-COLLECTIONS golden (Arrays.asList/unmodifiable) exists but adapter stays notPorted -> Collections.js has no fixture coverage.
- npm test 503 pass/31 skip, lint clean, parity X-RULELOAD 4 pass/0 fail/274 not ported.

VERDICT Runde 2: ACCEPT (no reachable divergence; MINORs above, F26 blocker recorded)
