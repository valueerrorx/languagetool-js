S01 done: X-PROBE-NUMBERS 27 cases (op probe-numbers; generator oracle/scripts/gen-probe-cases-numbers.mjs; helpers T/writeCases exported there)
S05 done: X-PROBE-STRINGS 18 cases (op probe-strings)
S11 done: X-PROBE-FORMAT 12 cases (op probe-format)
S19 done: X-PROBE-COLLECTIONS 17 cases (op probe-collections)
parity run: 79 not ported, 0 fail, exit 0; regenerated twice, responses byte-identical
S07 done: X-UNICODE 13 cases (props, case-simple, case-string, strings-context, normalizer, pattern-classes-01..08), X-LOCALE 2 cases (locales-main 16 locales incl. new:en-US/en-GB/en-NZ, locales-extra 37); ops unicode-dump + locale-dump (UnicodeDump.java, LocaleDump.java; generator oracle/scripts/gen-cases-unicode-locale.mjs); fixtures 2.2 MB + 0.4 MB, regenerated twice byte-identical (meta aside); Collator not used by LT -> not dumped; IsEmoji unsupported on JDK 17 (error recorded)
F03.1 done: Java ops check/analyze/rules-list/rule-examples/disambiguation-examples in oracle/harness/src/ltjs/oracle/ContentOps.java, wired in Harness.java (compiles)
F03.2 partial: normalizers + comparators (oracle/comparators/*.mjs) written
F03.3 partial: run.mjs/parity.mjs cli+http kinds, lib/cli-run.mjs, lib/http-run.mjs, corpus (oracle/corpus/{de,en,fr}), gen-oracle-check.mjs written; next: run oracle X-ORACLE-CHECK
F03.4: X-ORACLE-CHECK 14 cases generated (regenerated twice, byte-identical apart from meta and the Time: line, now normaliser durations)
F03 done: comparators + tests/oracle/comparators.test.js (42 tests), gen-corpus.mjs (dry-run counts de 50/en 53/fr 56 case files), README updated; npm test 109 pass, lint clean, parity 0 fail
F04.1: harness ops regex + regex-harvest (RegexOps.java); oracle/scripts/harvest-regex.mjs + lib-java-literals.mjs written, run OK: 32131 distinct patterns -> oracle/cases/X-REGEX/harvest/{patterns,report,dynamic-sites}.json. next: constructs, gen-regex-cases, oracle run, parity adapter stub
F04.2: trace shim (oracle/scripts/build-trace-shim.sh -> StringMatcher.TRACE) gives exact original regexes; harvest 32143 distinct; gen-cases-regex.mjs (shallow/deep/synthetic) written; next: run 'npm run oracle -- X-REGEX' (NOT --all: it regenerates every ID), constructs report, README
F04 done: X-REGEX 58 cases (shallow 46 = all 32143 distinct patterns, deep 3, synthetic 9 = 1070 patterns), 30 MB, regenerated 3 cases byte-identical; CONSTRUCTS.md written; parity 58 NOT PORTED (stub adapters regex/regex-harvest); lint+npm test green. Known: oracle/corpus/de/corpus.txt is English text (Grimm English translation)
