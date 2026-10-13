# Oracle: equality and performance checks (D-044)

Golden fixtures come only from real Java runs; nobody edits them. The port is accepted when every wave-1 fixture passes its comparator and the benchmark meets the threshold (6). Build/run basics: docs/inventory/BUILD.md; harness usage: oracle/README.md.

## 1. Reference runtime (unchanged)
- JDK 17 (`/usr/lib/jvm/java-17-openjdk`, D-008), sources at pin 9b0be9d, full distribution `$LT` as classpath (D-035).
- Pinned environment: `env -i`, `TZ=Europe/Vienna`, `LANG=LC_ALL=C.UTF-8`, `-Duser.language=en -Duser.country=US -Dfile.encoding=UTF-8`; fixed clock via libfaketime `@2026-03-15 10:00:00` (D-018); JS side gets `LTJS_FIXED_TIME=2026-03-15T10:00:00+01:00`.
- Existing infrastructure is kept: `oracle/run.mjs` (`npm run oracle -- <ID> [<case>] | --all | --selftest`), `oracle/parity.mjs` (`npm run parity [-- <ID>...]`), JSON-lines Java harness (`oracle/harness/`), adapters (`oracle/adapters/<op>.mjs`), probe/unicode/locale fixtures (X-*).

## 2. Case kinds
- `harness`: ops called in one JVM, JSON lines in/out (existing protocol `{id,op,args}` -> `{id,ok,result|error}`).
- `cli`: args, stdin, input files -> stdout, stderr, exit code.
- `http`: server args/config + a sequence of requests (method, path, params/body, headers) -> per request status code, content type class (json/text), body. Sent with Node `fetch` (no raw bytes).
- Case files: `oracle/cases/<ID>/<case>.json`, generated where possible by `oracle/scripts/gen-*.mjs`; fixtures `tests/golden/<ID>/<case>/` (`case.json`, `meta.json`, outputs; `.jsonl.gz` above 5 MB).

## 3. Comparators (`oracle/comparators/`)
### 3.1 `check` (core result, used by harness, CLI JSON and API)
Per match, in order: `rule.id`, `rule.subId`, `rule.category.id/name`, `rule.issueType`, `rule.description`, `rule.tags`/tone tags, `offset`, `length`, `sentence`, `message`, `shortMessage`, `replacements[]` (value, shortDescription, in order), `context` (text, offset, length), `type.typeName`, `contextForSureMatch`, `ignoreForIncompleteSentence`, urls; plus top-level `language` (code, name, detectedLanguage code/name/confidence/source), `warnings`, `ignoreRanges`, `sentenceRanges`, `extendedSentenceRanges`. Rules: JSON parsed on both sides, key order ignored, strings exact, integers exact, floats equal after `Math.fround` (Java float fields), missing vs present keys are a difference. `software` section: name/apiVersion/premium compared, version/buildDate/commit ignored (D-023).
Harness `check` results additionally carry the per-match internal positions (fromPos/toPos, line/column, pattern positions) for diagnosis; compared too.

### 3.2 `api`
Status code exact; JSON bodies via 3.1 or deep-equal (non-check endpoints: languages via `dev006-languages` filter, configinfo, info, words, healthcheck); text bodies (`Error: ...`, maxtextlength) exact after normalisers. Headers not compared except `Content-Type` media type and `Access-Control-Allow-Origin`.

### 3.3 `cli`
Exit code exact; stdout and stderr compared separately, line by line, after normalisers; `--json` output via 3.1. Uncaught exceptions: first line and `Caused by:` lines compared, frame lines removed.

### 3.4 `analyze`, `rule-examples`, library comparators
- `analyze`: sentences, tokens (text, startPos, whitespaceBefore), readings in order (lemma, POS, chunk tags), immunized/ignoreSpelling flags.
- `rule-examples`: per example sentence the rule-restricted match list (positions, suggestions) and the unrestricted 3.1 result.
- Library ops (`regex`, `fsa-lookup`, `speller`, `hunspell`, `srx`, `opennlp`, `langdetect`, `wordsplitter`, `synth`): structural deep-equal; doubles by value (`opennlp`/`langdetect` probabilities exact bits where they decide order, otherwise 1e-12 relative).
- `dev006-languages`: removes out-of-scope languages from the Java side before comparing (D-036); detection cases with an out-of-scope Java winner carry `"expect":"dev006"`.

