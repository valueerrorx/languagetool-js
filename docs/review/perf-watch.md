# Performance watch list (D-046: warm >= 0.8x Java) — measure vs Java in the perf step

| Step | Component | JS measured | Note |
|---|---|---|---|
| F05 | regex compile / find | 15 µs / 26 µs per pattern/run | |
| F07 | XML scanner | en grammar.xml 8.3 MB in 162 ms | |
| F08 | FSA lookup | ~800k lookups/s (en tagger) | |
| F11 | SRX sentence tokenizer | ~5,500 sentences/s, 620 kchar/s (en corpus) | risk: may dominate check time; compare with Java early |
| F11 | SRX RuleMatcher substring per before-match O(n·m); surrogate-pair texts use interpreter | perf on very long / emoji-heavy texts |
| F12 | word tokenizers (corpus sentences, warm) | en 1.33 M tokens/s (3.4 Mchar/s), fr 0.54 M tokens/s, de 3.5 M tokens/s | en/fr include dictionary lookups for hyphen/apostrophe words |
| F13 | taggers tag(List) (corpus sentences incl. whitespace tokens, warm) | en 0.35 M tokens/s, fr 0.32 M tokens/s | dominated by FSA lookups (several per token); compare with Java in the perf step |
| F15 | JLanguageTool.check2 (en corpus 30 kchar / 269 sentences, 15 synthetic rules, no-op disambiguator/chunker, warm) | ~3,300 sentences/s (80 ms per text); analyzeSentences alone ~5,100 sentences/s (53 ms) | word tokenize + tag dominate; real disambiguator/rules not included |
| F18 | language detection: cleanAndShortenText + DefaultLanguageIdentifier.detectLanguage, 1000-char de/en corpus texts (warm) | 5,600 detections/s (0.18 ms each); Java 17 same texts 3,000/s (0.33 ms) -> 1.86x; init (29 profiles) ~125 ms once per process | detector/text factory shared by all instances (immutable) |
| F21 | CLI startup: `node bin/lt-cli.mjs -l en-US -eo -e ENGLISH_WORD_REPEAT_RULE small.txt` (wall, 3 runs) | ~265 ms | Java 17 `languagetool-commandline.jar` same args ~3.1 s (full rule set, JVM start); not like-for-like until the full rule sets are ported |
| F22 | GermanTagger/SwissGermanTagger tag(List) (de corpus 315 sentences / 12,636 tokens incl. whitespace, warm best of 5) | de-DE 112 k tokens/s, de-CH 113 k tokens/s; init (spelling.txt expansion via synthesizer + compound splitter) ~1.7 s once | Java 17 same tokens: 129 k tokens/s (0.87x), init ~1.4 s; unknown words dominate (compound splitter + several FSA lookups) |
| F22 | GermanTagger | 112k tokens/s de corpus vs Java 129k (0.87x); first use 1.7 s vs 1.4 s | ok (>=0.8x), watch startup |
| F25a | Proxy-based unmodifiable views (src/lib/java/collections/Collections.js) on PatternToken getters / StringMatcher.getPossibleValues | measure in F27 matcher hot path; replace with frozen copies if slow |
| F25 | Language#getPatternRules cold (first call in fresh process, XML parse + rule build), JS vs Java 17 | de-DE 5274 rules 1.26 s (Java 0.97 s), en-US 6187 rules 1.55 s (Java 1.38 s), fr 7017 rules 2.31 s (Java 3.06 s) | rule counts identical; ok (JS 0.4x..1.3x of Java time) |
| F27 | AbstractPatternRulePerformer sequence matcher, X-SEQMATCH cases (analysis + rules cached, warm per request) | de-00 314 (rule,text) runs 106 ms (Java 117), en-00 336 runs 44 ms (Java 79), fr-00 348 runs 57 ms (Java 86); cold incl. rule loading/tagger init de 3.0 s (Java 3.4), en 1.4 s (2.7), fr 1.9 s (3.7) | JS <= Java; Proxy-based unmodifiable views (F25a watch item) not a visible cost here |
