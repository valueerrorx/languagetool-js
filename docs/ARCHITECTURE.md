# Architecture (functional port, D-044; wave 1: core, cli, server, de, en, fr)

Binding for porters and reviewers. Supersedes the class-by-class architecture approved in D-037 where it conflicts with D-042/D-043/D-044.
Companion docs: PORT-MAP.md (Java feature -> JS module, libraries), SEMANTICS.md (Java traps that change results), ORACLE.md (equality and performance checks), PLAN.md (steps F01..).

## 1. Principles
- Acceptance = results, not structure (D-043/D-044): for every input, the /v2 API and the CLI return the same content as Java 6.9-SNAPSHOT (pin 9b0be9d): same matches in the same order, same offsets/lengths (UTF-16 units), rule ids/subIds, categories, messages, short messages, suggestions in the same order, same JSON fields and nesting, same status codes and error texts. Formatting (whitespace, key order, number spelling, HTTP headers/framing, log layout, stack frames) is free.
- Not worse: same or better quality and completeness; throughput and latency not significantly worse than Java (ORACLE.md 6).
- Structure: organised by function block (section 3), not by Java class. Java classes that carry LT logic (rules, filters, taggers, disambiguators, language classes) keep their name as JS class or function so rule ids and FQCN references in XML (`<filter class=...>`) resolve; `// Java: Class#method` tags stay where a function corresponds to a Java method (D-042).
- npm libraries are used when they give identical results on the LT corpora (ORACLE.md); otherwise the original algorithm is ported. JDK semantics are emulated only where they change results (SEMANTICS.md).
- Java bugs that reach output are reproduced (D-011, D-017) unless approved in DEVIATIONS.md.
- Runtime: Node.js 24 LTS, ES modules, plain JavaScript, no build step for code. Tests: Vitest; lint: ESLint (flat config).

## 2. Directory layout
| path | purpose |
|---|---|
| `bin/lt-cli.mjs`, `bin/lt-server.mjs` | launchers (= `languagetool-commandline.jar`, `HTTPServer`); argument passthrough, exit code |
| `src/lib/java/` | JDK semantics helpers that affect results (Unicode 13 tables, case mapping, regex translator, strings, numbers, toString, StrictMath, Locale/number formats, Scanner line splitting, charset decoding, Properties, Random) |
| `src/lib/fsa/` | morfologik FSA reader, lookup, speller (own implementation) |
| `src/lib/hunspell/` | Hunspell WASM binding (+ `vendor/hunspell/` binary) |
| `src/lib/srx/` | SRX segmenter |
| `src/lib/opennlp/` | OpenNLP inference subset (tokenizer, POS, chunker, beam search) |
| `src/lib/langdetect/` | optimaize language-detector port |
| `src/lib/wordsplitter/`, `src/lib/openregex/`, `src/lib/units/`, `src/lib/soros/` | jwordsplitter, openregex subset, unit conversion arithmetic, Soros number spelling |
| `src/core/resources/` | resource access (classpath layout), message bundles, word-list loaders |
| `src/core/text/` | AnnotatedText, sentence/word tokenizers, AnalyzedToken/Readings/Sentence, StringTools |
| `src/core/tagging/` | BaseTagger, ManualTagger, CombiningTagger, synthesizers |
| `src/core/disambiguation/` | XML disambiguator, MultiWordChunker, chunker interfaces |
| `src/core/rules/` | rule model (Rule, RuleMatch, Category, ...), Java core rules, rule filters |
| `src/core/patterns/` | XML pattern rule loader, matcher, unifier, match/suggestion builder, RuleSet hints |
| `src/core/spelling/` | SpellingCheckRule, Morfologik speller rule, Hunspell rules, multitoken speller |
| `src/core/langid/` | language identification (optimaize fallback, common words, unicode detector) |
| `src/core/` (root) | `Language.js`, `Languages.js`, `JLanguageTool.js` (check pipeline), `RuleMatchesAsJsonSerializer.js`, `Tools.js` |
| `src/lang/{de,en,fr}/` | language modules: language classes, tokenizers, taggers, disambiguators, chunkers, Java rules, filters, `module.js` (registration) |
| `src/cli/` | command line (options parser, output modes) |
| `src/server/` | Express app, config, request handling, /v2 endpoints, worker pool |
| `resources/` | byte-exact copies of the Java runtime resources at their classpath paths, `MANIFEST.sha256` |
| `tests/` | Vitest tests (ported JUnit assertions + block tests); `tests/golden/` fixtures (oracle only) |
| `oracle/` | Java harness, case generators, comparators, corpora, benchmark |
| `scripts/` | `resources.mjs`, `gen-unicode-tables.mjs`, `build-hunspell.sh`, `build-info.mjs` |

