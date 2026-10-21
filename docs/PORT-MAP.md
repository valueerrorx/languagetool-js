# Port map (functional, D-044; wave 1)

Java package/feature -> JS module, plus library decisions. Per-ID ownership lives in PLAN.md (checked by `docs/tools/plan_check.py`); per-class tables were dropped with D-044. Java paths: `core:` = `languagetool-core/src/main/java/org/languagetool/`, `<lang>:` = `languagetool-language-modules/<lang>/src/main/java/org/languagetool/`.

## Feature -> module
| Java package / feature | JS module | steps |
|---|---|---|
| JDK semantics (String, Character, regex, numbers, formats, Scanner, Properties, Random, StrictMath) | `src/lib/java/` | F01, F02, F05, F06 |
| resources, `broker/*`, `ResourceBundleTools`, `JLanguageTool.VERSION/BUILD_DATE` | `src/core/resources/`, `src/core/LtBuildInfo.js` | F06 |
| XML loading (`rules/patterns/XMLRuleHandler`, `RuleEntityResolver`, `tools/XMLValidator`) | `src/core/resources/xml.js` (sax) | F07 |
| morfologik fsa/stemming (`tagging/MorfologikTagger`, `synthesis/*` lookups) | `src/lib/fsa/{FSA,CFSA2,FSA5,encoders,DictionaryLookup,metadata}.js` | F08 |
| `markup/*`, `AnalyzedToken*`, `AnalyzedSentence`, `tools/StringTools`, `tools/ContextTools` | `src/core/text/` | F09 |
| `Language`, `Languages`, `language/*`, `noop/*`, `LanguageBuilder`, dynamic languages | `src/core/Language.js`, `src/core/Languages.js`, `src/core/language/` | F10 |
| `tokenizers/SRXSentenceTokenizer`, `SimpleSentenceTokenizer`, net.loomchild segment | `src/lib/srx/`, `src/core/text/tokenizers/` | F11 |
| `tokenizers/WordTokenizer`, `<lang>:tokenizers/*` | `src/core/text/tokenizers/`, `src/lang/<lang>/tokenizers/` | F12 |
| `tagging/*` (BaseTagger, ManualTagger, CombiningTagger), `<lang>:tagging/*Tagger` | `src/core/tagging/`, `src/lang/<lang>/tagging/` | F13, F22 |
| `rules/Rule`, `RuleMatch`, `Category*`, `ITSIssueType`, `Tag`, `RuleOption`, `*Example`, `TextLevelRule`, `UserConfig`, `GlobalConfig`, `Premium` | `src/core/rules/model/` | F14 |
| `JLanguageTool`, `MultiThreadedJLanguageTool`, `CheckResults`, `ResultCache`, `RuleMatchFilter`s, `SentenceRange` | `src/core/JLanguageTool.js`, `src/core/check/` | F15, F35 |
| core Java rules (`rules/*Rule.java`, abstract rules) | `src/core/rules/` | F16, F36, F37, F38 |
| `<lang>:<Language>.java` and variants | `src/lang/<lang>/language/` | F17 |
| `language/identifier/*` + optimaize | `src/core/langid/`, `src/lib/langdetect/` | F18 |
| `tools/RuleMatchesAsJsonSerializer`, `tools/Tools` | `src/core/RuleMatchesAsJsonSerializer.js`, `src/core/Tools.js` | F19, F40 |
| `server/*` | `src/server/` (`app.js`, `HTTPServerConfig.js`, `ApiV2.js`, `TextChecker.js`, `RequestLimiter.js`, `UserLimits.js`, `worker/`) | F20, F66-F70 |
| `commandline/*` | `src/cli/` (`Main.js`, `CommandLineParser.js`, `CommandLineTools.js`) | F21, F64, F65 |
| jwordsplitter, `<de>:tokenizers/GermanCompoundTokenizer` | `src/lib/wordsplitter/`, `src/lang/de/tokenizers/` | F23 |
| `synthesis/*`, Soros | `src/core/tagging/synthesis/`, `src/lib/soros/`, `src/lang/<lang>/synthesis/` | F24 |
| `rules/patterns/*` (loader, PatternToken, StringMatcher, PatternRuleMatcher, Unifier, Match, RuleSet, RegexPatternRule, transformers) | `src/core/patterns/` | F25-F30 |
| core test-jar (`TestTools`, `PatternRuleTest`) | `tests/support/` | F31 |
| `tagging/disambiguation/*`, `chunking/*`, openregex | `src/core/disambiguation/`, `src/lib/openregex/` | F32, F33, F51 |
| `rules/*Filter.java`, `rules/patterns/*Filter` | `src/core/rules/filters/` (registered by FQCN) | F34 |
| `bitext/*`, `rules/bitext/*`, `rules/patterns/bitext/*`, false friends | `src/core/bitext/` | F39 |
| `rules/spelling/morfologik/*`, morfologik speller | `src/core/spelling/morfologik/`, `src/lib/fsa/Speller.js` | F41, F42 |
| `rules/spelling/*` (SpellingCheckRule, multitoken, symspell, VagueSpellChecker) | `src/core/spelling/` | F42 |
| `rules/spelling/hunspell/*`, dumonts hunspell | `src/core/spelling/hunspell/`, `src/lib/hunspell/` | F43 |
| opennlp-tools, `<en>:chunking/*` | `src/lib/opennlp/`, `src/lang/en/chunking/` | F44, F45 |
| `<lang>:rules/**`, `<lang>:tagging/disambiguation/**` | `src/lang/<lang>/rules/`, `src/lang/<lang>/disambiguation/` | F45-F63 |
| logging (slf4j calls) | `src/lib/log.js` | F71 |

