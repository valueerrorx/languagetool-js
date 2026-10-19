# F36 review (D-052, one round)
VERDICT: ACCEPT
Lint clean; parity X-STYLE 7 pass / 0 fail / 13 notPorted. Side-by-side: AbstractStatisticStyle/SentenceStyle, StyleRepeatedWord, StyleTooOftenUsedWord, FillerWords, RepeatedWords (+loadWords), AdvancedWordRepeat, Readability, PhraseRepeat, SynonymsData, Tools#isParagraphEnd, castToIntAt: no behavioural divergence found (MARKS_REGEX range probed).
CRITICAL: none
MINOR:
- AbstractStatisticStyleRule/StyleRepeatedWord: `instanceof Integer` mapped to typeof number (a Double config value would pass; harness inputs are int) - convention, not reachable.
- Java IndexOutOfBounds on tokens[nEnd] / tokenList.get(nTok) becomes TypeError in JS (subclass/negative-config only, unreachable).
- AbstractStyleTooOftenUsedWordRule#getWordMap: Map insertion order vs HashMap order; internal use is membership only, but a language subclass/test iterating it must not rely on order.
- castToIntAt NPE text hardcodes "cf[0]" (logged in unreachable.md).
TESTS: castToIntAt.test.js exists (Integer, Boolean/String CCE, empty AIOOBE; no null/bigint case). Adapter style-check.mjs calls real ports (no hardcoded values). No coverage for AdvancedWordRepeatRule, AbstractStatistic*, StyleRepeatedWord, StyleTooOften, FillerWords, RepeatedWords/loadWords until language subclasses land.
RECURRING: none new (REVIEW-NOTES "verified only when class exercised by fixture/test" applies).
IDs: verify now CORE-0417..0422 (paragraph-en/de/fr pass + JUnit 0418/0419). Stay ported: 0259,0260 (en/de fixtures fail on EN-0071/DE-0074), 0262 (en/de subclasses), 0263 (AdvancedWordRepeat unexercised), 0264 (de readability 30/30 np), 0427..0432 (no coverage).