## 3. Function blocks
Each block: approach, library decision, verification. "Equal" always means the ORACLE.md comparator for that block.

### 3.1 Resources and data loading
- `resources/` is committed (D-064 follow-up: repo runs standalone without Java). `npm run resources:update -- --java <checkout> [--build]` refreshes it (change summary + filter-class check, scripts/update-resources.mjs). `npm run resources` copies `src/main/resources/**` of core, commandline, server, de, en, fr and extracts the dictionary jars (german/english/french-pos-dict, opennlp models, jwordsplitter data, language-detector profiles) byte-exact into `resources/`; manifest verified by `npm test`.
- `src/core/resources/ResourceDataBroker.js`: Java resource paths -> files; synchronous lazy reads. Binary data (FSA dicts, OpenNLP models, .dic/.aff) are read as `Buffer`; in the server they are loaded once into a `SharedArrayBuffer` and shared by all workers (zero copy).
- Text decoding as Java: UTF-8 with U+FFFD replacement (`TextDecoder` non-fatal; same granularity verified by fixture), `Scanner` line separators where Java uses `Scanner` (SEMANTICS S6). Word-list loaders (`CachingWordListLoader`, `SimpleReplaceDataLoader`, ...) are one shared module with the per-loader quirks.
- Message bundles (`MessagesBundle*.properties`): parsed with `dot-properties` (spec-conformant escapes/continuations; bytes decoded UTF-8 as JDK 9+ ResourceBundle); `ResourceBundle` candidate/fallback chain own (40 lines). `Tools.i18n` uses `src/lib/java/MessageFormat.js` (own subset: quotes, `{n}`, `{n,number,...}`; numbers via Java default-locale rules).
- Verify: manifest; i18n probe fixtures (X-PROBE-FORMAT); every message in check fixtures.

### 3.2 XML loading
- Library: `sax` (isaacs, 1.6.x), strict mode with position tracking. Rule/disambiguation files declare internal-subset entities (`<!ENTITY name "...">`, text-only, ~250 in wave 1); a small DOCTYPE pre-scan registers them in `parser.ENTITIES`. External DTD/XSD are not loaded (as Java). External SYSTEM entities: none active in wave-1 files; a reference fails loudly.
- Rejected: `saxes` (no DTD entity expansion), `fast-xml-parser` (DOM-like, no element-order events with line numbers needed for rule line numbers/immunization).
- Verify: rule-count and rule-list fixtures per file (`rules-list`), pattern-rule examples (3.6).

