# F73 benchmark Java vs JS

Generated 2026-10-21T20:26:07.727Z by `npm run bench` (oracle/bench/bench.mjs). Same machine, JDK 17 default heap, D-018 env, no fake clock. Inputs: first 20 paragraphs (40..1500 chars) of oracle/corpus/<lang>; 3 measured passes after 1 warm-up pass, sequential single client. Ratio = JS speed relative to Java (>1 = JS faster).

## (a) CLI single check (3 paragraphs, wall ms, median of 3)

| lang | Java | JS | JS speed vs Java |
|---|---|---|---|
| de | 10331 | 15070 | 0.69x |
| en | 4595 | 4484 | 1.02x |
| fr | 6293 | 7333 | 0.86x |

## (b) Server

Server start to /v2/languages: Java 1321 ms, JS 937 ms.

| lang | first req Java | first req JS | warm p50 Java | warm p50 JS | p95 Java | p95 JS | chars/s Java | chars/s JS | JS speed |
|---|---|---|---|---|---|---|---|---|---|
| de | 11667 | 14764 | 1048 | 1426 | 1372 | 1977 | 214 | 154 | 0.72x |
| en | 2464 | 3505 | 51 | 95 | 95 | 219 | 8370 | 4738 | 0.57x |
| fr | 5057 | 6956 | 1488 | 646 | 1704 | 1040 | 402 | 871 | 2.17x |

## (c) Memory (RSS MB of server process; HWM = peak)

| | Java | JS |
|---|---|---|
| idle RSS | 633 | 173 |
| after warm-up RSS | 3579 | 3012 |
| peak (HWM) | 3966 | 3062 |

Raw JSON: ```{"date":"2026-10-21T20:26:07.727Z","cli":{"java":{"de":{"median":10330.730094999999,"runs":[10331,10928,9567]},"en":{"median":4595.471255999997,"runs":[4581,4595,4814]},"fr":{"median":6292.776158999994,"runs":[6149,6325,6293]}},"js":{"de":{"median":15070.394520000002,"runs":[15070,15332,14945]},"en":{"median":4483.91097099999,"runs":[4714,4484,4275]},"fr":{"median":7333.483919999999,"runs":[7058,7679,7333]}}},"server":{"java":{"startup":1320.6501130000106,"langs":{"de":{"first":11666.707053999999,"charsPerSec":213.56523610341014,"p50":1048.339399999997,"p95":1372.0308640000003,"n":60},"en":{"first":2463.899390000006,"charsPerSec":8369.742668315566,"p50":50.86127399999532,"p95":94.63660500000697,"n":60},"fr":{"first":5057.355165999994,"charsPerSec":402.2935305886118,"p50":1487.5706730000093,"p95":1704.0942159999977,"n":60}},"rssIdle":{"rss":633,"hwm":633},"rssWarm":{"rss":3579,"hwm":3966}},"js":{"startup":937.2326410000096,"langs":{"de":{"first":14763.817693999968,"charsPerSec":154.38532874210188,"p50":1426.1706179999746,"p95":1976.6969919999829,"n":60},"en":{"first":3505.0623849999974,"charsPerSec":4738.4273388844895,"p50":94.640373000002,"p95":219.49760899995454,"n":60},"fr":{"first":6955.922797000036,"charsPerSec":871.3235928176307,"p50":645.9330629999749,"p95":1039.7491579999914,"n":60}},"rssIdle":{"rss":173,"hwm":173},"rssWarm":{"rss":3012,"hwm":3062}}}}```

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
