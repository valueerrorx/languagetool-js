# F16 porter checkpoint (core basic rules)
- [x] 1 core rules: CommaWhitespace, DoublePunctuation, SymbolLocator/UnsyncStack/GenericUnpairedBrackets, GenericUnpairedQuotes, UppercaseSentenceStart, WordRepeat, MultipleWhitespace, SentenceWhitespace, WhitespaceBeforePunctuation
- [ ] 2 lang subclasses (de/en/fr as selected by fixtures)
- [ ] 3 adapter oracle/adapters/check-rules.mjs
- [ ] 4 tests
- [ ] 5 lint, npm test, parity
Notes: Language.getRelevantRules stays a stub (F17); adapter instantiates rules directly and addRule()s them.
Helpers added: src/lib/java/StringUtils.js (isNumeric, isNumericSpace, equalsAny), src/lib/java/URL.js (URL, MalformedURLException), Tools.getUrl, MessageFormat.format static.
Core rule files in src/core/rules/ done (untested).
- [x] 2 lang subclasses (en: EnglishUnpairedBrackets/Quotes/WordRepeat; de: GermanCommaWhitespace/DoublePunctuation/UnpairedBrackets/UnpairedQuotes/WordRepeat (ANTI_PATTERNS lazy notPorted), de SentenceWhitespaceRule)
- [x] 3 adapter check-rules.mjs: parity X-RULES-CORE 18 pass / 0 fail / 36 notPorted (de-DE, cleanOn)
- [x] 4 tests: tests/core/rules/* (core 10 classes, en 5, de 7 skipped: German tagger F22 / de rule list F17), tests/lib/java/rulesHelpers.test.js; en quotes testRule skipped + 2 single asserts pending (need EnglishHybridDisambiguator F32/F45)
- [x] 5 lint clean; npm test 326 pass / 8 skipped; parity full 433 pass / 0 fail / 116 notPorted (X-RULES-CORE 18 pass / 36 notPorted: de-DE + cleanOn)
Quirks reproduced: GenericUnpairedBracketsRule fall-through else chain, SentenceWhitespaceRule/UppercaseSentenceStartRule NBSP trim, WhitespaceBeforePunctuationRule charAt(0) SIOOBE on empty token, EnglishWordRepeatRule duplicate branches (heh, beep, walla) kept in list.
Open: Language#getRelevantRules still stubs (F17); rule lists mirrored in oracle/adapters/check-rules.mjs; GermanWordRepeatRule.ANTI_PATTERNS lazy notPorted.
