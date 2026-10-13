# Port map (wave 1)

Java class/package -> JS module. Generated from the pinned sources (`oracle/java-src`, 9b0be9d) and the inventory files; inventory IDs = rows whose Java-source/behaviour column names the class (complete lists; the authoritative one-owner index is the section "ID to class to step index"). Path rules: ARCHITECTURE.md 2-3. Classes marked `later` are deferred (D-005/DEV-001/DEV-002): no functional JS module is written; where ported code needs the type (signatures, `instanceof`, constants such as `LanguageModel`, `RemoteRule`, `GoogleToken`), a stub module with the class/interface shell and `// later (D-005)` is created at the listed path; callers keep the no-config behaviour of the owning inventory row.
Regenerate the index and class-table ID lists after inventory changes with `python3 docs/tools/portmap_index.py` (it also asserts 808/808 wave-1 todo IDs covered); hand edits only in the sections above the index.

## Porting order (steps)
| step | content | prerequisite |
|---|---|---|
| S1 | `src/lib/java/*` semantics helpers incl. Unicode 13 tables, regex translator, errors, enums, interfaces, classpath, clock; `tests/support` skeleton | oracle `probe` + `regex` + `unicode` dumps |
| S2 | infrastructure libs: `xml`, `slf4j`/`logback`, `jackson`, `commons`, `guava`, `diffutils`, `indriya` | S1 |
| S3 | core foundation: root data classes (AnalyzedToken*, AnalyzedSentence, Language, Languages, ResourceBundleTools, UserConfig, ...), `tools`, `markup`, `broker`, `noop`, `language`, rule base types (Rule, RuleMatch, Category, ITSIssueType, RuleFilter, filters on RuleMatch lists) | S2 |
| S4 | libs `morfologik`, `segment`, `ahocorasick`, `hunspell` (WASM) | S1, S2 |
| S5 | core analysis: `tokenizers`, `tagging` (not disambiguation rules), `synthesis`, `chunking` | S3, S4 |
| S6 | core pattern engine: `rules/patterns`, `tagging/disambiguation/rules` | S5 |
| S7 | core rules: generic and abstract rules, rule filters, `rules/spelling/**`, `rules/bitext`, `bitext`, `language/identifier` (+ lib `langdetect`) | S6 |
| S8 | core engine: JLanguageTool, MultiThreadedJLanguageTool, ResultCache, CheckResults, ranges, LanguageAnnotator; core test-jar helpers (CORE-0350) | S7 |
| S9 | en module (+ lib `opennlp`); first because de/fr disambiguation uses the en-US tagger (DE-0155, FR-0153). Note: EN BeoLingus rows (EN-0081, EN-0120) are ported here but verified after S10 (German tagger) | S8 |
| S10 | de module (+ libs `jwordsplitter`, `openregex`) | S9 |
| S11 | fr module | S9 |
| S12 | cli | S8 (fixtures need S9-S11) |
| S13 | server (+ lib `jdkhttp`, worker pool) | S12 |

Step notes (cross-step dependencies):
- S3 `Languages`: registers only in-scope modules in the relative order of Java's `Languages.get()` (DEV-006, ARCHITECTURE.md 3). During S3 grep all `Languages.getLanguageForShortCode(` / `getLanguage(` sites in core/cli/server and classify each (internal descriptor vs same exception); result is recorded here. Known: `CommonWordsDetector` es/ca/pt (CommonWordsDetector.java:38-40) -> `InternalLanguage` when not registered (S7).
- Cyclic-import policy (ARCHITECTURE.md 3, decision: keep the Java structure): S3 classes (`NoopLanguage`, `LanguageBuilder`, `DynamicLanguage`, `DynamicHunspellLanguage`, `DynamicMorfologikLanguage`, `Tools`, `Language`, `Languages`) stay in S3 and reference classes of later steps only lazily inside method/getter bodies (no top-level instantiation, no `extends`/`static` initialisers that need a later-step class). Later-step classes are imported with static `import` (ES module cycles are legal when only used inside functions); where a cycle would be evaluated at module load, use the lazy static getter pattern of ARCHITECTURE.md 3. Verified by the S3 gate: `import` of every S3 module in isolation must succeed with no later-step module evaluated first (`tests/support/importCycles.test.js`).
- Owner overrides in the index: CORE-0360..0364 and 0367 (regex syntax/flags translation) -> S1 regex translator; CORE-0371 (morfologik sequence encoders) -> S4; DE-0015 and FR-0014 (`MessagesBundle_*.properties`) -> S3 ResourceBundle (`ResourceBundleTools`); CORE-0336 (log text catalogue) -> S2 slf4j/logback; CORE-0449 -> S4 ahocorasick lib.
- EN-0081 and EN-0120 (BeoLingusTranslator) are ported in S9 but verified only after S10: `BeoLingusTranslator.java:82` uses `Languages.getLanguageForShortCode("de").getTagger()` (German tagger).
- IDs ported in S6/S7 that need the en-US language (`HunspellRule.java:124` `getEnglishSpellingRules`, `FalseFriendRuleHandler.java:59` `Languages.getLanguageForShortCode("en-US")`: CORE-0300, CORE-0236, CORE-0440..0443 and their false-friend / multi-lingual spelling fixtures) are verified after S9; before that their parity cases are SKIP, and unit tests use `tests/support` fake languages.

## Library equivalents
| Java dependency (version on the distribution classpath) | used by | JS solution | why behaviour-equivalent |
|---|---|---|---|
| JDK 17 java.lang/java.util/java.text/java.time (see next table) | everything | `src/lib/java/` | explicit Java semantics; probe fixtures |
| java.util.regex (JDK 17) | rules, tokenizers, everything | `src/lib/java/regex/` translator to JS RegExp (`v` flag) | ARCHITECTURE.md 13 decision; regex corpus fixture |
| JAXP SAX/Xerces, DOM, XPath, DOM-LS, Transformer (JDK 17) | rule/disambiguation/SRX/false-friend/bitext loaders, PatternRuleXmlCreator, IgnoreWhitespaceFilter | own `src/lib/xml/` (SAX with internal DTD entities, external entities via EntityResolver, Locator; minimal DOM + XPath subset + serializer for PatternRuleXmlCreator) | npm parsers lack DTD entity expansion or Xerces Locator semantics; SAX event-stream fixtures |
| XMLValidator schema validation (javax.xml.validation, test infrastructure CORE-0335) | rule tests | `tests/support/XMLValidator.js`: well-formedness in JS; XSD/DTD validity taken from the oracle (fixture records validated file hashes) | resources are byte-identical to the validated ones |
| morfologik-fsa, -fsa-builders, -stemming, -speller 2.2.0 | taggers, synthesizers, spellers, MorfologikMultiSpeller | own `src/lib/morfologik/` | no JS port with CFSA2/FSA5 + identical speller candidate order; fixtures per dict |
| com.gitlab.dumonts:hunspell 2.1.2 (JNA, libhunspell 1.7.x) | HunspellRule, CompoundAwareHunspellRule (de) | original C hunspell -> WASM (`vendor/hunspell`, D-013) | same C code; spell/suggest fixtures |
| net.loomchild:segment 2.0.4 | SRXSentenceTokenizer, SrxTools | own `src/lib/segment/` (SrxParser, SrxDocument, SrxTextIterator subset) | algorithm port; sentence fixtures |
| com.hankcs:aho-corasick-double-array-trie 1.2.2 | AbstractDashRule, DictionarySpellMatchFilter, EnglishDashRule, OldSpellingRule/SpellingData | own `src/lib/ahocorasick/` | same double-array build; `parseText` hit order is oracle-verified (CORE-0449, fixture compares hit lists on the dash/spelling data and on overlapping-key probes) |
| de.danielnaber:jwordsplitter 4.7 (+ wordsGerman.txt, exceptionsGerman.txt) | GermanCompoundTokenizer, GermanSpellerRule | own `src/lib/jwordsplitter/` + resources | algorithm port (DE-0208) |
| edu.washington.cs.knowitall:openregex 1.1.1 | GermanChunker, core chunking TokenExpressionFactory | own `src/lib/openregex/` subset (D-012) | chunk fixtures |
| com.optimaize.languagedetector:language-detector 0.6 (+ profiles) | DefaultLanguageIdentifier | own `src/lib/langdetect/` + `resources/languages/*` (profiles of in-scope languages only; candidates come from `Languages.get()`, DEV-006) | port incl. seeded java.util.Random(41) and double arithmetic order; probability fixtures |
| org.apache.opennlp:opennlp-tools 1.9.5 (+ knowitall models 1.5) | EnglishChunker | own `src/lib/opennlp/` inference subset (D-014), fdlibm exp/log (D-029) | bit-exact fixtures |
| com.fasterxml.jackson core/databind 2.18.x | RuleMatchesAsJsonSerializer, ApiV2, server JSON input | own `src/lib/jackson/` (JsonGenerator, ObjectMapper.readTree -> JsonNode) | JSON.stringify/parse differ (escapes `\u001F` uppercase, Float.toString numbers, int/double node types, trailing tokens accepted) |
| org.slf4j:slf4j-api 2.0.16, ch.qos.logback 1.5.21 | all logging | own `src/lib/slf4j/`, `src/lib/logback/` | message formatting and layouts ported (ARCHITECTURE.md 8) |
| org.apache.commons:commons-lang3 3.18 | StringUtils (58 imports), builders, ExceptionUtils, Pair/Triple, RegExUtils, Validate, ArrayUtils, NotImplementedException | own `src/lib/commons/lang3/` (used methods only) | method-by-method port; `ToStringBuilder` identity hash normalised in fixtures |
| org.apache.commons:commons-text | LevenshteinDistance, JaroWinklerDistance, WordUtils | own `src/lib/commons/text/` | port |
| commons-io | BOMInputStream, ByteOrderMark (CLI-0043) | own `src/lib/commons/io/` | port |
| org.apache.commons:commons-pool2 | PipelinePool (GenericKeyedObjectPool) | own `src/lib/commons/pool2/` (keyed pool: maxTotal, maxIdlePerKey, maxTotalPerKey, no blocking, idle eviction by time) | semantics of the used config only |
| commons-cli | GRPCServer, RemoteSynthesizer | not ported | later (SRV-0164) |
| com.google.guava 33.5 | cache (CacheBuilder/LoadingCache/Cache), Suppliers.memoize, Lists/Sets/Iterables/Streams/Strings, ImmutableX | `src/lib/guava/cache/` (expireAfterAccess/Write, maximumSize/Weight, stats); other helpers inline or `src/lib/guava/base/`; immutables as frozen arrays where mutation is observable | caches affect only stats/perf (stats only in SRV-0155 log, single worker path equal) |
| it.unimi.dsi:fastutil (Object2ObjectOpenHashMap, ObjectOpenHashSet, Object2IntOpenHashMap, Int2ObjectOpenHashMap) | taggers, spellers, MultiWordChunker | JS `Map`/`Set` where iteration order is not observable (lookup-only sites, verified per site); otherwise `src/lib/java/collections/FastutilOpenHashMap.js` (open addressing, same hash mixing) | per-site check recorded in the porter's step notes |
| io.github.java-diff-utils | DiffsAsMatches | own `src/lib/diffutils/` (Myers, same delta order) | fixtures |
| tech.units:indriya + javax.measure unit-api | AbstractUnitConversionRule (+ de/en UnitConversionRule*) | own `src/lib/indriya/` (only the units and converters used, same exact-rational arithmetic then doubleValue) | fixtures per conversion |
| com.sun.net.httpserver (JDK 17) | HTTPServer, LanguageToolHttpHandler | Express 5 + `src/lib/jdkhttp/` | framing reproduced (ARCHITECTURE.md 7); raw-socket fixtures |
| jna, lombok, org.jetbrains.annotations, jspecify, jsr305 | annotations/codegen | none | no runtime behaviour (Lombok `@Slf4j`/`@Getter` expanded by hand) |
| lucene, grpc, protobuf, opentelemetry, prometheus/micrometer, resilience4j, mybatis, mariadb, lettuce (redis), nimbus-jose-jwt | deferred subsystems | not ported | DEV-001, DEV-002 |

## JDK APIs with non-identical JS behaviour -> helper
Every row is binding; rules and traps in SEMANTICS.md. Module paths relative to `src/lib/java/`.
| JDK API | helper |
|---|---|
| `String.trim()`, `isBlank()`, `strip*()` | `strings.js` `javaTrim`, `javaIsBlank`, `javaStrip` |
| `String.split(regex[, limit])`, `Pattern.split` | `regex/Pattern.js` `javaSplit` |
| `String.replace(CharSequence, CharSequence)` / `replace(char, char)` | `strings.js` `javaReplace` |
| `String.replaceAll/replaceFirst/matches`, `Matcher.*`, `Pattern.quote`, `Matcher.quoteReplacement` | `regex/Pattern.js`, `regex/Matcher.js` |
| `String.toLowerCase()/toUpperCase()` (default locale en_US) and `(Locale)` | `strings.js` `toLowerCase(s, locale)`, `toUpperCase(s, locale)` (JDK 17 / Unicode 13 tables, tr/az/lt special casing) |
| `String.equalsIgnoreCase`, `regionMatches(true, ...)`, `String.CASE_INSENSITIVE_ORDER`, `compareTo`, `compareToIgnoreCase` | `strings.js` `equalsIgnoreCase`, `regionMatches`, `CASE_INSENSITIVE_ORDER`, `javaCompare` |
| `String.hashCode`, `Objects.hash`, `Arrays.hashCode`, `List.hashCode`, `Boolean/Integer/Long/Double.hashCode`, `Enum.hashCode` (identity) | `hash.js` |
| `String.valueOf(x)` / `"" + x` for double, float, char, null, Object | `toString.js` `javaToString`, `javaDoubleToString`, `javaFloatToString` (JDK 17 FloatingDecimal) |
| `String.format`, `PrintStream.printf`, `Formatter` | `Formatter.js` `javaFormat(locale, fmt, ...args)` |
| `String.substring`, `charAt`, `StringBuilder.insert/delete/setCharAt` with invalid indexes | `strings.js` checked variants throwing `StringIndexOutOfBoundsException` (only where reachable) |
| `Character.isLetter/isDigit/isLetterOrDigit/isAlphabetic/isWhitespace/isSpaceChar/isUpperCase/isLowerCase/isTitleCase/getType/toUpperCase/toLowerCase/toTitleCase` (char and int) | `Character.js` (Unicode 13 tables from JDK 17) |
| `Character.UnicodeScript`, Unicode properties in regex | `Character.js`, `unicode/*.json` |
| `java.text.Normalizer` | `Normalizer.js` (String.prototype.normalize + Unicode-13 guard) |
| `Integer.parseInt/valueOf`, `Long.parseLong`, `Double.parseDouble`, `Float.parseFloat`, `Boolean.parseBoolean/valueOf` | `numbers.js` (Java acceptance rules and `NumberFormatException` texts) |
| int/long arithmetic, `Math.floorMod/floorDiv`, `Math.round`, `Math.abs(int)`, `(int)` casts of double, `Integer.MAX_VALUE` overflow | `int.js`, `long.js` |
| `float` arithmetic | `Math.fround` via `float.js` |
| `StrictMath.exp/log` | `fdlibm.js` (D-029) |
| `Math.log/exp/pow/log10` | `JavaMath.js` (default JS `Math`, per-site probe fixtures; switch to fdlibm when a probe differs) |
| `java.text.MessageFormat` | `MessageFormat.js` |
| `java.text.DecimalFormat`, `NumberFormat.getNumberInstance(Locale)`, `RoundingMode` | `DecimalFormat.js` (JDK 17 CLDR symbols tables for en/de/fr locales) |
| `java.util.Locale`, `Locale.getDefault()` | `Locale.js` (default en_US, D-018) |
| `java.util.ResourceBundle` (+ candidate locales, fallback), `MissingResourceException` | `ResourceBundle.js` |
| `java.util.Properties.load(InputStream/Reader)`, keySet order (Hashtable) | `Properties.js` |
| `java.util.HashMap/HashSet/LinkedHashMap/LinkedHashSet/TreeMap/TreeSet/Hashtable/ConcurrentHashMap`, `Collectors.toSet/groupingBy` | `collections/JavaHashMap.js`, `JavaHashSet.js`, `JavaTreeMap.js`, `JavaTreeSet.js`, `JavaHashtable.js` (only where iteration order is observable; else JS Map/Set) |
| `AbstractCollection.toString` `[a, b]`, `AbstractMap.toString` `{k=v}`, `Arrays.toString`, `List.of(...).toString` | `toString.js` |
| `Collections.sort`, `List.sort`, `Arrays.sort(Object[])` (stable TimSort), `Arrays.binarySearch` | `collections/sort.js` (always explicit comparator, stable) |
| `Collections.unmodifiable*`, `List.of`, `Set.of`, `Map.of` (iteration order of Set.of/Map.of is randomized per JVM run!) | `collections/immutable.js` |
| `java.util.Random` (seeded), `nextInt`, `nextDouble`, `nextGaussian` | `Random.js` (48-bit LCG with BigInt) |
| `java.util.StringTokenizer` | `StringTokenizer.js` |
| `java.util.Scanner.nextLine/hasNextLine` | `Scanner.js` (line separators `\r\n`, `\n`, `\r`, ` `, ` `, `\u0085`) |
| `BufferedReader.readLine`, `InputStreamReader`, `Files.readAllLines` (throws on malformed), `new String(bytes, cs)` | `io.js`, `charset.js` |
| `PrintStream.print/println/printf`, `System.out/err`, `System.exit`, `System.getProperty/getenv`, `System.lineSeparator` | `System.js` |
| `java.io.File` (`getAbsolutePath`, `exists`, `isDirectory`, `listFiles` order, `toString`), `Files`, `Paths`, temp files | `io/File.js` (`listFiles` = readdir order via `fs.opendirSync`, never `fs.readdirSync` which sorts) |
| `java.net.URLDecoder/URLEncoder` (UTF-8), `java.net.URI`, `java.net.URL` (MalformedURLException), `InetAddress` text | `net.js` |
| `java.util.Base64` decoder (strict), encoder | `Base64.js` |
| `java.security.MessageDigest` SHA-256 | `node:crypto` directly (identical) |
| `java.util.Date`, `Calendar`, `GregorianCalendar`, `TimeZone`, `SimpleDateFormat`, `System.currentTimeMillis`, `nanoTime` | `datetime.js`, `clock.js` |
| `Enum` (`valueOf`, `values`, `name`, `ordinal`, `compareTo`) | `JavaEnum.js` |
| Throwable hierarchy, `printStackTrace`, helpful NPE messages | `errors.js` |
| `java.util.concurrent` executors/futures (server) | `src/core/tools/LtThreadPoolExecutor.js`, `src/server/worker/*` (ARCHITECTURE.md 6) |
| `BitSet` | `BitSet.js` |
| `Optional`, `Objects.requireNonNull(x[, msg])`, `Objects.equals`, `Objects.toString` | `Objects.js` |
| `Thread.interrupted()` in `InterruptibleCharSequence`, `Future.cancel(true)` | `src/core/tools/InterruptibleCharSequence.js` `checkInterrupted()` over the worker cancel flag (ARCHITECTURE.md 6.2) |
| JVM-wide once-only static side effects, `System.out/err` from any thread | `jvmOnce.js` (SharedArrayBuffer gate), `System.js` (`fs.writeSync`) |
| `ClassLoader.getResource(s)/getResourceAsStream`, `Class.forName` | `classpath.js`, `src/core/broker/DefaultClassBroker.js` |

## Package dependency notes
- Column "depends on" lists `org.languagetool` packages imported by the class (same-package references are implicit). Core cycles (e.g. root <-> rules <-> rules/patterns <-> language) are allowed under ESM; never touch an imported binding during module evaluation (ARCHITECTURE.md 3).
- Third-party dependencies per class follow the library table above.


## ID to class to step index (generated by `docs/tools/portmap_index.py`)

Every wave-1 `todo` ID of core, cli, server, de, en, fr (808) has exactly one owning step. Owning class = first class named in the row's Java-source column (own module first, core classes only if the row names no own class); owning step = latest step among the classes it names (the ID is complete when that step is done). Rows without a class are `non-class` (resource, config, regex, logging, library, test-support) and owned by the step stated. Regenerate with `python3 docs/tools/portmap_index.py`; do not hand-edit.

Counts per step: S1 6, S2 1, S3 79, S4 2, S5 20, S6 62, S7 98, S8 44, S9 116, S10 127, S11 52, S12 67, S13 134. Total 808.

