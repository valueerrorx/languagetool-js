# F64/F65 oracle (X-CLI-OPTS, X-CLI-BITEXT)
Status: DONE. Generator `oracle/scripts/gen-cases-cli-opts.mjs` writes oracle/cases/X-CLI-OPTS (402 cases) and oracle/cases/X-CLI-BITEXT (120 cases); fixtures tests/golden/<ID>/<case>/{case.json,stdout.txt,stderr.txt,exit.txt,files.json,meta.json}. Regenerate: `npm run oracle -- X-CLI-OPTS [<case>]` (all cases of an ID are slow, ~40 min at -P 6 on a loaded box; per case ~3-10 s). Compare: `npm run parity -- X-CLI-OPTS`.
Real runs of the standalone jar (`java -jar languagetool-commandline.jar`, env D-018, fake clock 2026-03-15 10:00 Europe/Vienna, fresh work dir with home/ and tmp/), languages de/en/fr only (variants de-DE, en-US/GB, fr). Case format as X-CLI-BASIC (kind cli, compare cli, args/stdin/files/filesB64). No `portLater` flags: the parity runner reports unported paths as NOT PORTED/FAIL.
Rule scope: "restricted" cases use `-eo -e <core rule ids>` (EN/DE/FR lists as in X-CLI-BASIC); "full" cases (name contains `full`, or no -eo) use the whole rule set.
Determinism: every case re-run once against its fixture with the shared comparator (0 diffs over all 522 cases).

## Cases per area (ids)
- --level (CLI-0004): level-* 26: PICKY en/de/fr restricted and full (picky rules fire: TOO_LONG_SENTENCE, COMMA_COMPOUND_SENTENCE, DOPPELPERFEKT, ...), default-level baselines, every enum name (ACADEMIC..ELEGANT), lowercase/unknown/empty value errors, missing value (ArrayIndexOutOfBoundsException), value swallows file arg, twice, with --json.
- -adl (0009, 0044): adl-* 16 (en/de/fr files and stdin, --autoDetect, undetectable text, empty stdin, with -l before/after, -m, -a, --json, -t, --line-by-line, -r, -d). stderr has the fastText WARN log line with timestamp (normaliser logTimestamp).
- -v (0010, 0041, 0047): verbose-* 16 (en/de/fr restricted and full; full runs contain the "Antipatterns activated:" report; with --json, -t, --line-by-line, -a, -u, --enable-temp-off, PICKY).
- --line-by-line (0011, 0056..0059): lbl-* 25 (stdin/file, -b, CRLF/CR, empty, blank lines, many paragraphs for line offsets, de/fr, -a, -t, -u, --json errors both orders, -p stdin error, -p file crash "Not implemented for a text-level rule", missing file, -c latin1, BOM, --xmlfilter, -v, -r, -adl).
- --enable-temp-off (0012): tempoff-* 8 (restricted, full en/de/fr with the "Activating ..." lines on stdout, -e, -d, --json, PICKY).
- --clean-overlapping (0013): overlap-* 9 (default vs clean, en/de/fr full, restricted, --json, -a).
- -t (0014, 0054): tagger-* 19 (en/de/fr, file, empty, unknown words, no -l, -b, --xmlfilter, --json, -r; conflict errors in all orders with -u/-a/-p).
- -r (0015, 0060): recursive-* 15 (one file, nested dirs, two files, not a directory, missing, stdin, bad charset -> "Could not check text in file", -a, --json, -u, de/fr, empty file, BOM).
- -eo/-d/-e/categories (0017..0020, 0039, 0040): sel-* 61 (all conflict orders, empty/inner-empty/trailing/only-comma lists, replace-vs-accumulate, unknown rule/category -> "No rules are active" incl. HashSet printing of several categories, empty category -> IllegalArgumentException, enablecategories/disablecategories de/en/fr, case sensitivity, baselines).
- -m (0022): mt-* 23 (false friends built in: de/en and fr/en work by default; en text has none by default (hasNGramFalseFriendRule), PICKY needed; -m with -d/-eo/categories/--json/-a/-v; unknown/empty/missing value; variants).
- --rulefile (0025): rulefile-* 22 (en/de/fr, umlauts, suggestions/url, rulegroup sub ids, -eo interplay (rule file rules are added before selection, so -eo needs their id), missing/invalid/empty/directory file, --json, -a, -v, --line-by-line, twice).
- --falsefriends (0027): ff-* 23 (en/de, de/en, fr/en, en/fr; PICKY needed; no -m = no rules; suggestion equal to pattern drops the rule; missing/invalid file; built-in resource path via `/org/languagetool/rules/false-friends.xml`; with --rulefile, --json, -a, twice, umlauts).
- -c (0029): enc-* 20 (utf-8, latin1, ISO-8859-15, windows-1252, US-ASCII, UTF-16(LE) without BOM, unknown/illegal/empty name, stdin with -c, --json, -a).
- -u (0030, 0050, 0052): unk-* 19 (en/de/fr, restricted/full, none, empty, sorting/duplicates, file, -a, --json both orders, -b, --xmlfilter, -p).
- -b (0031): b-* 16 (en/de/fr with and without, file, CRLF, --json, -a, full rules, order).
- --json (0032, 0051): json-* 28 (en/de/fr restricted and full, empty, escaping, astral, long line, multi-paragraph, all conflict errors by order, -p/-u/-a/-b2 conflicts, --xmlfilter, -adl, -m, categories).
- -a (0033, 0053): apply-* 22 (en/de/fr restricted and full, no matches, empty, no trailing newline, CRLF/paragraphs, overlap, umlauts, astral, conflicts with -t/-p, -b, --xmlfilter).
- -p (0034, 0055): profile-* 13 (en/de/fr restricted, full en, empty, long flag, recursive, missing file, conflicts by order).
- --xmlfilter (0035): xml-* 16 (MainTest texts, HTML with entities, comments/CDATA/PI, unclosed tag, multi-line positions, de/fr, -r, BOM, --json).
- misc combos: combo-* 4.
- X-CLI-BITEXT (0016, 0028, 0061..0065): bt-* 120: -b2/--bitext without -m / unknown -m / no -l; en/de/fr language pairs in all directions with the generic bitext rules (TRANSLATION_LENGTH, SAME_TRANSLATION, DIFFERENT_PUNCTUATION); tab reader formats (no tab, blank line, 3 columns, empty columns, trailing tab, CRLF, BOM, no final newline, empty file, newline only, stdin (fails: stdin not supported), directory, missing file, -c latin1/UTF-8/bogus); -d/-e/-eo rule selection (enabled-list order, duplicates, unknown, monolingual ids on source/target side, categories); --bitextrules en->de, de->en, fr->en, en->fr, de->fr with suggestions (own XML, structure of MainTest.testBitextWithExternalRule), wrong target/source lang, missing/invalid/empty file, twice, several rules with -e order; -a/--apply (CLI-0065) with generic, monolingual and external rules; interplay with --json (both orders), --line-by-line, -t, -u, -r, -p, --xmlfilter, -b, -adl, --rulefile and --falsefriends (discarded), -v, --level, --enable-temp-off, --clean-overlapping.

