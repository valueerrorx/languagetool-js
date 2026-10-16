# F22 porter checkpoint (GermanTagger, SwissGermanTagger, German token types)
- [x] 1 read docs + Java (GermanTagger, SwissGermanTagger, token types, compound splitter usage)
  - deps: GermanTagger needs GermanCompoundTokenizer.getStrictInstance() (F23, jwordsplitter) for every unknown word and
    GermanSynthesizer.synthesizeForPosTags (F24) for prefix_verb expansion -> pulled forward minimally:
    src/lib/wordsplitter (jwordsplitter 4.7 from sources jar, verified = bytecode via javac --release 8 + javap diff;
    only try-with-resources shape differs), GermanCompoundTokenizer (strict/non-strict), BaseSynthesizer/ManualSynthesizer
    lookup + synthesizeForPosTags only (synthesize()/Soros stay F24), CachingWordListLoader.
- [x] 2 port tagger classes into src/ (lib/wordsplitter, de/tokenizers/GermanCompoundTokenizer, core/tagging/synthesis, de/synthesis, de/tagging/*, StringUtils+RegExUtils helpers)
- [x] 3 hook into German language classes, remove notPorted GermanTagger#tag
- [x] 4 adapters tag/manual-tagger for de; parity X-TAGGER-DE
- [x] 5 enable de-DE/AT/CH in other adapters; re-run X-CHECK-PIPE, X-RULES-CORE, X-JSON, X-WORDTOK, X-SRX, X-TEXT
  - adapters: _check-pipe-common languageFor de guard removed; json-serialize portLater 'German tagger (F32)' satisfied; check-rules de rule list (F16 classes) added
  - results: X-JSON 27/27 pass (de incl.), X-WORDTOK/X-SRX/X-TEXT unchanged green; X-CHECK-PIPE 21 de cases + X-RULES-CORE de cases notPorted: GermanChunker (F51, post-disambiguation chunker) pending; experiment with null post chunker: all X-CHECK-PIPE de pass, X-RULES-CORE 8 de non-cleanOn pass (WordRepeatRule-de-DE needs ANTI_PATTERNS F25/F26; cleanOn adapter guard stale since F21)
- [x] 6 tests (GermanTaggerTest, SwissGermanTaggerTest, GermanCompoundTokenizerTest, ManualSynthesizerTest, GermanSynthesizerTest (F24 parts skipped), StringUtilsCommons; GermanRulesTest testRule_commaWhitespace un-skipped, rest skipped with step reasons): GermanTaggerTest, SwissGermanTaggerTest, un-skip GermanRulesTest
- [x] 7 perf-watch (112k vs Java 129k tokens/s), lint green, npm test 456 pass/11 skip, full parity 709 pass 0 fail 17 skip 127 notPorted
  - X-TAGGER-DE: 50 pass, 1 notPorted (edge-de-DE-x-simple-language, DEV-006 adapter filter); DictionaryLookup#lookup null word NPE text added
- Status: DONE (not committed). Open: X-CHECK-PIPE/X-RULES-CORE de need GermanChunker (F51); X-SRV-BASIC isDeLang portLater narrowing + regen (oracle task); F23 still owns DE-0008 (German#get*CompoundSplitter) and wordsplitter fixtures; F24 owns synthesize()/Soros and ManualSynthesizer possibleTags order (fastutil ObjectOpenHashSet).