### Non-class IDs
| ID | kind / owner | step |
|---|---|---|
| CLI-0072 | resources | S12 |
| CORE-0044 | runtime resources (resource loading via broker) | S3 |
| CORE-0195 | chunking package (Chunker, ChunkTag, TokenExpressionFactory) | S5 |
| CORE-0203 | tokenizers interfaces | S5 |
| CORE-0233 | suggestion ranking helpers (suggestions_ordering, suggestions) | S7 |
| CORE-0290 | bitext readers (bitext package) | S7 |
| CORE-0291 | bitext rules (rules/bitext) | S7 |
| CORE-0332 | tools misc utilities (src/core/tools) | S3 |
| CORE-0336 | logging (src/lib/slf4j, src/lib/logback) | S2 |
| CORE-0345 | translation lookup interfaces (rules/translation) | S7 |
| CORE-0350 | test-support | S8 |
| CORE-0351 | test-support | S8 |
| CORE-0360 | regex translator (src/lib/java/regex) | S1 |
| CORE-0361 | regex translator (src/lib/java/regex) | S1 |
| CORE-0362 | regex translator (src/lib/java/regex) | S1 |
| CORE-0363 | regex translator (src/lib/java/regex) | S1 |
| CORE-0364 | regex translator (src/lib/java/regex) | S1 |
| CORE-0367 | regex translator (src/lib/java/regex) | S1 |
| CORE-0371 | morfologik sequence encoders (src/lib/morfologik) | S4 |
| CORE-0449 | library ahocorasick (src/lib/ahocorasick) | S4 |
| DE-0014 | resource bundle / messages | S10 |
| DE-0015 | MessagesBundle_de.properties (ResourceBundle) | S3 |
| DE-0090 | regex | S10 |
| DE-0151 | resources | S10 |
| DE-0153 | resources | S10 |
| DE-0155 | resources | S10 |
| DE-0171 | resources | S10 |
| DE-0173 | resources | S10 |
| DE-0175 | resources | S10 |
| DE-0177 | resources | S10 |
| DE-0179 | resources | S10 |
| DE-0180 | resources | S10 |
| DE-0182 | resources | S10 |
| DE-0183 | resources | S10 |
| DE-0185 | resources | S10 |
| DE-0186 | resources | S10 |
| DE-0187 | resources | S10 |
| DE-0188 | resources | S10 |
| DE-0189 | resources | S10 |
| DE-0190 | resources | S10 |
| DE-0202 | resources | S10 |
| DE-0203 | resources | S10 |
| DE-0204 | resources | S10 |
| DE-0208 | other | S10 |
| DE-0220 | config / registration | S10 |
| EN-0015 | resource bundle / messages | S9 |
| EN-0029 | library | S9 |
| EN-0030 | library | S9 |
| EN-0031 | library | S9 |
| EN-0032 | library | S9 |
| EN-0033 | library | S9 |
| EN-0034 | library | S9 |
| EN-0150 | resources | S9 |
| EN-0151 | resources | S9 |
| EN-0152 | resources | S9 |
| EN-0153 | resources | S9 |
| EN-0154 | resources | S9 |
| EN-0155 | resources | S9 |
| EN-0156 | resources | S9 |
| EN-0157 | resources | S9 |
| EN-0158 | resources | S9 |
| EN-0160 | resources | S9 |
| EN-0170 | resources | S9 |
| EN-0171 | resources | S9 |
| EN-0172 | resources | S9 |
| EN-0173 | resources | S9 |
| EN-0174 | resources | S9 |
| EN-0175 | resources | S9 |
| EN-0176 | resources | S9 |
| EN-0177 | resources | S9 |
| EN-0178 | resources | S9 |
| EN-0180 | resources | S9 |
| EN-0181 | resources | S9 |
| EN-0182 | resources | S9 |
| EN-0183 | resources | S9 |
| EN-0184 | resources | S9 |
| EN-0185 | resources | S9 |
| EN-0186 | resources | S9 |
| EN-0187 | resources | S9 |
| EN-0188 | resources | S9 |
| EN-0189 | resources | S9 |
| EN-0190 | resources | S9 |
| EN-0191 | resources | S9 |
| EN-0192 | resources | S9 |
| EN-0193 | resources | S9 |
| EN-0194 | resources | S9 |
| EN-0202 | library | S9 |
| EN-0203 | other | S9 |
| FR-0013 | resource bundle / messages | S11 |
| FR-0014 | MessagesBundle_fr.properties (ResourceBundle) | S3 |
| FR-0150 | resources | S11 |
| FR-0151 | resources | S11 |
| FR-0153 | resources | S11 |
| FR-0170 | resources | S11 |
| FR-0171 | resources | S11 |
| FR-0172 | resources | S11 |
| FR-0173 | resources | S11 |
| FR-0174 | resources | S11 |
| FR-0176 | resources | S11 |
| FR-0177 | resources | S11 |
| FR-0178 | resources | S11 |
| FR-0179 | resources | S11 |
| FR-0180 | resources | S11 |
| FR-0181 | resources | S11 |
| FR-0221 | config / registration | S11 |
| SRV-0169 | test-support | S13 |
| SRV-0174 | other | S13 |