## Library table
| Java dependency | JS solution | why equal (or reason for own implementation) |
|---|---|---|
| java.util.regex (JDK 17) | own translator `src/lib/java/regex/` -> V8 RegExp `v` flag | no npm library speaks the Java dialect; V8 engine gives the performance; X-REGEX corpus proves equality |
| JAXP SAX (Xerces) | `sax` 1.6.x (strict) + DOCTYPE entity pre-scan | event order, text, attributes identical for the well-formed LT files; entity values are plain text; rule lists compared with Java (F07/F25) |
| morfologik-fsa/-stemming/-speller 2.2.0 | own `src/lib/fsa/` | no npm reader for CFSA2/FSA5; lookup order and speller candidate order depend on arc order and HMatrix traversal (fixtures per dict) |
| dumonts hunspell 2.1.2 (libhunspell 1.7.x) | Hunspell 1.7.x as WASM: `hunspell-wasm` if its version/results match, else own emscripten build of the matching tag; `nspell` only if 100 % equal | same C code -> same `spell`/`suggest` |
| net.loomchild segment 2.0.4 | own `src/lib/srx/` | no npm SRX engine with loomchild semantics; sentence-boundary fixtures |
| hankcs AhoCorasickDoubleArrayTrie 1.2.2 | own small trie `src/lib/ahocorasick.js` | hit order (end position, then longest-first output chain) must equal hankcs; npm libraries report other orders |
| jwordsplitter 4.7 | own `src/lib/wordsplitter/` | algorithm with its data files; split fixtures |
| openregex 1.1.1 | own subset `src/lib/openregex/` (D-012) | only GermanChunker patterns; chunk fixtures |
| optimaize language-detector 0.6 | own `src/lib/langdetect/` | franc/eld/tinyld/cld3/langdetect use other models -> other results; port with original profiles and seeded Random |
| opennlp-tools 1.9.5 | own inference subset `src/lib/opennlp/` (D-014) | npm `opennlp` wraps a JVM; bit-exact probabilities with StrictMath |
| Jackson 2.18 | `JSON.stringify` / `JSON.parse` | D-044: content-equal JSON; float fields emitted via `javaFloatToString` value; `data` param: Jackson accepts trailing content after the root value (SEMANTICS S6) |
| slf4j + logback | `src/lib/log.js` (console) | log format not part of parity (open question 1) |
| commons-lang3 StringUtils etc. | inline helpers in `src/lib/java/strings.js` / call sites | used methods only, semantics per method (null-safe variants) |
| commons-text LevenshteinDistance, JaroWinklerDistance | `fastest-levenshtein` for plain distance (wrapper adds the threshold -1 rule); own JaroWinkler (commons-text variant) | edit distance is mathematically defined; commons-text JaroWinkler has its own prefix/scaling rules |
| commons-io BOMInputStream | own 20 lines in `src/cli/` | BOM detection rules of CLI-0043 |
| commons-pool2 keyed pool | own `src/server/PipelinePool.js` | only maxTotal/maxIdlePerKey/maxTotalPerKey/no-block semantics used |
| Guava cache, Caffeine | `lru-cache` 11.x | caches never change results; size/TTL semantics configurable |
| Guava misc, fastutil collections | JS `Map`/`Set`/arrays | lookup-only sites; iteration-order sites use `src/lib/java/collections/` helpers (SEMANTICS S5) |
| java-diff-utils | own minimal Myers port (DiffsAsMatches) | not reachable from API/CLI in wave 1 (only ca/http-client use it); JUnit parity only |
| indriya / javax.measure | own `src/lib/units/` (indriya 1.3 subset: double converters, rationals as in 1.3, Simplifier) | suggestion numbers depend on exact arithmetic; UnitConversion fixtures |
| com.sun.net.httpserver | `express` 5.x | D-044: framing not compared; status/body content are |
| java.util.Properties | `dot-properties` 1.1.x on bytes decoded ISO-8859-1 (Properties.load) or UTF-8 (ResourceBundle) | spec-conformant escapes, continuations, separators |
| ThreadPoolExecutor (server) | own pool on `worker_threads` `src/server/worker/` | queue limits, cooperative cancel flag; `piscina` terminates workers on abort |
| lucene, fastText, grpc, protobuf, opentelemetry, prometheus, resilience4j, mybatis, mariadb, lettuce, jwt | not ported | DEV-001, DEV-002 |
| jna, lombok, annotations | none | no runtime behaviour |

