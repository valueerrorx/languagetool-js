# F73 benchmark Java vs JS

Generated 2026-10-22T05:41:56.847Z by `npm run bench` (oracle/bench/bench.mjs). Same machine, JDK 17 default heap, D-018 env, no fake clock. Inputs: first 20 paragraphs (40..1500 chars) of oracle/corpus/<lang>; 3 measured passes after 1 warm-up pass, sequential single client. Ratio = JS speed relative to Java (>1 = JS faster).

## (a) CLI single check (3 paragraphs, wall ms, median of 3)

| lang | Java | JS | JS speed vs Java |
|---|---|---|---|
| de | 8032 | 11612 | 0.69x |
| en | 3589 | 3727 | 0.96x |
| fr | 5267 | 6402 | 0.82x |

## (b) Server

Server start to /v2/languages: Java 1214 ms, JS 928 ms.

| lang | first req Java | first req JS | warm p50 Java | warm p50 JS | p95 Java | p95 JS | chars/s Java | chars/s JS | JS speed |
|---|---|---|---|---|---|---|---|---|---|
| de | 9458 | 11295 | 865 | 73 | 1142 | 403 | 258 | 1757 | 6.81x |
| en | 1867 | 2891 | 47 | 44 | 113 | 156 | 8506 | 8748 | 1.03x |
| fr | 4258 | 5541 | 1300 | 85 | 1392 | 256 | 460 | 5604 | 12.18x |

## (c) Memory (RSS MB of server process; HWM = peak)

| | Java | JS |
|---|---|---|
| idle RSS | 633 | 174 |
| after warm-up RSS | 3154 | 1983 |
| peak (HWM) | 3189 | 2033 |

Raw JSON: ```{"date":"2026-10-22T05:41:56.847Z","cli":{"java":{"de":{"median":8032.33344,"runs":[8296,8032,7808]},"en":{"median":3589.180640999999,"runs":[3543,4037,3589]},"fr":{"median":5266.978494999996,"runs":[5414,5267,5138]}},"js":{"de":{"median":11611.884731999991,"runs":[11906,11612,11443]},"en":{"median":3727.029714999997,"runs":[3727,3785,3647]},"fr":{"median":6401.976824000012,"runs":[6415,6324,6402]}}},"server":{"java":{"startup":1213.6388009999937,"langs":{"de":{"first":9458.239109999995,"charsPerSec":257.96408559503686,"p50":865.2183570000052,"p95":1141.6546910000034,"n":60},"en":{"first":1867.1170730000013,"charsPerSec":8506.134772773841,"p50":47.185550000023795,"p95":113.41677899999195,"n":60},"fr":{"first":4257.861832000024,"charsPerSec":460.22507369346897,"p50":1299.6850700000068,"p95":1392.3741550000268,"n":60}},"rssIdle":{"rss":633,"hwm":633},"rssWarm":{"rss":3154,"hwm":3189}},"js":{"startup":927.7257879999815,"langs":{"de":{"first":11294.95498499996,"charsPerSec":1756.7856436650964,"p50":72.7485619999934,"p95":402.7404889999889,"n":60},"en":{"first":2890.6040620000567,"charsPerSec":8748.165555135336,"p50":44.100561999948695,"p95":156.48883399995975,"n":60},"fr":{"first":5541.251548999979,"charsPerSec":5603.737711896493,"p50":85.40256900002714,"p95":255.99060000001919,"n":60}},"rssIdle":{"rss":174,"hwm":176},"rssWarm":{"rss":1983,"hwm":2033}}}}```

<!-- notes -->
## Notes F73 (hand-written)

Measurement caveat: during the final run another job loaded the machine (load average about 7 of 20 cores), so absolute numbers are noisy for both sides; Java numbers moved as well (de CLI 7.3 s -> 10.3 s). Compare ratios, not absolutes.

### Before optimisation (first run, quieter machine)
| metric | Java | JS | JS speed |
|---|---|---|---|
| CLI de / en / fr (ms) | 7346 / 3495 / 4842 | 18880 / 3557 / 6871 | 0.39x / 0.98x / 0.70x |
| server warm chars/s de / en / fr | 293 / 9737 / 487 | 119 / 4138 / 253 | 0.41x / 0.42x / 0.52x |
| server first request de / en / fr (ms) | 8670 / 1772 / 4053 | 18442 / 2735 / 8610 | |
| RSS idle / after warm-up (MB) | 633 / 2794 | 173 / 2832 | |

