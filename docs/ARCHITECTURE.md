# Architecture (wave 1: core, cli, server, de, en, fr)

Binding for all porters. Decisions referenced: D-004, D-006, D-013, D-014, D-018, D-021, D-023, D-024, D-026, D-029, D-031, D-032.
Companion docs: PORT-MAP.md (class -> module), SEMANTICS.md (Java traps -> helpers), ORACLE.md (golden fixtures).

## 1. Overview
- Faithful structural port of LanguageTool 6.9-SNAPSHOT (pin 9b0be9d): one JS module per Java class, same names, same call structure.
- Runtime: Node.js 24 LTS (tested 24.14), ES modules only (`"type": "module"`), plain JavaScript (no TypeScript, no transpiler, no bundler).
- Entry points: `bin/languagetool-commandline.mjs` (= `java -jar languagetool-commandline.jar`), `bin/languagetool-server.mjs` (= `java -cp languagetool-server.jar org.languagetool.server.HTTPServer`). Express 5 hosts the HTTP server (D-004).
- Core is synchronous like Java (no async in core/lang code). Async exists only at the edges: HTTP I/O, worker messaging, timers.
- Java semantics that JS does not share go through `src/lib/java/` helpers (SEMANTICS.md). Third-party Java libraries are ported (own implementations) under `src/lib/<lib>/`, except Hunspell (original C compiled to WASM, D-013).
- Tooling: Vitest (tests), ESLint (flat config, `eslint.config.js`). No other runtime dependencies except `express` (pinned exact version).

## 2. Directory layout
| path | purpose |
|---|---|
| `bin/` | CLI and server launchers (argument passthrough, exit code, stdout/stderr setup); no logic |
| `src/core/` | languagetool-core; path = Java package minus `org/languagetool/` (e.g. `src/core/rules/patterns/PatternRuleLoader.js`, root package `src/core/JLanguageTool.js`) |
| `src/cli/` | languagetool-commandline; path = package minus `org/languagetool/commandline/` (`src/cli/Main.js`) |
| `src/server/` | languagetool-server; path = package minus `org/languagetool/server/` (`src/server/HTTPServer.js`, `src/server/rules/...`) |
| `src/lang/<code>/` | language module (`de`, `en`, `fr`; wave 2 adds `it es sl ru sk pl`); path = package minus `org/languagetool/` (`src/lang/de/rules/de/CaseRule.js`, `src/lang/de/language/German.js`) plus `module.js` (registration, see 4) |
| `src/lib/java/` | JDK semantics helpers (numbers, strings, Character tables, regex translator, collections, properties, Formatter, MessageFormat, DecimalFormat, FloatingDecimal, fdlibm, Random, Calendar/SimpleDateFormat, Normalizer, errors, enums, interfaces, classpath, clock, System) |
| `src/lib/<lib>/` | ports of Java libraries: `morfologik/`, `hunspell/` (WASM wrapper), `opennlp/`, `jwordsplitter/`, `ahocorasick/`, `openregex/`, `langdetect/` (optimaize), `segment/` (loomchild SRX), `xml/` (SAX), `jackson/`, `slf4j/` + `logback/`, `commons/` (lang3/text/pool2 subsets), `guava/` (cache subset), `diffutils/`, `indriya/` (units subset), `jdkhttp/` (JDK HttpServer framing for Express) |
| `resources/` | classpath root: byte-exact copies of all runtime resources (see 5), committed; `resources/MANIFEST.sha256` |
| `vendor/hunspell/` | `hunspell.wasm` + `hunspell.mjs` glue (built by `npm run build:hunspell`, committed with sha256) |
| `tests/` | ported JUnit tests mirroring `src/` (`tests/core/...`, `tests/lang/de/...`), extra tests, `tests/parity/` (runner + JS harness) |
| `tests/golden/<ID>/` | golden fixtures, written only by the oracle (ORACLE.md) |
| `oracle/` | harness (`oracle/harness/` Java driver sources), case definitions (`oracle/cases/<ID>/`), scripts, `oracle/java-src/` (pinned clone, gitignored), `oracle/tools/` (libfaketime build, gitignored) |
| `scripts/` | `resources.mjs`, `build-info.mjs`, `gen-unicode-tables.mjs`, `build-hunspell.sh`, `parity.mjs`, `oracle.mjs` |
| `docs/` | spec, decisions, maps |