### Class IDs
| ID | class | step |
|---|---|---|
| CLI-0001 | CommandLineParser (+Main) | S12 |
| CLI-0002 | CommandLineParser (+Main) | S12 |
| CLI-0003 | CommandLineParser | S12 |
| CLI-0004 | CommandLineParser | S12 |
| CLI-0005 | Main | S12 |
| CLI-0006 | Main | S12 |
| CLI-0007 | CommandLineParser (+Main) | S12 |
| CLI-0008 | CommandLineParser | S12 |
| CLI-0009 | CommandLineParser | S12 |
| CLI-0010 | CommandLineParser | S12 |
| CLI-0011 | CommandLineParser | S12 |
| CLI-0012 | CommandLineParser | S12 |
| CLI-0013 | Main | S12 |
| CLI-0014 | CommandLineParser | S12 |
| CLI-0015 | CommandLineParser | S12 |
| CLI-0016 | CommandLineParser | S12 |
| CLI-0017 | CommandLineParser | S12 |
| CLI-0018 | CommandLineParser | S12 |
| CLI-0019 | CommandLineParser | S12 |
| CLI-0020 | CommandLineParser (+CommandLineOptions) | S12 |
| CLI-0021 | CommandLineParser | S12 |
| CLI-0022 | CommandLineParser (+Main) | S12 |
| CLI-0025 | Main | S12 |
| CLI-0027 | Main | S12 |
| CLI-0028 | Main | S12 |
| CLI-0029 | Main | S12 |
| CLI-0030 | CommandLineParser | S12 |
| CLI-0031 | CommandLineParser (+Main) | S12 |
| CLI-0032 | CommandLineParser | S12 |
| CLI-0033 | CommandLineParser | S12 |
| CLI-0034 | CommandLineParser | S12 |
| CLI-0035 | Main | S12 |
| CLI-0036 | Main | S12 |
| CLI-0037 | Main | S12 |
| CLI-0038 | Main | S12 |
| CLI-0039 | Main | S12 |
| CLI-0040 | Main | S12 |
| CLI-0041 | Main (+CommandLineTools) | S12 |
| CLI-0042 | Main | S12 |
| CLI-0043 | Main | S12 |
| CLI-0044 | Main | S12 |
| CLI-0045 | Main | S12 |
| CLI-0046 | CommandLineTools | S12 |
| CLI-0047 | CommandLineTools | S12 |
| CLI-0048 | CommandLineTools | S12 |
| CLI-0049 | CommandLineTools | S12 |
| CLI-0050 | Main | S12 |
| CLI-0051 | CommandLineTools | S12 |
| CLI-0052 | Main | S12 |
| CLI-0053 | Main | S12 |
| CLI-0054 | CommandLineTools | S12 |
| CLI-0055 | CommandLineTools | S12 |
| CLI-0056 | Main | S12 |
| CLI-0057 | Main | S12 |
| CLI-0058 | Main | S12 |
| CLI-0059 | Main | S12 |
| CLI-0060 | Main | S12 |
| CLI-0061 | Main | S12 |
| CLI-0062 | Main | S12 |
| CLI-0063 | TabBitextReader | S7 |
| CLI-0064 | CommandLineTools | S12 |
| CLI-0065 | CommandLineTools | S12 |
| CLI-0066 | Main | S12 |
| CLI-0067 | JnaTools | S3 |
| CLI-0068 | Main | S12 |
| CLI-0069 | CommandLineTools | S12 |
| CLI-0070 | CommandLineOptions | S12 |
| CLI-0071 | Main | S12 |
| CORE-0003 | DumontsHunspellDictionary (+Hunspell) | S7 |
| CORE-0004 | SrxTools (+SRXSentenceTokenizer) | S5 |
| CORE-0006 | DefaultLanguageIdentifier | S7 |
| CORE-0007 | RuleMatchesAsJsonSerializer | S3 |
| CORE-0008 | RuleEntityResolver (+XMLValidator, IgnoreWhitespaceFilter) | S6 |
| CORE-0009 | StringTools | S3 |
| CORE-0010 | LtBuildInfo (+JLanguageTool) | S8 |
| CORE-0020 | Languages (+MultiKeyProperties) | S3 |
| CORE-0021 | Languages | S3 |
| CORE-0022 | Languages | S3 |
| CORE-0023 | Languages | S3 |
| CORE-0024 | Languages | S3 |
| CORE-0025 | Languages (+DynamicLanguage, DynamicHunspellLanguage, DynamicMorfologikLanguage) | S3 |
| CORE-0026 | Language | S3 |
| CORE-0027 | Language | S3 |
| CORE-0028 | Language | S3 |
| CORE-0029 | Language (+JLanguageTool) | S8 |
| CORE-0030 | Language | S3 |
| CORE-0031 | Language | S3 |
| CORE-0032 | Language | S3 |
| CORE-0033 | Language | S3 |
| CORE-0034 | NoopLanguage (+NoopChunker, NoopDisambiguator) | S3 |
| CORE-0035 | LanguageBuilder (+RuleFilenameException) | S3 |
| CORE-0036 | Contributor (+Contributors) | S3 |
| CORE-0040 | ResourceDataBroker (+DefaultResourceDataBroker) | S3 |
| CORE-0041 | ClassBroker (+DefaultClassBroker) | S3 |
| CORE-0042 | ResourceBundleTools (+ResourceBundleWithFallback) | S3 |
| CORE-0043 | Tools | S3 |
| CORE-0050 | JLanguageTool | S8 |
| CORE-0051 | JLanguageTool | S8 |
| CORE-0052 | JLanguageTool | S8 |
| CORE-0053 | JLanguageTool | S8 |
| CORE-0054 | JLanguageTool | S8 |
| CORE-0055 | JLanguageTool | S8 |
| CORE-0056 | Tools | S3 |
| CORE-0057 | JLanguageTool | S8 |
| CORE-0058 | JLanguageTool | S8 |
| CORE-0059 | JLanguageTool | S8 |
| CORE-0060 | JLanguageTool (+UserConfig) | S8 |
| CORE-0061 | JLanguageTool | S8 |
| CORE-0062 | JLanguageTool (+Tools, PasswordAuthenticator) | S8 |
| CORE-0070 | JLanguageTool | S8 |
| CORE-0071 | JLanguageTool (+CheckResults) | S8 |
| CORE-0072 | JLanguageTool | S8 |
| CORE-0073 | JLanguageTool | S8 |
| CORE-0074 | JLanguageTool | S8 |
| CORE-0075 | JLanguageTool | S8 |
| CORE-0076 | JLanguageTool | S8 |
| CORE-0077 | JLanguageTool (+LevelToneTagCacheKey) | S8 |
| CORE-0078 | JLanguageTool | S8 |
| CORE-0079 | JLanguageTool (+ToneTag) | S8 |
| CORE-0080 | JLanguageTool | S8 |
| CORE-0081 | JLanguageTool | S8 |
| CORE-0082 | JLanguageTool | S8 |
| CORE-0083 | JLanguageTool | S8 |
| CORE-0084 | JLanguageTool (+ExtendedSentenceRange, Range) | S8 |
| CORE-0085 | JLanguageTool (+ErrorRateTooHighException) | S8 |
| CORE-0086 | JLanguageTool | S8 |
| CORE-0087 | JLanguageTool | S8 |
| CORE-0088 | RuleMatchListener (+JLanguageTool) | S8 |
| CORE-0091 | MultiThreadedJLanguageTool | S8 |
| CORE-0092 | JLanguageTool | S8 |
| CORE-0095 | ResultCache (+InputSentence, SimpleInputSentence) | S8 |
| CORE-0100 | AnnotatedTextBuilder | S3 |
| CORE-0101 | AnnotatedTextBuilder | S3 |
| CORE-0102 | AnnotatedTextBuilder (+MappingValue) | S3 |
| CORE-0103 | AnnotatedText | S3 |
| CORE-0104 | AnnotatedText | S3 |
| CORE-0110 | RuleMatch | S3 |
| CORE-0111 | RuleMatch | S3 |
| CORE-0112 | RuleMatch | S3 |
| CORE-0113 | SuggestedReplacement | S3 |
| CORE-0114 | SentenceRange | S8 |
| CORE-0115 | CheckResults | S8 |
| CORE-0116 | DetectedLanguage | S3 |
| CORE-0120 | Rule | S3 |
| CORE-0121 | Category (+CategoryId, CategoryIds, Categories) | S3 |
| CORE-0122 | ITSIssueType | S3 |
| CORE-0123 | Tag (+ToneTag) | S3 |
| CORE-0124 | RuleOption | S3 |
| CORE-0125 | Example | S3 |
| CORE-0126 | TextLevelRule | S3 |
| CORE-0127 | UserConfig | S3 |
| CORE-0128 | GlobalConfig | S3 |
| CORE-0129 | Premium (+PremiumOff) | S3 |
| CORE-0140 | PatternRuleLoader | S6 |
| CORE-0141 | PatternRuleHandler | S6 |
| CORE-0142 | PatternRuleHandler | S6 |
| CORE-0143 | PatternRuleHandler | S6 |
| CORE-0144 | PatternRuleHandler | S6 |
| CORE-0145 | RepeatedPatternRuleTransformer (+JLanguageTool) | S8 |
| CORE-0146 | ConsistencyPatternRuleTransformer | S6 |
| CORE-0147 | XMLRuleHandler (+PatternRuleHandler) | S6 |
| CORE-0148 | RegexPatternRule (+PatternRuleHandler) | S6 |
| CORE-0149 | PatternRuleHandler | S6 |
| CORE-0150 | XMLRuleHandler (+PatternToken) | S6 |
| CORE-0151 | XMLRuleHandler (+PatternToken) | S6 |
| CORE-0152 | PatternRuleHandler (+PatternToken) | S6 |
| CORE-0153 | PatternRuleHandler (+AbstractPatternRule) | S6 |
| CORE-0154 | PatternRuleHandler | S6 |
| CORE-0155 | PatternRuleHandler | S6 |
| CORE-0156 | RuleFilterCreator (+RegexRuleFilterCreator) | S6 |
| CORE-0157 | RuleFilterEvaluator | S6 |
| CORE-0158 | RuleFilter | S6 |
| CORE-0160 | XMLRuleHandler (+PatternRuleHandler) | S6 |
| CORE-0161 | XMLRuleHandler (+Match) | S6 |
| CORE-0162 | Match (+MatchState) | S6 |
| CORE-0163 | Match (+MatchState) | S6 |
| CORE-0164 | MatchState (+PatternRuleMatcher) | S6 |
| CORE-0172 | PatternRuleMatcher (+RuleWithMaxFilter) | S6 |
| CORE-0173 | PatternRuleMatcher | S6 |
| CORE-0174 | PatternRule (+PatternRuleXmlCreator, PatternRuleId) | S6 |
| CORE-0175 | RuleSet (+Substrings, StringMatcher) | S6 |
| CORE-0176 | AbstractTokenBasedRule (+CaseConversionHelper) | S6 |
| CORE-0177 | RegexRuleFilter (+RegexRuleFilterEvaluator, RegexAntiPatternFilter) | S6 |
| CORE-0178 | PatternRuleBuilderHelper (+PatternTokenBuilder) | S6 |
| CORE-0180 | PartialPosTagFilter | S7 |
| CORE-0181 | AbstractDateCheckFilter (+AbstractDateCheckWithSuggestionsFilter) | S7 |
| CORE-0182 | AbstractFutureDateFilter (+AbstractNewYearDateFilter, YMDDateHelper, DateRangeChecker, ...) | S7 |
| CORE-0183 | AbstractFindSuggestionsFilter | S7 |
| CORE-0184 | AbstractAdvancedSynthesizerFilter | S7 |
| CORE-0186 | SameRuleGroupFilter (+RuleWithMaxFilter, DictionaryMatchFilter, DictionarySpellMatchFilter, ...) | S7 |
| CORE-0187 | CleanOverlappingFilter | S3 |
| CORE-0190 | XmlRuleDisambiguator (+Disambiguator, AbstractDisambiguator) | S6 |
| CORE-0191 | DisambiguationRuleHandler (+DisambiguationRuleLoader, DisambiguationPatternRuleReplacer) | S6 |
| CORE-0193 | MultiWordChunker | S5 |
| CORE-0194 | MultiWordChunker2 | S5 |
| CORE-0200 | SRXSentenceTokenizer (+SrxTools) | S5 |
| CORE-0201 | SimpleSentenceTokenizer | S5 |
| CORE-0202 | WordTokenizer | S5 |
| CORE-0210 | BaseTagger | S5 |
| CORE-0211 | ManualTagger | S5 |
| CORE-0212 | CombiningTagger | S5 |
| CORE-0213 | MorfologikTagger (+DemoTagger, TaggedWord, WordTagger) | S5 |
| CORE-0214 | AnalyzedToken | S3 |
| CORE-0215 | AnalyzedTokenReadings | S3 |
| CORE-0216 | AnalyzedSentence | S3 |
| CORE-0220 | BaseSynthesizer (+SynthesizerTools) | S5 |
| CORE-0221 | BaseSynthesizer (+Soros) | S5 |
| CORE-0222 | ManualSynthesizer | S5 |
| CORE-0232 | MorfologikMultiSpeller | S7 |
| CORE-0236 | CompoundAwareHunspellRule | S7 |
| CORE-0237 | MultitokenSpeller (+MultitokenSpellerFilter) | S7 |
| CORE-0238 | SymSpellRule (+SymSpell, SuggestItem, SuggestionStage, ...) | S7 |
| CORE-0239 | VagueSpellChecker (+ForeignLanguageChecker) | S7 |
| CORE-0240 | CommonFileTypes (+RuleWithLanguage) | S7 |
| CORE-0250 | CommaWhitespaceRule | S7 |
| CORE-0251 | DoublePunctuationRule | S7 |
| CORE-0252 | GenericUnpairedBracketsRule (+SymbolLocator, UnsyncStack) | S7 |
| CORE-0253 | GenericUnpairedQuotesRule | S7 |
| CORE-0254 | UppercaseSentenceStartRule | S7 |
| CORE-0255 | WordRepeatRule | S7 |
| CORE-0256 | MultipleWhitespaceRule | S7 |
| CORE-0257 | SentenceWhitespaceRule | S7 |
| CORE-0258 | WhitespaceBeforePunctuationRule | S7 |
| CORE-0259 | LongSentenceRule | S7 |
| CORE-0260 | LongParagraphRule | S7 |
| CORE-0262 | WordRepeatBeginningRule | S7 |
| CORE-0263 | PhraseRepeatRule (+AdvancedWordRepeatRule) | S7 |
| CORE-0264 | ReadabilityRule | S7 |
| CORE-0265 | WrongWordInContextRule | S7 |
| CORE-0266 | DemoRule (+FakeRule, SpecificIdRule, TestRemoteRule, ...) | S7 |
| CORE-0270 | AbstractSimpleReplaceRule (+SimpleReplaceDataLoader) | S7 |
| CORE-0271 | AbstractSimpleReplaceRule2 | S7 |
| CORE-0272 | AbstractCompoundRule (+CompoundRuleData) | S7 |
| CORE-0273 | AbstractDashRule | S7 |
| CORE-0274 | ConfusionSet (+ConfusionPair, ConfusionString, ScoredConfusionSet, ...) | S7 |
| CORE-0275 | AbstractWordCoherencyRule (+WordCoherencyDataLoader) | S7 |
| CORE-0278 | AbstractUnitConversionRule | S7 |
| CORE-0279 | ShortDescriptionProvider | S3 |
| CORE-0292 | BitextPatternRule (+BitextPatternRuleHandler, BitextPatternRuleLoader, FalseFriendsAsBitextLoader) | S6 |
| CORE-0293 | Tools | S3 |
| CORE-0300 | FalseFriendRuleLoader (+FalseFriendRuleHandler, FalseFriendPatternRule) | S6 |
| CORE-0310 | LanguageIdentifierService | S7 |
| CORE-0311 | LanguageIdentifier | S7 |
| CORE-0312 | DefaultLanguageIdentifier | S7 |
| CORE-0313 | CommonWordsDetector | S7 |
| CORE-0314 | UnicodeBasedDetector | S7 |
| CORE-0315 | SimpleLanguageIdentifier | S7 |
| CORE-0317 | LanguageAnnotator (+FragmentWithLanguage) | S8 |
| CORE-0320 | ContextTools | S3 |
| CORE-0321 | ContextTools | S3 |
| CORE-0322 | RuleMatchesAsJsonSerializer | S3 |
| CORE-0323 | RuleMatchesAsJsonSerializer | S3 |
| CORE-0324 | RuleMatchesAsJsonSerializer | S3 |
| CORE-0325 | RuleMatchesAsJsonSerializer | S3 |
| CORE-0326 | RuleMatchesAsJsonSerializer | S3 |
| CORE-0327 | Tools | S3 |
| CORE-0328 | Tools | S3 |
| CORE-0329 | StringTools | S3 |
| CORE-0331 | DiffsAsMatches (+PseudoMatch) | S3 |
| CORE-0333 | LtThreadPoolFactory (+LtThreadPoolExecutor, CircuitBreakers) | S3 |
| CORE-0335 | XMLValidator | S3 |
| CORE-0352 | LineExpander (+SuggestionWithMessage, MatchPosition, EquivalenceTypeLocator, ...) | S7 |
| CORE-0365 | StringMatcher | S6 |
| CORE-0366 | PatternToken (+StringMatcher, RegexPatternRule, SrxTools) | S6 |
| CORE-0370 | MorfologikTagger | S5 |
| CORE-0372 | MorfologikSpeller | S7 |
| CORE-0373 | MorfologikTagger (+BaseSynthesizer) | S5 |
| CORE-0374 | MorfologikSpeller | S7 |
| CORE-0375 | MorfologikSpeller | S7 |
| CORE-0376 | MorfologikSpeller | S7 |
| CORE-0378 | UnifierConfiguration (+XMLRuleHandler, Language) | S6 |
| CORE-0379 | Unifier | S6 |
| CORE-0380 | Unifier | S6 |
| CORE-0381 | XMLRuleHandler (+AbstractPatternRulePerformer) | S6 |
| CORE-0382 | Unifier (+XMLRuleHandler) | S6 |
| CORE-0383 | Unifier | S6 |
| CORE-0384 | PatternToken (+PatternTokenMatcher, AbstractPatternRulePerformer) | S6 |
| CORE-0385 | PatternToken | S6 |
| CORE-0386 | AbstractPatternRulePerformer | S6 |
| CORE-0387 | AbstractPatternRulePerformer | S6 |
| CORE-0388 | AbstractPatternRulePerformer (+PatternToken) | S6 |
| CORE-0389 | AbstractPatternRulePerformer | S6 |
| CORE-0390 | StringMatcher | S6 |
| CORE-0391 | AbstractPatternRulePerformer (+PatternRuleMatcher) | S6 |
| CORE-0392 | DisambiguationPatternRuleReplacer | S6 |
| CORE-0393 | DisambiguationPatternRuleReplacer | S6 |
| CORE-0394 | DisambiguationPatternRuleReplacer | S6 |
| CORE-0395 | DisambiguationPatternRuleReplacer | S6 |
| CORE-0396 | DisambiguationPatternRuleReplacer | S6 |
| CORE-0397 | DisambiguationPatternRuleReplacer | S6 |
| CORE-0398 | DisambiguationPatternRuleReplacer (+AnalyzedTokenReadings) | S6 |
| CORE-0399 | DisambiguationPatternRuleReplacer | S6 |
| CORE-0400 | DisambiguationPatternRuleReplacer (+Unifier) | S6 |
| CORE-0401 | DisambiguationPatternRuleReplacer | S6 |
| CORE-0402 | AbstractSuppressMisspelledSuggestionsFilter | S7 |
| CORE-0403 | AdaptSuggestionsFilter | S7 |
| CORE-0404 | CheckPostagsInSuggestionFilter | S7 |
| CORE-0405 | ConvertToSentenceCaseFilter | S7 |
| CORE-0406 | UnderlineSpacesFilter | S7 |
| CORE-0407 | WhitespaceCheckFilter | S7 |
| CORE-0408 | AddCommasFilter | S7 |
| CORE-0409 | SuppressIfAnyRuleMatchesFilter | S7 |
| CORE-0410 | IsEnglishWordFilter | S7 |
| CORE-0411 | AbstractMakeContractionsFilter | S7 |
| CORE-0412 | AbstractNumberInWordFilter | S7 |
| CORE-0413 | AbstractTextToNumberFilter | S7 |
| CORE-0414 | ApostropheTypeFilter | S6 |
| CORE-0415 | MultitokenSpellerFilter | S7 |
| CORE-0416 | NewLineMatchFilter | S7 |
| CORE-0417 | EmptyLineRule | S7 |
| CORE-0418 | PunctuationMarkAtParagraphEnd | S7 |
| CORE-0419 | PunctuationMarkAtParagraphEnd2 | S7 |
| CORE-0420 | WhiteSpaceAtBeginOfParagraph | S7 |
| CORE-0421 | WhiteSpaceBeforeParagraphEnd | S7 |
| CORE-0422 | ParagraphRepeatBeginningRule | S7 |
| CORE-0423 | AbstractPunctuationCheckRule | S7 |
| CORE-0424 | AbstractSpaceBeforeRule | S7 |
| CORE-0425 | AbstractSpecificCaseRule | S7 |
| CORE-0426 | AbstractCheckCaseRule | S7 |
| CORE-0427 | AbstractStyleRepeatedWordRule | S7 |
| CORE-0428 | AbstractStyleTooOftenUsedWordRule | S7 |
| CORE-0429 | AbstractStatisticStyleRule | S7 |
| CORE-0430 | AbstractStatisticSentenceStyleRule | S7 |
| CORE-0431 | AbstractFillerWordsRule | S7 |
| CORE-0432 | AbstractRepeatedWordsRule (+SynonymsData) | S7 |
| CORE-0433 | SpellingCheckRule (+CachingWordListLoader) | S7 |
| CORE-0434 | SpellingCheckRule | S7 |
| CORE-0435 | SpellingCheckRule | S7 |
| CORE-0436 | MorfologikSpellerRule | S7 |
| CORE-0437 | MorfologikSpellerRule (+SpellingCheckRule) | S7 |
| CORE-0438 | MorfologikSpellerRule | S7 |
| CORE-0439 | MorfologikSpellerRule (+MorfologikMultiSpeller) | S7 |
| CORE-0440 | HunspellRule | S7 |
| CORE-0441 | HunspellRule | S7 |
| CORE-0442 | HunspellRule (+HunspellNoSuggestionRule) | S7 |
| CORE-0443 | HunspellRule (+Hunspell, DumontsHunspellDictionary) | S7 |
| CORE-0444 | StringTools | S3 |
| CORE-0445 | StringTools | S3 |
| CORE-0446 | StringTools | S3 |
| CORE-0447 | UserConfig (+Tools, AbstractCompoundRule, ReadabilityRule, ...) | S7 |
| CORE-0450 | LanguageWithModel | S3 |
| DE-0001 | German | S10 |
| DE-0002 | German | S10 |
| DE-0004 | German | S10 |
| DE-0005 | German | S10 |
| DE-0006 | German | S10 |
| DE-0007 | German | S10 |
| DE-0008 | German | S10 |
| DE-0009 | GermanyGerman | S10 |
| DE-0010 | AustrianGerman | S10 |
| DE-0011 | SwissGerman | S10 |
| DE-0012 | SwissGerman | S10 |
| DE-0013 | NonSwissGerman | S10 |
| DE-0020 | GermanWordTokenizer | S10 |
| DE-0021 | GermanCompoundTokenizer | S10 |
| DE-0022 | German | S10 |
| DE-0024 | SwissGermanTagger | S10 |
| DE-0025 | AnalyzedGermanToken (+GermanToken) | S10 |
| DE-0026 | AdjectiveTags (+VerbPrefixes) | S10 |
| DE-0027 | GermanSynthesizer | S10 |
| DE-0028 | GermanRuleDisambiguator | S10 |
| DE-0029 | GermanChunker | S10 |
| DE-0030 | GermanMultitokenSpeller | S10 |
| DE-0031 | GermanTagger | S10 |
| DE-0032 | GermanTagger | S10 |
| DE-0040 | AgreementRule | S10 |
| DE-0041 | AgreementRuleAntiPatterns1 | S10 |
| DE-0042 | AgreementRule2 | S10 |
| DE-0043 | AgreementSuggestor2 | S10 |
| DE-0044 | AgreementTools (+PrepositionToCases) | S10 |
| DE-0045 | CaseRule | S10 |
| DE-0046 | CaseRuleAntiPatterns (+CaseRuleExceptions) | S10 |
| DE-0047 | CompoundCoherencyRule | S10 |
| DE-0048 | CompoundInfinitivRule | S10 |
| DE-0049 | ConjunctionAtBeginOfSentenceRule | S10 |
| DE-0050 | DashRule | S10 |
| DE-0051 | DuUpperLowerCaseRule | S10 |
| DE-0052 | GermanCommaWhitespaceRule | S10 |
| DE-0053 | GermanCompoundRule | S10 |
| DE-0054 | SwissCompoundRule | S10 |
| DE-0056 | GermanDoublePunctuationRule | S10 |
| DE-0057 | GermanFillerWordsRule | S10 |
| DE-0058 | GermanParagraphRepeatBeginningRule | S10 |
| DE-0059 | GermanReadabilityRule | S10 |
| DE-0060 | GermanRepeatedWordsRule | S10 |
| DE-0063 | GermanSpellerRule | S10 |
| DE-0064 | GermanSpellerRule | S10 |
| DE-0065 | AustrianGermanSpellerRule | S10 |
| DE-0066 | SwissGermanSpellerRule | S10 |
| DE-0067 | MorfologikGermanyGermanSpellerRule | S10 |
| DE-0068 | GermanStyleRepeatedWordRule | S10 |
| DE-0069 | GermanUnpairedBracketsRule | S10 |
| DE-0070 | GermanUnpairedQuotesRule | S10 |
| DE-0071 | GermanWordRepeatBeginningRule | S10 |
| DE-0072 | GermanWordRepeatRule | S10 |
| DE-0073 | GermanWrongWordInContextRule | S10 |
| DE-0074 | LongSentenceRule | S10 |
| DE-0075 | MissingCommaRelativeClauseRule | S10 |
| DE-0076 | MissingVerbRule | S10 |
| DE-0077 | NonSignificantVerbsRule | S10 |
| DE-0078 | OldSpellingRule (+SpellingData) | S10 |
| DE-0079 | PassiveSentenceRule | S10 |
| DE-0081 | RedundantModalOrAuxiliaryVerb | S10 |
| DE-0082 | SentenceWhitespaceRule | S10 |
| DE-0083 | SentenceWithManRule | S10 |
| DE-0084 | SentenceWithModalVerbRule | S10 |
| DE-0085 | SimilarNameRule | S10 |
| DE-0086 | SimpleReplaceRule | S10 |
| DE-0087 | StyleRepeatedSentenceBeginning | S10 |
| DE-0088 | StyleRepeatedVeryShortSentences | S10 |
| DE-0089 | Rule | S3 |
| DE-0091 | UnitConversionRule | S10 |
| DE-0092 | UnnecessaryPhraseRule | S10 |
| DE-0094 | VerbAgreementRule | S10 |
| DE-0095 | WiederVsWiderRule | S10 |
| DE-0096 | WordCoherencyRule | S10 |
| DE-0097 | GermanSpellerRule | S10 |
| DE-0098 | GermanSpellerRule | S10 |
| DE-0099 | GermanSpellerRule | S10 |
| DE-0100 | GermanSpellerRule | S10 |
| DE-0101 | GermanSpellerRule | S10 |
| DE-0102 | GermanSpellerRule (+LineExpander, GermanCompoundTokenizer) | S10 |
| DE-0110 | AdaptSuggestionFilter | S10 |
| DE-0111 | AdvancedSynthesizerFilter | S10 |
| DE-0112 | CompoundCheckFilter | S10 |
| DE-0113 | DateCheckFilter (+DateFilterHelper) | S10 |
| DE-0114 | YMDDateCheckFilter | S10 |
| DE-0115 | FutureDateFilter (+NewYearDateFilter, YMDNewYearDateFilter, RecentYearFilter) | S10 |
| DE-0116 | GermanNumberInWordFilter | S10 |
| DE-0117 | GermanSuppressMisspelledSuggestionsFilter | S10 |
| DE-0118 | InsertCommaFilter | S10 |
| DE-0119 | PotentialCompoundFilter | S10 |
| DE-0120 | RemoveUnknownCompoundsFilter | S10 |
| DE-0121 | UppercaseNounReadingFilter | S10 |
| DE-0122 | ValidWordFilter | S10 |
| DE-0130 | GermanHelper | S10 |
| DE-0131 | GermanTools | S10 |
| DE-0132 | LanguageNames | S10 |
| DE-0133 | LineExpander | S10 |
| DE-0150 | Language | S3 |
| DE-0152 | GermanyGerman (+AustrianGerman) | S10 |
| DE-0170 | BaseTagger (+BaseSynthesizer) | S5 |
| DE-0172 | BaseSynthesizer | S5 |
| DE-0176 | Language | S3 |
| DE-0181 | ShortDescriptionProvider | S3 |
| DE-0184 | SpellingCheckRule | S7 |
| DE-0191 | BaseSynthesizer | S5 |
| DE-0200 | GermanTagger | S10 |
| DE-0201 | GermanSynthesizer | S10 |
| DE-0205 | HunspellRule (+Hunspell) | S7 |
| DE-0206 | GermanCompoundTokenizer | S10 |
| DE-0207 | GermanChunker | S10 |
| DE-0225 | German | S10 |
| DE-0226 | JLanguageTool (+CleanOverlappingFilter) | S8 |
| EN-0001 | English | S9 |
| EN-0002 | English | S9 |
| EN-0004 | English | S9 |
| EN-0005 | English | S9 |
| EN-0006 | English | S9 |
| EN-0007 | English | S9 |
| EN-0009 | AmericanEnglish | S9 |
| EN-0010 | BritishEnglish | S9 |
| EN-0011 | AustralianEnglish | S9 |
| EN-0012 | CanadianEnglish | S9 |
| EN-0013 | NewZealandEnglish | S9 |
| EN-0014 | SouthAfricanEnglish | S9 |
| EN-0020 | EnglishWordTokenizer | S9 |
| EN-0022 | English | S9 |
| EN-0023 | EnglishTagger | S9 |
| EN-0024 | EnglishSynthesizer | S9 |
| EN-0025 | EnglishHybridDisambiguator | S9 |
| EN-0026 | EnglishChunker | S9 |
| EN-0027 | EnglishChunkFilter | S9 |
| EN-0028 | EnglishMultitokenSpeller | S9 |
| EN-0040 | AbstractEnglishSpellerRule | S9 |
| EN-0041 | AbstractEnglishSpellerRule | S9 |
| EN-0043 | MorfologikAmericanSpellerRule | S9 |
| EN-0044 | MorfologikBritishSpellerRule | S9 |
| EN-0045 | MorfologikAustralianSpellerRule | S9 |
| EN-0046 | MorfologikCanadianSpellerRule | S9 |
| EN-0047 | MorfologikNewZealandSpellerRule | S9 |
| EN-0048 | MorfologikSouthAfricanSpellerRule | S9 |
| EN-0049 | VariantInfo | S9 |
| EN-0050 | AmericanReplaceRule | S9 |
| EN-0051 | BritishReplaceRule | S9 |
| EN-0052 | NewZealandReplaceRule | S9 |
| EN-0053 | AvsAnRule (+AvsAnData) | S9 |
| EN-0054 | CompoundRule | S9 |
| EN-0055 | ConsistentApostrophesRule | S9 |
| EN-0056 | ContractionSpellingRule | S9 |
| EN-0058 | EnglishDashRule | S9 |
| EN-0059 | EnglishDiacriticsRule | S9 |
| EN-0062 | EnglishPlainEnglishRule | S9 |
| EN-0063 | EnglishRedundancyRule | S9 |
| EN-0064 | EnglishRepeatedWordsRule | S9 |
| EN-0065 | EnglishSpecificCaseRule | S9 |
| EN-0066 | EnglishUnpairedBracketsRule | S9 |
| EN-0067 | EnglishUnpairedQuotesRule | S9 |
| EN-0068 | EnglishWordRepeatBeginningRule | S9 |
| EN-0069 | EnglishWordRepeatRule | S9 |
| EN-0070 | EnglishWrongWordInContextRule | S9 |
| EN-0071 | LongSentenceRule | S9 |
| EN-0072 | SimpleReplaceRule | S9 |
| EN-0073 | SimpleReplaceProfanityRule | S9 |
| EN-0074 | Rule | S3 |
| EN-0075 | UnitConversionRule | S9 |
| EN-0076 | UnitConversionRuleImperial | S9 |
| EN-0077 | UnitConversionRuleUS | S9 |
| EN-0079 | WordCoherencyRule | S9 |
| EN-0081 | AbstractEnglishSpellerRule | S9 |
| EN-0100 | AdverbFilter | S9 |
| EN-0101 | AdvancedSynthesizerFilter | S9 |
| EN-0102 | DateCheckFilter (+DateFilterHelper) | S9 |
| EN-0103 | YMDDateCheckFilter (+FutureDateFilter, NewYearDateFilter, YMDNewYearDateFilter) | S9 |
| EN-0104 | EnglishConvertToSentenceCaseFilter | S9 |
| EN-0105 | EnglishNumberInWordFilter | S9 |
| EN-0106 | EnglishPartialPosTagFilter (+NoDisambiguationEnglishPartialPosTagFilter) | S9 |
| EN-0107 | EnglishSuppressMisspelledSuggestionsFilter | S9 |
| EN-0108 | FindSuggestionsFilter | S9 |
| EN-0109 | OrdinalSuffixFilter | S9 |
| EN-0120 | BeoLingusTranslator | S9 |
| EN-0121 | Inflector | S9 |
| EN-0200 | EnglishTagger | S9 |
| EN-0201 | EnglishSynthesizer | S9 |
| EN-0204 | EnglishChunker | S9 |
| EN-0205 | EnglishChunker | S9 |
| EN-0206 | EnglishChunker | S9 |
| EN-0220 | AnnotatedTextBuilder (+Tools) | S3 |
| EN-0221 | DynamicMorfologikLanguage | S3 |
| EN-0222 | JLanguageTool | S8 |
| EN-0223 | English | S9 |
| FR-0001 | French | S11 |
| FR-0002 | French | S11 |
| FR-0005 | French | S11 |
| FR-0006 | French | S11 |
| FR-0007 | French | S11 |
| FR-0008 | French | S11 |
| FR-0009 | French | S11 |
| FR-0010 | BelgianFrench | S11 |
| FR-0011 | CanadianFrench | S11 |
| FR-0012 | SwissFrench | S11 |
| FR-0020 | FrenchWordTokenizer | S11 |
| FR-0021 | French | S11 |
| FR-0022 | FrenchTagger | S11 |
| FR-0023 | FrenchSynthesizer | S11 |
| FR-0024 | FrenchHybridDisambiguator | S11 |
| FR-0025 | FrenchMultitokenSpeller | S11 |
| FR-0040 | MorfologikFrenchSpellerRule | S11 |
| FR-0041 | CompoundRule | S11 |
| FR-0042 | QuestionWhitespaceRule | S11 |
| FR-0043 | QuestionWhitespaceStrictRule | S11 |
| FR-0044 | SimpleReplaceRule | S11 |
| FR-0045 | FrenchRepeatedWordsRule | S11 |
| FR-0060 | AdvancedSynthesizerFilter | S11 |
| FR-0061 | DateCheckFilter (+DateFilterHelper, DMYDateCheckFilter) | S11 |
| FR-0062 | NewYearDateFilter | S11 |
| FR-0063 | FindSuggestionsFilter | S11 |
| FR-0064 | FrenchNumberInWordFilter | S11 |
| FR-0065 | FrenchPartialPosTagFilter | S11 |
| FR-0066 | FrenchSuppressMisspelledSuggestionsFilter | S11 |
| FR-0067 | InterrogativeVerbFilter | S11 |
| FR-0068 | MakeContractionsFilter | S11 |
| FR-0069 | PostponedAdjectiveConcordanceFilter | S11 |
| FR-0070 | SuggestionsFilter | S11 |
| FR-0071 | WordWithDeterminerFilter | S11 |
| FR-0200 | FrenchTagger (+MorfologikFrenchSpellerRule) | S11 |
| FR-0201 | FrenchSynthesizer | S11 |
| FR-0220 | AnnotatedTextBuilder | S3 |
| SRV-0001 | HTTPServer (+Server) | S13 |
| SRV-0002 | Server | S13 |
| SRV-0003 | Server | S13 |
| SRV-0004 | HTTPServerConfig | S13 |
| SRV-0005 | HTTPServerConfig | S13 |
| SRV-0006 | HTTPServerConfig | S13 |
| SRV-0007 | HTTPServerConfig (+LanguageToolHttpHandler) | S13 |
| SRV-0008 | HTTPServer | S13 |
| SRV-0009 | Server (+HTTPServer) | S13 |
| SRV-0010 | HTTPServerConfig (+HTTPServer) | S13 |
| SRV-0011 | HTTPServerConfig | S13 |
| SRV-0013 | HTTPServerConfig | S13 |
| SRV-0014 | HTTPServerConfig | S13 |
| SRV-0015 | HTTPServer (+Server, DatabaseAccess) | S13 |
| SRV-0016 | Server | S13 |
| SRV-0017 | HTTPServer | S13 |
| SRV-0018 | HTTPServer | S13 |
| SRV-0020 | Server (+HTTPServer) | S13 |
| SRV-0030 | HTTPServerConfig | S13 |
| SRV-0031 | HTTPServerConfig | S13 |
| SRV-0032 | HTTPServerConfig | S13 |
| SRV-0033 | HTTPServerConfig | S13 |
| SRV-0034 | HTTPServerConfig | S13 |
| SRV-0035 | HTTPServerConfig | S13 |
| SRV-0036 | HTTPServerConfig | S13 |
| SRV-0037 | ConfidenceMapLoader (+V2TextChecker) | S13 |
| SRV-0039 | HTTPServerConfig | S13 |
| SRV-0040 | HTTPServerConfig | S13 |
| SRV-0041 | HTTPServerConfig (+PipelinePool) | S13 |
| SRV-0043 | HTTPServerConfig | S13 |
| SRV-0044 | HTTPServerConfig (+PipelinePool) | S13 |
| SRV-0045 | HTTPServerConfig (+TextChecker) | S13 |
| SRV-0046 | HTTPServerConfig | S13 |
| SRV-0047 | HTTPServerConfig (+TextChecker) | S13 |
| SRV-0048 | HTTPServerConfig (+UserLimits, TextChecker) | S13 |
| SRV-0049 | HTTPServerConfig (+TextChecker) | S13 |
| SRV-0051 | HTTPServerConfig | S13 |
| SRV-0053 | HTTPServerConfig | S13 |
| SRV-0054 | HTTPServerConfig (+PipelinePool) | S13 |
| SRV-0055 | HTTPServerConfig (+TextChecker) | S13 |
| SRV-0057 | HTTPServerConfig | S13 |
| SRV-0058 | HTTPServerConfig | S13 |
| SRV-0059 | HTTPServerConfig | S13 |
| SRV-0061 | HTTPServerConfig | S13 |
| SRV-0070 | LanguageToolHttpHandler | S13 |
| SRV-0071 | LanguageToolHttpHandler | S13 |
| SRV-0072 | LanguageToolHttpHandler | S13 |
| SRV-0073 | LanguageToolHttpHandler | S13 |
| SRV-0074 | LanguageToolHttpHandler | S13 |
| SRV-0075 | LanguageToolHttpHandler | S13 |
| SRV-0076 | LanguageToolHttpHandler (+TextChecker) | S13 |
| SRV-0077 | ServerTools (+LanguageToolHttpHandler) | S13 |
| SRV-0078 | LanguageToolHttpHandler | S13 |
| SRV-0079 | LanguageToolHttpHandler | S13 |
| SRV-0080 | LanguageToolHttpHandler | S13 |
| SRV-0081 | LanguageToolHttpHandler (+TextChecker) | S13 |
| SRV-0082 | LanguageToolHttpHandler (+ServerTools) | S13 |
| SRV-0083 | LanguageToolHttpHandler | S13 |
| SRV-0084 | LanguageToolHttpHandler (+Server) | S13 |
| SRV-0085 | RequestLimiter | S13 |
| SRV-0086 | ErrorRequestLimiter (+LanguageToolHttpHandler) | S13 |
| SRV-0087 | LanguageToolHttpHandler | S13 |
| SRV-0088 | ServerTools | S13 |
| SRV-0089 | InstrumentedAppender | S13 |
| SRV-0090 | ApiV2 | S13 |
| SRV-0091 | ApiV2 (+ServerTools) | S13 |
| SRV-0092 | ApiV2 | S13 |
| SRV-0093 | ApiV2 | S13 |
| SRV-0094 | ApiV2 | S13 |
| SRV-0095 | ApiV2 | S13 |
| SRV-0096 | ApiV2 | S13 |
| SRV-0097 | ApiV2 (+TextChecker) | S13 |
| SRV-0098 | ApiV2 | S13 |
| SRV-0099 | ApiV2 | S13 |
| SRV-0100 | ApiV2 | S13 |
| SRV-0104 | ApiV2 (+DatabaseAccessOpenSource) | S13 |
| SRV-0105 | ApiV2 (+DatabaseAccessOpenSource) | S13 |
| SRV-0106 | BasicAuthentication | S13 |
| SRV-0110 | V2TextChecker | S13 |
| SRV-0111 | ServerTools (+UserLimits) | S13 |
| SRV-0112 | DatabaseAccessOpenSource | S13 |
| SRV-0113 | TextChecker | S13 |
| SRV-0114 | TextChecker | S13 |
| SRV-0116 | TextChecker | S13 |
| SRV-0117 | PipelinePool | S13 |
| SRV-0118 | TextChecker | S13 |
| SRV-0120 | V2TextChecker (+TextChecker) | S13 |
| SRV-0121 | TextChecker (+V2TextChecker) | S13 |
| SRV-0122 | TextChecker (+V2TextChecker) | S13 |
| SRV-0123 | DefaultLanguageIdentifier | S7 |
| SRV-0125 | TextChecker | S13 |
| SRV-0126 | TextChecker | S13 |
| SRV-0127 | TextChecker (+V2TextChecker) | S13 |
| SRV-0128 | TextChecker (+PipelinePool) | S13 |
| SRV-0129 | TextChecker | S13 |
| SRV-0130 | ServerTools | S13 |
| SRV-0131 | ServerTools | S13 |
| SRV-0132 | TextChecker | S13 |
| SRV-0133 | TextChecker | S13 |
| SRV-0134 | TextChecker (+ServerTools) | S13 |
| SRV-0135 | TextChecker | S13 |
| SRV-0136 | TextChecker | S13 |
| SRV-0137 | TextChecker | S13 |
| SRV-0138 | TextChecker | S13 |
| SRV-0139 | TextChecker | S13 |
| SRV-0140 | V2TextChecker | S13 |
| SRV-0142 | TextChecker | S13 |
| SRV-0143 | TextChecker (+DatabaseLogger) | S13 |
| SRV-0144 | LocalAbTestService (+AbTestService, TextChecker) | S13 |
| SRV-0150 | PipelineSettings (+PipelinePool) | S13 |
| SRV-0151 | PipelinePool | S13 |
| SRV-0152 | PipelinePool | S13 |
| SRV-0153 | Pipeline | S13 |
| SRV-0154 | TextChecker | S13 |
| SRV-0155 | TextChecker | S13 |
| SRV-0160 | UserLimits | S13 |
| SRV-0161 | LimitEnforcementMode | S13 |
| SRV-0168 | HTTPTestTools | S13 |
| SRV-0170 | RequestCounter | S13 |
| SRV-0173 | AbTestService (+ActiveRulesMBean) | S13 |
| SRV-0175 | ActiveRules | S13 |
| SRV-0177 | HTTPSServer (+HTTPSServerConfig, HTTPServerConfig, IllegalConfigurationException) | S13 |
| SRV-0181 | HTTPServerConfig | S13 |
| SRV-0183 | HTTPServerConfig | S13 |
| SRV-0185 | HTTPServerConfig | S13 |
| SRV-0187 | HTTPServerConfig (+HTTPServer) | S13 |
| SRV-0189 | HTTPServerConfig | S13 |
| SRV-0191 | HTTPServerConfig | S13 |
| SRV-0193 | ApiV2 (+DatabaseAccessOpenSource) | S13 |
| SRV-0195 | ApiV2 (+DatabaseAccessOpenSource) | S13 |
| SRV-0197 | ApiV2 (+DatabaseAccessOpenSource) | S13 |
| SRV-0199 | DatabaseAccess (+DatabaseAccessOpenSource) | S13 |
| SRV-0201 | DatabaseLogger | S13 |

