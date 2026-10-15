# F13 porter checkpoint
- [x] 1 core: BaseTagger (tag/getAnalyzedTokens/createToken/errors), ManualTagger null/internTags, MorfologikTagger ctors, MorfologikSpeller.getDictionaryWithCaching
- [x] 2 En/Fr taggers (INSTANCE, NPE on null token)
- [x] 3 adapters tag.mjs, manual-tagger.mjs
- [x] 4 tests (EnglishTagger, FrenchTagger, CombiningTagger+MorfologikTagger+ManualTagger; tests/support/TestTools.js, tests/support/tagging/)
- [ ] 5 parity (11 fixtures stale format, see report), lint, full test
- all done except stale fixtures (11 X-TAGGER cases object format, need oracle regen)