## 3. Naming and module conventions
- File = Java class name (`PascalCase.js`), named export of the class (`export class CaseRule`). No default exports. Nested/inner classes live in the outer class file, exported as `Outer_Inner` and attached as static (`Outer.Inner`).
- Every ported function carries `// Java: Class#method(ParamTypes)`.
- Overloads: one JS method with the Java name, dispatching on arity first, then on runtime type (`typeof`, `instanceof`); each branch commented with its Java signature. Constructor overloads: same pattern in `constructor(...args)`.
- Interfaces: `defineInterface('org.languagetool.rules.RuleFilter')` from `src/lib/java/interfaces.js` returns a marker with `Symbol.hasInstance`; classes declare `static [IMPLEMENTS] = [RuleFilter]`, so Java `instanceof` checks port 1:1. Abstract classes are JS classes whose abstract methods throw `AbstractMethodError`.
- Enums: `JavaEnum` base (`name()`, `ordinal()`, `toString()`, `static values()`, `static valueOf(name)` throwing `IllegalArgumentException("No enum constant <fqcn>.<name>")`, `compareTo` by ordinal).
- Static fields and static initializers: lazy static getters initialised on first access (mirrors JVM class initialisation order, which is observable for static-init logs and singletons such as `GermanTagger.INSTANCE`, `TextChecker` static A/B restrictions log). Never compute cross-module statics at ES module evaluation time (import cycles exist as in Java).
- `null` is `null` (never `undefined` in ported code). Java `Object.equals/hashCode` are methods `equals(o)`/`hashCode()`; collections that rely on them use `src/lib/java/collections/` (SEMANTICS.md).
- FQCN registry: `src/core/broker/DefaultClassBroker.js` resolves Java class names (rule filters from XML, `PremiumAbTestService` probe, language classes) via a registry filled by `src/core/registry.js` and each `src/lang/<code>/module.js` (static imports, FQCN -> class). Unknown FQCN -> same `ClassNotFoundException` path as Java.
- Language discovery (CORE-0020, D-021): `src/core/Languages.js` hard-codes the module order of the reduced classpath: de, en, es, fr, it, pl, ru, sk, sl (aggregated language-module.properties order), each module's `languageClasses` order from its `META-INF/org/languagetool/language-module.properties` copy. Wave 1 registers only de, en, fr (wave-1 oracle profile, ORACLE.md 2).

## 4. Module boundaries
- Dependency direction exactly as Maven: `lang/*` -> `core`; `cli` -> `core` (+ languages via registry); `server` -> `core` (+ languages); `core` never imports `lang`, `cli`, `server` (languages are reached through `Languages` registry and `ClassBroker`, like Java reflection).
- Cross-language runtime dependencies stay dynamic, as in Java: DE/FR `IsEnglishWordFilter` and EN `BeoLingusTranslator` use `Languages.getLanguageForShortCode(...)`.
- `src/lib/*` never imports `src/core|cli|server|lang`. `src/lib/java` imports nothing else from `src/`.
- Test-only Java classes (core test-jar: TestTools, FakeLanguage, Demo language `xx`, PatternTestTools, ...) live in `tests/support/` (never in `src/`), registered only by tests (the `xx` demo language must not exist at runtime, see BUILD.md classpath note).