## Class tables

### core (`languagetool-core/org/languagetool` -> `src/core`), 346 classes


#### core: (root)

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| AnalyzedSentence | `src/core/AnalyzedSentence.js` | CORE-0120, CORE-0126, CORE-0401, CORE-0216 | - | S3 core foundation |
| AnalyzedToken | `src/core/AnalyzedToken.js` | CORE-0214 | tools | S3 core foundation |
| AnalyzedTokenReadings | `src/core/AnalyzedTokenReadings.js` | CORE-0398, CORE-0215 | chunking, tools | S3 core foundation |
| ApiCleanupNeeded | `src/core/ApiCleanupNeeded.js` | CORE-0352 | - | S3 core foundation |
| CheckResults | `src/core/CheckResults.js` | CORE-0071, CORE-0115 | rules | S8 core engine |
| DetectedLanguage | `src/core/DetectedLanguage.js` | CORE-0116, CORE-0322 | - | S3 core foundation |
| DynamicHunspellLanguage | `src/core/DynamicHunspellLanguage.js` | CORE-0025 | rules, rules/spelling/hunspell | S3 core foundation |
| DynamicLanguage | `src/core/DynamicLanguage.js` | CORE-0025 | language, rules/patterns | S3 core foundation |
| DynamicMorfologikLanguage | `src/core/DynamicMorfologikLanguage.js` | CORE-0025, EN-0221 | rules, rules/spelling/morfologik | S3 core foundation |
| ErrorRateTooHighException | `src/core/ErrorRateTooHighException.js` | CORE-0085 | - | S8 core engine |
| Experimental | `src/core/Experimental.js` | CORE-0352 | - | S3 core foundation |
| ExtendedSentenceRange | `src/core/ExtendedSentenceRange.js` | CORE-0084 | - | S8 core engine |
| FragmentWithLanguage | `src/core/FragmentWithLanguage.js` | CORE-0317 | - | S8 core engine |
| GlobalConfig | `src/core/GlobalConfig.js` | CORE-0058, CORE-0128, EN-0081 | - | S3 core foundation |
| InputSentence | `src/core/InputSentence.js` | CORE-0095 | rules | S8 core engine |
| JLanguageTool | `src/core/JLanguageTool.js` | CORE-0010, CORE-0029, CORE-0050, CORE-0051, CORE-0052, CORE-0053, CORE-0054, CORE-0055, CLI-0050, CORE-0057, CORE-0058, CORE-0059, CORE-0060, CORE-0061, CORE-0062, CORE-0070, CORE-0071, CORE-0072, CORE-0073, CORE-0074, CORE-0075, CORE-0076, CORE-0077, CORE-0078, CORE-0079, CORE-0080, CORE-0081, CORE-0082, CORE-0083, CORE-0084, CORE-0085, CORE-0086, CORE-0087, CORE-0088, CORE-0092, CORE-0145, DE-0226, EN-0222 | broker, languagemodel, markup, rules, rules/patterns, rules/spelling, tools | S8 core engine |
| Language | `src/core/Language.js` | CORE-0020, CORE-0026, CORE-0027, CORE-0028, CORE-0029, CORE-0030, CORE-0031, CORE-0032, CORE-0033, CORE-0378, DE-0150, DE-0176 | broker, chunking, language, languagemodel, markup, rules, rules/patterns, rules/spelling, rules/spelling/multitoken, synthesis, tagging, tagging/disambiguation, tagging/disambiguation/xx, tagging/xx, tokenizers | S3 core foundation |
| LanguageAnnotator | `src/core/LanguageAnnotator.js` | CORE-0317 | rules/spelling | S8 core engine |
| LanguageMaintainedState | `src/core/LanguageMaintainedState.js` | CORE-0352 | - | S3 core foundation |
| LanguageWithModel | `src/core/LanguageWithModel.js` | CORE-0450, CORE-0352 | languagemodel | S3 core foundation |
| Languages | `src/core/Languages.js` | CORE-0020, CORE-0021, CORE-0022, CORE-0023, CORE-0024, CORE-0025, CORE-0130, CORE-0410, SRV-0059, SRV-0092, SRV-0142 | noop, tools | S3 core foundation |
| LevelToneTagCacheKey | `src/core/LevelToneTagCacheKey.js` | CORE-0077 | - | S8 core engine |
| LinguServices | `src/core/LinguServices.js` | CORE-0439, CORE-0427, CORE-0447 | rules | S3 core foundation |
| LtBuildInfo | `src/core/LtBuildInfo.js` | CORE-0010, CLI-0005 | - | S3 core foundation |
| MultiThreadedJLanguageTool | `src/core/MultiThreadedJLanguageTool.js` | CORE-0091, CLI-0071 | markup, rules, rules/patterns | S8 core engine |
| Premium | `src/core/Premium.js` | CORE-0041, CORE-0129, CORE-0130, CORE-0322, SRV-0113 | markup, rules | S3 core foundation |
| PremiumOff | `src/core/PremiumOff.js` | CORE-0129 | rules | S3 core foundation |
| Range | `src/core/Range.js` | CORE-0084 | - | S8 core engine |
| RemoteRuleFallbackManager | `src/core/RemoteRuleFallbackManager.js` | CORE-0343 (later) | rules | later |
| ResourceBundleTools | `src/core/ResourceBundleTools.js` | CORE-0042 | - | S3 core foundation |
| ResourceBundleWithFallback | `src/core/ResourceBundleWithFallback.js` | CORE-0042 | - | S3 core foundation |
| ResultCache | `src/core/ResultCache.js` | CORE-0095, SRV-0155 | rules, tools | S8 core engine |
| RuleEntityResolver | `src/core/RuleEntityResolver.js` | CORE-0008 | - | S3 core foundation |
| RuleMatchListener | `src/core/RuleMatchListener.js` | CORE-0088 | rules | S8 core engine |
| SentenceRange | `src/core/SentenceRange.js` | CORE-0114 | markup | S8 core engine |
| ShortDescriptionProvider | `src/core/ShortDescriptionProvider.js` | CORE-0082, CORE-0279, DE-0181 | broker | S3 core foundation |
| SimpleInputSentence | `src/core/SimpleInputSentence.js` | CORE-0073, CORE-0095 | - | S8 core engine |
| Tag | `src/core/Tag.js` | CORE-0123, CORE-0142 | - | S3 core foundation |
| ToneTag | `src/core/ToneTag.js` | CORE-0079, CORE-0123, CORE-0142 | - | S3 core foundation |
| UserConfig | `src/core/UserConfig.js` | CORE-0060, CORE-0127, CORE-0439, CORE-0427, CORE-0447 | rules | S3 core foundation |
| XMLValidator | `src/core/XMLValidator.js` | CORE-0008, CORE-0044, CORE-0335 | broker, tools | S3 core foundation |

#### core: bitext

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| BitextReader | `src/core/bitext/BitextReader.js` | CORE-0352 | - | S7 core rules/spelling/identification |
| StringPair | `src/core/bitext/StringPair.js` | CORE-0290 | - | S7 core rules/spelling/identification |
| TabBitextReader | `src/core/bitext/TabBitextReader.js` | CORE-0290, CLI-0063 | - | S7 core rules/spelling/identification |
| WordFastTMReader | `src/core/bitext/WordFastTMReader.js` | CORE-0290 | - | S7 core rules/spelling/identification |

#### core: broker

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| ClassBroker | `src/core/broker/ClassBroker.js` | CORE-0041, CORE-0156 | - | S3 core foundation |
| DefaultClassBroker | `src/core/broker/DefaultClassBroker.js` | CORE-0041 | - | S3 core foundation |
| DefaultResourceDataBroker | `src/core/broker/DefaultResourceDataBroker.js` | CORE-0040 | - | S3 core foundation |
| ResourceDataBroker | `src/core/broker/ResourceDataBroker.js` | CORE-0040 | - | S3 core foundation |

#### core: chunking

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| ChunkTag | `src/core/chunking/ChunkTag.js` | CORE-0395, CORE-0195 | - | S5 core analysis |
| ChunkTaggedToken | `src/core/chunking/ChunkTaggedToken.js` | CORE-0195 | - | S5 core analysis |
| Chunker | `src/core/chunking/Chunker.js` | CORE-0195 | - | S5 core analysis |
| TokenExpressionFactory | `src/core/chunking/TokenExpressionFactory.js` | CORE-0195 | - | S5 core analysis |
| TokenPredicate | `src/core/chunking/TokenPredicate.js` | CORE-0195 | rules/patterns | S5 core analysis |

#### core: grpc

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| SynthesizeServerGrpc | `src/core/grpc/SynthesizeServerGrpc.js` | CORE-0346 (later) | - | later |
| Synthesizer | `src/core/grpc/Synthesizer.js` | CORE-0220, CORE-0346 (later) | - | later |

#### core: language

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| Contributor | `src/core/language/Contributor.js` | CORE-0036 | - | S3 core foundation |
| Contributors | `src/core/language/Contributors.js` | CORE-0036 | - | S3 core foundation |
| LanguageBuilder | `src/core/language/LanguageBuilder.js` | CORE-0035 | chunking, languagemodel, rules, synthesis, tagging, tagging/disambiguation, tokenizers | S3 core foundation |
| RuleFilenameException | `src/core/language/RuleFilenameException.js` | CORE-0035 | - | S3 core foundation |

#### core: language/identifier

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| DefaultLanguageIdentifier | `src/core/language/identifier/DefaultLanguageIdentifier.js` | CORE-0006, CORE-0311, CORE-0312, SRV-0123 | language/identifier/detector, noop | S7 core rules/spelling/identification |
| LanguageIdentifier | `src/core/language/identifier/LanguageIdentifier.js` | CORE-0311 | language/identifier/detector | S7 core rules/spelling/identification |
| LanguageIdentifierService | `src/core/language/identifier/LanguageIdentifierService.js` | CORE-0310, CORE-0311, CLI-0044 | - | S7 core rules/spelling/identification |
| SimpleLanguageIdentifier | `src/core/language/identifier/SimpleLanguageIdentifier.js` | CORE-0315 | (root), noop, rules/spelling | S7 core rules/spelling/identification |

#### core: language/identifier/detector

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| CommonWordsDetector | `src/core/language/identifier/detector/CommonWordsDetector.js` | CORE-0313 | broker, InternalLanguage | S7 core rules/spelling/identification |
| InternalLanguage (port-only, D-035) | `src/core/language/identifier/detector/InternalLanguage.js` | CORE-0313 | - | S7 core rules/spelling/identification |
| FastTextDetector | `src/core/language/identifier/detector/FastTextDetector.js` | CORE-0316 (later) | language/identifier | later |
| NGramDetector | `src/core/language/identifier/detector/NGramDetector.js` | CORE-0316 (later) | language/identifier, noop | later |
| UnicodeBasedDetector | `src/core/language/identifier/detector/UnicodeBasedDetector.js` | CORE-0314 | - | S7 core rules/spelling/identification |

#### core: languagemodel

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| BaseLanguageModel | `src/core/languagemodel/BaseLanguageModel.js` | CORE-0340 (later) | rules/ngrams | later |
| LanguageModel | `src/core/languagemodel/LanguageModel.js` | CORE-0353 (later) | rules/ngrams | later |
| LuceneLanguageModel | `src/core/languagemodel/LuceneLanguageModel.js` | CORE-0340 (later) | - | later |
| LuceneSingleIndexLanguageModel | `src/core/languagemodel/LuceneSingleIndexLanguageModel.js` | CORE-0340 (later) | - | later |
| MultiLanguageModel | `src/core/languagemodel/MultiLanguageModel.js` | CORE-0340 (later) | rules/ngrams | later |

#### core: languagemodel/bert

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| RemoteLanguageModel | `src/core/languagemodel/bert/RemoteLanguageModel.js` | CORE-0342 (later) | languagemodel/bert/grpc | later |

#### core: languagemodel/bert/grpc

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| BertLmGrpc | `src/core/languagemodel/bert/grpc/BertLmGrpc.js` | CORE-0342 (later) | - | later |
| BertLmProto | `src/core/languagemodel/bert/grpc/BertLmProto.js` | CORE-0353 (later) | - | later |

#### core: markup

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| AnnotatedText | `src/core/markup/AnnotatedText.js` | CORE-0070, CORE-0082, CORE-0103, CORE-0104, CORE-0126 | - | S3 core foundation |
| AnnotatedTextBuilder | `src/core/markup/AnnotatedTextBuilder.js` | CORE-0100, CORE-0101, CORE-0102, EN-0220, FR-0220 | - | S3 core foundation |
| MappingValue | `src/core/markup/MappingValue.js` | CORE-0102 | - | S3 core foundation |
| TextPart | `src/core/markup/TextPart.js` | CORE-0101 | - | S3 core foundation |

#### core: noop

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| NoopChunker | `src/core/noop/NoopChunker.js` | CORE-0034 | chunking | S3 core foundation |
| NoopDisambiguator | `src/core/noop/NoopDisambiguator.js` | CORE-0034 | tagging/disambiguation | S3 core foundation |
| NoopLanguage | `src/core/noop/NoopLanguage.js` | CORE-0022, CORE-0034, CORE-0312 | chunking, language, rules, rules/patterns, tagging, tagging/disambiguation, tagging/xx, tokenizers | S3 core foundation |

