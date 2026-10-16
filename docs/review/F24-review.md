# F24 review
Status: started
- [x] AvsAnRule/AvsAnData: match/suggestAorAn/getCorrectDeterminerFor/isVowel/loadWords side-by-side: equal (Pattern.split + equalsIgnoreCase(null) checked later)
- [x] ObjectOpenHashSet: add/contains/rehash/trim/iterator vs javap 8.5.14: equal; no remove (unused); ctor arg checks missing (unreachable)
- [x] ManualSynthesizer/TaggedWord#hashCode: equal (order via JavaHashMap)
- [x] Base/German/French/EnglishSynthesizer: dispatch synthesize2/3 equal to Java virtual calls.
  - FINDING: EnglishSynthesizer.js:70/74 substring(0, indexOf-1) with posTag "+INDT"/"+DT" exactly (regexp=true): Java SIOOBE, JS "" (check helper)
- [x] Soros: line-by-line equal
- [x] tests: AvsAnRuleTest/En/Fr/De/ManualSynthesizerTest ported; 4 AvsAn sentences skipped with PLAN F48 note
- running npm test / lint
- npm test 93 files, 476 pass / 10 skip; lint clean
## Verdict: ACCEPT
MINOR:
1. src/lang/en/synthesis/EnglishSynthesizer.js:70,74 plain substring(0, indexOf-1) vs Java EnglishSynthesizer.java:111,115: posTag exactly "+INDT"/"+DT" with posTagRegExp=true -> Java SIOOBE "begin 0, end -1, length 5", JS "" -> []. Shipped en grammar uses +DT/+INDT only non-regexp -> unreachable; use strings.js substring or log in unreachable.md. RECURRING (substring bounds, F23 wordsplitter).
2. src/core/tagging/synthesis/ManualSynthesizer.js:41 "Too many lemmas" text misses closing "]" of List#toString (Java ManualSynthesizer.java "... hash " + value + ", the storage"). Unreachable (>255 per hash).
3. src/lib/java/collections/ObjectOpenHashSet.js:25 generic Error instead of IllegalArgumentException; ctor arg checks (f, expected) missing; no remove(). Unused/unreachable.
4. tests/lang/en/AvsAnRuleTest.test.js:101 skip reason names F32/F45, PLAN F48 note says F45 only.
TESTS: ObjectOpenHashSet order test self-derived (no Java values); order is covered only via X-SYNTH manual cases.