## JDK APIs with result-relevant differences -> helper
Paths relative to `src/lib/java/`; rules in SEMANTICS.md.
| JDK API | helper |
|---|---|
| `String.toLowerCase/toUpperCase` (default and `Locale`), `Character.*` predicates/case/scripts | `strings.js`, `Character.js`, `specialCasing.js`, `unicode/*.json` (Unicode 13) |
| `String.trim/isBlank/strip`, `split`, `replace`, `replaceAll/replaceFirst/matches`, `equalsIgnoreCase`, `regionMatches`, `CASE_INSENSITIVE_ORDER`, `compareTo` | `strings.js`, `regex/Pattern.js`, `regex/Matcher.js` |
| `java.util.regex.*` | `regex/` |
| `"" + double/float`, `Double/Float.toString`, collection `toString` | `toString.js` |
| `Integer.parseInt`, `Double.parseDouble`, `Boolean.parseBoolean`, int/long/float arithmetic | `numbers.js`, `int.js`, `long.js`, `float.js` |
| `StrictMath.exp/log` | `StrictMath.js` (fdlibm) |
| `Math.log/log10/pow` at result sites | `libm.js` |
| `MessageFormat` | `MessageFormat.js` |
| `DecimalFormat`/`NumberFormat` (unit conversion en/de/fr) | `DecimalFormat.js` |
| `java.text.Normalizer` | `Normalizer.js` |
| `StringTokenizer` | `StringTokenizer.js` |
| `Scanner.nextLine`, `BufferedReader.readLine`, UTF-8 decoding with replacement | `io.js`, `charset.js` |
| `Properties.load`, `ResourceBundle` lookup chain | `Properties.js`, `ResourceBundle.js` |
| `HashMap/HashSet` iteration where it reaches output, `PriorityQueue` order | `collections/JavaHashMap.js`, `JavaHashSet.js`, `PriorityQueue.js` |
| `java.util.Random(seed)` incl. `nextGaussian` | `Random.js` |
| `File.listFiles` order, `getAbsolutePath` | `io/File.js` |
| `URLDecoder`, `Base64` decoder (strict) | `net.js`, `Base64.js` |
| `Calendar` (non-lenient date validation, week data), current date in Europe/Vienna | `datetime.js`, `clock.js` |
| `Throwable` hierarchy and messages, `Enum.valueOf` text | `errors.js`, `JavaEnum.js` |
| `Locale` (incl. malformed `new Locale("en-US")`) | `Locale.js` |

