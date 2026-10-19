# F36 porter checkpoint
Status: DONE (pending lead review). IDs CORE-0259,0260,0262..0264,0417..0422,0427..0432 -> inventory `ported`.
- New: src/core/rules/{LongSentenceRule,LongParagraphRule,EmptyLineRule,PunctuationMarkAtParagraphEnd(2),WhiteSpaceAtBeginOfParagraph,WhiteSpaceBeforeParagraphEnd,ParagraphRepeatBeginningRule,WordRepeatBeginningRule,PhraseRepeatRule,AdvancedWordRepeatRule,ReadabilityRule,AbstractStyleRepeatedWordRule,AbstractStyleTooOftenUsedWordRule,AbstractStatisticStyleRule,AbstractStatisticSentenceStyleRule,AbstractFillerWordsRule,AbstractRepeatedWordsRule,SynonymsData}.js; Tools#isParagraphEnd; casts#castToIntAt (ClassCastException / ArrayIndexOutOfBounds for `(int) cf[0]`).
- JUnit ports: LongSentenceRuleTest, LongParagraphRuleTest, PunctuationMarkAtParagraphEnd(2)Test (Demo language via tests/support/DemoLanguage.js; en-US sentence tokenizer differs). Extra: tests/lib/java/castToIntAt.test.js.
- Adapter oracle/adapters/style-check.mjs: no Language#getRelevantRules in JS (F17) -> rebuilds the native F36 rules of en/de/fr in Java list order; extras via class map. No-op disambiguator/chunker (+ German post-disambiguation chunker) as in X-CHECK-RULES.
- X-STYLE: 7 pass (longparagraph-fr, longsentence-fr, paragraph x3, readability-en, repeat-fr), 13 notPorted (parts need EN-0071/DE-0074 LongSentenceRule, EN/DE WordRepeatBeginning, GermanReadabilityRule, *RepeatedWordsRule, StyleTooOftenUsed*, German statistic/StyleRepeated rules, pl/ru). No 0-match TOO_OFTEN rule runtime: those subclasses are not ported.
- Abstract classes 0427..0432 and AdvancedWordRepeatRule have no fixture/JUnit coverage until their language subclasses are ported.
## Quirks reproduced
- Config of wrong type -> ClassCastException (LongSentence/LongParagraph/Readability/TooOften/StatisticSentence), empty array -> ArrayIndexOutOfBounds; Statistic*/StyleRepeated ignore wrong types (instanceof checks).
- LongParagraphRule int overflow `maxWords + 5` / `maxWords - 1` kept with `| 0`.
- LongParagraphRule/AbstractFillerWordsRule ignore their defaultActive parameter (always default off); ReadabilityRule final condition precedence `a && b || c`.
- PunctuationMarkAtParagraphEnd: `ftp` branch `continue` skips lastPara update; precedence `(len>30 && http) || ftp`.
- JS name clashes renamed: AbstractStatisticStyleRule field excludeDirectSpeech -> excludeDirectSpeechFlag; AbstractFillerWordsRule private minPercent -> fillerMinPercent.