## 5. Resources
- Layout: `resources/` is the Java classpath root. A Java resource path maps 1:1: `/org/languagetool/resource/de/german.dict` -> `resources/org/languagetool/resource/de/german.dict`, `/en-token.bin` -> `resources/en-token.bin`, jwordsplitter `de/danielnaber/jwordsplitter/wordsGerman.txt`, optimaize profiles `languages/<code>`, `git.properties` not copied (D-023).
- Access only via `src/lib/java/classpath.js`: `getResource(path)` (absolute path or null), `getResources(path)` (array, classpath order; one root, so 0..1 entries), `getResourceAsBytes(path)` (Buffer), `getResourceAsStream`-equivalent readers. `ResourceDataBroker` (CORE-0040) is ported on top of it. Reads are synchronous (`fs.readFileSync`), lazy, at the same call sites as Java.
- Decoding: bytes are decoded at the Java call site with the Java charset (UTF-8 via `src/lib/java/charset.js` replicating Java's malformed-input replacement; ISO-8859-1 for `java.util.Properties.load(InputStream)`; ResourceBundle `.properties` as UTF-8, JDK 9+). Binary files (.dict, .bin, .dic/.aff, .sor) are never decoded as text by generic code.
- `npm run resources` (`scripts/resources.mjs`), reproducible and idempotent:
  1. Inputs: `oracle/java-src` at the pinned commit (verified with `git rev-parse HEAD`), the self-built distribution `$LT/libs/*.jar` (BUILD.md; falls back to `../LanguageTool-6.9-SNAPSHOT/libs` only for third-party jars, which are identical; core/module resources always from the pin).
  2. Copy `languagetool-core/src/main/resources/**`, `languagetool-commandline/src/main/resources/**`, `languagetool-server/src/main/resources/**`, `languagetool-language-modules/{de,en,fr}/src/main/resources/**` (wave 2 adds its modules) into `resources/`, excluding files listed in `scripts/resources-exclude.txt` (never-loaded files per D-010: READMEs, scripts, xsl/css/html of CORE-0377, files excluded by module poms).
  3. Extract from jars (unzip, byte-exact, entry paths kept): `german-pos-dict.jar`, `english-pos-dict.jar`, `french-pos-dict.jar` (`org/languagetool/resource/**`), `opennlp-{tokenize,postag,chunk}-models.jar` (`*.bin`), `jwordsplitter.jar` (`de/danielnaber/jwordsplitter/*.txt`), `language-detector.jar` (`languages/*`), `hunspell.jar`: nothing (native lib not used).
  4. Write `resources/MANIFEST.sha256` (sorted `sha256  path`); `npm run resources -- --verify` recomputes and fails on any difference; `npm test` runs the verify step first.
  5. Never edits content. Resource size is committed to git as-is (no LFS).
- Test resources (`src/test/resources` of each module) are copied by the same script into `tests/resources/<module>/`.

## 6. Synchronous core, worker-based server concurrency
### 6.1 Core and CLI
- All core, language and library code is synchronous, with Java's call structure. WASM (Hunspell) is instantiated synchronously (`new WebAssembly.Module/Instance`), which Node permits for any size.
- `MultiThreadedJLanguageTool` (CORE-0091, used by the CLI) is ported as a subclass whose `analyzeSentences` and `performCheck` run the same callables sequentially in index order. Java's result order is deterministic (futures in submission order; matches in a `TreeMap` keyed by rule index), so sequential execution yields identical output. The only nondeterministic Java aspects (listener call order, `ignoreRanges` order across threads) become deterministic rule-index order; neither is printed by the CLI. `shutdown()` sets a flag; use after shutdown throws `RejectedExecutionException` like the ForkJoinPool.
- Thread-safety constructs (`synchronized`, atomics, concurrent maps) become plain code; `ThreadLocal` becomes a plain field per worker.

### 6.2 Server
- Java has two pools: SERVER_POOL (HTTP exchanges, `maxCheckThreads`, queue `maxWorkQueueSize`) and TEXT_CHECKER_POOL (checks, `maxTextCheckerThreads`, queue `textCheckerQueueSize`). Both are observable (503 texts, healthcheck, `q:` and `h:` in logs, timeouts).
- Main thread: Express + `LanguageToolHttpHandler` + everything TextChecker does before `executorService.submit` (parameter parsing, limits, language detection) and after (`getResponse`, JSON). SERVER_POOL is `src/core/tools/LtThreadPoolExecutor.js`: an async semaphore with `maxCheckThreads` permits and a FIFO queue; `getQueue().size()`, active count and rejection (`RejectedExecutionException`, WARN `Task rejected from pool ...`) behave like `ThreadPoolExecutor`.
- TEXT_CHECKER_POOL: `src/server/worker/CheckWorkerPool.js` with exactly `maxTextCheckerThreads` `worker_threads` workers and a queue of `textCheckerQueueSize` (overflow -> `RejectedExecutionException` -> 503 "Server overloaded, please try again later"). Each worker owns its `PipelinePool`, languages and `ResultCache` (same lazy loading as Java). Dispatch: lowest-index idle worker, so a sequential request stream always hits worker 0 and cache/pipeline reuse equals Java's single shared instances. JVM-wide once-only side effects that can run inside a worker (prints, warnings) are gated by a flag owned by the main thread (worker asks the main thread before printing).
- The task message carries everything `getRuleMatches` needs (AnnotatedText parts, language code, QueryParams, UserConfig, dictionary words); results come back as structured clones of `CheckResults` (RuleMatch DTOs reconstructed into RuleMatch objects with lazily computed suggestions already materialised, exactly as Java computes them inside the timeout).
- Listener: each `RuleMatchListener.matchFound` in the worker posts the match immediately; the main thread appends to `ruleMatchesSoFar` (allowIncompleteResults path, SRV-0129).
- Timeout (`future.get(maxCheckTimeMillis)`): the main thread races the worker promise against a timer. On timeout it calls `future.cancel(true)`: sets the worker's cancel flag (an `Int32Array` over a `SharedArrayBuffer`, read by the worker's `CheckCancelledCallback` and by `InterruptibleCharSequence`-equivalent checks, which is how Java interruption works), returns `cancelled: true` if the task had not completed, and responds at the deadline like Java. A worker that ignores cancellation for `maxCheckTimeMillis + 10 s` is terminated and replaced (Java leaves such threads running; not observable beyond capacity).
- `ExecutionException` mapping: worker errors are serialised with Java class name, message and cause chain and rethrown on the main thread as the same JS error classes (`ErrorRateTooHighException` root cause etc.).
- Logs from workers are posted to the main thread and written by the single logback-equivalent appender (Java interleaving across threads is nondeterministic, so per-request ordering is what fixtures compare).