## Cross-block dependencies (order constraints)
- DE and FR disambiguation use the en-US tagger (DE-0155, FR-0153): F13 before F51/F60.
- BeoLingusTranslator (EN-0081, EN-0120) uses the German tagger: F22 before F46.
- `HunspellRule.getEnglishSpellingRules` and `FalseFriendRuleHandler` resolve en-US: German speller (F52) after English spellers (F46); false friends (F39) need F13/F17.
- CommonWordsDetector resolves es/ca/pt at init: `InternalLanguage` descriptor (short code only), never registered (D-035, DEV-006), F18.
- Match synthesis (`<match postag>`) needs synthesizers: F24 before F29.

## Wave 2 (it, es, sl, ru, sk, pl; steps W01..W42 in PLAN.md)
Java paths relative to `languagetool-language-modules/<l>/src/main/java/org/languagetool/`; JS under `src/lang/<l>/`. Order inside a language: language -> tokenizer/tagger -> synthesizer/disambiguator -> speller -> rules -> filters -> XML -> check. Resources (dict, txt, xml) come through the resources manifest (F06), no code port.

### Core pieces (before any language)
| Java / JDK | JS module | steps | notes |
|---|---|---|---|
| `java.nio.charset` ISO-8859-2, ISO-8859-15, KOI8-R (morfologik .info encodings of sl_SI, it_*, ru_*) | `src/lib/fsa/charsets.js`, `src/lib/java/charset.js` | W01 | tables from JDK; REPORT semantics as for existing charsets; sl/it/ru dicts unreadable without |
| 9-language oracle profile (D-033), per-language case generators | `oracle/scripts/gen-cases-*.mjs`, `oracle/adapters/*` | W02 | es-ES.dict etc. from `spanish-pos-dict.jar` |
| Language hooks (adaptSuggestion 2-arg, min_matches, ignored chars regex, post-disambiguation chunker, Calendar week data, filter registry) | `src/core/Language.js`, `src/core/JLanguageTool.js`, `src/core/patterns/*`, `src/lib/java/Calendar.js` | W03 | already exist in core; audit only |

