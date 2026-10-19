# F34 porter checkpoint
Status: started. Done classes are listed below after each is ported.
- DONE src/lib/java/Calendar.js (+tests/lib/java/Calendar.test.js): probe-verified vs JDK17 8762 cases (cutover 1582, leap, non-lenient messages, int64 overflow, week data; getTimeInMillis Number loses precision beyond 2^53; far-past LMT offsets differ by minutes from JDK, unreachable). clock.js now lazy.
- DONE (not yet registered/tested): TestHackHelper, AbstractDateCheckFilter, AbstractDateCheckWithSuggestionsFilter, AbstractFutureDateFilter, AbstractNewYearDateFilter, YMDDateHelper, DateRangeChecker, ShortenedYearRangeChecker in src/core/rules/
- DONE (written, untested): PartialPosTagFilter, EditDistance(pulled fwd from CORE-0238), AbstractFindSuggestionsFilter, AbstractAdvancedSynthesizerFilter, AbstractSuppressMisspelledSuggestionsFilter, AdaptSuggestions, CheckPostagsInSuggestion, ConvertToSentenceCase, UnderlineSpaces, WhitespaceCheck, AddCommas, SuppressIfAnyRuleMatches, IsEnglishWord, filterCasts helper
- registered all in filterRegistry; parity X-FILTERS first run 56 pass 6 fail 19 notPorted; fixing
- Calendar compareTo via getMillisOf(lenient clone) fixed date-future; X-FILTERS now 62 pass 0 fail 19 notPorted; analysing remaining notPorted
- DONE: tests (NewLineFilterTest, GenericFiltersTest, Calendar.test), DemoPartialPosTagFilter stand-in -> real subclass, DemoPatternRuleTest#testRules un-skipped, inventory F34 ids ported + CORE-0350/0351 verified, PLAN F34 [x] + F42 note.
- Remaining: full npm run parity, npm test, lint; then report. Quirks: AbstractDateCheckFilter getDate(year) nullable; Calendar#after uses lenient clone (no IAE); AbstractFindSuggestionsFilter cache; AbstractTextToNumberFilter float math.