Finding: the Java default server config has pipelineCaching=false, so every request creates a new pipeline (rule objects, spell checker init, ignore-word lists, SpellingData for de). The warm request cost for de/fr is therefore dominated by pipeline construction, in JS even more so.

### Optimisations (no observable behaviour change)
- SpellingCheckRule#addIgnoreWords: per tokenizer memo of ignore-list lines (single-token set, token lists of multi-token lines), no re-tokenizing for every new pipeline.
- SpellingCheckRule#startsWithIgnoredWord: case-sensitive sort uses the default JS sort (UTF-16 code unit order = String#compareTo) instead of a JS comparator.
- FrenchWordTokenizer: skip the regex replacements / patterns whose literal characters (apostrophes, hyphen, dot, comma, space) are absent.
- StringTokenizer: delimiter analysis cached per delimiter string, Set lookup instead of indexOf / linear scan.
- JavaHashMap: shared frozen empty bin instead of one array per bucket on resize (same iteration order).
- ManualSynthesizer#lookup: lemma/tag index instead of hashing both strings per call (a hash-collision miss returns null instead of an empty list; all callers treat both alike).
- SpellingData: synthesizer forms of an old spelling are computed once for both tries (ca. 2.3x faster de SpellingData build).
- decodeUtf8Java: native TextDecoder fast path for well-formed input (BOM kept, malformed input still handled by the Java REPLACE path).
- Speller#findRepl: Charset#decodeUtf8OrNull instead of throwing/catching MalformedInputException per arc (exhaustively compared with decode for all byte sequences up to 4 bytes).
- WorkerBackend#schedule: a job queued while the only warm worker has just been interrupted waits up to 100 ms for it instead of starting a cold worker (fixes X-SRV-GUARDS/timeout-fraction-50: the follow-up request ran on a freshly spawned worker and exceeded the 50 ms limit).