#### core: rules

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| AbstractAdvancedSynthesizerFilter | `src/core/rules/AbstractAdvancedSynthesizerFilter.js` | CORE-0184 | rules/patterns, synthesis, tools | S7 core rules/spelling/identification |
| AbstractCheckCaseRule | `src/core/rules/AbstractCheckCaseRule.js` | CORE-0426 | - | S7 core rules/spelling/identification |
| AbstractCompoundRule | `src/core/rules/AbstractCompoundRule.js` | CORE-0272, CORE-0447 | tools | S7 core rules/spelling/identification |
| AbstractDashRule | `src/core/rules/AbstractDashRule.js` | CORE-0273, CORE-0449 | - | S7 core rules/spelling/identification |
| AbstractDateCheckFilter | `src/core/rules/AbstractDateCheckFilter.js` | CORE-0181 | rules/patterns, tools | S7 core rules/spelling/identification |
| AbstractDateCheckWithSuggestionsFilter | `src/core/rules/AbstractDateCheckWithSuggestionsFilter.js` | CORE-0181 | rules/patterns, tools | S7 core rules/spelling/identification |
| AbstractFillerWordsRule | `src/core/rules/AbstractFillerWordsRule.js` | CORE-0431 | - | S7 core rules/spelling/identification |
| AbstractFindSuggestionsFilter | `src/core/rules/AbstractFindSuggestionsFilter.js` | CORE-0183 | rules/patterns, rules/spelling/symspell/implementation, synthesis, tagging, tools | S7 core rules/spelling/identification |
| AbstractFutureDateFilter | `src/core/rules/AbstractFutureDateFilter.js` | CORE-0182 | rules/patterns | S7 core rules/spelling/identification |
| AbstractMakeContractionsFilter | `src/core/rules/AbstractMakeContractionsFilter.js` | CORE-0411 | rules/patterns | S7 core rules/spelling/identification |
| AbstractNewYearDateFilter | `src/core/rules/AbstractNewYearDateFilter.js` | CORE-0182 | rules/patterns | S7 core rules/spelling/identification |
| AbstractNumberInWordFilter | `src/core/rules/AbstractNumberInWordFilter.js` | CORE-0412 | rules/patterns | S7 core rules/spelling/identification |
| AbstractPunctuationCheckRule | `src/core/rules/AbstractPunctuationCheckRule.js` | CORE-0423 | - | S7 core rules/spelling/identification |
| AbstractRepeatedWordsRule | `src/core/rules/AbstractRepeatedWordsRule.js` | CORE-0432 | synthesis, tools | S7 core rules/spelling/identification |
| AbstractSimpleReplaceRule | `src/core/rules/AbstractSimpleReplaceRule.js` | CORE-0270 | synthesis, tools | S7 core rules/spelling/identification |
| AbstractSimpleReplaceRule2 | `src/core/rules/AbstractSimpleReplaceRule2.js` | CORE-0271, CORE-0426 | (root), tools | S7 core rules/spelling/identification |
| AbstractSpaceBeforeRule | `src/core/rules/AbstractSpaceBeforeRule.js` | CORE-0424 | - | S7 core rules/spelling/identification |
| AbstractSpecificCaseRule | `src/core/rules/AbstractSpecificCaseRule.js` | CORE-0425 | rules/spelling, tools | S7 core rules/spelling/identification |
| AbstractStatisticSentenceStyleRule | `src/core/rules/AbstractStatisticSentenceStyleRule.js` | CORE-0430 | - | S7 core rules/spelling/identification |
| AbstractStatisticStyleRule | `src/core/rules/AbstractStatisticStyleRule.js` | CORE-0429, CORE-0431 | - | S7 core rules/spelling/identification |
| AbstractStyleRepeatedWordRule | `src/core/rules/AbstractStyleRepeatedWordRule.js` | CORE-0427, CORE-0447 | - | S7 core rules/spelling/identification |
| AbstractStyleTooOftenUsedWordRule | `src/core/rules/AbstractStyleTooOftenUsedWordRule.js` | CORE-0428 | - | S7 core rules/spelling/identification |
| AbstractSuppressMisspelledSuggestionsFilter | `src/core/rules/AbstractSuppressMisspelledSuggestionsFilter.js` | CORE-0402 | rules/patterns, rules/spelling, tagging | S7 core rules/spelling/identification |
| AbstractTextToNumberFilter | `src/core/rules/AbstractTextToNumberFilter.js` | CORE-0413 | rules/patterns | S7 core rules/spelling/identification |
| AbstractUnitConversionRule | `src/core/rules/AbstractUnitConversionRule.js` | CORE-0278 | - | S7 core rules/spelling/identification |
| AbstractWordCoherencyRule | `src/core/rules/AbstractWordCoherencyRule.js` | CORE-0275 | tools | S7 core rules/spelling/identification |
| AdaptSuggestionsFilter | `src/core/rules/AdaptSuggestionsFilter.js` | CORE-0403 | rules/patterns | S7 core rules/spelling/identification |
| AddCommasFilter | `src/core/rules/AddCommasFilter.js` | CORE-0408 | rules/patterns, tools | S7 core rules/spelling/identification |
| AdvancedWordRepeatRule | `src/core/rules/AdvancedWordRepeatRule.js` | CORE-0263 | tools | S7 core rules/spelling/identification |
| BERTSuggestionRanking | `src/core/rules/BERTSuggestionRanking.js` | CORE-0342 (later) | languagemodel/bert | later |
| Categories | `src/core/rules/Categories.js` | CORE-0121 | - | S3 core foundation |
| Category | `src/core/rules/Category.js` | CORE-0121, CORE-0142 | - | S3 core foundation |
| CategoryId | `src/core/rules/CategoryId.js` | CORE-0121 | - | S3 core foundation |
| CategoryIds | `src/core/rules/CategoryIds.js` | CORE-0121 | - | S3 core foundation |
| CheckPostagsInSuggestionFilter | `src/core/rules/CheckPostagsInSuggestionFilter.js` | CORE-0404 | rules/patterns, tagging | S7 core rules/spelling/identification |
| CleanOverlappingFilter | `src/core/rules/CleanOverlappingFilter.js` | CORE-0087, CORE-0186, CORE-0187, DE-0226 | - | S3 core foundation |
| CommaWhitespaceRule | `src/core/rules/CommaWhitespaceRule.js` | CORE-0250 | tools | S7 core rules/spelling/identification |
| CompoundRuleData | `src/core/rules/CompoundRuleData.js` | CORE-0272 | - | S7 core rules/spelling/identification |
| ConfusionPair | `src/core/rules/ConfusionPair.js` | CORE-0274 | tools | S7 core rules/spelling/identification |
| ConfusionSet | `src/core/rules/ConfusionSet.js` | CORE-0274 | tools | S7 core rules/spelling/identification |
| ConfusionSetLoader | `src/core/rules/ConfusionSetLoader.js` | CORE-0274 | - | S7 core rules/spelling/identification |
| ConfusionString | `src/core/rules/ConfusionString.js` | CORE-0274 | - | S7 core rules/spelling/identification |
| ConvertToSentenceCaseFilter | `src/core/rules/ConvertToSentenceCaseFilter.js` | CORE-0405 | rules/patterns, tools | S7 core rules/spelling/identification |
| CorrectExample | `src/core/rules/CorrectExample.js` | CORE-0125 | - | S3 core foundation |
| DateRangeChecker | `src/core/rules/DateRangeChecker.js` | CORE-0182 | rules/patterns | S7 core rules/spelling/identification |
| DemoRule | `src/core/rules/DemoRule.js` | CORE-0266 | - | S7 core rules/spelling/identification |
| DictionaryMatchFilter | `src/core/rules/DictionaryMatchFilter.js` | CORE-0186, SRV-0117 | markup | S3 core foundation |
| DictionarySpellMatchFilter | `src/core/rules/DictionarySpellMatchFilter.js` | CORE-0186, CORE-0449, SRV-0117 | markup | S7 core rules/spelling/identification |
| DoublePunctuationRule | `src/core/rules/DoublePunctuationRule.js` | CORE-0251 | - | S7 core rules/spelling/identification |
| EmptyLineRule | `src/core/rules/EmptyLineRule.js` | CORE-0417 | tools | S7 core rules/spelling/identification |
| ErrorTriggeringExample | `src/core/rules/ErrorTriggeringExample.js` | CORE-0125 | - | S3 core foundation |
| Example | `src/core/rules/Example.js` | CORE-0125 | - | S3 core foundation |
| ExampleSentence | `src/core/rules/ExampleSentence.js` | CORE-0125 | - | S3 core foundation |
| FakeRule | `src/core/rules/FakeRule.js` | CORE-0266 | - | S7 core rules/spelling/identification |
| GRPCPostProcessing | `src/core/rules/GRPCPostProcessing.js` | CORE-0343 (later) | rules/ml, tools | later |
| GRPCRule | `src/core/rules/GRPCRule.js` | CORE-0343 (later) | rules/ml, tools | later |
| GRPCUtils | `src/core/rules/GRPCUtils.js` | CORE-0343 (later) | chunking, rules/ml, tools/grpc | later |
| GenericUnpairedBracketsRule | `src/core/rules/GenericUnpairedBracketsRule.js` | CORE-0252 | - | S7 core rules/spelling/identification |
| GenericUnpairedQuotesRule | `src/core/rules/GenericUnpairedQuotesRule.js` | CORE-0253 | - | S7 core rules/spelling/identification |
| ITSIssueType | `src/core/rules/ITSIssueType.js` | CORE-0122 | - | S3 core foundation |
| IncorrectExample | `src/core/rules/IncorrectExample.js` | CORE-0125 | - | S3 core foundation |
| IsEnglishWordFilter | `src/core/rules/IsEnglishWordFilter.js` | CORE-0410 | rules/patterns, tagging | S7 core rules/spelling/identification |
| LanguageDependentRuleMatchFilter | `src/core/rules/LanguageDependentRuleMatchFilter.js` | CORE-0087, CORE-0186 | markup, rules/patterns | S3 core foundation |
| LineExpander | `src/core/rules/LineExpander.js` | CORE-0433, CORE-0352, DE-0102, DE-0133 | - | S3 core foundation |
| LongParagraphRule | `src/core/rules/LongParagraphRule.js` | CORE-0260 | tools | S7 core rules/spelling/identification |
| LongSentenceRule | `src/core/rules/LongSentenceRule.js` | CORE-0259, DE-0074, EN-0071 | tools | S7 core rules/spelling/identification |
| MatchPosition | `src/core/rules/MatchPosition.js` | CORE-0352 | - | S3 core foundation |
| MultipleWhitespaceRule | `src/core/rules/MultipleWhitespaceRule.js` | CORE-0256 | tools | S7 core rules/spelling/identification |
| NewLineMatchFilter | `src/core/rules/NewLineMatchFilter.js` | CORE-0416 | markup | S7 core rules/spelling/identification |
| ParagraphRepeatBeginningRule | `src/core/rules/ParagraphRepeatBeginningRule.js` | CORE-0422 | tools | S7 core rules/spelling/identification |
| PartialPosTagFilter | `src/core/rules/PartialPosTagFilter.js` | CORE-0180 | rules/patterns | S7 core rules/spelling/identification |
| PhraseRepeatRule | `src/core/rules/PhraseRepeatRule.js` | CORE-0263 | tools | S7 core rules/spelling/identification |
| PunctuationMarkAtParagraphEnd | `src/core/rules/PunctuationMarkAtParagraphEnd.js` | CORE-0418 | tokenizers, tools | S7 core rules/spelling/identification |
| PunctuationMarkAtParagraphEnd2 | `src/core/rules/PunctuationMarkAtParagraphEnd2.js` | CORE-0419 | tools | S7 core rules/spelling/identification |
| ReadabilityRule | `src/core/rules/ReadabilityRule.js` | CORE-0264, CORE-0447 | tools | S7 core rules/spelling/identification |
| RemoteRule | `src/core/rules/RemoteRule.js` | CORE-0089, CORE-0343 (later) | rules/spelling, tools | later |
| RemoteRuleConfig | `src/core/rules/RemoteRuleConfig.js` | CORE-0343 (later) | - | later |
| RemoteRuleFilters | `src/core/rules/RemoteRuleFilters.js` | CORE-0343 (later) | broker, rules/patterns | later |
| RemoteRuleMetrics | `src/core/rules/RemoteRuleMetrics.js` | CORE-0343 (later) | - | later |
| RemoteRuleResult | `src/core/rules/RemoteRuleResult.js` | CORE-0343 (later) | - | later |
| Rule | `src/core/rules/Rule.js` | CORE-0028, CORE-0031, CORE-0035, CORE-0055, CORE-0120, CORE-0142, CORE-0143, CORE-0148, DE-0089, EN-0074 | rules/patterns, tagging/disambiguation/rules | S3 core foundation |
| RuleMatch | `src/core/rules/RuleMatch.js` | CORE-0070, CORE-0110, CORE-0111, CORE-0112 | rules/patterns, tools | S3 core foundation |
| RuleMatchFilter | `src/core/rules/RuleMatchFilter.js` | CORE-0416, CORE-0186 | markup | S3 core foundation |
| RuleOption | `src/core/rules/RuleOption.js` | CORE-0124, CORE-0259, CORE-0428, CORE-0429, CORE-0430, SRV-0096, SRV-0135 | - | S3 core foundation |
| RuleWithMaxFilter | `src/core/rules/RuleWithMaxFilter.js` | CORE-0391, CORE-0172, CORE-0186 | rules/patterns | S3 core foundation |
| SameRuleGroupFilter | `src/core/rules/SameRuleGroupFilter.js` | CORE-0081, CORE-0087, CORE-0186 | - | S3 core foundation |
| ScoredConfusionSet | `src/core/rules/ScoredConfusionSet.js` | CORE-0274 | - | S7 core rules/spelling/identification |
| SentenceWhitespaceRule | `src/core/rules/SentenceWhitespaceRule.js` | CORE-0257, DE-0082 | tools | S7 core rules/spelling/identification |
| ShortenedYearRangeChecker | `src/core/rules/ShortenedYearRangeChecker.js` | CORE-0182 | rules/patterns | S7 core rules/spelling/identification |
| SimpleReplaceDataLoader | `src/core/rules/SimpleReplaceDataLoader.js` | CORE-0270 | - | S7 core rules/spelling/identification |
| SpecificIdRule | `src/core/rules/SpecificIdRule.js` | CORE-0266 | - | S7 core rules/spelling/identification |
| SuggestedReplacement | `src/core/rules/SuggestedReplacement.js` | CORE-0113 | rules/spelling | S3 core foundation |
| SuggestionFilter | `src/core/rules/SuggestionFilter.js` | CORE-0186 | - | S7 core rules/spelling/identification |
| SuggestionWithMessage | `src/core/rules/SuggestionWithMessage.js` | CORE-0352 | - | S3 core foundation |
| SuppressIfAnyRuleMatchesFilter | `src/core/rules/SuppressIfAnyRuleMatchesFilter.js` | CORE-0409 | rules/patterns | S7 core rules/spelling/identification |
| SymbolLocator | `src/core/rules/SymbolLocator.js` | CORE-0252 | - | S7 core rules/spelling/identification |
| SynonymsData | `src/core/rules/SynonymsData.js` | CORE-0432 | - | S7 core rules/spelling/identification |
| TestHackHelper | `src/core/rules/TestHackHelper.js` | CORE-0266 | - | S7 core rules/spelling/identification |
| TestRemoteRule | `src/core/rules/TestRemoteRule.js` | CORE-0266 | - | S7 core rules/spelling/identification |
| TextLevelRule | `src/core/rules/TextLevelRule.js` | CORE-0126 | markup | S3 core foundation |
| UnderlineSpacesFilter | `src/core/rules/UnderlineSpacesFilter.js` | CORE-0406 | rules/patterns, tools | S7 core rules/spelling/identification |
| UnsyncStack | `src/core/rules/UnsyncStack.js` | CORE-0252, CORE-0332 | - | S7 core rules/spelling/identification |
| UppercaseSentenceStartRule | `src/core/rules/UppercaseSentenceStartRule.js` | CORE-0254, DE-0225, EN-0223 | tokenizers, tools | S7 core rules/spelling/identification |
| WhiteSpaceAtBeginOfParagraph | `src/core/rules/WhiteSpaceAtBeginOfParagraph.js` | CORE-0420 | - | S7 core rules/spelling/identification |
| WhiteSpaceBeforeParagraphEnd | `src/core/rules/WhiteSpaceBeforeParagraphEnd.js` | CORE-0421 | tools | S7 core rules/spelling/identification |
| WhitespaceBeforePunctuationRule | `src/core/rules/WhitespaceBeforePunctuationRule.js` | CORE-0258 | tools | S7 core rules/spelling/identification |
| WhitespaceCheckFilter | `src/core/rules/WhitespaceCheckFilter.js` | CORE-0407 | rules/patterns | S7 core rules/spelling/identification |
| WordCoherencyDataLoader | `src/core/rules/WordCoherencyDataLoader.js` | CORE-0275 | - | S7 core rules/spelling/identification |
| WordRepeatBeginningRule | `src/core/rules/WordRepeatBeginningRule.js` | CORE-0262 | - | S7 core rules/spelling/identification |
| WordRepeatRule | `src/core/rules/WordRepeatRule.js` | CORE-0255 | tools | S7 core rules/spelling/identification |
| WrongWordInContextRule | `src/core/rules/WrongWordInContextRule.js` | CORE-0265 | tools | S7 core rules/spelling/identification |
| YMDDateHelper | `src/core/rules/YMDDateHelper.js` | CORE-0182 | - | S7 core rules/spelling/identification |

#### core: rules/bitext

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| BitextRule | `src/core/rules/bitext/BitextRule.js` | CORE-0291 | bitext, rules | S7 core rules/spelling/identification |
| DifferentLengthRule | `src/core/rules/bitext/DifferentLengthRule.js` | CORE-0291 | rules | S7 core rules/spelling/identification |
| DifferentPunctuationRule | `src/core/rules/bitext/DifferentPunctuationRule.js` | CORE-0291 | rules | S7 core rules/spelling/identification |
| IncorrectBitextExample | `src/core/rules/bitext/IncorrectBitextExample.js` | CORE-0291 | bitext | S7 core rules/spelling/identification |
| SameTranslationRule | `src/core/rules/bitext/SameTranslationRule.js` | CORE-0291 | rules | S7 core rules/spelling/identification |

#### core: rules/ml

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| MLServerGrpc | `src/core/rules/ml/MLServerGrpc.js` | CORE-0353 (later) | - | later |
| MLServerProto | `src/core/rules/ml/MLServerProto.js` | CORE-0353 (later) | - | later |
| PostProcessingServerGrpc | `src/core/rules/ml/PostProcessingServerGrpc.js` | CORE-0353 (later) | - | later |
| ProcessingServerGrpc | `src/core/rules/ml/ProcessingServerGrpc.js` | CORE-0353 (later) | - | later |

#### core: rules/ngrams

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| ConfusionProbabilityRule | `src/core/rules/ngrams/ConfusionProbabilityRule.js` | CORE-0341 (later) | broker, languagemodel, rules, rules/patterns, tagging/disambiguation/rules, tools | later |
| GoogleToken | `src/core/rules/ngrams/GoogleToken.js` | CORE-0340 (later) | languagemodel, tokenizers, tools | later |
| GoogleTokenUtil | `src/core/rules/ngrams/GoogleTokenUtil.js` | CORE-0353 (later) | - | later |
| LanguageModelUtils | `src/core/rules/ngrams/LanguageModelUtils.js` | CORE-0340 (later) | languagemodel, tokenizers | later |
| NgramProbabilityRule | `src/core/rules/ngrams/NgramProbabilityRule.js` | CORE-0341 (later) | languagemodel, rules, rules/patterns, synthesis, tokenizers | later |
| Probability | `src/core/rules/ngrams/Probability.js` | CORE-0340 (later) | - | later |

#### core: rules/patterns

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| AbstractPatternRule | `src/core/rules/patterns/AbstractPatternRule.js` | CORE-0153, CORE-0403 | rules, tagging/disambiguation/rules | S6 core patterns/disambiguation |
| AbstractPatternRulePerformer | `src/core/rules/patterns/AbstractPatternRulePerformer.js` | CORE-0380, CORE-0381, CORE-0384, CORE-0385, CORE-0386, CORE-0387, CORE-0388, CORE-0389, CORE-0391 | chunking | S6 core patterns/disambiguation |
| AbstractTokenBasedRule | `src/core/rules/patterns/AbstractTokenBasedRule.js` | CORE-0176 | tools | S6 core patterns/disambiguation |
| ApostropheTypeFilter | `src/core/rules/patterns/ApostropheTypeFilter.js` | CORE-0414 | rules | S6 core patterns/disambiguation |
| CaseConversionHelper | `src/core/rules/patterns/CaseConversionHelper.js` | CORE-0176 | tools | S6 core patterns/disambiguation |
| ConsistencyPatternRuleTransformer | `src/core/rules/patterns/ConsistencyPatternRuleTransformer.js` | CORE-0146 | rules | S6 core patterns/disambiguation |
| EquivalenceTypeLocator | `src/core/rules/patterns/EquivalenceTypeLocator.js` | CORE-0378, CORE-0352 | - | S6 core patterns/disambiguation |
| FalseFriendPatternRule | `src/core/rules/patterns/FalseFriendPatternRule.js` | CORE-0300 | - | S6 core patterns/disambiguation |
| FalseFriendRuleHandler | `src/core/rules/patterns/FalseFriendRuleHandler.js` | CORE-0300 | rules | S6 core patterns/disambiguation |
| FalseFriendRuleLoader | `src/core/rules/patterns/FalseFriendRuleLoader.js` | CORE-0300 | - | S6 core patterns/disambiguation |
| IgnoreWhitespaceFilter | `src/core/rules/patterns/IgnoreWhitespaceFilter.js` | CORE-0008 | - | S6 core patterns/disambiguation |
| Match | `src/core/rules/patterns/Match.js` | CORE-0082, CORE-0161, CORE-0162, CORE-0163, CORE-0172, CORE-0392, CORE-0401 | synthesis, tools | S6 core patterns/disambiguation |
| MatchState | `src/core/rules/patterns/MatchState.js` | CORE-0162, CORE-0163, CORE-0164, CORE-0392 | (root), synthesis, tools | S6 core patterns/disambiguation |
| PasswordAuthenticator | `src/core/rules/patterns/PasswordAuthenticator.js` | CORE-0062 | tools | S6 core patterns/disambiguation |
| PatternRule | `src/core/rules/patterns/PatternRule.js` | CORE-0152, CORE-0174, CORE-0292 | rules, tagging/disambiguation/rules, tools | S6 core patterns/disambiguation |
| PatternRuleBuilderHelper | `src/core/rules/patterns/PatternRuleBuilderHelper.js` | CORE-0178 | - | S6 core patterns/disambiguation |
| PatternRuleHandler | `src/core/rules/patterns/PatternRuleHandler.js` | CORE-0141, CORE-0142, CORE-0143, CORE-0144, CORE-0147, CORE-0148, CORE-0149, CORE-0152, CORE-0153, CORE-0154, CORE-0155, CORE-0160 | rules, tagging/disambiguation/rules, tools | S6 core patterns/disambiguation |
| PatternRuleId | `src/core/rules/patterns/PatternRuleId.js` | CORE-0174 | - | S6 core patterns/disambiguation |
| PatternRuleLoader | `src/core/rules/patterns/PatternRuleLoader.js` | CORE-0140, CORE-0142 | tools | S6 core patterns/disambiguation |
| PatternRuleMatcher | `src/core/rules/patterns/PatternRuleMatcher.js` | CORE-0164, CORE-0391, CORE-0172, CORE-0173, SRV-0175 | rules, tools | S6 core patterns/disambiguation |
| PatternRuleTransformer | `src/core/rules/patterns/PatternRuleTransformer.js` | CORE-0352 | rules | S6 core patterns/disambiguation |
| PatternRuleXmlCreator | `src/core/rules/patterns/PatternRuleXmlCreator.js` | CORE-0174 | - | S6 core patterns/disambiguation |
| PatternToken | `src/core/rules/patterns/PatternToken.js` | CORE-0366, CORE-0150, CORE-0151, CORE-0152, CORE-0378, CORE-0384, CORE-0385, CORE-0388 | chunking, synthesis, tools | S6 core patterns/disambiguation |
| PatternTokenBuilder | `src/core/rules/patterns/PatternTokenBuilder.js` | CORE-0178 | - | S6 core patterns/disambiguation |
| PatternTokenMatcher | `src/core/rules/patterns/PatternTokenMatcher.js` | CORE-0384 | - | S6 core patterns/disambiguation |
| RegexAntiPatternFilter | `src/core/rules/patterns/RegexAntiPatternFilter.js` | CORE-0177 | rules | S6 core patterns/disambiguation |
| RegexPatternRule | `src/core/rules/patterns/RegexPatternRule.js` | CORE-0365, CORE-0366, CORE-0148, CORE-0177 | rules, tools | S6 core patterns/disambiguation |
| RegexRuleFilter | `src/core/rules/patterns/RegexRuleFilter.js` | CORE-0177 | rules | S6 core patterns/disambiguation |
| RegexRuleFilterCreator | `src/core/rules/patterns/RegexRuleFilterCreator.js` | CORE-0156 | - | S6 core patterns/disambiguation |
| RegexRuleFilterEvaluator | `src/core/rules/patterns/RegexRuleFilterEvaluator.js` | CORE-0177 | rules | S6 core patterns/disambiguation |
| RepeatedPatternRuleTransformer | `src/core/rules/patterns/RepeatedPatternRuleTransformer.js` | CORE-0145 | rules | S6 core patterns/disambiguation |
| RuleFilter | `src/core/rules/patterns/RuleFilter.js` | CORE-0156, CORE-0158 | rules, synthesis, tagging, tools | S6 core patterns/disambiguation |
| RuleFilterCreator | `src/core/rules/patterns/RuleFilterCreator.js` | CORE-0156 | - | S6 core patterns/disambiguation |
| RuleFilterEvaluator | `src/core/rules/patterns/RuleFilterEvaluator.js` | CORE-0157 | rules | S6 core patterns/disambiguation |
| RuleMatcher | `src/core/rules/patterns/RuleMatcher.js` | CORE-0352 | rules | S6 core patterns/disambiguation |
| RuleSet | `src/core/rules/patterns/RuleSet.js` | CORE-0077, CORE-0081, CORE-0390, CORE-0175 | rules | S6 core patterns/disambiguation |
| StringMatcher | `src/core/rules/patterns/StringMatcher.js` | CORE-0375, CORE-0365, CORE-0366, CORE-0390, CORE-0175 | tools | S6 core patterns/disambiguation |
| Substrings | `src/core/rules/patterns/Substrings.js` | CORE-0175 | - | S6 core patterns/disambiguation |
| Unifier | `src/core/rules/patterns/Unifier.js` | CORE-0379, CORE-0380, CORE-0382, CORE-0383, CORE-0389, CORE-0400 | - | S6 core patterns/disambiguation |
| UnifierConfiguration | `src/core/rules/patterns/UnifierConfiguration.js` | CORE-0378 | - | S6 core patterns/disambiguation |
| XMLRuleHandler | `src/core/rules/patterns/XMLRuleHandler.js` | CORE-0147, CORE-0150, CORE-0151, CORE-0378, CORE-0381, CORE-0382, CORE-0160, CORE-0161 | chunking, rules, synthesis, tagging/disambiguation/rules, tools | S6 core patterns/disambiguation |

