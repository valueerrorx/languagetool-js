# F18 porter checkpoint
Status: DONE 2026-10-16 (not committed). R5 stubs: SimpleLanguageIdentifier, LanguageAnnotator (notPorted). FragmentWithLanguage ported.
- [x] 1 read Java + optimaize sources (sources jar fetched to ~/.m2, sha1 of binary == distribution libs/language-detector.jar)
- [x] 2 resources.mjs: distribution common_words.txt/*.profile + resources/ltjs/detection-languages.json (scripts/lib/language-descriptors.mjs parses Java sources, order from merged language-module.properties)
- [x] 3 src/lib/java/Random.js (+test) + src/lib/optimaize port (profile HashSet order verified vs Java)
- [x] 4 identifier classes (src/core/language/identifier/), src/server/detectLanguageOfString.js (thin)
- [x] 5 adapters + parity: X-LANGDETECT 13/13 PASS, also strict deep-equal (no dev006 leniency) 72/72 requests
- [x] 6 JUnit ports (UnicodeBasedLangIdentifierTest, CommonWordsTest, DefaultLanguageIdentifierTest non-ignored, LanguageIdentifierServiceTest default part), perf (perf-watch F18: 5.6k/s vs Java 3.0k/s), lint + npm test green, full parity 485 pass 0 fail
Notes: profile order = HashSet<LanguageProfile> iteration (hash = 31*LdLocale.hash + ngrams map hash) -> must be reproduced.
Order-free notes: CommonWordsDetector result HashMap (only the oracle op reads it, sorted); RemoveMinorityScriptsTextFilter HashMap/HashSet (max + membership); NgramFrequencyData word map (lookup); scores HashMap (<= 1 entry in fallback mode).
Comparator note: oracle/comparators jsonl routes fixtures containing "Supported language codes are" (server, service, prefs) to compareDev006 (lenient); a strict deep-equal run of all 72 X-LANGDETECT requests also passes (scratch script).