### 3.3 Text analysis
- AnnotatedText (builder, markup, interpretAs, position mapping) ported as is: positions are UTF-16 offsets identical to Java.
- Sentence splitting: own SRX implementation (`src/lib/srx/`) of loomchild segment 2.0.4 semantics as used by LT (`segment.srx`, language rule cascade, break/no-break rule order, UNICODE_CHARACTER_CLASS), regexes through the Java regex translator (3.4). No npm SRX engine exists (`sentencex`, `sentence-splitter` use other rules -> different splits).
- Word tokenizers: core WordTokenizer (StringTokenizer over the Java delimiter set) and DE/EN/FR tokenizers ported with their regexes and URL/e-mail joining.
- Tagging: `src/lib/fsa/` own reader for morfologik CFSA2/FSA5 + sequence encoders + `.info` metadata, `DictionaryLookup` in FSA arc order. No usable npm package (none reads morfologik CFSA2). ManualTagger (added.txt/removed.txt), CombiningTagger, language taggers (GermanTagger compound/case logic, SwissGermanTagger, English/French tagLowercaseWithUppercase) ported.
- Synthesis: BaseSynthesizer on the `*_synth.dict` FSAs + ManualSynthesizer + Soros number spelling (`src/lib/soros/`, own port of the LT-bundled Soros program interpreter, regex via translator).
- Disambiguation: XML disambiguator (same pattern engine as rules, 3.6) with all actions; MultiWordChunker/MultiWordChunker2; language hybrid disambiguators.
- Chunkers: EN OpenNLP chunker (3.8); DE GermanChunker on an own openregex subset (`src/lib/openregex/`, D-012; no npm equivalent).
- Verify: `analyze` fixtures (sentence split, tokens, readings incl. order, chunk tags, immunization) over the corpora; disambiguation `<example>` fixtures.

### 3.4 Java regex dialect
- Kept from the approved design: `src/lib/java/regex/` translates Java patterns to JS `RegExp` with the `v` flag at compile time (possessive/atomic, class set operations, inline flags, Java case-insensitivity from Unicode 13 tables, JDK 17 `\b`, line terminators, `matches/lookingAt/find`, Java replacement syntax). Constructs without an exact translation fail at compile time.
- No npm library translates the Java dialect; `re2` has different semantics and no lookaround. Translation cache by (pattern, flags); compile lazily (about 30 000 patterns per wave).
- Verify: X-REGEX corpus fixture (every harvested in-scope pattern x token/sentence inputs from its rule examples + edge strings), then indirectly every check fixture.

### 3.5 Rule model and check pipeline (JLanguageTool equivalent)
- `src/core/JLanguageTool.js`: rule set assembly (language rules, pattern rules, variants, mother-tongue/false friends, user rules), enable/disable logic, levels and tone tags, check modes, annotated-text position mapping, text-level vs sentence-level rules, sentence ranges, error-rate limit, listeners, rule-match filters (SameRuleGroupFilter, CleanOverlappingFilter, language `filterRuleMatches`), priorities. Same order of rule evaluation and of matches as Java (rule index order, then sentence order; stable `fromPos` sort).
- `MultiThreadedJLanguageTool` (CLI) = same class, sequential; results are deterministic in Java, so identical. Optional per-sentence parallelism is a performance measure only (F-step "perf"), must keep order.
- Result cache: `lru-cache` (Guava semantics not observable beyond hit/miss; cached results are identical by construction).
- Verify: check fixtures (API JSON content comparator), JUnit-derived JLanguageTool cases.

### 3.6 Rule engine
- XML pattern rules: loader (rule groups, categories, attributes, phrases, entities, antipatterns, markers, examples, filters, `<match>`, unification), token matcher (StringMatcher fast paths must equal full regex matching), sequence matcher (skip, min/max, and/or, exceptions with scopes), unifier, message/suggestion builder (`\N`, case conversion, include_skipped, synthesis), RegexPatternRule, RuleSet text/lemma hints, repeated/consistency transformers.
- Java rule classes (core + de/en/fr) are ported as JS classes with the same ids, categories, messages and data files; generic filter classes registered by FQCN in a registry (`<filter class="org.languagetool...">` resolves without reflection).
- Rule data loading at startup: XML parse per language (de grammar.xml 8 MB). If startup exceeds the Java baseline, a build-time snapshot of the parsed rule definitions (`v8.serialize`) is added, verified by rule-list equality (performance step).
- Verify per rule: `rule-examples` fixtures (every `<example>` incorrect/correct sentence, rule-restricted and unrestricted result), Java-rule example sentences and JUnit cases, corpus check fixtures.

