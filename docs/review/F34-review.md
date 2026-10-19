# F34 review
Status: started 2026-10-18
# F34 review
Status: done 2026-10-19. ACCEPT (minor only). See report.
VERDICT: ACCEPT (lint clean; parity X-FILTERS 62 pass/0 fail/19 notPorted, deferred to F41-F43/F49/F58/F62 per PLAN)
Checked vs Java: AbstractFindSuggestionsFilter, StringComparator/EditDistance, TestHackHelper users, Abstract(DateCheck|DateCheckWithSuggestions|FutureDate|NewYearDate), AbstractAdvancedSynthesizer, AbstractSuppressMisspelled, IsEnglishWord, MultitokenSpellerFilter, PartialPosTag, CheckPostagsInSuggestion: no behavioural divergence found.
MINOR 1 AbstractFindSuggestionsFilter.js:~232 Map cache: Java Guava put(key,null) throws NPE if getSpellingSuggestions returns null; JS caches null then TypeError on .length (similar outcome, different type/text). Eviction by clear() does not change results.
MINOR 2 MultitokenSpellerFilter.js:51 null getMultitokenSpeller -> bare NullPointerException, Java 17 helpful NPE text (Cannot invoke "...MultitokenSpeller.getSuggestions(String, boolean)" because the return value of "org.languagetool.Language.getMultitokenSpeller()" is null) differs; visible for de/pt/nl-less langs only in error output.
MINOR 3 TestHackHelper: only PatternRuleTest/GenericFiltersTest toggle it (finally resets to false, not previous value); never true in server/CLI/oracle (verified by grep). Later ported Java JUnit tests that Java runs with org.junit on stack (language DateCheckFilter tests, JLanguageToolTest date rules) must set it too.
MINOR 4 Calendar.js lacks getDisplayName/LONG/SHORT/add/getActualMaximum/getTime used by de/en/fr DateFilterHelper (F49/F58/F62) - must be added there with probe verification.
TESTS: speller-dependent paths (findsugg-real, suppress-*, multitokenspeller, numberinword-real) have no JS execution until F41-F43; re-run X-FILTERS then.