## 7. HTTP server (Express + JDK HttpServer framing, D-004, D-006, D-024)
- `src/server/HTTPServer.js` creates `http.createServer({ ServerResponse: JdkServerResponse }, app)` where `app` is an Express 5 application with one catch-all route = the JDK context "/" -> `LanguageToolHttpHandler.handle(exchange)`. Express settings: `x-powered-by` off, `etag` off, no body parsers, no `res.send`/`res.json` (the handler reads the raw body itself, SRV-0072/0073). Express's response prototype is chained onto `JdkServerResponse.prototype`.
- `src/lib/jdkhttp/HttpExchange.js` ports the used `com.sun.net.httpserver.HttpExchange` API: `getRequestMethod`, `getRequestURI` (java.net.URI semantics: raw path/query), `getRequestHeaders` (`Headers`: keys normalised first char upper, rest lower; multi-values), `getResponseHeaders`, `sendResponseHeaders(code, length)` (length 0 = chunked, -1 = no body, as JDK), `getResponseBody`, `getRemoteAddress`, `getLocalAddress`, `close`.
- `src/lib/jdkhttp/JdkServerResponse.js` overrides header serialisation to emit JDK 17 framing exactly (oracle capture 2026-10-13): status line `HTTP/1.1 <code> <JDK reason phrase>`; `Date` first (RFC 1123 GMT, from the injectable clock); then response headers in insertion order with JDK name normalisation (`Content-type`, `Content-length`, `Access-control-allow-origin`); no `Connection`/`Keep-Alive` headers on keep-alive responses; for HTTP/1.0 requests or request `Connection: close`, `Connection: close` is the first header before `Date`. Reason phrases table ported from `sun.net.httpserver.Code` (JDK 17).
- JDK-level transport errors (D-024) live in `src/lib/jdkhttp/ServerImpl.js`: request URIs that `java.net.URI` rejects (e.g. `%ZZ`) -> raw `HTTP/1.1 400 Bad Request\r\nContent-Length: 39\r\nContent-Type: text/html\r\nConnection: close\r\n\r\n<h1>400 Bad Request</h1>Bad request URI` and socket close (note different header casing, no Date). Node parser errors (`clientError`) are mapped to the JDK response for the same input where the oracle shows one; otherwise the socket is closed without response, as JDK does for unparsable requests.
- Bind address and allow-list: `--public` -> all interfaces; default `localhost` (SRV-0009). Remote address strings use Java's `InetAddress` text form (`127.0.0.1`, `0:0:0:0:0:0:0:1`), helper `src/lib/jdkhttp/inetAddress.js`.