### 3.7 Spelling
- Morfologik speller (EN, FR, DE suggestion source): own port in `src/lib/fsa/` of morfologik Speller (isMisspelled, HMatrix edit distance traversal, replacement pairs, convert case, frequency ordering) incl. runtime-built FSAs for plain-text word lists (`spelling.txt`, user words) whose arc order is the encoded byte order (MorfologikMultiSpeller). No npm library implements morfologik's candidate order.
- Hunspell (German `spell()`; `suggest()` only for dynamic hunspell languages and HunspellRule base): the original C Hunspell 1.7.x (version bundled by dumonts hunspell 2.1.2, `libhunspell-1.7.so.0`) as WASM. Candidate order: (1) `hunspell-wasm` 0.3.x if its Hunspell version and the dictionary-encoding path give equal `spell`/`suggest` results on the corpus; (2) else own emscripten build of the exact tag (`scripts/build-hunspell.sh`, pinned emsdk). `nspell` (allowed by D-044) is evaluated with the same fixture but expected to fail on de_DE compounding/suggestion order; used only if 100 % equal.
- SpellingCheckRule logic (ignore/prohibit/accept lists, URL/immunization handling, suggestion post-processing, multitoken speller, GermanSpellerRule compound/infix logic, English variants) ported.
- Verify: `speller` fixtures (spell + suggestions per dictionary over corpus tokens, misspelled words from rule examples, `suggestions.txt`), speller rule check fixtures.

### 3.8 English OpenNLP chunker
- Own inference port of opennlp-tools 1.9.5 (model reader for the 1.5 `.bin` models, GIS eval with StrictMath exp/log via `src/lib/java/StrictMath.js`, TokenizerME, POSTaggerME, ChunkerME, BeamSearch with JDK PriorityQueue order) (D-014, D-029). npm `opennlp` wraps a JVM (rejected); no JS reimplementation reads these models.
- Verify: `opennlp` fixtures (tokens, tags, chunks, probabilities) over the EN corpus; EN analyze fixtures.

### 3.9 Language modules de, en, fr
- Per module: language classes and variants (names, codes, countries, default variants, rule lists in Java order, priorities, `filterRuleMatches`, typography, speller line preparation), tokenizers, tagger, synthesizer, disambiguator/chunker, Java rules, filters, XML rule files, data files, `module.js` registering languages and filter FQCNs.
- Language list and order: in-scope languages in the relative order of Java's `Languages.get()` (X-LANGUAGES), filtered per DEV-006.
- Verify: module integration fixtures (rule lists, analyze, rule examples, corpus check), ported JUnit tests.

### 3.10 Language detection
- Own port of optimaize language-detector 0.6 (n-gram profiles from the original jar, seeded `java.util.Random` 41 + `nextGaussian`, same filters) plus LT's DefaultLanguageIdentifier logic (cleanAndShortenText, common-words, unicode-script detector, preferred languages, noop languages). npm `franc`, `eld`, `tinyld`, `cld3-asm`, `languagedetect`, `langdetect` use other models/algorithms -> different results and confidences (rejected).
- Profiles: the port loads the same profile set as the Java oracle (full distribution, list from X-LANGUAGES), so probabilities/confidences for in-scope results are identical; out-of-scope winners are mapped per DEV-006 (`expect: dev006`).
- Verify: `langdetect` fixtures (probabilities, detected language, confidence) and `/v2/check?language=auto` cases.

