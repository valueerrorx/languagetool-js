# Oracle harness and golden fixtures

Golden fixtures are produced only by running the real Java original; nobody edits them by hand. Binding decisions: D-008 (JDK 17), D-018 (env + fixed clock), D-035 (full distribution, DEV-006), D-023 (build metadata normalised), D-024 (HTTP framing), D-031 (waves). Build/run basics: docs/inventory/BUILD.md.

## 1. Reference runtime
- JDK: `/usr/lib/jvm/java-17-openjdk/bin/java` (17.0.20.1). The oracle refuses other versions (`java -version` checked).
- Sources: `oracle/java-src` must be at `9b0be9db8cb4589cd031e85bd929c95c8ce57e49` (checked with `git rev-parse HEAD`; dirty tree -> refuse).
- Binaries: the self-built distribution `$LT = oracle/java-src/languagetool-standalone/target/LanguageTool-6.9-SNAPSHOT/LanguageTool-6.9-SNAPSHOT` (entry jars + `libs/`). Missing -> the oracle prints the BUILD.md build commands and exits 2.

## 2. Classpath: full distribution (D-035)
- One classpath for all runs: the full `$LT` distribution; no profiles, no classpath files. The entry jar is the classpath (`-cp $LT/languagetool-commandline.jar` for CLI, `-cp $LT/languagetool-server.jar` for server and `-cp $LT/languagetool-server.jar:oracle/harness/build` for harness runs); the jar manifest `Class-Path` pulls in `./`, `libs/*` (all ~60 languages), so `logback.xml` of the entry jar wins exactly as in the distribution (CLI-0072, SRV-0089). `languagetool-core-tests.jar` (demo language `xx`) is not in the manifest, see BUILD.md.
- Why not a reduced classpath: `CommonWordsDetector` static fields resolve `es`/`ca`/`pt` (CommonWordsDetector.java:38-40); without those modules `LanguageIdentifier` fails with `ExceptionInInitializerError` on first access and `NoClassDefFoundError: Could not initialize class ...LanguageIdentifier` later, which breaks server auto-detection and start-up paths. The oracle must show real Java behaviour, not that failure.
- Consequence (DEV-006): Java outputs contain all ~60 languages, the port only the in-scope ones. Rules for fixtures and comparison:
  1. Cases are authored so that the expected result does not depend on out-of-scope languages (in-scope language codes, in-scope detection texts). Detection cases whose Java result is an out-of-scope language are recorded with `"expect": "dev006"` and are not compared bytewise (JS only has to return the DEV-006 unknown/other result, checked by a hand-written assertion in the case).
  2. Language-list outputs (`/v2/languages`, "Supported language codes are: ...", `languages` harness op, `Languages.get()` dumps) are compared with comparator `structure:dev006-languages` (`tests/parity/comparators/dev006-languages.mjs`): it removes out-of-scope entries (by short code, including variants like `pt-BR`, `ca-ES-valencia`) from the Java side only, re-derives `Content-length`, and then compares bytes. The filter is data (set of in-scope codes from `Languages` of the JS port), never edits the stored fixture.
  3. Outputs that embed counts or lists derived from all languages elsewhere (e.g. server start-up lines that print language counts, rule counts over `Languages.get()`) get the same comparator treatment or are documented per case; any other difference is a FAIL.
- Invocation: `java <jvm flags> -cp <classpath> <main class> <args>`; main classes `org.languagetool.commandline.Main`, `org.languagetool.server.HTTPServer`, `org.languagetool.server.HTTPSServer`, harness `ltjs.oracle.Harness`.
- First oracle task (check of D-035): X-LANGUAGES (order of `Languages.get()` for the order table, ARCHITECTURE.md 3) and X-DETECT (`LanguageIdentifier` init and detection of en/de/fr/es sample texts, server `/v2/check?language=auto`) must run without `ExceptionInInitializerError`.