## 8. Logging (D-026)
- `src/lib/slf4j/`: `LoggerFactory.getLogger(fqcn)`, `Logger` (trace..error, `isXEnabled`), `MDC`, `MarkerFactory`; SLF4J 2.0.16 `MessageFormatter` semantics (`{}` substitution, `\\{}` escaping, array rendering, trailing Throwable as stack trace).
- `src/lib/logback/`: configuration objects equivalent to the two shipped `logback.xml` files: CLI (stdout, `%-5level %logger{36} %msg%n`, root INFO) and server (stdout, `%d{yyyy-MM-dd HH:mm:ss.SSS ZZZZ} %-5level %logger %msg%n`, `org.languagetool` INFO, root INFO). Includes logback's `TargetLengthBasedClassNameAbbreviator` and `%d` with Java `SimpleDateFormat`/zone semantics (`ZZZZ` -> `GMT+02:00`). The entry point selects the config (CLI vs server), mirroring which `logback.xml` wins on the classpath (CLI-0072, SRV-0089).
- Lombok `@Slf4j` classes: `static get log()` lazily from `LoggerFactory.getLogger(<fqcn>)`.
- `System.out/err` prints are separate (`src/lib/java/System.js`, synchronous writes; stdout/stderr are synchronous for files and pipes on Linux).

## 9. Clock and environment (D-018)
- `src/lib/java/clock.js` is the only source of time: `currentTimeMillis()`, `nanoTime()`, `new JavaDate()`, `Calendar.getInstance()`, logback `%d`, HTTP `Date`, ServerTools.print timestamps. Default = system time. Test/parity injection: `setClock(fn)` in-process, or env `LTJS_FIXED_TIME=<ISO-8601 with offset>` (clock starts at that instant and advances in real time, same model as libfaketime `@` mode used by the oracle).
- Default time zone and locale are fixed in the port to the D-018 values regardless of host: `TZ=Europe/Vienna` (read from env `TZ`, default Europe/Vienna; launchers set it if unset), `Locale.getDefault() = en_US`, `file.encoding = UTF-8`, `line.separator = \n`. `user.name` from `os.userInfo().username` (SRV-0015 root warning).
- Time-zone rules: `src/lib/java/datetime.js` uses `Intl.DateTimeFormat` only to obtain zone offsets (IANA data); all formatting (month/day names, patterns) is Java-table-driven (SEMANTICS.md).

## 10. Build metadata (D-023)
- `npm run build` runs `scripts/build-info.mjs`, writing `src/build-info.json`: `{ "version": "6.9-SNAPSHOT", "buildDate": "<yyyy-MM-dd HH:mm:ss Z of build time in TZ>", "gitShortId": "<git rev-parse --short=7 HEAD of LT-JS>" }`, then verifies resources and the Hunspell WASM hash.
- `src/core/LtBuildInfo.js` reads it where Java reads `/git.properties`; missing file -> WARN `Failed to read {}` and null values, as Java. Fixtures normalise buildDate and commit (ORACLE.md 5).

