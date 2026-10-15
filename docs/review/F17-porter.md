# F17 porter checkpoint
Status: done. Ported German/SwissGerman/English/French filterRuleMatches (+German/French mergeMatches) and French adjustFrenchRuleMatch in src/lang/{de,en,fr}/language/. Adapters needed no change.
Parity: 472 pass, 0 fail, 123 not ported (all X-LANG-META filter-* PASS; priority real-rule requests remain NOT PORTED, rule lists come with the rule steps). Tests: tests/lang/FrenchTest.test.js (sentence tokenizer, typography, apostrophe adjust). npm test + lint green.
Not done: postFilters.js languageDependent hook stays pass-through (F35, CORE-0087); getRelevantRules stubs unchanged; logger.info in SwissGerman filter not emitted; German/English/Swiss JUnit tests need rules (none cover filters).