## 3. Environment pinning and fixed clock (D-018)
- Every Java run uses `env -i` plus: `PATH=/usr/bin:/bin`, `HOME=<case work dir>/home` (empty), `LANG=C.UTF-8`, `LC_ALL=C.UTF-8`, `TZ=Europe/Vienna`; JVM flags `-Duser.language=en -Duser.country=US -Dfile.encoding=UTF-8 -Djava.io.tmpdir=<case work dir>/tmp` plus case-specific `-D` flags (the JS side receives the same ones via `LTJS_JAVA_OPTS`, SEMANTICS.md P12); working directory = `<case work dir>` (fresh temp dir containing the case's input files with their relative names).
- Fixed clock: libfaketime is not installed system-wide; `oracle/scripts/build-faketime.sh` clones `https://github.com/wolfcw/libfaketime` at tag `v0.9.13` into `oracle/tools/libfaketime` (gitignored) and builds it with `make`. Runs add `LD_PRELOAD=<abs>/oracle/tools/libfaketime/src/libfaketime.so.1`, `FAKETIME="@2026-03-15 10:00:00"` (start-at mode, interpreted in TZ Europe/Vienna, clock advances in real time), `FAKETIME_DONT_FAKE_MONOTONIC=1`, `FAKETIME_DONT_RESET=1`. The JS side gets `LTJS_FIXED_TIME=2026-03-15T10:00:00+01:00` (ARCHITECTURE.md 9).
- The fixed clock is applied to every case (not only date filters), so dates in output are deterministic; durations are normalised (5).
- `npm run oracle -- X-SELFTEST` verifies the setup: Java prints `new Date()`, `Calendar.getInstance()` fields, `System.currentTimeMillis()` and `TimeZone.getDefault().getID()`; the fixture must show 2026-03-15 10:00 Europe/Vienna. If libfaketime does not affect the JVM, the oracle refuses to generate date-dependent cases (fixtures marked `"clock": "fixed"`).

## 4. Case definitions and fixture format
- Case definitions (authored by the parity-tester, reviewed): `oracle/cases/<ID>/<case>.json`, inputs in `oracle/cases/<ID>/inputs/`. `<ID>` is an inventory ID (`CORE-0322`, `CLI-0046`, `DE-0150`, ...) or an infrastructure ID with prefix `X-` (`X-SELFTEST`, `X-UNICODE`, `X-LOCALE`, `X-PROBE-<topic>`, `X-SAX`, `X-REGEX`) that supports helper generation and many IDs.
- Case JSON (all kinds): `{ "kind": "cli" | "http" | "harness", "clock": "fixed", "description": "...", "javaOpts": [], "env": {}, "normalize": ["buildDate", ...], "compare": "bytes" | "jsonl" | "structure:<comparator>" }` plus kind-specific fields:
  - `cli`: `"args": [...]`, `"stdin": "inputs/x.txt"` (optional), `"files": ["inputs/a.txt", ...]` (copied into the work dir).
  - `http`: `"serverArgs": [...]`, `"configFile": "inputs/server.properties"` (optional), `"port": 8081`, `"requests": [{ "raw": "inputs/req1.http" } | { "method": "POST", "path": "/v2/check", "headers": [[name, value]], "body": "..." , "connection": "new" | "reuse" }]`, `"startupWaitFor": "Server started"`.
  - `harness`: `"requests": "inputs/requests.jsonl"` or inline `"ops": [...]`.
- Fixture directory (written by the oracle only): `tests/golden/<ID>/<case>/`
  - `case.json` (verbatim copy of the definition), `meta.json` (`java -version` line, pin, entry jar sha256, clock, generator version, generation time; not compared);
  - `cli`: copied `stdin.bin` and `files/`, outputs `stdout.bin`, `stderr.bin`, `exit.txt`;
  - `http`: `requests/NNN.http` (exact bytes sent), `responses/NNN.http` (exact bytes received: status line, headers, body), `server.stdout`, `server.stderr`, `exit.txt` (server exit code after stop, or `running`);
  - `harness`: `requests.jsonl`, `responses.jsonl` (gzip as `.jsonl.gz` when larger than 5 MB).
- Stored outputs are raw, un-normalised Java bytes; normalisation is applied at comparison time to both sides.

## 5. Normalisation catalogue (`oracle/lib/normalizers.mjs`)
Only these normalisers exist; adding one needs a DECISIONS entry. Each case lists the ones it uses.
| name | rule |
|---|---|
| `buildDate` | `"buildDate":"<v>"` -> `"buildDate":"<BUILD_DATE>"`; `--version` line date; server startup `build date: <v>,` (D-023) |
| `commit` | `"commit":"<7 hex>"`; `(<date>, <7 hex>)` in `--version`; startup line `, <7 hex>) server on` (D-023) |
| `httpDate` | `Date:` response header (D-024): only `mm:ss` is replaced (`Sun, 15 Mar 2026 09:<MM:SS> GMT`); weekday, date, hour and `GMT` are kept |
| `logTimestamp` | leading logback `yyyy-MM-dd HH:mm:ss.SSS GMT±hh:mm ` and ServerTools `yyyy-MM-dd HH:mm:ss +0000 ` prefixes: only `mm:ss(.SSS)` is replaced by `<MM:SS.mmm>`; date, hour and zone are kept (the clock is fixed, so they are deterministic and check the timezone/clock) |
| `durations` | in each digit run only the digits become `#`, the shape is kept (`12.5` -> `#.#`, `1.0E-4` -> `#.#E-#`, `Infinity` and `NaN` stay), so a wrong number format or Infinity/NaN is still a diff; applies to numbers in `Handled request in <n>ms`, `Check done: ... <n>ms`, `Time: <n>ms for <k> sentences (<x> sentences/sec)`, profile timings (CLI-0055), `Prewarming finished in <x> seconds`, `in <n>ms` of log catalogue lines |
| `stackFrames` | lines `^\tat ` and `^\t\.\.\. \d+ more$` removed (pending ARCHITECTURE.md open question 1) |
| `loadavg` | `system load: [<...>]` -> `system load: <LOAD>` |
| `identityHash` | `@<hex>[` of `ToStringBuilder`/`Object.toString` output -> `@<HASH>[` |
| `paths` | absolute case work dir -> `<CASE>`, java.io.tmpdir -> `<TMP>` |
Request counters (`h:`, `r:`, `dH:`, `#<n>`) are not normalised: cases run requests sequentially, which makes them deterministic.

## 6. Java harness (`oracle/harness/`)
- Sources `oracle/harness/src/ltjs/oracle/*.java`, compiled by `oracle/scripts/build-harness.sh` with `javac --release 17 -cp $LT/languagetool-server.jar -d oracle/harness/build` (gitignored output; rebuilt when sources are newer).
- Process model: one long-lived JVM per harness case; requests are JSON lines on stdin, responses JSON lines on stdout (Jackson); LanguageTool logging is redirected to stderr with `-Dlogback.configurationFile=oracle/harness/logback-stderr.xml` and captured in `stderr.bin`.
- Response envelope: `{"ok":true,"result":...}` or `{"ok":false,"error":{"class":"<fqcn>","message":<string|null>,"causes":[{"class","message"}...]}}`. Doubles/floats are emitted twice: as Java `toString` text and as raw IEEE bits (`"bits":"0x..."`) so formatting and arithmetic are compared independently.
- Ops (each has a JS twin in `tests/parity/harness/ops/<op>.js` that calls the port):
  - `probe`: JDK semantics (`Double/Float.toString`, `String.format(locale, fmt, typed args)`, `MessageFormat`, `DecimalFormat`, `String.split/trim/replace/toLowerCase/toUpperCase/equalsIgnoreCase`, `CASE_INSENSITIVE_ORDER`, `Integer/Long/Double/Float.parse*`, `URLDecoder`, `Base64`, `Scanner`/`BufferedReader` line splitting, `Properties.load` key order, `HashMap/HashSet/Hashtable` iteration order for given keys, `Random(seed)` sequences, `Math`/`StrictMath` functions, `Calendar`/`SimpleDateFormat`, `Normalizer`, `Character.*` for given code points). Probe inputs per call site are listed in the case files.
  - `unicode-dump` (X-UNICODE): per code point 0..0x10FFFF `getType`, predicates, simple case mappings, `UnicodeScript`, plus `String.toUpperCase/toLowerCase` special casings; `locale-dump` (X-LOCALE): `DecimalFormatSymbols`, `DateFormatSymbols`, week data, `NumberFormat` patterns for en_US, en_GB, en, de, de_DE, de_AT, de_CH, fr, fr_FR, fr_CA, fr_CH, fr_BE, ROOT. Input to `scripts/gen-unicode-tables.mjs`.
  - `regex` (CORE-0360..0367): `{pattern, flags, input, mode: matches|lookingAt|find|split|replaceAll|replaceFirst, replacement?, limit?}` -> match spans of all groups, results or exception. `regex-harvest` collects every pattern in scope with its effective flags: pattern-token regexes and postag regexes of all loaded rules (grammar, style, variants, disambiguation, antipatterns), RegexPatternRule patterns, SRX rules, unification equivalences, and static `java.util.regex.Pattern` fields of all loaded `org.languagetool` classes (reflection); inputs = tokens/sentences of the owning rule's examples plus fixed edge strings (empty, surrogates, NBSP, line terminators, Turkish i, ß/ẞ, combining marks). The corpus is the X-REGEX fixture.
  - `xml-sax` (X-SAX, CORE-0008): SAX event stream (startElement with attributes and Locator line/column, characters with Locator, endElement, entity resolution, errors) for every in-scope XML resource, using LanguageTool's own parser setup.
  - `morfologik`: `lookup` / `isMisspelled` / `suggest(maxEditDistance)` / `getFrequency` per dictionary file (CORE-0370..0376); `hunspell`: `spell` / `suggest` per de dictionary (CORE-0003, DE-0205); `ahocorasick` (CORE-0449); `jwordsplitter` (DE-0208); `opennlp`: `tokenize` / `pos` / `chunk` (EN-0029..0034); `langdetect`: probabilities (CORE-0006); `srx`: sentence splitting (CORE-0004).
  - `languages`: `Languages.get()` and lookup results; `rules-list`: all rules of `new JLanguageTool(lang[, motherTongue])` in order with id, subId, description, category, default state, tags, tone tags, priority.
  - `tokenize`: sentences and words; `analyze`: per sentence `AnalyzedSentence.toString()` and structured tokens (token, startPos, whitespaceBefore, readings with lemma/POS/chunk tags, immunization, ignoreSpelling, historical annotations); `synth`: synthesizer forms.
  - `check`: `{lang, motherTongue?, text | annotatedText parts, enabled/disabled rules and categories, enabledOnly, level, toneTags, mode, paraHandling, cleanOverlapping, userConfig}` -> every RuleMatch field (rule id, subId, specificRuleId, from/to, line/column/endLine/endColumn, sentence and pattern positions, message, shortMessage, suggestions with shortDescription/suffix/type/confidence, url, type, category id/name, issue type, tags) and the `RuleMatchesAsJsonSerializer` output.
  - `rule-examples`: for one rule file or Java rule list of a language, every `<example>` (correct, incorrect, triggers_error) and every Java rule example sentence -> `check` result restricted to that rule (as PatternRuleTest does) plus the unrestricted result; `disambiguation-examples`: input/output analysis of every disambiguation `<example>`.
- The harness only calls public/protected Java API (reflection where PatternRuleTest does the same); it never changes LanguageTool behaviour.

## 7. CLI and HTTP capture
- CLI (`oracle/scripts/run-cli.mjs`): prepares the work dir, runs the CLI main class with the case args and stdin, records stdout/stderr/exit code byte-exact. `-r` cases create their directory tree in a fixed creation order; the fixture records the `readdir` order seen by Java (`files.order`, obtained with `opendir`/`DirectoryStream` order, not sorted), and the JS run recreates the same layout in the same creation order; before running, the parity runner checks that `fs.opendirSync` order on the JS work dir equals `files.order` and reports the case as INVALID (not FAIL) when the file system order differs.
- HTTP (`oracle/scripts/run-http.mjs`): starts the server main class with the case args (fixed `--port`, default 8081), waits for `startupWaitFor` on stdout, sends each request as raw bytes over TCP (new connection unless `"connection": "reuse"`), reads the response by its framing: headers up to the empty line, then `Content-length` bytes, or for `Transfer-encoding: chunked` (JDK `sendResponseHeaders(code, 0)`) chunks until the terminal `0\r\n\r\n`, or nothing when the response has no body (`sendResponseHeaders(code, -1)`, status 1xx/204/304, answers to HEAD), else until connection close; 10 s idle is only the safety timeout (recorded as a failed capture, never as a valid fixture), then stops the server (`--stoppable` + `/v2/stop` when the case allows, else SIGTERM) and records stdout/stderr. Requests run strictly sequentially. Raw bytes are compared (header names and order included), so curl is never used.
- Timeout cases use `maxCheckTimeMillis` with inputs that exceed it by a wide margin; their bodies differ only by normalised fields (`loadavg`); cases whose content is timing dependent (`allowIncompleteResults` match counts) use `"compare": "structure:incomplete"`.

## 8. From JUnit and rule examples to fixtures
- JUnit tests are ported to Vitest (ARCHITECTURE.md 14); they are not fixtures. Their Java baseline is BUILD.md.
- MainTest (CLI) and HTTPServerTest/ApiV2Test/TextCheckerTest invocations are additionally turned into `cli`/`http` cases with the same arguments and inputs (from `src/test/resources`), because the Java tests only assert substrings while fixtures pin the full bytes (IDs CLI-*, SRV-*).
- Every XML rule file and disambiguation file of the wave gets `rule-examples` / `disambiguation-examples` fixtures under its inventory ID (DE-0150..0153, DE-0155, EN-0150..0158, EN-0160, FR-0150, FR-0151, FR-0153); every Java rule gets a `rule-examples` case under its rule ID; filters and tokenizers get `check`/`analyze` cases built from their test classes' inputs.
- Rows marked "needs oracle fixtures" in the inventories get at least one dedicated case; the fixtures column of the inventory lists the case names.

## 9. Commands
### `npm run oracle -- <ID> [<case>] | --all | --selftest`
1. Checks preconditions (1), builds missing pieces (harness, libfaketime) or exits 2 with instructions.
2. For each selected case definition: creates a fresh work dir, runs Java under the pinned environment (3), writes the fixture into a temp dir and atomically replaces `tests/golden/<ID>/<case>/`.
3. Java failures (exceptions, non-zero exit) are recorded as data; the command exits 1 only on infrastructure errors.
4. Never modifies `src/`, `docs/` or case definitions; prints a summary `oracle: <n> cases written`.

### `npm run parity [-- <ID>...]`
1. Loads fixtures (all, or the given IDs); skips IDs whose inventory status is `later` (read from docs/inventory/*.md).
2. Runs the JS side with identical inputs and environment: `cli` -> `node bin/languagetool-commandline.mjs <args>` in an identical work dir; `http` -> `node bin/languagetool-server.mjs <args>`, replaying the recorded request bytes; `harness` -> JS harness ops in-process.
3. Applies the case's normalisers to both outputs and compares (`bytes`: exact; `jsonl`: per line deep-equal after parsing, strings compared exactly, doubles by bits and text; `structure:<name>`: comparator in `tests/parity/comparators/`).
4. Prints `PASS|FAIL|SKIP <ID>/<case>`, on FAIL a unified diff (first 40 lines) and writes actual outputs to `tests/parity/out/<ID>/<case>/` (gitignored); final line `parity: <p> pass, <f> fail, <s> skip`; exit code 0 iff no FAIL.
5. `tests/parity/parity.test.js` runs the same runner inside `npm test` for IDs with status `ported` or `verified` (regression guard); the full run is `npm run parity`.