#### core: rules/patterns/bitext

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| BitextPatternRule | `src/core/rules/patterns/bitext/BitextPatternRule.js` | CORE-0292 | rules, rules/bitext, rules/patterns | S6 core patterns/disambiguation |
| BitextPatternRuleHandler | `src/core/rules/patterns/bitext/BitextPatternRuleHandler.js` | CORE-0292 | bitext, rules, rules/bitext, rules/patterns | S6 core patterns/disambiguation |
| BitextPatternRuleLoader | `src/core/rules/patterns/bitext/BitextPatternRuleLoader.js` | CORE-0292 | rules/patterns | S6 core patterns/disambiguation |
| FalseFriendsAsBitextLoader | `src/core/rules/patterns/bitext/FalseFriendsAsBitextLoader.js` | CORE-0292 | rules/patterns | S6 core patterns/disambiguation |

#### core: rules/spelling

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| CachingWordListLoader | `src/core/rules/spelling/CachingWordListLoader.js` | CORE-0433, CORE-0425 | - | S7 core rules/spelling/identification |
| CommonFileTypes | `src/core/rules/spelling/CommonFileTypes.js` | CORE-0240 | - | S7 core rules/spelling/identification |
| ForeignLanguageChecker | `src/core/rules/spelling/ForeignLanguageChecker.js` | CORE-0436, CORE-0442, CORE-0239 | language/identifier | S7 core rules/spelling/identification |
| RuleWithLanguage | `src/core/rules/spelling/RuleWithLanguage.js` | CORE-0240 | rules | S7 core rules/spelling/identification |
| SpellingCheckRule | `src/core/rules/spelling/SpellingCheckRule.js` | CORE-0433, CORE-0434, CORE-0435, CORE-0437, DE-0184 | languagemodel, rules, rules/patterns, rules/spelling/suggestions, tagging/disambiguation/rules, tokenizers, tools | S7 core rules/spelling/identification |
| SymSpellRule | `src/core/rules/spelling/SymSpellRule.js` | CORE-0238 | broker, languagemodel, rules, rules/spelling/suggestions, rules/spelling/symspell/implementation | S7 core rules/spelling/identification |
| VagueSpellChecker | `src/core/rules/spelling/VagueSpellChecker.js` | CORE-0239 | rules, rules/spelling/hunspell, rules/spelling/morfologik | S7 core rules/spelling/identification |

#### core: rules/spelling/hunspell

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| CompoundAwareHunspellRule | `src/core/rules/spelling/hunspell/CompoundAwareHunspellRule.js` | CORE-0236 | languagemodel, rules/spelling/morfologik, tokenizers, tools | S7 core rules/spelling/identification |
| DumontsHunspellDictionary | `src/core/rules/spelling/hunspell/DumontsHunspellDictionary.js` | CORE-0003, CORE-0443 | - | S7 core rules/spelling/identification |
| Hunspell | `src/core/rules/spelling/hunspell/Hunspell.js` | CORE-0003, CORE-0025, CORE-0443, DE-0205 | broker | S7 core rules/spelling/identification |
| HunspellDictionary | `src/core/rules/spelling/hunspell/HunspellDictionary.js` | CORE-0235 | - | S7 core rules/spelling/identification |
| HunspellNoSuggestionRule | `src/core/rules/spelling/hunspell/HunspellNoSuggestionRule.js` | CORE-0442 | rules | S7 core rules/spelling/identification |
| HunspellRule | `src/core/rules/spelling/hunspell/HunspellRule.js` | CORE-0440, CORE-0441, CORE-0442, CORE-0443, DE-0205, SRV-0175 | languagemodel, rules, rules/spelling, tools | S7 core rules/spelling/identification |

#### core: rules/spelling/morfologik

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| MorfologikMultiSpeller | `src/core/rules/spelling/morfologik/MorfologikMultiSpeller.js` | CORE-0439, CORE-0232, DE-0102 | (root), rules/spelling | S7 core rules/spelling/identification |
| MorfologikSpeller | `src/core/rules/spelling/morfologik/MorfologikSpeller.js` | CORE-0372, CORE-0374, CORE-0375, CORE-0376 | broker, rules/patterns, rules/spelling, tools | S7 core rules/spelling/identification |
| MorfologikSpellerRule | `src/core/rules/spelling/morfologik/MorfologikSpellerRule.js` | CORE-0436, CORE-0437, CORE-0438, CORE-0439, CORE-0345, CORE-0447, EN-0081 | (root), languagemodel, rules, rules/spelling, rules/spelling/suggestions, rules/translation, tools | S7 core rules/spelling/identification |
| WeightedSuggestion | `src/core/rules/spelling/morfologik/WeightedSuggestion.js` | CORE-0233 | - | S7 core rules/spelling/identification |

#### core: rules/spelling/morfologik/suggestions_ordering

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| DetailedDamerauLevenstheinDistance | `src/core/rules/spelling/morfologik/suggestions_ordering/DetailedDamerauLevenstheinDistance.js` | CORE-0233 | - | S7 core rules/spelling/identification |
| SuggestionsOrdererConfig | `src/core/rules/spelling/morfologik/suggestions_ordering/SuggestionsOrdererConfig.js` | CORE-0233 | - | S7 core rules/spelling/identification |

#### core: rules/spelling/multitoken

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| MultitokenSpeller | `src/core/rules/spelling/multitoken/MultitokenSpeller.js` | CORE-0237 | rules/spelling, rules/spelling/morfologik, tools | S7 core rules/spelling/identification |
| MultitokenSpellerFilter | `src/core/rules/spelling/multitoken/MultitokenSpellerFilter.js` | CORE-0415, CORE-0237 | rules, rules/patterns, rules/spelling, tools | S7 core rules/spelling/identification |

#### core: rules/spelling/suggestions

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| SuggestionChangesExperiment | `src/core/rules/spelling/suggestions/SuggestionChangesExperiment.js` | CORE-0233 | - | S7 core rules/spelling/identification |
| SuggestionsChanges | `src/core/rules/spelling/suggestions/SuggestionsChanges.js` | CORE-0233 | - | S7 core rules/spelling/identification |
| SuggestionsOrderer | `src/core/rules/spelling/suggestions/SuggestionsOrderer.js` | CORE-0233 | rules | S7 core rules/spelling/identification |
| SuggestionsOrdererFeatureExtractor | `src/core/rules/spelling/suggestions/SuggestionsOrdererFeatureExtractor.js` | CORE-0234 (later) | languagemodel, rules, rules/ngrams, rules/spelling/morfologik/suggestions_ordering, rules/spelling/symspell/implementation | later |
| SuggestionsRanker | `src/core/rules/spelling/suggestions/SuggestionsRanker.js` | CORE-0233 | rules | S7 core rules/spelling/identification |

#### core: rules/spelling/symspell/implementation

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| ChunkArray | `src/core/rules/spelling/symspell/implementation/ChunkArray.js` | CORE-0238 | - | S7 core rules/spelling/identification |
| EditDistance | `src/core/rules/spelling/symspell/implementation/EditDistance.js` | CORE-0238 | - | S7 core rules/spelling/identification |
| SuggestItem | `src/core/rules/spelling/symspell/implementation/SuggestItem.js` | CORE-0238 | - | S7 core rules/spelling/identification |
| SuggestionStage | `src/core/rules/spelling/symspell/implementation/SuggestionStage.js` | CORE-0238 | - | S7 core rules/spelling/identification |
| SymSpell | `src/core/rules/spelling/symspell/implementation/SymSpell.js` | CORE-0238 | - | S7 core rules/spelling/identification |

#### core: rules/translation

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| DataSource | `src/core/rules/translation/DataSource.js` | CORE-0345 | - | S7 core rules/spelling/identification |
| TranslationData | `src/core/rules/translation/TranslationData.js` | CORE-0345 | - | S7 core rules/spelling/identification |
| TranslationEntry | `src/core/rules/translation/TranslationEntry.js` | CORE-0345 | - | S7 core rules/spelling/identification |
| Translator | `src/core/rules/translation/Translator.js` | CORE-0345 | - | S7 core rules/spelling/identification |

#### core: synthesis

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| BaseSynthesizer | `src/core/synthesis/BaseSynthesizer.js` | CORE-0373, CORE-0220, CORE-0221, DE-0170, DE-0172, DE-0191 | rules/spelling/morfologik, tools | S5 core analysis |
| ManualSynthesizer | `src/core/synthesis/ManualSynthesizer.js` | CORE-0222 | tagging, tools | S5 core analysis |
| Soros | `src/core/synthesis/Soros.js` | CORE-0044, CORE-0221 | - | S5 core analysis |
| Synthesizer | `src/core/synthesis/Synthesizer.js` | CORE-0220, CORE-0346 | - | S5 core analysis |
| SynthesizerTools | `src/core/synthesis/SynthesizerTools.js` | CORE-0220 | tools | S5 core analysis |

#### core: tagging

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| BaseTagger | `src/core/tagging/BaseTagger.js` | CORE-0210, DE-0170 | rules/spelling/morfologik, tools | S5 core analysis |
| CombiningTagger | `src/core/tagging/CombiningTagger.js` | CORE-0210, CORE-0212 | - | S5 core analysis |
| ManualTagger | `src/core/tagging/ManualTagger.js` | CORE-0211 | synthesis, tools | S5 core analysis |
| MorfologikTagger | `src/core/tagging/MorfologikTagger.js` | CORE-0370, CORE-0373, CORE-0213 | - | S5 core analysis |
| TaggedWord | `src/core/tagging/TaggedWord.js` | CORE-0213 | - | S5 core analysis |
| Tagger | `src/core/tagging/Tagger.js` | CORE-0352 | - | S5 core analysis |
| WordTagger | `src/core/tagging/WordTagger.js` | CORE-0213 | - | S5 core analysis |

#### core: tagging/disambiguation

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| AbstractDisambiguator | `src/core/tagging/disambiguation/AbstractDisambiguator.js` | CORE-0190 | - | S5 core analysis |
| Disambiguator | `src/core/tagging/disambiguation/Disambiguator.js` | CORE-0190, CORE-0216 | - | S5 core analysis |
| MultiWordChunker | `src/core/tagging/disambiguation/MultiWordChunker.js` | CORE-0193 | tools | S5 core analysis |
| MultiWordChunker2 | `src/core/tagging/disambiguation/MultiWordChunker2.js` | CORE-0194 | tools | S5 core analysis |

#### core: tagging/disambiguation/rules

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| DisambiguatedExample | `src/core/tagging/disambiguation/rules/DisambiguatedExample.js` | CORE-0352 | - | S6 core patterns/disambiguation |
| DisambiguationPatternRule | `src/core/tagging/disambiguation/rules/DisambiguationPatternRule.js` | CORE-0149 | rules/patterns | S6 core patterns/disambiguation |
| DisambiguationPatternRuleReplacer | `src/core/tagging/disambiguation/rules/DisambiguationPatternRuleReplacer.js` | CORE-0191, CORE-0392, CORE-0393, CORE-0394, CORE-0395, CORE-0396, CORE-0397, CORE-0398, CORE-0399, CORE-0400, CORE-0401 | chunking, rules, rules/patterns, tools | S6 core patterns/disambiguation |
| DisambiguationRuleHandler | `src/core/tagging/disambiguation/rules/DisambiguationRuleHandler.js` | CORE-0191 | rules/patterns, tools | S6 core patterns/disambiguation |
| DisambiguationRuleLoader | `src/core/tagging/disambiguation/rules/DisambiguationRuleLoader.js` | CORE-0191 | tools | S6 core patterns/disambiguation |
| XmlRuleDisambiguator | `src/core/tagging/disambiguation/rules/XmlRuleDisambiguator.js` | CORE-0044, CORE-0190 | rules, rules/patterns, tagging/disambiguation | S6 core patterns/disambiguation |

#### core: tagging/disambiguation/xx

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| DemoDisambiguator | `src/core/tagging/disambiguation/xx/DemoDisambiguator.js` | CORE-0030, CORE-0350 | tagging/disambiguation | S5 core analysis |

#### core: tagging/ner

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| NERService | `src/core/tagging/ner/NERService.js` | CORE-0344 (later) | tools | later |

#### core: tagging/xx

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| DemoTagger | `src/core/tagging/xx/DemoTagger.js` | CORE-0030, CORE-0213, CORE-0350 | tagging | S5 core analysis |

#### core: tokenizers

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| CompoundWordTokenizer | `src/core/tokenizers/CompoundWordTokenizer.js` | CORE-0203, CORE-0236 | - | S5 core analysis |
| SRXSentenceTokenizer | `src/core/tokenizers/SRXSentenceTokenizer.js` | CORE-0004, CORE-0200 | - | S5 core analysis |
| SentenceTokenizer | `src/core/tokenizers/SentenceTokenizer.js` | CORE-0203 | - | S5 core analysis |
| SimpleSentenceTokenizer | `src/core/tokenizers/SimpleSentenceTokenizer.js` | CORE-0030, CORE-0201 | language, rules | S5 core analysis |
| SrxTools | `src/core/tokenizers/SrxTools.js` | CORE-0004, CORE-0366, CORE-0200 | - | S5 core analysis |
| Tokenizer | `src/core/tokenizers/Tokenizer.js` | CORE-0203 | - | S5 core analysis |
| WordTokenizer | `src/core/tokenizers/WordTokenizer.js` | CORE-0030, CORE-0202 | tools | S5 core analysis |

#### core: tools

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| CircuitBreakers | `src/core/tools/CircuitBreakers.js` | CORE-0333 | - | S3 core foundation |
| ConfidenceKey | `src/core/tools/ConfidenceKey.js` | CORE-0332 | - | S3 core foundation |
| ContextTools | `src/core/tools/ContextTools.js` | CORE-0320, CORE-0321, CORE-0323 | - | S3 core foundation |
| DiffsAsMatches | `src/core/tools/DiffsAsMatches.js` | CORE-0331 | - | S3 core foundation |
| InterruptibleCharSequence | `src/core/tools/InterruptibleCharSequence.js` | CORE-0332 | - | S3 core foundation |
| JnaTools | `src/core/tools/JnaTools.js` | CORE-0332, CLI-0067 | - | S3 core foundation |
| LoggingTools | `src/core/tools/LoggingTools.js` | CORE-0332 | - | S3 core foundation |
| LtThreadPoolExecutor | `src/core/tools/LtThreadPoolExecutor.js` | CORE-0333 | - | S3 core foundation |
| LtThreadPoolFactory | `src/core/tools/LtThreadPoolFactory.js` | CORE-0333 | - | S3 core foundation |
| MostlySingularMultiMap | `src/core/tools/MostlySingularMultiMap.js` | CORE-0332 | - | S3 core foundation |
| MultiKeyProperties | `src/core/tools/MultiKeyProperties.js` | CORE-0020, CORE-0332 | - | S3 core foundation |
| PseudoMatch | `src/core/tools/PseudoMatch.js` | CORE-0331 | - | S3 core foundation |
| RuleMatchesAsJsonSerializer | `src/core/tools/RuleMatchesAsJsonSerializer.js` | CORE-0007, CORE-0322, CORE-0323, CORE-0324, CORE-0325, CORE-0326, CLI-0051 | markup, rules | S3 core foundation |
| StringInterner | `src/core/tools/StringInterner.js` | CORE-0150, CORE-0332 | - | S3 core foundation |
| StringTools | `src/core/tools/StringTools.js` | CORE-0009, CORE-0406, CORE-0329, CORE-0444, CORE-0445, CORE-0446 | - | S3 core foundation |
| TelemetryProvider | `src/core/tools/TelemetryProvider.js` | CORE-0334 (later) | - | later |
| Tools | `src/core/tools/Tools.js` | CORE-0043, CORE-0056, CORE-0062, CORE-0439, CORE-0418, CORE-0293, CORE-0327, CORE-0328, CLI-0012, CLI-0028, CLI-0040, CLI-0053, CORE-0447, EN-0220 | rules, rules/bitext, rules/patterns, rules/patterns/bitext | S3 core foundation |
| TracedFunction | `src/core/tools/TracedFunction.js` | CORE-0334 (later) | - | later |
| WrappedValue | `src/core/tools/WrappedValue.js` | CORE-0334 (later) | - | later |
| WrappedVoid | `src/core/tools/WrappedVoid.js` | CORE-0334 (later) | - | later |

#### core: tools/Cache

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| CacheUtils | `src/core/tools/Cache/CacheUtils.js` | CORE-0095 | rules, rules/ml, tools/grpc | S3 core foundation |
| ProtoResultCache | `src/core/tools/Cache/ProtoResultCache.js` | CORE-0095 | - | S3 core foundation |

#### core: tools/grpc

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| ProtoHelper | `src/core/tools/grpc/ProtoHelper.js` | CORE-0353 (later) | rules | later |
| RuleData | `src/core/tools/grpc/RuleData.js` | CORE-0353 (later) | rules, rules/ml, tools | later |

### cli (`languagetool-commandline/org/languagetool/commandline` -> `src/cli`), 6 classes


#### cli: (root)

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| CommandLineOptions | `src/cli/CommandLineOptions.js` | CLI-0020, CLI-0070 | rules | S12 cli |
| CommandLineParser | `src/cli/CommandLineParser.js` | CLI-0001, CLI-0002, CLI-0003, CLI-0004, CLI-0007, CLI-0008, CLI-0009, CLI-0010, CLI-0011, CLI-0012, CLI-0014, CLI-0015, CLI-0016, CLI-0017, CLI-0018, CLI-0019, CLI-0020, CLI-0021, CLI-0022, CLI-0030, CLI-0031, CLI-0032, CLI-0033, CLI-0034 | - | S12 cli |
| CommandLineTools | `src/cli/CommandLineTools.js` | CLI-0041, CLI-0046, CLI-0047, CLI-0048, CLI-0049, CLI-0051, CLI-0054, CLI-0055, CLI-0064, CLI-0065, CLI-0069 | bitext, markup, rules, rules/bitext, rules/patterns, tagging/disambiguation/rules, tokenizers, tools | S12 cli |
| Main | `src/cli/Main.js` | CLI-0001, CLI-0002, CLI-0005, CLI-0006, CLI-0007, CLI-0013, CLI-0022, CLI-0023, CLI-0025, CLI-0027, CLI-0028, CLI-0029, CLI-0031, CLI-0035, CLI-0036, CLI-0037, CLI-0038, CLI-0039, CLI-0040, CLI-0041, CLI-0042, CLI-0043, CLI-0044, CLI-0045, CLI-0050, CLI-0052, CLI-0053, CLI-0056, CLI-0057, CLI-0058, CLI-0059, CLI-0060, CLI-0061, CLI-0062, CLI-0066, CLI-0068, CLI-0071 | bitext, language, language/identifier, rules, rules/bitext, rules/patterns, tools | S12 cli |
| UnknownParameterException | `src/cli/UnknownParameterException.js` | CLI-0002 | - | S12 cli |
| WrongParameterNumberException | `src/cli/WrongParameterNumberException.js` | CLI-0001 | - | S12 cli |

### server (`languagetool-server/org/languagetool/server` -> `src/server`), 56 classes