## 11. Error model
- `src/lib/java/errors.js`: `Throwable extends Error` with `getMessage()`, `getLocalizedMessage()`, `getCause()`, `toString()` = `<fqcn>` or `<fqcn>: <message>`, `printStackTrace(stream)`, `addSuppressed`; subclasses with exact JDK FQCNs (`java.lang.RuntimeException`, `IllegalArgumentException`, `IllegalStateException`, `NullPointerException`, `ArrayIndexOutOfBoundsException`, `IndexOutOfBoundsException`, `NumberFormatException`, `UnsupportedOperationException`, `ClassCastException`, `ArithmeticException`, `java.io.IOException`, `FileNotFoundException`, `UncheckedIOException`, `java.io.UnsupportedEncodingException`, `java.util.regex.PatternSyntaxException`, `java.util.MissingResourceException`, `java.util.concurrent.{ExecutionException,TimeoutException,RejectedExecutionException,CancellationException}`, `org.xml.sax.SAXParseException`, `org.apache.commons.lang3.NotImplementedException`, ...). LanguageTool exceptions are ported in their own modules with their Java FQCN.
- Java constructors `(msg)`, `(msg, cause)`, `(cause)` reproduced: `new RuntimeException(cause)` has message `cause.toString()` (observable in server 500 texts, SRV-0076).
- JS-native errors (`TypeError`, `RangeError`) must never escape ported code where Java would throw a specific exception: dereferences of possibly-null values that Java turns into an observable NPE throw `NullPointerException` with the JDK 17 helpful message copied from the oracle (SEMANTICS.md).
- Uncaught exceptions in `bin/` launchers: print `Exception in thread "main" ` + Java-format stack trace (`toString()`, `\tat <frame>` lines, `Caused by: ...`, `... n more`) to stderr, exit code 1, same as the JVM. Frame lines come from the JS stack (cannot match Java frames; open question 1); fixtures normalise frame lines (ORACLE.md 5).
- `System.exit(n)` -> `System.exit` helper: flush stdout/stderr, `process.exit(n)`. Java `SystemExitHandler` hooks used by tests map to an injectable exit handler.
- `OutOfMemoryError`/`StackOverflowError` (CORE-0086, CORE-0333): JS `RangeError: Maximum call stack size exceeded` is mapped to `StackOverflowError` at the same catch sites; thresholds differ from the JVM (open question 2).

## 12. CLI and HTTP surface mapping (no GUI)
- CLI: `node bin/languagetool-commandline.mjs <args>` takes the identical argument vector as `java -jar languagetool-commandline.jar <args>`; same stdout/stderr bytes, same exit codes (CLI-0068), same usage text, same option parsing order (CLI-0001..0036). STDIN is read fully (`fs.readFileSync(0)`), decoded per CLI-0043.
- Server: `node bin/languagetool-server.mjs <args>` = `HTTPServer.main(args)`; `node bin/languagetool-https-server.mjs <args>` = `HTTPSServer.main(args)` (usage and config-error paths, SRV-0177; TLS serving is `later`).
- Every endpoint, parameter, validation order, status code, error text and JSON shape is ported inside the same Java methods (ApiV2, TextChecker, V2TextChecker, LanguageToolHttpHandler); no Express routing logic beyond the single catch-all.