### 3.11 HTTP API server
- Express 5 (`express` 5.x) with normal routing for `/v2/*` (`languages`, `check`, `configinfo`, `info`, `maxtextlength`, `words*`, `users/me`, `admin/refreshUser`, `healthcheck`, `stop`), body parsing for `application/x-www-form-urlencoded` done by the ported parameter parser (Java URLDecoder rules, SEMANTICS S6) because validation errors and texts depend on it. No JDK HttpServer emulation, no byte-exact framing (D-044).
- Config: `HTTPServerConfig` semantics (all keys, defaults, validation messages) via `dot-properties`-parsed Properties (ISO-8859-1 bytes).
- Same request validation order, status codes and error texts (`Error: ...` bodies), limits (text length, request limiter, work-queue 503), user/auth no-DB behaviour, A/B no-config paths, JSONP callback.
- Concurrency: the main thread runs Express, parameter parsing, detection and response building; checks run in a pool of `worker_threads` (own small pool in `src/server/worker/`, ~200 lines: fixed size = `maxTextCheckerThreads` capped at `os.availableParallelism()`, bounded queue = `textCheckerQueueSize`, queue-size/active counts for healthcheck and 503). Each worker owns its pipelines (languages, rules) and shares dictionary buffers (3.1). Pipeline pool and prewarming per worker. `piscina` rejected: its abort terminates workers (reload cost) and it hides per-worker cancel state.
- Timeouts: `maxCheckTimeMillis` -> the main thread answers with the Java timeout error at the deadline and sets the worker's cancel flag (SharedArrayBuffer); the worker stops at the next check point (between sentences and rules, and at Java's interruptible regex sites). A regex already running is not interrupted (DEV-007).
- Result cache: one `lru-cache` per worker (cache hits change no results; stats are log-only).
- Verify: `http` cases compared with the API content comparator (ORACLE.md 3.2) incl. error cases; concurrency only for 503/timeout status and text.

### 3.12 CLI
- `src/cli/`: option parser (order, conflicts, messages, usage text, exit codes), input reading (encoding, BOM, STDIN), modes: plain listing, `--json`, `-a` apply, `-t` tagger only, `-u` unknown words, `-p` profile, `--line-by-line`, `-r` recursive (readdir order as Java), bitext, `--rulefile`, `--falsefriends`, `-adl`.
- Output compared per stream by content (stdout/stderr lines; timings normalised); exit codes equal.

### 3.13 Logging
- Java log statements that matter to operators are kept with level and message text through a minimal logger (`src/lib/log.js`, console format free). Log output is not part of parity (D-044) except text the CLI/API returns. See open question 1.