## Findings worth knowing for the port
- Java without -e and with -eo (or -e ",,") behaves like no selection: all rules stay active (sel-eo-no-e, sel-e-only-commas).
- --rulefile rules are added before Tools.selectRules: with -eo they need their id in -e; --falsefriends rules are added after selection (always active, but only PICKY level, and only when a reverse rule gives a suggestion different from the pattern).
- Built-in false friends: default for de and fr text; English text has none (hasNGramFalseFriendRule).
- Bitext mode cannot read stdin (FileNotFoundException "-"), reads only the file; -b2 with --json is an error only if -b2 precedes --json; `--json -b2` runs and prints plain bitext output.
- `-p` then `-a`/`-t`/`--json` are not conflicts (checks happen when the later flag is parsed); `-a` then `-p`, `--json` then `-p`, `-t` then `-p` are.
- `-p --line-by-line` on a file crashes with RuntimeException "Not implemented for a text-level rule" after printing the header.

## Nondeterministic parts and normalisation
- `Time: <ms>ms for <n> sentences (<r> sentences/sec)`: ms and rate masked, sentence/pair count compared (comparator, as F21).
- `-p` profile output (new, oracle/comparators/cli.mjs `profileLines`): "Analyze time", "Disambig time", rule rows (Time and Sentences-per-sec columns masked; rule id, Sentences and Matches compared), "Total rule time", "Total time" masked. Cases set `profileTimes: true` as a marker only (the masking is unconditional).
- Work dir path (`Working on <abs path>...`, exception messages) -> normaliser `paths`; stack frames dropped (`stackFrames`); build date/commit (`buildDate`, `commit`); `-adl` cases add `logTimestamp` (fastText WARN line).
- `-r` with several files: Java File.listFiles() order is filesystem dependent; recursive-two-files records it as-is (`orderDependent: true`); the port should not claim parity there if the order differs on another filesystem. All other -r cases have one file per directory.
- Unknown-language error text lists all supported codes (DEV-006): cases with `listCut`.

## Not oracle-able / UNORACLED
- CLI-0045 (changeLanguage failure RuntimeException): no input reaches it.
- CLI-0023, CLI-0024, CLI-0026 (language model, fastText, remote rules): deferred (D-005), not in this step.
- CLI-0073 MainTest cases with pl/sk/br/ca (testBitextMode*, testBitextWithExternalRule, testStdInWithExternalFalseFriends, testListUnknown/Polish): languages out of scope; replaced by de/en/fr equivalents above (bitext rule structure, false-friend file, -u).
- Timing values (profile, Time line), `-r` file order across filesystems.

## Infra changes
- oracle/comparators/cli.mjs: profile masking (above). No other shared file changed. Generator also writes X-CLI-BITEXT.