#### server: (root)

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| APINewGroup | `src/server/APINewGroup.js` | SRV-0172 (later) | - | later |
| AbTestService | `src/server/AbTestService.js` | SRV-0144, SRV-0173 | - | S13 server |
| ActiveRules | `src/server/ActiveRules.js` | SRV-0175, SRV-0176 | rules/patterns, rules/spelling/hunspell | S13 server |
| ActiveRulesMBean | `src/server/ActiveRulesMBean.js` | SRV-0176, SRV-0173 | - | S13 server |
| ApiV2 | `src/server/ApiV2.js` | SRV-0074, SRV-0090, SRV-0091, SRV-0092, SRV-0093, SRV-0094, SRV-0095, SRV-0096, SRV-0097, SRV-0098, SRV-0099, SRV-0100, SRV-0104, SRV-0105, SRV-0193, SRV-0195, SRV-0197 | markup, rules, server, tools | S13 server |
| AuthException | `src/server/AuthException.js` | SRV-0049, SRV-0075, SRV-0193, SRV-0195, SRV-0197, SRV-0104, SRV-0105, SRV-0106 | - | S13 server |
| BadRequestException | `src/server/BadRequestException.js` | SRV-0072, SRV-0075, SRV-0076, SRV-0193 | - | S13 server |
| BasicAuthentication | `src/server/BasicAuthentication.js` | SRV-0106 | - | S13 server |
| ConfidenceMapLoader | `src/server/ConfidenceMapLoader.js` | SRV-0037 | tools | S13 server |
| DBGroup | `src/server/DBGroup.js` | SRV-0172 (later) | - | later |
| DBGroupMember | `src/server/DBGroupMember.js` | SRV-0172 (later) | - | later |
| DBInvite | `src/server/DBInvite.js` | SRV-0172 (later) | - | later |
| DatabaseAccess | `src/server/DatabaseAccess.js` | SRV-0015, SRV-0048, SRV-0199 | rules | S13 server |
| DatabaseAccessOpenSource | `src/server/DatabaseAccessOpenSource.js` | SRV-0089, SRV-0193, SRV-0194, SRV-0195, SRV-0196, SRV-0197, SRV-0198, SRV-0104, SRV-0105, SRV-0112, SRV-0199 | rules | S13 server |
| DatabaseCheckLogEntry | `src/server/DatabaseCheckLogEntry.js` | SRV-0171 (later) | - | later |
| DatabaseLogEntry | `src/server/DatabaseLogEntry.js` | SRV-0171 (later) | - | later |
| DatabaseLogger | `src/server/DatabaseLogger.js` | SRV-0143, SRV-0200, SRV-0201, SRV-0202 | - | S13 server |
| DatabasePingLogEntry | `src/server/DatabasePingLogEntry.js` | SRV-0171 (later) | - | later |
| DictGroupEntry | `src/server/DictGroupEntry.js` | SRV-0172 (later) | - | later |
| ErrorRequestLimiter | `src/server/ErrorRequestLimiter.js` | SRV-0086 | - | S13 server |
| ExtendedUserInfo | `src/server/ExtendedUserInfo.js` | SRV-0172 (later) | - | later |
| GRPCServer | `src/server/GRPCServer.js` | SRV-0164 (later) | rules, rules/ml | later |
| GroupRoles | `src/server/GroupRoles.js` | SRV-0172 (later) | - | later |
| HTTPSServer | `src/server/HTTPSServer.js` | SRV-0177, SRV-0178 | server, tools | S13 server |
| HTTPSServerConfig | `src/server/HTTPSServerConfig.js` | SRV-0177 | - | S13 server |
| HTTPServer | `src/server/HTTPServer.js` | SRV-0001, SRV-0008, SRV-0009, SRV-0010, SRV-0015, SRV-0017, SRV-0018, SRV-0020, SRV-0187 | server, tools | S13 server |
| HTTPServerConfig | `src/server/HTTPServerConfig.js` | SRV-0004, SRV-0005, SRV-0006, SRV-0007, SRV-0010, SRV-0011, SRV-0013, SRV-0014, SRV-0030, SRV-0031, SRV-0032, SRV-0033, SRV-0034, SRV-0035, SRV-0036, SRV-0039, SRV-0040, SRV-0041, SRV-0043, SRV-0044, SRV-0045, SRV-0046, SRV-0047, SRV-0048, SRV-0049, SRV-0051, SRV-0053, SRV-0054, SRV-0055, SRV-0057, SRV-0058, SRV-0059, SRV-0061, SRV-0177, SRV-0181, SRV-0183, SRV-0185, SRV-0187, SRV-0189, SRV-0191 | rules/spelling/morfologik/suggestions_ordering | S13 server |
| HTTPTestTools | `src/server/HTTPTestTools.js` | SRV-0168 | tools | S13 server |
| IllegalConfigurationException | `src/server/IllegalConfigurationException.js` | SRV-0177 | - | S13 server |
| InstrumentedAppender | `src/server/InstrumentedAppender.js` | SRV-0188, SRV-0089 | - | S13 server |
| JwtContent | `src/server/JwtContent.js` | SRV-0166 (later) | - | later |
| LanguageToolHttpHandler | `src/server/LanguageToolHttpHandler.js` | SRV-0007, SRV-0070, SRV-0071, SRV-0072, SRV-0073, SRV-0074, SRV-0075, SRV-0076, SRV-0077, SRV-0078, SRV-0079, SRV-0080, SRV-0081, SRV-0082, SRV-0083, SRV-0084, SRV-0086, SRV-0087 | server, tools | S13 server |
| LimitEnforcementMode | `src/server/LimitEnforcementMode.js` | SRV-0161 | - | S13 server |
| LocalAbTestService | `src/server/LocalAbTestService.js` | SRV-0144 | - | S13 server |
| LoggingInterceptor | `src/server/LoggingInterceptor.js` | SRV-0171 (later) | - | later |
| PathNotFoundException | `src/server/PathNotFoundException.js` | SRV-0075 | - | S13 server |
| Pipeline | `src/server/Pipeline.js` | SRV-0150, SRV-0151, SRV-0152, SRV-0153 | markup, rules, rules/patterns | S13 server |
| PipelinePool | `src/server/PipelinePool.js` | SRV-0182, SRV-0041, SRV-0044, SRV-0054, SRV-0117, SRV-0128, SRV-0137, SRV-0150, SRV-0151, SRV-0152 | gui, rules, tools | S13 server |
| PipelineSettings | `src/server/PipelineSettings.js` | SRV-0150 | - | S13 server |
| PortBindingException | `src/server/PortBindingException.js` | SRV-0017 | - | S13 server |
| RemoteRuleMatch | `src/server/RemoteRuleMatch.js` | SRV-0165 (later) | rules | later |
| RemoteSynthesizer | `src/server/RemoteSynthesizer.js` | SRV-0164 (later) | grpc, rules, synthesis | later |
| RequestCounter | `src/server/RequestCounter.js` | SRV-0170 | - | S13 server |
| RequestLimiter | `src/server/RequestLimiter.js` | SRV-0085, SRV-0115 | - | S13 server |
| ResultExtender | `src/server/ResultExtender.js` | SRV-0141 (later) | rules | later |
| Server | `src/server/Server.js` | SRV-0001, SRV-0002, SRV-0003, SRV-0009, SRV-0015, SRV-0016, SRV-0020, SRV-0084 | server, tools | S13 server |
| ServerMetricsCollector | `src/server/ServerMetricsCollector.js` | SRV-0188 (later) | - | later |
| ServerTools | `src/server/ServerTools.js` | SRV-0077, SRV-0082, SRV-0088, SRV-0089, SRV-0174, SRV-0091, SRV-0193, SRV-0111, SRV-0130, SRV-0131, SRV-0134 | - | S13 server |
| TextChecker | `src/server/TextChecker.js` | SRV-0045, SRV-0047, SRV-0048, SRV-0049, SRV-0055, SRV-0191, SRV-0076, SRV-0081, SRV-0097, SRV-0113, SRV-0114, SRV-0116, SRV-0118, SRV-0120, SRV-0121, SRV-0122, SRV-0125, SRV-0126, SRV-0127, SRV-0128, SRV-0129, SRV-0132, SRV-0133, SRV-0134, SRV-0135, SRV-0136, SRV-0137, SRV-0138, SRV-0139, SRV-0142, SRV-0143, SRV-0144, SRV-0154, SRV-0155 | language/identifier, markup, rules, rules/bitext, rules/spelling/morfologik/suggestions_ordering, server, tools | S13 server |
| TextTooLongException | `src/server/TextTooLongException.js` | SRV-0073, SRV-0075, SRV-0114 | - | S13 server |
| TooManyRequestsException | `src/server/TooManyRequestsException.js` | SRV-0084 | - | S13 server |
| UUIDTypeHandler | `src/server/UUIDTypeHandler.js` | SRV-0167 (later) | - | later |
| UnavailableException | `src/server/UnavailableException.js` | SRV-0075 | - | S13 server |
| UserInfoEntry | `src/server/UserInfoEntry.js` | SRV-0105, SRV-0172 | - | S13 server |
| UserLimits | `src/server/UserLimits.js` | SRV-0048, SRV-0190, SRV-0111, SRV-0160, SRV-0166 | - | S13 server |
| V2TextChecker | `src/server/V2TextChecker.js` | SRV-0037, SRV-0110, SRV-0120, SRV-0121, SRV-0122, SRV-0127, SRV-0140 | markup, rules, server, tools | S13 server |

### en (`languagetool-language-modules/en/org/languagetool` -> `src/lang/en`), 77 classes


#### en: chunking

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| EnglishChunkFilter | `src/lang/en/chunking/EnglishChunkFilter.js` | EN-0026, EN-0027, EN-0033 | - | S9 en |
| EnglishChunker | `src/lang/en/chunking/EnglishChunker.js` | EN-0001, EN-0026, EN-0150, EN-0204, EN-0205, EN-0206 | tools | S9 en |

#### en: language

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| AmericanEnglish | `src/lang/en/language/AmericanEnglish.js` | EN-0001, EN-0009, EN-0015, EN-0064, EN-0105 | languagemodel, rules, rules/en, rules/spelling, rules/spelling/suggestions | S9 en |
| AustralianEnglish | `src/lang/en/language/AustralianEnglish.js` | EN-0011, EN-0015 | languagemodel, rules, rules/en, rules/spelling | S9 en |
| BritishEnglish | `src/lang/en/language/BritishEnglish.js` | EN-0010, EN-0015 | languagemodel, rules, rules/en, rules/spelling | S9 en |
| CanadianEnglish | `src/lang/en/language/CanadianEnglish.js` | EN-0012, EN-0015 | languagemodel, rules, rules/en, rules/spelling | S9 en |
| English | `src/lang/en/language/English.js` | EN-0001, EN-0002, EN-0003, EN-0004, EN-0005, EN-0006, EN-0007, EN-0008, EN-0022, EN-0223 | chunking, languagemodel, markup, rules, rules/en, rules/patterns, rules/spelling, rules/spelling/multitoken, synthesis, synthesis/en, tagging, tagging/disambiguation, tagging/en, tokenizers, tokenizers/en, tools | S9 en |
| NewZealandEnglish | `src/lang/en/language/NewZealandEnglish.js` | EN-0013, EN-0015 | languagemodel, rules, rules/en, rules/spelling | S9 en |
| SouthAfricanEnglish | `src/lang/en/language/SouthAfricanEnglish.js` | EN-0014, EN-0015 | languagemodel, rules, rules/en, rules/spelling | S9 en |

#### en: rules/en

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| AbstractEnglishSpellerRule | `src/lang/en/rules/en/AbstractEnglishSpellerRule.js` | EN-0040, EN-0041, EN-0080, EN-0081 | languagemodel, rules, rules/en/translation, rules/spelling/morfologik, rules/translation, tagging/ner, tools | S9 en |
| AdvancedSynthesizerFilter | `src/lang/en/rules/en/AdvancedSynthesizerFilter.js` | EN-0101 | rules | S9 en |
| AdverbFilter | `src/lang/en/rules/en/AdverbFilter.js` | EN-0100 | rules, rules/patterns | S9 en |
| AmericanReplaceRule | `src/lang/en/rules/en/AmericanReplaceRule.js` | EN-0009, EN-0050 | language, rules | S9 en |
| AvsAnData | `src/lang/en/rules/en/AvsAnData.js` | EN-0053, EN-0183 | - | S9 en |
| AvsAnRule | `src/lang/en/rules/en/AvsAnRule.js` | EN-0002, EN-0024, EN-0053 | rules, tools | S9 en |
| BritishReplaceRule | `src/lang/en/rules/en/BritishReplaceRule.js` | EN-0010, EN-0051 | language, rules | S9 en |
| CompoundRule | `src/lang/en/rules/en/CompoundRule.js` | EN-0002, EN-0054, EN-0174 | rules, rules/patterns, tagging/disambiguation/rules, tools | S9 en |
| ConsistentApostrophesRule | `src/lang/en/rules/en/ConsistentApostrophesRule.js` | EN-0002, EN-0055 | rules, tools | S9 en |
| ContractionSpellingRule | `src/lang/en/rules/en/ContractionSpellingRule.js` | EN-0002, EN-0056, EN-0184 | rules, tools | S9 en |
| DateCheckFilter | `src/lang/en/rules/en/DateCheckFilter.js` | EN-0102 | rules, tools | S9 en |
| DateFilterHelper | `src/lang/en/rules/en/DateFilterHelper.js` | EN-0102 | tools | S9 en |
| EnglishConfusionProbabilityRule | `src/lang/en/rules/en/EnglishConfusionProbabilityRule.js` | EN-0003, EN-0057 (later) | languagemodel, rules, rules/ngrams, rules/patterns | later |
| EnglishConvertToSentenceCaseFilter | `src/lang/en/rules/en/EnglishConvertToSentenceCaseFilter.js` | EN-0104 | rules | S9 en |
| EnglishDashRule | `src/lang/en/rules/en/EnglishDashRule.js` | EN-0002, EN-0058, EN-0174 | rules, tools | S9 en |
| EnglishDiacriticsRule | `src/lang/en/rules/en/EnglishDiacriticsRule.js` | EN-0002, EN-0059, EN-0185 | language, rules, tools | S9 en |
| EnglishForDutchmenFalseFriendRule | `src/lang/en/rules/en/EnglishForDutchmenFalseFriendRule.js` | EN-0060 (later) | languagemodel, rules | later |
| EnglishForFrenchFalseFriendRule | `src/lang/en/rules/en/EnglishForFrenchFalseFriendRule.js` | EN-0060 (later) | languagemodel, rules | later |
| EnglishForGermansFalseFriendRule | `src/lang/en/rules/en/EnglishForGermansFalseFriendRule.js` | EN-0060 (later) | languagemodel, rules | later |
| EnglishForL2SpeakersFalseFriendRule | `src/lang/en/rules/en/EnglishForL2SpeakersFalseFriendRule.js` | EN-0060 (later) | languagemodel, rules, rules/ngrams, rules/patterns | later |
| EnglishForSpaniardsFalseFriendRule | `src/lang/en/rules/en/EnglishForSpaniardsFalseFriendRule.js` | EN-0060 (later) | languagemodel, rules | later |
| EnglishMultitokenSpeller | `src/lang/en/rules/en/EnglishMultitokenSpeller.js` | EN-0001, EN-0028 | rules/spelling/multitoken | S9 en |
| EnglishNgramProbabilityRule | `src/lang/en/rules/en/EnglishNgramProbabilityRule.js` | EN-0003, EN-0061 (later) | languagemodel, rules/ngrams, tokenizers | later |
| EnglishNumberInWordFilter | `src/lang/en/rules/en/EnglishNumberInWordFilter.js` | EN-0105 | language, rules | S9 en |
| EnglishPartialPosTagFilter | `src/lang/en/rules/en/EnglishPartialPosTagFilter.js` | EN-0106 | rules | S9 en |
| EnglishPlainEnglishRule | `src/lang/en/rules/en/EnglishPlainEnglishRule.js` | EN-0002, EN-0062, EN-0186 | language, rules, tools | S9 en |
| EnglishRedundancyRule | `src/lang/en/rules/en/EnglishRedundancyRule.js` | EN-0002, EN-0063, EN-0187 | language, rules, tools | S9 en |
| EnglishRepeatedWordsRule | `src/lang/en/rules/en/EnglishRepeatedWordsRule.js` | EN-0002, EN-0064, EN-0191 | language, rules, rules/patterns, synthesis, synthesis/en, tagging/disambiguation/rules, tools | S9 en |
| EnglishSpecificCaseRule | `src/lang/en/rules/en/EnglishSpecificCaseRule.js` | EN-0002, EN-0065, EN-0175 | rules, tools | S9 en |
| EnglishSuppressMisspelledSuggestionsFilter | `src/lang/en/rules/en/EnglishSuppressMisspelledSuggestionsFilter.js` | EN-0107 | rules | S9 en |
| EnglishUnpairedBracketsRule | `src/lang/en/rules/en/EnglishUnpairedBracketsRule.js` | EN-0002, EN-0066 | rules, tools | S9 en |
| EnglishUnpairedQuotesRule | `src/lang/en/rules/en/EnglishUnpairedQuotesRule.js` | EN-0002, EN-0067 | rules, tools | S9 en |
| EnglishWordRepeatBeginningRule | `src/lang/en/rules/en/EnglishWordRepeatBeginningRule.js` | EN-0002, EN-0068 | rules | S9 en |
| EnglishWordRepeatRule | `src/lang/en/rules/en/EnglishWordRepeatRule.js` | EN-0002, EN-0069 | rules | S9 en |
| EnglishWrongWordInContextRule | `src/lang/en/rules/en/EnglishWrongWordInContextRule.js` | EN-0002, EN-0070 | rules | S9 en |
| FindSuggestionsFilter | `src/lang/en/rules/en/FindSuggestionsFilter.js` | EN-0108, EN-0200 | rules, rules/spelling/morfologik, tagging, tagging/en | S9 en |
| FutureDateFilter | `src/lang/en/rules/en/FutureDateFilter.js` | EN-0103 | rules | S9 en |
| GoogleStyleWordTokenizer | `src/lang/en/rules/en/GoogleStyleWordTokenizer.js` | EN-0021 (later) | tokenizers | later |
| LongSentenceRule | `src/lang/en/rules/en/LongSentenceRule.js` | EN-0002, EN-0071 | tools | S9 en |
| MorfologikAmericanSpellerRule | `src/lang/en/rules/en/MorfologikAmericanSpellerRule.js` | EN-0001, EN-0009, EN-0043, EN-0105 | languagemodel, rules | S9 en |
| MorfologikAustralianSpellerRule | `src/lang/en/rules/en/MorfologikAustralianSpellerRule.js` | EN-0011, EN-0045 | languagemodel | S9 en |
| MorfologikBritishSpellerRule | `src/lang/en/rules/en/MorfologikBritishSpellerRule.js` | EN-0010, EN-0044 | languagemodel | S9 en |
| MorfologikCanadianSpellerRule | `src/lang/en/rules/en/MorfologikCanadianSpellerRule.js` | EN-0012, EN-0046 | languagemodel | S9 en |
| MorfologikNewZealandSpellerRule | `src/lang/en/rules/en/MorfologikNewZealandSpellerRule.js` | EN-0013, EN-0047 | languagemodel | S9 en |
| MorfologikSouthAfricanSpellerRule | `src/lang/en/rules/en/MorfologikSouthAfricanSpellerRule.js` | EN-0014, EN-0048 | languagemodel | S9 en |
| NewYearDateFilter | `src/lang/en/rules/en/NewYearDateFilter.js` | EN-0103 | rules | S9 en |
| NewZealandReplaceRule | `src/lang/en/rules/en/NewZealandReplaceRule.js` | EN-0013, EN-0052 | language, rules | S9 en |
| NoDisambiguationEnglishPartialPosTagFilter | `src/lang/en/rules/en/NoDisambiguationEnglishPartialPosTagFilter.js` | EN-0106 | rules, tagging | S9 en |
| OrdinalSuffixFilter | `src/lang/en/rules/en/OrdinalSuffixFilter.js` | EN-0109 | rules, rules/patterns | S9 en |
| SimpleReplaceProfanityRule | `src/lang/en/rules/en/SimpleReplaceProfanityRule.js` | EN-0002, EN-0073, EN-0189 | rules, tools | S9 en |
| SimpleReplaceRule | `src/lang/en/rules/en/SimpleReplaceRule.js` | EN-0002, EN-0072, EN-0188 | - | S9 en |
| StyleTooOftenUsedAdjectiveRule | `src/lang/en/rules/en/StyleTooOftenUsedAdjectiveRule.js` | EN-0074 | rules | S9 en |
| StyleTooOftenUsedNounRule | `src/lang/en/rules/en/StyleTooOftenUsedNounRule.js` | EN-0074 | rules | S9 en |
| StyleTooOftenUsedVerbRule | `src/lang/en/rules/en/StyleTooOftenUsedVerbRule.js` | EN-0074 | rules | S9 en |
| UnitConversionRule | `src/lang/en/rules/en/UnitConversionRule.js` | EN-0075 | rules | S9 en |
| UnitConversionRuleImperial | `src/lang/en/rules/en/UnitConversionRuleImperial.js` | EN-0010, EN-0011, EN-0012, EN-0013, EN-0076 | - | S9 en |
| UnitConversionRuleUS | `src/lang/en/rules/en/UnitConversionRuleUS.js` | EN-0009, EN-0077 | tools | S9 en |
| UpperCaseNgramRule | `src/lang/en/rules/en/UpperCaseNgramRule.js` | EN-0003, EN-0078, EN-0175 | languagemodel, rules, rules/ngrams, rules/patterns, rules/spelling, tagging/disambiguation/rules, tools | S9 en |
| VariantInfo | `src/lang/en/rules/en/VariantInfo.js` | EN-0040, EN-0043, EN-0044, EN-0045, EN-0046, EN-0047, EN-0048, EN-0049 | - | S9 en |
| WordCoherencyRule | `src/lang/en/rules/en/WordCoherencyRule.js` | EN-0002, EN-0079 | rules | S9 en |
| YMDDateCheckFilter | `src/lang/en/rules/en/YMDDateCheckFilter.js` | EN-0103 | rules | S9 en |
| YMDNewYearDateFilter | `src/lang/en/rules/en/YMDNewYearDateFilter.js` | EN-0103 | rules | S9 en |

#### en: rules/en/translation

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| BeoLingusTranslator | `src/lang/en/rules/en/translation/BeoLingusTranslator.js` | EN-0081, EN-0120 | rules/translation, tagging, tools | S9 en |
| Inflector | `src/lang/en/rules/en/translation/Inflector.js` | EN-0121 | synthesis | S9 en |

#### en: synthesis/en

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| EnglishSynthesizer | `src/lang/en/synthesis/en/EnglishSynthesizer.js` | EN-0001, EN-0024, EN-0194, EN-0201 | rules/en, synthesis, tools | S9 en |

#### en: tagging/en

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| EnglishHybridDisambiguator | `src/lang/en/tagging/en/EnglishHybridDisambiguator.js` | EN-0001, EN-0025, EN-0173 | tagging/disambiguation, tagging/disambiguation/rules | S9 en |
| EnglishTagger | `src/lang/en/tagging/en/EnglishTagger.js` | EN-0001, EN-0020, EN-0023, EN-0200 | tagging, tools | S9 en |

#### en: tokenizers/en

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| EnglishWordTokenizer | `src/lang/en/tokenizers/en/EnglishWordTokenizer.js` | EN-0001, EN-0020 | tagging/en, tokenizers | S9 en |

### de (`languagetool-language-modules/de/org/languagetool` -> `src/lang/de`), 99 classes


#### de: chunking

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| GermanChunker | `src/lang/de/chunking/GermanChunker.js` | DE-0001, DE-0029, DE-0090, DE-0207 | rules/patterns | S10 de |

#### de: language

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| AustrianGerman | `src/lang/de/language/AustrianGerman.js` | DE-0010, DE-0014, DE-0152, DE-0203 | (root), languagemodel, rules, rules/de, rules/spelling | S10 de |
| German | `src/lang/de/language/German.js` | DE-0001, DE-0002, DE-0003, DE-0004, DE-0005, DE-0006, DE-0007, DE-0008, DE-0022, DE-0225 | chunking, languagemodel, markup, rules, rules/de, rules/spelling, rules/spelling/multitoken, synthesis, tagging, tagging/de, tagging/disambiguation, tagging/disambiguation/rules/de, tokenizers, tokenizers/de, tools | S10 de |
| GermanyGerman | `src/lang/de/language/GermanyGerman.js` | DE-0009, DE-0014, DE-0053, DE-0060, DE-0116, DE-0119, DE-0122, DE-0152 | (root), languagemodel, rules, rules/de | S10 de |
| NonSwissGerman | `src/lang/de/language/NonSwissGerman.js` | DE-0013 | (root), rules, rules/de | S10 de |
| SwissGerman | `src/lang/de/language/SwissGerman.js` | DE-0011, DE-0012, DE-0014, DE-0016, DE-0066, DE-0204 | languagemodel, markup, rules, rules/de, rules/spelling, tagging, tagging/de | S10 de |

