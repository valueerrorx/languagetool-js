# F21 oracle (X-CLI-BASIC)
Status: DONE. 127 cli cases (3.5 MB), `npm run oracle -- X-CLI-BASIC` generates, `npm run parity -- X-CLI-BASIC` runs (17 SKIP portLater, 110 NOT PORTED until bin/lt-cli.mjs exists). Generator: oracle/scripts/gen-cases-cli-basic.mjs -> oracle/cases/X-CLI-BASIC/; fixtures tests/golden/X-CLI-BASIC/<case>/{case.json,stdout.txt,stderr.txt,exit.txt,files.json,meta.json}.

## Cases (Java: java -jar languagetool-commandline.jar, cwd = fresh work dir, pinned env of ORACLE.md)
- usage/errors: no-args, -h, -help, --help, --?, usage-before-version/list, too-many-args (15), max-args-14, unknown-param(-middle), unknown-last-is-file, first-match-wins, missing-arg-* (10 value options), unknown-language(-country/-empty/-case), --level bad value.
- --version, version-with-lang, --list (+ order with --version; DEV-006), languages en-US/en/en-GB/fr/fr-FR/fr-CA, de-DE/de/de-AT/umlauts (portLater), -adl (en, stdin, fr; de portLater), no -l (stdin, file), -m.
- rule selection: all match-producing cases use `-eo -e <ported F16 core rule ids>` (EN: COMMA_PARENTHESIS_WHITESPACE, DOUBLE_PUNCTUATION, UPPERCASE_SENTENCE_START, WHITESPACE_RULE, EN_UNPAIRED_BRACKETS, ENGLISH_WORD_REPEAT_RULE, SENTENCE_WHITESPACE; FR: same with UNPAIRED_BRACKETS, no word-repeat rule in fr). -eo/-e/-d combos, "You cannot specify both disabled rules and enabledonly" errors, "No rules are active" (unknown id), categories, --clean-overlapping, --enable-temp-off, --level PICKY. Full-rule-set cases (no -eo; MainTest strings with EN_A_VS_AN, spelling) are portLater (SKIP).
- input: UTF-8, BOM stripped, BOM with -c utf-8, -c latin1 (+ without -c), UTF-16LE/BE/UTF-32LE BOM, -c UTF-16, bad -c, empty file/stdin, newline-only, missing file (FileNotFoundException trace), directory, stdin '-' and implicit, stdin BOM kept, CRLF, CR, astral chars, nbsp/tab/zero-width, soft hyphen/U+202D, 10k-char line, 60 lines, 30 paragraphs, 200 sentences, 150 sentences (threads-order), spaces/umlaut in file name, subdir path, stdin ignored when file given. Also -b, --json (listing-json-flag, other ID, recorded), recorded portLater: -v, -p, -a, --line-by-line, -r.
- MainTest strings copied: enTestFile text, "This is an test.", "Zwuasdac?", -l en, -adl, -e/-d FOO.
- Time line: `Time: <ms>ms for <n> sentences (<r> sentences/sec)` is kept in fixtures. D-045 says timing values are not compared; the comparator replaces ms and rate by '#' but COMPARES the sentence count n (CLI-0048). No new normalizer (comparator-internal, oracle/comparators/cli.mjs).

## Infra changes
- oracle/lib/cli-run.mjs: case field `filesB64` (binary input files). oracle/adapters/cli.mjs: same field; commandline cases (no jar/mainClass) run `node bin/lt-cli.mjs`; notPorted while bin/lt-cli.mjs is missing.
- oracle/comparators/cli.mjs: time line (above); `listDev006` (keeps only de/en/fr (+ variants, no x-simple) lines of the Java --list output, on both sides); `listCut` (cuts "Supported language codes are: ... . The list of languages" in stderr); parity.mjs passes both and SKIPs cli cases with `portLater`.
- Comparison is full stdout and stderr (stackFrames removed), so stderr texts "Expected text language: ...", "Working on ...", "No language specified ...", usage and exception first lines must match exactly.

## How the parity runner launches the JS CLI
oracle/adapters/cli.mjs run(cs,{workDir}): writes cs.files/filesB64 into a fresh workDir (+ home/, tmp/), spawns `node <repo>/bin/lt-cli.mjs <cs.args...>` with cwd = workDir, env = process.env + `LTJS_FIXED_TIME=2026-03-15T10:00:00+01:00`, `TZ=Europe/Vienna`, stdin = cs.stdin as UTF-8 bytes (closed immediately when empty/absent), collects stdout/stderr (UTF-8), exit code, and files created/changed in workDir. Args are the Java args verbatim (-l, -eo, -e, ...); file args are relative to workDir. The port must read stdin to EOF when FILE is '-' or absent.

## Findings
- Java -eo with -d (or -e and -d equal) -> IllegalArgumentException "You cannot specify both disabled rules and enabledonly" (exit 1, printed as `java.lang.IllegalArgumentException: ...`).
- Unknown -e id with -eo -> uncaught `Exception in thread "main" java.lang.RuntimeException: No rules are active. Please make sure your rule ids (...)` exit 1.
- "Expected text language" line varies with -eo (no dictionary rule active -> hint text), so cases are deterministic without spelling.
- Missing file: stderr has "Expected text language" then uncaught FileNotFoundException, no "Working on" (CLI-0042).
- Last non-option arg is always the FILE (unknown-last-is-file).
UNORACLED: CLI-0067 (jna.nosys property, no observable output); CLI-0070 (bean getters/setters, no CLI-visible behaviour; JUnit port only); CLI-0069 non-default overloads (library API, covered via plain listing); CLI-0071 thread count (only result order observable, threads-order).