Not done (would need larger changes or risk behaviour): sharing DisambiguationPatternRule objects for multi-token ignore lines across pipelines, sharing sorted ignore arrays between pipelines, prefix-state reuse in synthesizer FSA lookups (2.9 M lookups at SpellingData build), regex engine speed (Pattern#exec), GISModel eval string building (en chunker).

## F73 round 2 (warm /v2/check de/en, target JS speed >= 0.8)

Before (table above, previous run) / after (this file, top tables; same machine, load average about 4):
| metric | before | after |
|---|---|---|
| warm chars/s JS de (Java) | 154 (214) = 0.72x | 1757 (258) = 6.81x |
| warm chars/s JS en (Java) | 4738 (8370) = 0.57x | 8748 (8506) = 1.03x |
| warm chars/s JS fr (Java) | 871 (402) = 2.17x | 5604 (460) = 12.18x |
| warm p50 JS de / en / fr (ms) | 1426 / 95 / 646 | 73 / 44 / 85 |
| CLI de / en / fr | 0.69x / 1.02x / 0.86x | 0.69x / 0.96x / 0.82x (cold start, not a target; run-to-run noise) |

Profiling: `node --cpu-prof` on the inline backend (LTJS_CHECK_BACKEND=inline), samples of the warm requests only. Hotspots before (self/inclusive share of warm time):
- de: per-request pipeline construction of GermanSpellerRule: addIgnoreWords + line expansion (21 %), sorting the ignore set in startsWithIgnoredWord (18 %), creating the thousands of multi-token DisambiguationPatternRule objects (AbstractTokenBasedRule/TokenHint, about 45 %), GC (9 %).
- en: opennlp GISModel#eval of chunker/POS beam search (22 %), RuleSet.hinted per pipeline (8 %), SpellingCheckRule#addIgnoreWords (7 %), dictionary reader lines (BufferedReader/readerLines/decode, 9 %).
- both: Proxy get trap of Collections.unmodifiableList on every rule list access.

Changes (no observable result change; Java behaviour is the specification, the pipelines are still created per request like Java's pipelineCaching=false):
- SpellingCheckRule: `addIgnoreWordsList`/`ignorePlanFor`/`applyIgnorePlan`: cached word lists are classified (single token / multi token / compound-only) once per list, tokenizer and variant; the resulting ignore Set is shared copy-on-write between rules with the same composition of lists (`ignoreNode`, `markIgnoreDirty`), the sorted dictionaries of startsWithIgnoredWord are shared the same way; the anti-pattern DisambiguationPatternRules of multi-token lines are stateless and shared per language. GermanSpellerRule/AustrianGermanSpellerRule/AbstractEnglishSpellerRule/HunspellRule use it (subclasses overriding addIgnoreWords/expandLine fall back to the per-line loop).
- Rule#getSentenceWithImmunization: for >= 64 anti-patterns only those preselected by their token hints (RuleSet.textHinted) are replaced; the others return the sentence unchanged in canBeIgnoredFor anyway.
- RuleSet.hinted: hint index memoised for rule lists with the same token-based rules (identity and position); non-token-based rules (new per pipeline) do not matter.
- BufferedReader (lib/java/io.js) splits lines lazily on the first readLine; MorfologikMultiSpeller#getBufferedReader decodes lazily (the readers of cached dictionaries are never read).
- ChunkerME/POSTaggerME: context arrays cached per (sequence, index, previous outcomes); BeamSearch caches eval results per cached context array (eval is a pure function of it, summing order unchanged).
- Collections list views: fast path for index reads in the Proxy get trap.

Checks: npm test tests/lib tests/core, lint clean; X-CORPUS de/en/fr (cli, h, http, all variants) and X-CORPUS-W2 ru/es all pass; X-ENSPELL, X-DECHECK, X-ENCHUNK pass. Note: running X-CHUNK X-ENCHUNK X-DECHUNK in one process fails 17 multiword cases at the unmodified HEAD as well (case order dependence of the MultiWordChunker cache, not caused by this round; each passes alone).

## F73 round 3 (CLI cold start, target JS speed >= 1.0)

Method: 3 paragraphs of oracle/corpus/<lang> (as in table (a)), median of 3 wall ms, Java and JS alternating on the same machine (load average about 5). The bench harness started `node` via PATH=/usr/bin:/bin, which is the system Node 22; the stack is Node 24, so oracle/bench/bench.mjs now starts the CLI with `process.execPath` (the server part still uses `node`). Both Node versions are shown.

| lang | Java ms | JS before (Node 22, round 2) | JS after Node 24 | JS after Node 22 |
|---|---|---|---|---|
| de | 7873 | 0.69x | 7643 = 1.03x | 8605 = 0.92x |
| en | 3621 | 0.96x | 2895 = 1.25x | 3372 = 1.15x |
| fr | 5169 | 0.82x | 5023 = 1.03x | 5622 = 0.93x |

Profile (`node --cpu-prof bin/lt-cli.mjs`, de): 2.4 M synthesizer FSA lookups (SpellingData build 1.6 s, GermanTagger expansion infos 1.0 s, 8 % hits), Pattern.compile cache churn (1.1 s de, 0.8 s fr), CFSA2Serializer offset iteration (0.4 s de), GC 0.6 s.

Changes (results unchanged):
- FSATraversal#match: resumes after the common prefix of the previous query (path memo); consecutive keys "lemma|tag" share the lemma. Early-return conditions of the skipped steps are identical for both queries (steps before the last byte of either).
- BaseSynthesizer#synthesizeForPosTags: the dictionary entries after "lemma|" are enumerated once (DictionaryLookup#tagFilterForPrefix); tags without entries skip the stemmer lookup (manual/removal synthesizers still run). 2.4 M -> 0.2 M lookups for de.
- Pattern.compile: flags 0 keyed by the pattern text (no key concatenation), no LRU re-insert on hit (FIFO eviction at 4096).
- CFSA2Serializer: the offset fixed-point iteration runs on a precomputed arc plan (typed arrays); serialized bytes compared identical to the previous implementation on 3 real word lists (60k de, 35k fr, 42k de).
- bin/lt-cli.mjs: `module.enableCompileCache()` before the dynamic imports (about 0.05 s).
- Not done: lazy per-language registration (imports cost about 0.4 s of 3-8 s; the registry in register.js is side-effect based), regex engine time in AbstractUnitConversionRule (about 0.2 s de).

Checks: X-CLI-BASIC, X-LANGUAGES, X-LANG-REGISTRY all pass; X-CORPUS cli-de/en/fr 148 pass; X-CORPUS-W2 cli-* 80 pass; X-CLI-OPTS sample (adl, list, b2 and names a-h) 102 pass, 2 not ported (adl-undetectable, as before); vitest tests/cli tests/core tests/lib pass; lint clean.