#### de: rules/de

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| AdaptSuggestionFilter | `src/lang/de/rules/de/AdaptSuggestionFilter.js` | DE-0110 | language, rules, rules/patterns, synthesis, tagging/de, tools | S10 de |
| AdvancedSynthesizerFilter | `src/lang/de/rules/de/AdvancedSynthesizerFilter.js` | DE-0111 | rules | S10 de |
| AgreementRule | `src/lang/de/rules/de/AgreementRule.js` | DE-0002, DE-0040, DE-0041 | language, rules, rules/patterns, tagging/de, tagging/disambiguation/rules, tools | S10 de |
| AgreementRule2 | `src/lang/de/rules/de/AgreementRule2.js` | DE-0002, DE-0042 | rules, rules/patterns, synthesis, tagging/disambiguation/rules, tools | S10 de |
| AgreementRuleAntiPatterns1 | `src/lang/de/rules/de/AgreementRuleAntiPatterns1.js` | DE-0041 | rules/patterns | S10 de |
| AgreementRuleAntiPatterns2 | `src/lang/de/rules/de/AgreementRuleAntiPatterns2.js` | DE-0041 | rules/patterns | S10 de |
| AgreementRuleAntiPatterns3 | `src/lang/de/rules/de/AgreementRuleAntiPatterns3.js` | DE-0041 | rules/patterns | S10 de |
| AgreementSuggestor2 | `src/lang/de/rules/de/AgreementSuggestor2.js` | DE-0040, DE-0043 | synthesis, tools | S10 de |
| AgreementTools | `src/lang/de/rules/de/AgreementTools.js` | DE-0044 | tagging/de | S10 de |
| AustrianGermanSpellerRule | `src/lang/de/rules/de/AustrianGermanSpellerRule.js` | DE-0010, DE-0065 | language, languagemodel, rules/spelling | S10 de |
| CaseRule | `src/lang/de/rules/de/CaseRule.js` | DE-0002, DE-0045, DE-0132, DE-0175 | language, rules, rules/patterns, tagging/de, tagging/disambiguation/rules, tools | S10 de |
| CaseRuleAntiPatterns | `src/lang/de/rules/de/CaseRuleAntiPatterns.js` | DE-0046 | rules/patterns | S10 de |
| CaseRuleExceptions | `src/lang/de/rules/de/CaseRuleExceptions.js` | DE-0045, DE-0046 | rules/patterns | S10 de |
| CompoundCheckFilter | `src/lang/de/rules/de/CompoundCheckFilter.js` | DE-0112, DE-0190 | rules, rules/patterns, tools | S10 de |
| CompoundCoherencyRule | `src/lang/de/rules/de/CompoundCoherencyRule.js` | DE-0002, DE-0047 | rules | S10 de |
| CompoundInfinitivRule | `src/lang/de/rules/de/CompoundInfinitivRule.js` | DE-0002, DE-0048, DE-0202 | rules, rules/patterns, rules/spelling/morfologik, tagging/disambiguation/rules, tools | S10 de |
| ConjunctionAtBeginOfSentenceRule | `src/lang/de/rules/de/ConjunctionAtBeginOfSentenceRule.js` | DE-0002, DE-0049 | rules | S10 de |
| DashRule | `src/lang/de/rules/de/DashRule.js` | DE-0002, DE-0050 | rules, tools | S10 de |
| DateCheckFilter | `src/lang/de/rules/de/DateCheckFilter.js` | DE-0113, DE-0114 | rules | S10 de |
| DateFilterHelper | `src/lang/de/rules/de/DateFilterHelper.js` | DE-0113 | tools | S10 de |
| DuUpperLowerCaseRule | `src/lang/de/rules/de/DuUpperLowerCaseRule.js` | DE-0002, DE-0051 | rules, tools | S10 de |
| FutureDateFilter | `src/lang/de/rules/de/FutureDateFilter.js` | DE-0115 | rules | S10 de |
| GermanCommaWhitespaceRule | `src/lang/de/rules/de/GermanCommaWhitespaceRule.js` | DE-0002, DE-0052 | rules | S10 de |
| GermanCompoundRule | `src/lang/de/rules/de/GermanCompoundRule.js` | DE-0009, DE-0010, DE-0013, DE-0053, DE-0054, DE-0177 | language, rules, rules/patterns, tagging/disambiguation/rules | S10 de |
| GermanConfusionProbabilityRule | `src/lang/de/rules/de/GermanConfusionProbabilityRule.js` | DE-0003, DE-0055 (later) | languagemodel, rules, rules/ngrams, rules/patterns | later |
| GermanDoublePunctuationRule | `src/lang/de/rules/de/GermanDoublePunctuationRule.js` | DE-0002, DE-0056 | rules, tools | S10 de |
| GermanFillerWordsRule | `src/lang/de/rules/de/GermanFillerWordsRule.js` | DE-0002, DE-0057 | rules | S10 de |
| GermanHelper | `src/lang/de/rules/de/GermanHelper.js` | DE-0130 | tagging/de | S10 de |
| GermanMultitokenSpeller | `src/lang/de/rules/de/GermanMultitokenSpeller.js` | DE-0001, DE-0030 | rules/spelling/multitoken | S10 de |
| GermanNumberInWordFilter | `src/lang/de/rules/de/GermanNumberInWordFilter.js` | DE-0116 | language, rules | S10 de |
| GermanParagraphRepeatBeginningRule | `src/lang/de/rules/de/GermanParagraphRepeatBeginningRule.js` | DE-0002, DE-0058 | rules | S10 de |
| GermanReadabilityRule | `src/lang/de/rules/de/GermanReadabilityRule.js` | DE-0002, DE-0059 | rules | S10 de |
| GermanRepeatedWordsRule | `src/lang/de/rules/de/GermanRepeatedWordsRule.js` | DE-0002, DE-0060, DE-0188 | language, rules, synthesis | S10 de |
| GermanSpellerRule | `src/lang/de/rules/de/GermanSpellerRule.js` | DE-0001, DE-0009, DE-0097, DE-0098, DE-0099, DE-0100, DE-0101, DE-0102, DE-0063, DE-0064 | language, languagemodel, rules, rules/ngrams, rules/patterns, rules/spelling, rules/spelling/hunspell, rules/spelling/morfologik, synthesis, tagging, tokenizers/de, tools | S10 de |
| GermanStyleRepeatedWordRule | `src/lang/de/rules/de/GermanStyleRepeatedWordRule.js` | DE-0002, DE-0068, DE-0202 | rules, rules/spelling/morfologik, tools | S10 de |
| GermanSuppressMisspelledSuggestionsFilter | `src/lang/de/rules/de/GermanSuppressMisspelledSuggestionsFilter.js` | DE-0117 | rules | S10 de |
| GermanTools | `src/lang/de/rules/de/GermanTools.js` | DE-0131 | - | S10 de |
| GermanUnpairedBracketsRule | `src/lang/de/rules/de/GermanUnpairedBracketsRule.js` | DE-0002, DE-0069 | rules, tools | S10 de |
| GermanUnpairedQuotesRule | `src/lang/de/rules/de/GermanUnpairedQuotesRule.js` | DE-0002, DE-0070 | rules, tools | S10 de |
| GermanWordRepeatBeginningRule | `src/lang/de/rules/de/GermanWordRepeatBeginningRule.js` | DE-0002, DE-0071 | rules | S10 de |
| GermanWordRepeatRule | `src/lang/de/rules/de/GermanWordRepeatRule.js` | DE-0002, DE-0072 | rules, rules/patterns, tagging/disambiguation/rules | S10 de |
| GermanWrongWordInContextRule | `src/lang/de/rules/de/GermanWrongWordInContextRule.js` | DE-0002, DE-0073, DE-0189 | rules | S10 de |
| InsertCommaFilter | `src/lang/de/rules/de/InsertCommaFilter.js` | DE-0118 | rules, rules/patterns, tagging/de | S10 de |
| LanguageNames | `src/lang/de/rules/de/LanguageNames.js` | DE-0045, DE-0046, DE-0132 | - | S10 de |
| LineExpander | `src/lang/de/rules/de/LineExpander.js` | DE-0098, DE-0102, DE-0133, DE-0182 | synthesis, tools | S10 de |
| LongSentenceRule | `src/lang/de/rules/de/LongSentenceRule.js` | DE-0002, DE-0074 | rules | S10 de |
| MissingCommaRelativeClauseRule | `src/lang/de/rules/de/MissingCommaRelativeClauseRule.js` | DE-0002, DE-0075 | language, rules, rules/patterns, tagging/disambiguation/rules | S10 de |
| MissingVerbRule | `src/lang/de/rules/de/MissingVerbRule.js` | DE-0002, DE-0076 | language, rules, rules/patterns, tools | S10 de |
| MorfologikGermanyGermanSpellerRule | `src/lang/de/rules/de/MorfologikGermanyGermanSpellerRule.js` | DE-0067, DE-0202 | rules, rules/spelling/morfologik | S10 de |
| NewYearDateFilter | `src/lang/de/rules/de/NewYearDateFilter.js` | DE-0115 | rules | S10 de |
| NonSignificantVerbsRule | `src/lang/de/rules/de/NonSignificantVerbsRule.js` | DE-0002, DE-0077 | rules | S10 de |
| OldSpellingRule | `src/lang/de/rules/de/OldSpellingRule.js` | DE-0002, DE-0065, DE-0078, DE-0173 | rules | S10 de |
| PassiveSentenceRule | `src/lang/de/rules/de/PassiveSentenceRule.js` | DE-0002, DE-0079 | rules | S10 de |
| PotentialCompoundFilter | `src/lang/de/rules/de/PotentialCompoundFilter.js` | DE-0119 | language, rules, rules/patterns, tools | S10 de |
| PrepositionToCases | `src/lang/de/rules/de/PrepositionToCases.js` | DE-0043, DE-0044 | - | S10 de |
| ProhibitedCompoundRule | `src/lang/de/rules/de/ProhibitedCompoundRule.js` | DE-0003, DE-0080, DE-0178 (later) | broker, language, languagemodel, rules, tools | later |
| RecentYearFilter | `src/lang/de/rules/de/RecentYearFilter.js` | DE-0115 | rules, rules/patterns | S10 de |
| RedundantModalOrAuxiliaryVerb | `src/lang/de/rules/de/RedundantModalOrAuxiliaryVerb.js` | DE-0002, DE-0081 | rules | S10 de |
| RemoveUnknownCompoundsFilter | `src/lang/de/rules/de/RemoveUnknownCompoundsFilter.js` | DE-0120 | language, rules, rules/patterns | S10 de |
| SentenceWhitespaceRule | `src/lang/de/rules/de/SentenceWhitespaceRule.js` | DE-0002, DE-0082 | rules, tools | S10 de |
| SentenceWithManRule | `src/lang/de/rules/de/SentenceWithManRule.js` | DE-0002, DE-0083 | rules | S10 de |
| SentenceWithModalVerbRule | `src/lang/de/rules/de/SentenceWithModalVerbRule.js` | DE-0002, DE-0084 | rules | S10 de |
| SimilarNameRule | `src/lang/de/rules/de/SimilarNameRule.js` | DE-0002, DE-0085 | rules, tools | S10 de |
| SimpleReplaceRule | `src/lang/de/rules/de/SimpleReplaceRule.js` | DE-0002, DE-0086 | - | S10 de |
| SpellingData | `src/lang/de/rules/de/SpellingData.js` | DE-0078 | synthesis, tools | S10 de |
| StyleRepeatedSentenceBeginning | `src/lang/de/rules/de/StyleRepeatedSentenceBeginning.js` | DE-0002, DE-0087 | rules | S10 de |
| StyleRepeatedVeryShortSentences | `src/lang/de/rules/de/StyleRepeatedVeryShortSentences.js` | DE-0002, DE-0088 | rules, tools | S10 de |
| StyleTooOftenUsedAdjectiveRule | `src/lang/de/rules/de/StyleTooOftenUsedAdjectiveRule.js` | DE-0089 | rules | S10 de |
| StyleTooOftenUsedNounRule | `src/lang/de/rules/de/StyleTooOftenUsedNounRule.js` | DE-0089 | rules | S10 de |
| StyleTooOftenUsedVerbRule | `src/lang/de/rules/de/StyleTooOftenUsedVerbRule.js` | DE-0089 | rules | S10 de |
| SubjectVerbAgreementRule | `src/lang/de/rules/de/SubjectVerbAgreementRule.js` | DE-0002, DE-0090 | chunking, language, rules, rules/patterns, tagging/de, tagging/disambiguation/rules, tools | S10 de |
| SwissCompoundRule | `src/lang/de/rules/de/SwissCompoundRule.js` | DE-0011, DE-0054, DE-0177 | rules | S10 de |
| SwissGermanSpellerRule | `src/lang/de/rules/de/SwissGermanSpellerRule.js` | DE-0011, DE-0066 | language, languagemodel, rules/spelling | S10 de |
| UnitConversionRule | `src/lang/de/rules/de/UnitConversionRule.js` | DE-0002, DE-0091 | rules | S10 de |
| UnnecessaryPhraseRule | `src/lang/de/rules/de/UnnecessaryPhraseRule.js` | DE-0002, DE-0092 | rules | S10 de |
| UpperCaseNgramRule | `src/lang/de/rules/de/UpperCaseNgramRule.js` | DE-0003, DE-0093, DE-0174 (later) | languagemodel, rules, rules/ngrams, tools | later |
| UppercaseNounReadingFilter | `src/lang/de/rules/de/UppercaseNounReadingFilter.js` | DE-0121 | rules, rules/patterns, tagging/de, tools | S10 de |
| ValidWordFilter | `src/lang/de/rules/de/ValidWordFilter.js` | DE-0122 | language, rules, rules/patterns | S10 de |
| VerbAgreementRule | `src/lang/de/rules/de/VerbAgreementRule.js` | DE-0002, DE-0094 | (root), language, rules, rules/patterns, tagging/disambiguation/rules, tools | S10 de |
| WiederVsWiderRule | `src/lang/de/rules/de/WiederVsWiderRule.js` | DE-0002, DE-0095 | rules | S10 de |
| WordCoherencyRule | `src/lang/de/rules/de/WordCoherencyRule.js` | DE-0002, DE-0096 | rules | S10 de |
| YMDDateCheckFilter | `src/lang/de/rules/de/YMDDateCheckFilter.js` | DE-0114 | rules | S10 de |
| YMDNewYearDateFilter | `src/lang/de/rules/de/YMDNewYearDateFilter.js` | DE-0115 | rules | S10 de |

#### de: synthesis

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| GermanSynthesizer | `src/lang/de/synthesis/GermanSynthesizer.js` | DE-0001, DE-0031, DE-0027, DE-0191, DE-0201 | tokenizers/de, tools | S10 de |

#### de: tagging/de

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| AdjectiveTags | `src/lang/de/tagging/de/AdjectiveTags.js` | DE-0031, DE-0026 | - | S10 de |
| AnalyzedGermanToken | `src/lang/de/tagging/de/AnalyzedGermanToken.js` | DE-0025 | - | S10 de |
| GermanTagger | `src/lang/de/tagging/de/GermanTagger.js` | DE-0001, DE-0031, DE-0032, DE-0024, DE-0182, DE-0200 | rules/spelling, synthesis, tagging, tokenizers/de, tools | S10 de |
| GermanToken | `src/lang/de/tagging/de/GermanToken.js` | DE-0025 | - | S10 de |
| SwissGermanTagger | `src/lang/de/tagging/de/SwissGermanTagger.js` | DE-0011, DE-0024, DE-0066 | - | S10 de |
| VerbPrefixes | `src/lang/de/tagging/de/VerbPrefixes.js` | DE-0026 | - | S10 de |

#### de: tagging/disambiguation/rules/de

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| GermanRuleDisambiguator | `src/lang/de/tagging/disambiguation/rules/de/GermanRuleDisambiguator.js` | DE-0001, DE-0028 | tagging/disambiguation, tagging/disambiguation/rules | S10 de |

#### de: tokenizers/de

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| GermanCompoundTokenizer | `src/lang/de/tokenizers/de/GermanCompoundTokenizer.js` | DE-0008, DE-0021, DE-0097, DE-0102, DE-0206 | tokenizers | S10 de |
| GermanWordTokenizer | `src/lang/de/tokenizers/de/GermanWordTokenizer.js` | DE-0001, DE-0020 | tokenizers | S10 de |

### fr (`languagetool-language-modules/fr/org/languagetool` -> `src/lang/fr`), 31 classes


#### fr: language

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| BelgianFrench | `src/lang/fr/language/BelgianFrench.js` | FR-0010, FR-0013 | - | S11 fr |
| CanadianFrench | `src/lang/fr/language/CanadianFrench.js` | FR-0011, FR-0013 | - | S11 fr |
| French | `src/lang/fr/language/French.js` | FR-0001, FR-0002, FR-0003, FR-0004, FR-0005, FR-0006, FR-0007, FR-0008, FR-0009, FR-0021 | languagemodel, markup, rules, rules/fr, rules/spelling, rules/spelling/multitoken, synthesis, tagging, tagging/disambiguation, tagging/disambiguation/fr, tagging/fr, tokenizers, tokenizers/fr | S11 fr |
| SwissFrench | `src/lang/fr/language/SwissFrench.js` | FR-0012, FR-0013 | - | S11 fr |

#### fr: rules/fr

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| AdvancedSynthesizerFilter | `src/lang/fr/rules/fr/AdvancedSynthesizerFilter.js` | FR-0060 | rules | S11 fr |
| CompoundRule | `src/lang/fr/rules/fr/CompoundRule.js` | FR-0002, FR-0041, FR-0174 | rules, tagging/fr | S11 fr |
| DMYDateCheckFilter | `src/lang/fr/rules/fr/DMYDateCheckFilter.js` | FR-0061 | rules | S11 fr |
| DateCheckFilter | `src/lang/fr/rules/fr/DateCheckFilter.js` | FR-0061 | rules | S11 fr |
| DateFilterHelper | `src/lang/fr/rules/fr/DateFilterHelper.js` | FR-0061 | - | S11 fr |
| FindSuggestionsFilter | `src/lang/fr/rules/fr/FindSuggestionsFilter.js` | FR-0063, FR-0200 | language, rules, rules/spelling, synthesis, tagging, tagging/fr, tools | S11 fr |
| FrenchConfusionProbabilityRule | `src/lang/fr/rules/fr/FrenchConfusionProbabilityRule.js` | FR-0004, FR-0046 (later) | languagemodel, rules, rules/ngrams | later |
| FrenchMultitokenSpeller | `src/lang/fr/rules/fr/FrenchMultitokenSpeller.js` | FR-0001, FR-0025 | rules/spelling/multitoken | S11 fr |
| FrenchNumberInWordFilter | `src/lang/fr/rules/fr/FrenchNumberInWordFilter.js` | FR-0064 | language, rules | S11 fr |
| FrenchPartialPosTagFilter | `src/lang/fr/rules/fr/FrenchPartialPosTagFilter.js` | FR-0065 | language, rules | S11 fr |
| FrenchRepeatedWordsRule | `src/lang/fr/rules/fr/FrenchRepeatedWordsRule.js` | FR-0002, FR-0045, FR-0180 | language, rules, synthesis | S11 fr |
| FrenchSuppressMisspelledSuggestionsFilter | `src/lang/fr/rules/fr/FrenchSuppressMisspelledSuggestionsFilter.js` | FR-0066 | rules | S11 fr |
| GrammalecteRule | `src/lang/fr/rules/fr/GrammalecteRule.js` | FR-0003, FR-0047 (later) | rules | later |
| InterrogativeVerbFilter | `src/lang/fr/rules/fr/InterrogativeVerbFilter.js` | FR-0067 | language, rules, rules/patterns, rules/spelling, synthesis, tagging/fr, tools | S11 fr |
| MakeContractionsFilter | `src/lang/fr/rules/fr/MakeContractionsFilter.js` | FR-0068 | rules | S11 fr |
| MorfologikFrenchSpellerRule | `src/lang/fr/rules/fr/MorfologikFrenchSpellerRule.js` | FR-0002, FR-0040, FR-0200 | language, rules, rules/spelling/morfologik, tagging/fr, tools | S11 fr |
| NewYearDateFilter | `src/lang/fr/rules/fr/NewYearDateFilter.js` | FR-0062 | rules | S11 fr |
| PostponedAdjectiveConcordanceFilter | `src/lang/fr/rules/fr/PostponedAdjectiveConcordanceFilter.js` | FR-0069 | rules, rules/patterns, synthesis | S11 fr |
| QuestionWhitespaceRule | `src/lang/fr/rules/fr/QuestionWhitespaceRule.js` | FR-0002, FR-0042 | rules, rules/patterns, tagging/disambiguation/rules, tools | S11 fr |
| QuestionWhitespaceStrictRule | `src/lang/fr/rules/fr/QuestionWhitespaceStrictRule.js` | FR-0002, FR-0043 | - | S11 fr |
| SimpleReplaceRule | `src/lang/fr/rules/fr/SimpleReplaceRule.js` | FR-0002, FR-0044 | rules | S11 fr |
| SuggestionsFilter | `src/lang/fr/rules/fr/SuggestionsFilter.js` | FR-0070 | rules, rules/patterns | S11 fr |
| WordWithDeterminerFilter | `src/lang/fr/rules/fr/WordWithDeterminerFilter.js` | FR-0071 | rules, rules/patterns, synthesis, tools | S11 fr |

#### fr: synthesis

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| FrenchSynthesizer | `src/lang/fr/synthesis/FrenchSynthesizer.js` | FR-0001, FR-0023, FR-0181, FR-0201 | - | S11 fr |

#### fr: tagging/disambiguation/fr

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| FrenchHybridDisambiguator | `src/lang/fr/tagging/disambiguation/fr/FrenchHybridDisambiguator.js` | FR-0001, FR-0024 | language, tagging/disambiguation, tagging/disambiguation/rules | S11 fr |

#### fr: tagging/fr

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| FrenchTagger | `src/lang/fr/tagging/fr/FrenchTagger.js` | FR-0001, FR-0022, FR-0200 | chunking, tagging, tools | S11 fr |

#### fr: tokenizers/fr

| Java class | JS module | inventory IDs | depends on (org.languagetool packages) | step |
|---|---|---|---|---|
| FrenchWordTokenizer | `src/lang/fr/tokenizers/fr/FrenchWordTokenizer.js` | FR-0001, FR-0020 | tagging/fr, tokenizers | S11 fr |