### 3.5 Normalisers (`oracle/lib/normalizers.mjs`)
`buildDate`, `commit`, `durations` (numbers in timing lines -> `#`), `paths` (work dir, tmpdir), `stackFrames` (remove `\tat`/`... n more` lines). Adding one needs a DECISIONS entry.

## 4. Fixture sources
1. Rule examples: every `<example>` (correct, incorrect with corrections/markers, triggers_error) of every wave-1 grammar/style/variant XML, plus Java-rule example sentences (`addExamplePair`) -> `rule-examples` per inventory ID (DE-0150..0153, EN-0150..0158, FR-0150/0151, Java rule IDs).
2. Disambiguation examples (`<example type="untouched|ambiguous">` inputs/outputs) -> `analyze` (DE-0155, EN-0160, FR-0153).
3. JUnit-derived cases: inputs and calls of the Java tests of each block (language tests, rule tests, JLanguageToolTest, MainTest, HTTPServerTest, ApiV2Test, TextCheckerTest ...) as harness/cli/http cases, so the full Java result is pinned, not only the asserted substring.
4. Corpora per language (`oracle/corpus/<lang>/`): deterministic paragraphs built by `oracle/scripts/gen-corpus.mjs` from (1)-(3) sentences (shuffled with fixed seed into 3-8 sentence paragraphs, mixed correct/incorrect), about 300 KB per language, plus `de-AT`, `de-CH`, `en-GB`, `fr-CA` variants; extra user-approved real-world texts if provided (ARCHITECTURE open question 3). Checked as harness `check` (all default rules, level default and picky) and via `/v2/check`.
5. Library corpora: X-REGEX (harvested patterns x inputs), speller word lists (corpus tokens + misspellings from incorrect examples + `suggestions.txt`), OpenNLP sentences from the EN corpus, detection texts (corpus paragraphs cut at 20/50/200/1000 chars).
6. Inventory rows that name a fixture get at least one dedicated case.

## 5. Commands
- `npm run oracle -- <ID>|--all|--selftest`: preconditions (JDK, pin, `$LT`, harness build, libfaketime), runs Java per case in a fresh work dir, writes fixtures atomically; Java exceptions are data.
- `npm run parity [-- <ID>...]`: runs the JS side with identical inputs (`harness` in-process via adapters, `cli` via `node bin/lt-cli.mjs`, `http` against `node bin/lt-server.mjs`), applies comparator and normalisers, prints `PASS|FAIL|SKIP|NOT PORTED <ID>/<case>` with a diff of the first differing matches, final `parity: p pass, f fail, s skip`; exit 0 iff no FAIL. IDs with status `later` are skipped.
- `npm test` runs parity for IDs with status `ported`/`verified` (regression guard).

## 6. Performance benchmark (`npm run bench`, `oracle/bench/`)
- Corpus: the 4. corpora (de, en, fr), fixed.
- Java: distribution server (`HTTPServer`, default config, same machine, JDK 17, `-Xmx` default) and CLI; JS: `bin/lt-server.mjs` and `bin/lt-cli.mjs` with the same parameters. Warm-up 1 pass, then 3 measured passes.
- Metrics: (a) startup to first `/v2/check` answer per language; (b) single-client throughput (chars/s, sequential requests of one paragraph each); (c) concurrent throughput with 4 and 8 clients; (d) CLI wall time for the whole corpus file; (e) peak RSS.
- Output `oracle/bench/results/<date>.json` + summary table; acceptance per ARCHITECTURE open question 2 (proposal: (b),(c),(d) >= 0.8x Java, (a) <= 1.5x Java, (e) reported).