### 3.14 LTJS rule layer (D-061, DEV-028)
- Own detection rules beyond Java, ids `LTJS_*`, category GRAMMAR or PUNCTUATION, German messages in LT style with suggestions. Not part of Java parity.
- Code: `src/core/ltjs/extraRules.js` (switch, id registry), `src/lang/<code>/ltjs/` (rules; de: `GermanLtjsRules.js` = list of all German layer rules and ids, `DasDassRules.js` = 12 das/dass rule classes, `DasDassTools.js` = clause analysis on the tagged and disambiguated tokens: verb-final clause (also across one embedded relative clause), subject, article reading, neuter antecedent, case roles, missing subject/object of the verb; `KommaRules.js` = 10 comma rule classes, `KommaTools.js` = segment boundaries, finite/non-finite verb readings, zu-infinitive, verb-final clause with dropped plural readings, nominative subject with determiner agreement). The language adds them at the end of `getRelevantRules` (German) and registers their ids; they ship in `@valueerror/ltjs-lang-<code>` with the rest of `src/lang/<code>/`.
- German comma rules (LTJS_KOMMA_*): missing comma after a fronted subordinate/relative clause (two finite verbs meet), before subordinating conjunctions, w-words and relative pronouns (with agreement and article checks), before obligatory infinitive groups (ohne/statt/anstatt, correlate es + adjective, da-word, noun), before 'aber' after a complete clause, at the end of a subordinate clause before 'und' + new predicate; superfluous comma before 'und'/'oder' joining predicates with the same subject, between Vorfeld and finite verb, before a prepositional object, after 'und'. They stay silent when the clause structure is uncertain (open verb bracket, Ausklammerung, comparison phrases, extended attributes). Priority -60 (German#getPriorityForId): overlapping Java matches win.
- Switch: on by default; env `LTJS_EXTRA_RULES=0` removes the rules from every rule list (read when a JLanguageTool builds its rules); `check(text, {extraRules: false})` and `/v2/check` parameter `ltjsExtraRules=false` disable them per call/request; single rules via `disabledRules`.
- Parity and ported Java tests run with the layer off: `oracle/parity.mjs` sets `LTJS_EXTRA_RULES=0` (inherited by the cli/http adapter processes, which also set it), `vitest.config.js` sets it for all tests; `tests/lang/de/ltjs/` switches it on.
- Quality gate: annotated eval corpus (`tests/eval/`, recall and false alarms vs Java) plus clean prose (no new matches allowed).

## 4. Error model
- Errors that reach API/CLI output keep the Java exception class name and message text where the text is visible: server error bodies (`Error: Internal Error: java.lang.IllegalArgumentException: ...`, `new RuntimeException(cause)` message = `cause.toString()`), CLI messages and the first line of an uncaught exception (`Exception in thread "main" <fqcn>: <message>` + `Caused by:` lines). `src/lib/java/errors.js` (built) provides the hierarchy and constructor semantics.
- Not reproduced (D-044): stack frame lines (DEV-003 moot), JDK helpful NullPointerException texts, StackOverflow/OOM thresholds (DEV-004). Dereferences of null that Java turns into an NPE visible in output throw a `NullPointerException` with the message seen in the fixture.

## 5. Clock and environment
- `src/lib/java/clock.js`: injectable clock (D-018), env `LTJS_FIXED_TIME` for parity runs; date filters compute "today" in TZ Europe/Vienna (Intl offsets). Default locale en_US for default-locale string operations.

## 6. Testing
- Per block: Vitest tests carrying the JUnit assertions that test observable behaviour (ported when the block is ported; pure-structure JUnit tests are dropped), plus golden-fixture parity (`npm run parity`).
- `later` IDs: no tests; `n/a`: excluded.
- Baseline: rule example self tests (PatternRuleTest equivalent) and per-language rule tests run against the port in `npm test`.

## 7. Dropped by D-044 (from the D-037 architecture)
- JDK HttpServer framing/headers (`jdkhttp/`), raw-socket HTTP fixtures, `Content-type` casing, chunked-length emulation, "Bad request URI" transport errors.
- Byte-exact JSON (Jackson generator emulation, key order, escapes, Double/Float text in JSON).
- Logback/SLF4J format emulation, timestamp/zone formatting of logs, `jvmOnce` gating, synchronous `writeSync` line ordering across threads.
- Exception frame format, helpful NPE texts, JVM signal exit codes (143/130).
- Main-thread `ThreadPoolExecutor` model with Java queue kinds, worker DTO/RuleSnapshot contract, synchronous cache RPC, shared clock origin across workers.
- Hash-order emulation of logs (`requestParams`, Properties unknown-key warnings), `SimpleDateFormat`/`Calendar` symbol tables beyond what date filters need, full `Formatter`, Jackson parser node types.
- Class-per-file structure, overload dispatch conventions, interface markers, lazy static getters as a rule, FQCN reflection registry beyond rule filters.

## Open questions (user decisions)
1. Logs: are server/CLI log lines (stdout/stderr diagnostics, request logs) part of the acceptance? Proposal: no; only content the CLI prints as its result (matches, warnings like "Expected text language", errors) is compared.
2. Performance threshold for "not significantly worse": proposal warm throughput >= 0.8x Java (single client and concurrent), startup to first result <= 1.5x Java, RSS reported only. Confirm or set other numbers.
3. Larger text corpora: proposal = deterministic corpora built from LT's own rule/disambiguation example sentences plus JUnit texts; do you want an additional real-world corpus (e.g. a Tatoeba/Leipzig/Wikipedia sample you provide or approve)?
4. Server worker count: Java shares one heap across `maxTextCheckerThreads` (default 10) threads; JS workers each hold their own rule objects (~hundreds of MB per language). Proposal: cap workers at `os.availableParallelism()` and an env override; this changes only when 503/queue limits trigger under load. OK?
5. Error texts of internal crashes (500 bodies containing Java exception class names, e.g. `java.lang.IllegalArgumentException`) are reproduced only for validation errors reachable with normal requests; internal crash texts (rule bugs) may differ. OK?