## 13. Library ports and order
| order | module | Java library | approach | verification |
|---|---|---|---|---|
| 1 | `src/lib/java/*` | JDK 17 | own helpers incl. Unicode 13 tables generated from JDK 17 (`scripts/gen-unicode-tables.mjs`, input dumped by the oracle harness) | unit tests + `probe` fixtures (ORACLE.md) |
| 2 | `src/lib/java/regex/` | java.util.regex (JDK 17) | translate-at-compile (decision below) | regex corpus fixture: every in-scope pattern x inputs |
| 3 | `src/lib/xml/` | JAXP/Xerces SAX | own SAX parser for the XML used (internal DTD subset entities, external SYSTEM entities via EntityResolver, Locator line/column like Xerces) | SAX event-stream fixture for every in-scope XML file |
| 4 | `src/lib/slf4j`, `src/lib/logback` | slf4j 2.0.16, logback 1.5.21 | own subset | log-line fixtures |
| 5 | `src/lib/jackson/` | jackson-core/databind 2.18 | generator (compact, CharTypes escaping) + tree parser (JsonNode, asText, toString) | JSON fixtures |
| 6 | `src/lib/commons/`, `src/lib/guava/`, `src/lib/diffutils/`, `src/lib/indriya/` | commons-lang3 3.18, commons-text, commons-pool2, guava 33.5 (cache), java-diff-utils, indriya | own subsets of used methods only | unit tests, fixtures where output-relevant |
| 7 | `src/lib/morfologik/` | morfologik 2.2.0 (fsa, fsa-builders, stemming, speller) | own port: CFSA2/FSA5 readers, FSABuilder + CFSA2Serializer (MorfologikMultiSpeller), DictionaryLookup, encoders, DictionaryMetadata, Speller (HMatrix) | lookup/speller fixtures per dict |
| 8 | `src/lib/segment/` | net.loomchild segment 2.0.4 | own port of SrxParser/SrxDocument/SrxTextIterator subset | sentence tokenizer fixtures |
| 9 | `src/lib/ahocorasick/` | hankcs AhoCorasickDoubleArrayTrie 1.2.2 | own port (same build algorithm, same hit order) | parseText fixtures (CORE-0449) |
| 10 | `src/lib/hunspell/` + `vendor/hunspell/` | dumonts hunspell 2.1.2 (bundles libhunspell 1.7.x) | original C hunspell compiled to WASM with emscripten (D-013) | spell/suggest fixtures |
| 11 | `src/lib/jwordsplitter/` | jwordsplitter 4.7 | own port | split fixtures (DE-0208) |
| 12 | `src/lib/openregex/` | openregex 1.1.1 | own port of the subset used by GermanChunker (D-012) | chunker fixtures |
| 13 | `src/lib/langdetect/` | optimaize language-detector 0.6 | own port incl. seeded `java.util.Random` (seed 41, `nextGaussian`) | detection fixtures (probabilities bit-exact) |
| 14 | `src/lib/opennlp/` | opennlp-tools 1.9.5 inference subset (D-014) | own port: model reader, GIS eval with fdlibm (D-029), TokenizerME, POSTaggerME, ChunkerME, BeamSearch with Java PriorityQueue order | chunk fixtures |
| 15 | `src/lib/jdkhttp/` | com.sun.net.httpserver (JDK 17) | framing layer over Express/Node http | raw-socket HTTP fixtures |
- Hunspell build: `npm run build:hunspell` = `scripts/build-hunspell.sh`, run in Docker image `emscripten/emsdk:3.1.74` (pinned digest recorded in the script), compiling hunspell tag `v1.7.2` (the version contained in dumonts hunspell 2.1.2; if the spell/suggest fixture differs, the script's pinned tag is moved to the matching 1.7.x and the fact recorded in DECISIONS) with `-O2 -sALLOW_MEMORY_GROWTH -sSINGLE_FILE=0 -sMODULARIZE -sEXPORT_ES6`, exporting `Hunspell_create/spell/suggest/free_list/destroy`; dictionaries are written to the WASM in-memory FS from `resources/` bytes (Java copies them to temp files; the temp-file TRACE logs and deletion are reproduced as log calls only). String encoding to the dictionary's `SET` charset is done exactly as dumonts' JNA wrapper does. Output committed with `vendor/hunspell/SHA256SUMS`.
- Regex decision (CORE-0360..0367): translate at compile time, no own regex engine. `src/lib/java/regex/Pattern.js` parses Java syntax into an AST and emits a JS `RegExp` with the `v` flag (code-point semantics like Java, set operations for class intersection/subtraction), never using the JS `i`, `m`, `s` flags: case-insensitivity (ASCII-only or UNICODE_CASE per Java flags and inline `(?i)`/`(?iu)`/`(?-i)` at any position) is expanded into explicit character sets from JDK 17 case tables; `.`, `^`, `$`, `\Z`, `\z`, `\A`, `\G`, `\b`, `\B`, `\w`, `\s`, `\d`, `\h`, `\R`, POSIX and `\p{...}` classes are emitted as explicit sets/lookarounds with Java 17 (Unicode 13) semantics; possessive quantifiers and atomic groups become `(?=(...))\k<n>` with group renumbering hidden from callers; `matches()`/`lookingAt()` anchor via wrapper patterns. `Matcher` API (`matches`, `find`, `lookingAt`, `group`, `start`, `end`, `groupCount`, `replaceAll`, `replaceFirst`, `appendReplacement`), `String.split/replaceAll/replaceFirst/matches`, `Pattern.quote` are ported on top. Translations are cached by (source, flags). Java syntax errors throw `PatternSyntaxException` with the JDK message format. Rationale: V8's backtracking engine is needed for the performance of ~30 000 regexes; every construct with no exact translation must fail loudly at compile time (never silently approximate).

## 14. Testing (JUnit 4 -> Vitest)
- One Vitest file per JUnit class: `languagetool-core/src/test/java/org/languagetool/rules/RuleMatchTest.java` -> `tests/core/rules/RuleMatchTest.test.js`; language/cli/server analogously (`tests/lang/de/...`, `tests/cli/...`, `tests/server/...`). `describe('<JavaClass>')`, one `it('<javaMethodName>')` per `@Test`, same order, same assertions, same test data.
- Assertions: `assertEquals(a, b)` -> `expect(b).toEqual(a)` (strings/numbers `toBe`); `assertTrue/False` -> `toBe(true/false)`; `assertNull` -> `toBeNull()`; `assertSame` -> `toBe`; `@Test(expected = X.class)` / `assertThrows` -> `expect(() => ...).toThrow(X)` plus message check when Java checks it; `fail(msg)` -> `throw new AssertionError(msg)`.
- `@Ignore` -> `it.skip` (kept, with the Java reason); `@Before/@After/@BeforeClass/@AfterClass` -> `beforeEach/afterEach/beforeAll/afterAll`; JUnit `Assume` -> `ctx.skip()`; abstract base test classes -> exported helper functions/classes in `tests/support/`.
- Tests that need all classpath languages (LanguageSpecificTest, SpellcheckerTest, D-021) run against the registered languages of the current wave.
- Tests of `later` IDs are ported as `it.skip('... later (D-005)')` so the count matches the JUnit baseline.
- Test helpers from the core test-jar (CORE-0350) are ported to `tests/support/` first (step order in PORT-MAP.md).
- `npm test` = resource verify + Vitest; `npm run parity` = golden fixtures (ORACLE.md). Coverage of ported JUnit tests is tracked against BUILD.md baseline counts.

## 15. Package scripts
`install` (npm install), `test`, `lint`, `build` (build-info + verify), `build:hunspell`, `resources`, `oracle -- <ID>`, `parity [-- <ID>...]`.

## Open questions (user decisions)
1. Uncaught-exception stack traces: JS cannot reproduce Java `\tat ...` frame lines and `... n more` counts. Proposal: the exception header line, `Caused by:` lines and exit code are identical; frame lines are JS frames in the same format and are normalised in fixtures. Needs a DEVIATIONS entry if approved.
2. Resource-exhaustion thresholds: JVM `StackOverflowError` (CORE-0086: "Could not check sentence due to StackOverflowError ...") and `OutOfMemoryError` (CORE-0333: stack trace + exit 1) occur at different input sizes in Node. Proposal: same handling code and messages, but no guarantee that the same input triggers them. Needs a DEVIATIONS entry if approved.
3. Raw transport behaviour beyond what the oracle can capture deterministically (JDK HttpServer idle/request timeouts, max header size limits, behaviour on half-closed sockets): proposal to cover only what is reachable with well-formed HTTP/1.x requests plus the captured `Bad request URI` case (D-024 "where reachable"). Confirm.
