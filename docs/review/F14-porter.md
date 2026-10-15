# F14 porter checkpoint (rule model)

Sub-steps (mark [x] when done), files in src/core/rules/model/ and src/core/:
- [x] 1 enums/small: Tag.js (Tag, ToneTag), ITSIssueType.js, Category.js (Category, CategoryId, CategoryIds, Categories), Examples.js, RuleOption.js
- [x] 2 SuggestedReplacement.js, RuleMatch.js, SentenceRange.js, CheckResults.js, DetectedLanguage.js
- [x] 3 Rule.js, TextLevelRule.js
- [x] 4 UserConfig.js (+LinguServices), GlobalConfig.js (extend), Premium.js
- [x] 5 tests tests/core/RuleMatchTest + model tests; lint, npm test, parity
Notes: MatchPosition reused from src/core/text/SmallTypes.js. RuleWithMaxFilter not ported (needs AbstractPatternRule; belongs to CORE-0186).
Done: lint, npm test (273 pass), parity 374 pass/0 fail.