### Languages
| Java class | JS module | IDs | depends on | step |
|---|---|---|---|---|
| sl `language/Slovenian` | `src/lang/sl/language/Slovenian.js` | SL-0001..0009, 0036 | Language, SRX | W04, W05 |
| sl `rules/sl/MorfologikSlovenianSpellerRule` | `src/lang/sl/rules/MorfologikSlovenianSpellerRule.js` | SL-0010, 0030..0032 | MorfologikSpellerRule, W01 | W05 |
| sl grammar.xml | via `getRuleFileNames` | SL-0020 | pattern loader | W06 |
| sk `language/Slovak`, `tagging/sk/SlovakTagger` | `src/lang/sk/language/Slovak.js`, `src/lang/sk/tagging/SlovakTagger.js` | SK-0001..0010, 0020, 0040, 0045, 0052 | BaseTagger | W08 |
| sk `synthesis/sk/SlovakSynthesizer` | `src/lang/sk/synthesis/SlovakSynthesizer.js` | SK-0008, 0021, 0041, 0042 | BaseSynthesizer | W09 |
| sk `rules/sk/{CompoundRule,MorfologikSlovakSpellerRule}` | `src/lang/sk/rules/` | SK-0011, 0012, 0043..0046 | AbstractCompoundRule, speller | W10 |
| sk grammar.xml, grammar-typography.xml | via `getRuleFileNames` | SK-0030, 0031 | pattern loader | W11 |
| it `language/Italian`, `tagging/it/ItalianTagger` | `src/lang/it/language/Italian.js`, `src/lang/it/tagging/ItalianTagger.js` | IT-0001..0013, 0018, 0040 | BaseTagger, W01 | W13 |
| it `synthesis/it/ItalianSynthesizer`, `tagging/disambiguation/rules/it/ItalianRuleDisambiguator` | `src/lang/it/synthesis/`, `src/lang/it/tagging/` | IT-0019, 0020, 0031, 0041, 0042 | XmlRuleDisambiguator | W14 |
| it `rules/it/{ItalianWordRepeatRule,MorfologikItalianSpellerRule}` | `src/lang/it/rules/` | IT-0014, 0015, 0043..0045 | WordRepeatRule, speller | W15 |
| it `rules/it/DateCheckFilter`, grammar.xml | `src/lang/it/rules/DateCheckFilter.js` | IT-0017, 0030 | AbstractDateCheckFilter | W16 |
| it `rules/it/ItalianConfusionProbabilityRule` | not ported (ngram, D-020 class) | - | - | - |
| pl `language/Polish`, `tokenizers/pl/PolishWordTokenizer`, `tagging/pl/PolishTagger` | `src/lang/pl/language/`, `tokenizers/`, `tagging/` | PL-0001..0010, 0030, 0031, 0065 | WordTokenizer, BaseTagger | W18 |
| pl `synthesis/pl/PolishSynthesizer`, `tagging/disambiguation/pl/PolishHybridDisambiguator` | `src/lang/pl/synthesis/`, `src/lang/pl/tagging/` | PL-0006, 0007, 0032, 0033 | MultiWordChunker, XmlRuleDisambiguator | W19 |
| pl `rules/pl/{Morfologik..SpellerRule,CompoundRule,DashRule,PolishUnpairedBracketsRule,PolishWordRepeatRule,SimpleReplaceRule,WordCoherencyRule}` | `src/lang/pl/rules/` | PL-0002, 0008, 0011..0017 | abstract rules (F37) | W20 |
| pl `rules/pl/{DateCheckFilter,DecadeSpellingFilter}`, grammar.xml | `src/lang/pl/rules/` | PL-0020, 0021, 0040 | filter registry | W21 |
| ru `language/Russian`, `tokenizers/ru/RussianWordTokenizer`, `tagging/ru/RussianTagger` | `src/lang/ru/language/`, `tokenizers/`, `tagging/` | RU-0001..0014, 0060, 0061, 0099 | BaseTagger, W01 (KOI8-R) | W23 |
| ru `synthesis/ru/RussianSynthesizer`, `tagging/disambiguation/ru/RussianHybridDisambiguator`, `chunking/RussianChunker` | `src/lang/ru/synthesis/`, `tagging/`, `chunking/` | RU-0007..0009, 0062..0064, 0071 | Chunker, MultiWordChunker | W24 |
| ru `rules/ru/{MorfologikRussianSpellerRule,MorfologikRussianYOSpellerRule}` | `src/lang/ru/rules/` | RU-0010, 0020, 0021 | speller, W01 | W25 |
| ru rules A (Compound, Dash, SimpleReplace, SpecificCase, SimpleWordRepeat) | `src/lang/ru/rules/` | RU-0022, 0024, 0026..0028 | abstract rules | W26 |
| ru rules B (FillerWords, UnpairedBrackets, VerbConjugation, WordCoherency, WordRepeat, WordRootRepeat) | `src/lang/ru/rules/` | RU-0002, 0025, 0029..0033 | abstract rules | W27 |
| ru filters (8 classes) | `src/lang/ru/rules/` | RU-0040..0047 | PartialPosTagFilter, date filters | W28 |
| ru grammar.xml, bitext.xml | via `getRuleFileNames`, `Tools.getBitextRules` | RU-0070, 0072 | pattern/bitext loaders | W29 |
| ru `rules/ru/RussianConfusionProbabilityRule` | not ported (ngram) | - | - | - |
| es `language/{Spanish,SpanishVoseo}` | `src/lang/es/language/` | ES-0001..0019, 0102 | Language hooks (W03) | W31 |
| es `tokenizers/es/SpanishWordTokenizer`, `tagging/es/SpanishTagger` | `src/lang/es/tokenizers/`, `tagging/` | ES-0005, 0006, 0060, 0061 | BaseTagger | W32 |
| es `synthesis/es/SpanishSynthesizer` | `src/lang/es/synthesis/` | ES-0008, 0062 | BaseSynthesizer, Soros | W33 |
| es `tagging/disambiguation/es/SpanishHybridDisambiguator` | `src/lang/es/tagging/` | ES-0007, 0063, 0072, 0074 | MultiWordChunker, XmlRuleDisambiguator, IsEnglishWordFilter | W34 |
| es `rules/es/{MorfologikSpanishSpellerRule,SpanishMultitokenSpeller}` | `src/lang/es/rules/` | ES-0010, 0016, 0017, 0022, 0032 | MultitokenSpeller | W35 |
| es rules A (CompoundRule, SimpleReplaceRule, SimpleReplaceVerbsRule, SpanishWikipediaRule) | `src/lang/es/rules/` | ES-0020, 0023, 0024, 0028 | abstract replace rules | W36 |
| es rules B (QuestionMarkRule, SpanishRepeatedWordsRule, SpanishUnpairedBracketsRule, SpanishWordRepeat(Beginning)Rule, SpanishWrongWordInContextRule) | `src/lang/es/rules/` | ES-0002, 0021, 0026, 0027, 0029..0031 | abstract rules | W37 |
| es filters A (AdvancedSynthesizer, DateCheck, DateFilterHelper, NewYearDate, SpanishNumberInWord, SuppressMisspelledSuggestions, TextToNumber) | `src/lang/es/rules/` | ES-0040, 0043, 0044, 0046, 0048..0050 | abstract filters | W38 |
| es filters B (ConfusionCheck, ConfusionPairsDataLoader, FindSuggestions, PostponedAdjectiveConcordance) | `src/lang/es/rules/` | ES-0041, 0042, 0045, 0047 | AbstractFindSuggestionsFilter | W39 |
| es grammar.xml, style.xml | via `getRuleFileNames` | ES-0070, 0071 | pattern loader | W40 |
| es `SpanishConfusionProbabilityRule`, remote-rule-filters.xml | not ported (ngram / remote rules, DEV-001) | - | - | - |

### Library table (wave 2)
No new Java dependencies. External dictionary artifact `org.softcatala:spanish-pos-dict:2.5` (es-ES.dict, es-ES_synth.dict, es-ES_tags.txt): bytes copied from the jar by the resources script (W02), read by the existing FSA reader.

### JDK APIs (wave 2)
| JDK API | helper |
|---|---|
| ISO-8859-2 / ISO-8859-15 / KOI8-R decode/encode (dict .info `fsa.dict.encoding`, REPORT on malformed input) | `src/lib/fsa/charsets.js` (W01) |
| `Calendar.getInstance(Locale "ru"/"pl"/FRANCE/UK)` week data and day names in date filters | `src/lib/java/Calendar.js` (W03, W28, W38) |
| `String.toLowerCase` for Cyrillic/Polish/Slovene letters (final sigma n/a; locale `ru`/`pl` default rules) | `src/lib/java/strings.js` |
