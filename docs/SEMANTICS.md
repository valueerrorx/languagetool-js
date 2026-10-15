# Java -> JavaScript semantics rules (D-044)

Binding for porters and reviewers. Only rules that can change API/CLI results (matches, offsets, ids, messages, suggestions and their order, error texts, status/exit codes) are kept. Format: trap -> rule -> helper (paths relative to `src/lib/java/` unless stated). Rules made obsolete by D-044 are listed at the end, one line each, with their former number (P1..P15).
D-042/D-043: any JS implementation is fine if the result is identical and verified; helper edge cases that cannot reach output are logged in docs/review/unreachable.md, not fixed.

## S1 Unicode version and character data (was P1)
- JDK 17 = Unicode 13, Node 24 = Unicode 16: `\p{..}`, `toLowerCase/toUpperCase`, `normalize`, `Intl` differ for later-assigned/changed code points. -> All predicates and case mappings from JDK 17 tables: `Character.js`, `unicode/*.json` (from X-UNICODE).
- Never call JS `toLowerCase/toUpperCase/toLocaleLowerCase` in ported code. -> `strings.js` `toLowerCase(s, locale)`, `toUpperCase(s, locale)`; default locale en_US; tr/az/lt special casing; Greek final sigma context (`wordBreak.js`).
- `Character.toUpperCase(cp)` is simple 1:1 (`ß` stays), `String.toUpperCase` is full (`ß` -> `SS`). -> use exactly what the Java line uses.
- `new Locale("en-US")` (EN-0050..0052 rule locales) is a malformed language `en-us`, not en_US: no special casing, no en_US number data. -> `Locale.js` constructor semantics, never `forLanguageTag`.
- `Normalizer` (removeDiacritics, NFKC/NFC): `String.prototype.normalize` except code points unassigned in Unicode 13 pass unchanged. -> `Normalizer.js`.

## S2 Regex dialect (was P2; CORE-0360..0367)
All Java patterns (XML `regexp`, `postag_regexp`, `<regexp>`, SRX, disambiguation, Java rule code, config keys) go through `regex/Pattern.js`; no JS regex literal for a Java pattern.
- Possessive quantifiers and atomic groups -> `(?=(X))\k<n>` with hidden groups.
- Class set operations and nested classes -> `v`-flag `&&`/`--`.
- `\p{L}`, `\p{Lu}`, `\p{IsAlphabetic}`, `\p{InBlock}`, `\p{javaLowerCase}` from Unicode 13 data; POSIX `\p{Punct}`, `\p{Alpha}`, ... ASCII-only unless UNICODE_CHARACTER_CLASS (DE-0102).
- `\w \d \s \h \R` ASCII/Java definitions without UNICODE_CHARACTER_CLASS; Unicode-aware with it (RegexPatternRule, SRX: CORE-0366). JS `\s`/`\w` never emitted directly.
- `\b`/`\B` in JDK 17 use `isLetterOrDigit || '_'` (+ attached non-spacing marks) even without UNICODE_CHARACTER_CLASS.
- Line terminators: `.` excludes `\n \r \u0085    `; `$`/`\Z` match before a final terminator; `^` only at 0 without MULTILINE; UNIX_LINES only `\n`.
- Inline flags anywhere (`(?i)`, `(?u)`, `(?iu)`, `(?-i)`, scoped `(?i:..)`) apply to the end of the enclosing group (DE-0090). No JS `i/m/s` flags; case-insensitivity expanded into explicit sets: CASE_INSENSITIVE = ASCII only; with UNICODE_CASE per-char `toUpperCase`/`toLowerCase` equality (JDK simple mappings). Token regexps are CASE_INSENSITIVE|UNICODE_CASE unless `case_sensitive="yes"`.
- `matches()` = whole input (token regexps, `String.matches`), `lookingAt()` prefix, `find()` search. -> `Matcher.js`.
- Escapes `\uXXXX`, `\x{..}`, `\0ooo`, `\cX`, `\Q..\E`; `\11` = group 11 only if it exists.
- Replacement syntax `$n`, `${name}`, `\$`; `$&`, `` $` `` have no meaning; illegal references throw (`regexp_replace`, Java code). -> `Matcher.js` `javaReplacement`.
- Case-insensitive back-references compare with the active case rules; translator rejects them at compile time; any harvested occurrence gets a pattern-specific rewrite (X-REGEX report).
- Empty matches in `find`/`replaceAll`/`split`: Java advances by one UTF-16 unit (also inside a surrogate pair). -> scan loop in `Matcher.js`, never `matchAll`/global `replace`.
- StringMatcher fast paths (CORE-0390) must equal full regex matching, incl. `CASE_INSENSITIVE_ORDER` (per char upper then lower) and `Character.getType`.
- Syntax errors visible in output (config `abTestClients`, `trustedSources`, user rule files): `PatternSyntaxException` message `<desc> near index <n>\n<pattern>\n<caret>`.

## S3 Strings and tokenizing (was P3)
- Offsets everywhere (API `offset`/`length`, context, sentence ranges, text limits) are UTF-16 code units, as in Java. -> keep `length`/`charAt` indexing; never code points, `for..of`, spread or `Array.from(str)` where Java loops over chars.
- `String.trim()` removes `<= U+0020` only; JS `trim()` also NBSP/BOM/U+2028 and keeps C0 controls. -> `javaTrim`; `isBlank`/`strip` use `Character.isWhitespace` (`javaIsBlank`, `javaStrip`).
- `String.split(regex[, limit])` (trailing empties removed, `"".split(",")` = `[""]`, `",".split(",")` = `[]`, zero-width match at 0 gives no leading empty, limit rules). -> `javaSplit`. Sites: `-e ""`, `enabledRules=` -> one empty id (CLI-0018/0019, SRV-0127), data loaders.
- `String.replace(CharSequence, ..)` is literal, all occurrences; `replaceAll/replaceFirst` are regex. Decide by the Java method name, never by the pattern text (DE-0031 no-op replace kept). -> `javaReplace` vs `javaReplaceAll`/`javaReplaceFirst`.
- `StringTokenizer` delimiter test per UTF-16 unit (code points only when delimiters contain surrogates) (WordTokenizer, AnnotatedTextBuilder, EN/FR tokenizers). -> `StringTokenizer.js`.
- Three different whitespace predicates: `Character.isWhitespace` (no NBSP/U+2007/U+202F), `Character.isSpaceChar` (with them, without `\t\n`), `StringTools.isWhitespace` (CORE-0444). -> `Character.js`, ported StringTools.
- `equalsIgnoreCase`/`regionMatches(true, ..)` per char upper-then-lower, surrogate-aware. -> `strings.js`.
- `compareTo`, `Collections.sort(List<String>)`, `TreeSet<String>`: UTF-16 code-unit order (`--list`, unknown words, language lists). -> `javaCompare`; never `localeCompare`/default `sort()`.
- String concatenation of non-strings in messages/suggestions: `"" + 1.5f`, `"" + 2.0` (`2.0`), `"" + null` (`null`), lists `[a, b]`, maps `{k=v}`, enums by `name()`/override. -> `toString.js` with the Java static type.

## S4 Numbers and formatting (was P4)
- `Double.toString`/`Float.toString` (JDK 17 FloatingDecimal, not always shortest) where a number is concatenated into a message or printed by the CLI. -> `toString.js`.
- JSON float fields (confidence values, `Float` in Java) are emitted as the number whose shortest text equals `Float.toString` (`Number(javaFloatToString(f))`), so `0.9999955` stays `0.9999955`; comparator compares float fields after `Math.fround`.
- `String.format("%.Nf")` rounds HALF_UP on the FloatingDecimal digit string (`%.1f` of 0.15 -> `0.2`); locale argument mandatory. Only sites reaching output (CLI time/profile lines are normalised; check messages using it are ported exactly). -> `Formatter.js` subset when the first such site is ported.
- `DecimalFormat`/`NumberFormat.getNumberInstance(Locale)` with HALF_UP on the exact binary value (unit conversion suggestions DE-0091, EN-0075..0077, `Locale.GERMANY/ENGLISH/UK/US`): CLDR 39 symbols. -> `DecimalFormat.js` (may wrap `Intl.NumberFormat` with `roundingMode: 'halfExpand'` only where X-LOCALE + unit fixtures prove equality, e.g. fr narrow NBSP).
- `MessageFormat` (Tools.i18n, rule messages from bundles): `''`, quoted text, `{0}`, number/choice sub-formats with en_US/bundle locale rules. -> `MessageFormat.js`.
- Integer parsing accepts `+`/`-` and Unicode decimal digits, no whitespace; `parseDouble` trims `<= U+0020` and accepts `NaN`, `Infinity`, hex, `d`/`f` suffix; messages `For input string: "<s>"` reach CLI/API errors (config values, `ruleValues`, `--level`). -> `numbers.js`.
- int arithmetic wraps (`maxTextHardLength * 10`, SRV-0073); `int += float` truncates; `(int)(d + 0.5)`; `Math.round(double)` = `floor(x + 0.5)`. -> `int.js`, `float.js`.
- `long` beyond 2^53 (textSessionId from SHA-256, SRV-0118, used for A/B buckets). -> `long.js` BigInt.
- `StrictMath.exp/log` (OpenNLP GIS eval, BeamSearch, `Random.nextGaussian`) -> `StrictMath.js` (fdlibm, D-029). `Math.log/log10/pow` at result sites (readability formulas, text-to-number `Math.pow(10, n)`) -> `libm.js` (D-041).
- Keep Java evaluation order and types in double arithmetic (Flesch DE-0059/EN readability, optimaize probabilities, priority arithmetic with `Integer.MIN_VALUE + 10000`). No algebraic simplification.
- Unit conversion (indriya) uses exact rational converters then `doubleValue()`. -> `src/lib/units/` with BigInt rationals.

## S5 Collections and ordering (was P5)
- `Languages.get()` order: Java order of the full distribution filtered to registered languages (X-LANGUAGES); never sort. `/v2/languages` array order and "Supported language codes" lists follow it (DEV-006 filter).
- `HashMap`/`HashSet` iteration that feeds output must be reproduced with `collections/JavaHashMap.js`/`JavaHashSet.js` (same bucket order): `Languages.getLongCodeToLangMapping()` extra entries (/v2/languages), CLI "No rules are active" category list (CLI-0039, `CategoryId.hashCode` = String hash), Unifier `equivalencesToBeKept`/`equivalencesMatched` (reading order after UNIFY, CORE-0383/0400; verify with fixtures), `HashMap<Language,Integer>` known-word counts in language detection (tie-breaking). Every other HashMap/HashSet: porter checks that no output order depends on it and notes "order-free" in the step review; otherwise use the helper.
- `fastutil` open-hash maps: lookup-only in wave 1 -> `Map`/`Set`.
- `TreeSet<String>(String.CASE_INSENSITIVE_ORDER)` collapses case variants, first inserted wins (GermanChunker). -> sorted array/`Map` keyed by the Java comparator.
- `LinkedHashMap/Set` = JS insertion order (re-put keeps position) (suggestion dedup CORE-0110, ADDITIONAL_SUGGESTIONS DE-0101).
- `PriorityQueue` heap order (OpenNLP BeamSearch). -> `collections/PriorityQueue.js` (JDK siftUp/siftDown, iteration = array order).
- Sorts are stable in both; comparators return `Integer.compare`-style ints, never booleans (SameRuleGroupFilter, CleanOverlappingFilter, suggestion ordering).
- `Set.of`/`Map.of` iteration is random per JVM run: fixtures must not depend on it.
- Shared static caches (`MultiWordChunker.getInstance(file, ..)` shared by de and fr for `/spelling_global.txt`; setters mutate the shared instance). -> same cache keys and setter order in the port (per worker in the server).
- Morfologik runtime FSAs (MorfologikMultiSpeller over `spelling.txt`, user words): arc order = byte order of the words encoded in the dictionary charset; speller ties are broken by traversal order. -> `src/lib/fsa/` builds from the sorted encoded byte sequences, never from JS string order.

## S6 I/O, charsets, data loading (was P6)
- `Scanner.nextLine()` separators `\r\n`, `\n`, `\r`, ` `, ` `, `\u0085` (ManualSynthesizer, SimpleReplaceDataLoader, WrongWordInContextRule, AbstractRepeatedWordsRule, CommonWordsDetector, MultiKeyProperties, Hunspell ignore files, AvsAnData, CompoundCheckFilter); `BufferedReader.readLine()` only `\n`, `\r`, `\r\n` (CLI line-by-line, other loaders). -> `io.js` `scannerLines`, `readerLines`.
- UTF-8 decoding: malformed bytes -> U+FFFD with Java's granularity for readers/Scanner; `Files.readAllLines` throws `MalformedInputException` instead (ConfidenceMapLoader, BeoLingus). -> `charset.js`.
- `Properties.load(InputStream)` is ISO-8859-1 + escapes (server config, morfologik `.info`); `ResourceBundle` .properties UTF-8 with ISO-8859-1 fallback; candidate chain and en_US default fallback. -> `Properties.js` (dot-properties), `ResourceBundle.js`.
- Hunspell dictionaries: words are passed in the dictionary `SET` encoding exactly as dumonts' wrapper does (byte conversion before the WASM call). -> `src/lib/hunspell/`.
- `File.listFiles()` = readdir order (CLI `-r` output order). Node `readdirSync` sorts. -> `io/File.js` via `fs.opendirSync`. `getAbsolutePath()` = `user.dir + "/" + path` without normalising (CLI "Working on ..." text).
- CLI input: BOM detection (UTF-8/16/32) when `-c` is not given (CLI-0043); unknown charset name error text.
- `URLDecoder.decode`: `+` -> space, invalid `%` escapes throw `IllegalArgumentException` with the JDK text (-> HTTP error body), malformed UTF-8 -> U+FFFD. `URLSearchParams` is lenient and must not be used. -> `net.js`.
- `Base64` decoder is strict (BasicAuthentication error path). -> `Base64.js`.
- Jackson `readTree` (`data` parameter, SRV-0098) accepts trailing content after the first JSON value and keeps last duplicate key; `JSON.parse` rejects trailing content. -> parse the first value (scan its end, then `JSON.parse` of that slice) to keep 200 vs 400 decisions equal.

## S7 Dates and clock (was P7)
- Current time only from `clock.js` (D-018; date filters DE-0113/0115, EN-0102/0103, FR-0061/0062, CORE-0181/0182). "Today" is computed in TZ Europe/Vienna.
- `Calendar` with `setLenient(false)`: invalid dates throw at `getTime()`; week data per locale (first day/minimal days: de Monday/4, en_US Sunday/1, fr Monday/4). -> `datetime.js` (minimal GregorianCalendar for the date filters).
- Day/month names in date filters come from LT's own DateFilterHelper tables, not from the JDK; no `Intl` names.

## S8 Exceptions and messages that reach output (was P8)
- `Throwable.toString()` = FQCN or `FQCN: message`; `new RuntimeException(cause)` message = `cause.toString()`; `ExecutionException(cause)` likewise. These texts appear in server 500 bodies (`Error: Internal Error: ...`, SRV-0075/0076/0139) and CLI errors. -> `errors.js` constructors; never build such messages by hand.
- `ArrayIndexOutOfBoundsException: Index 1 out of bounds for length 1` (CLI `--level` without value, `ruleValues` without `:`), `Enum.valueOf` text `No enum constant <fqcn>.<name>`, `Objects.requireNonNull` messages. -> explicit throws with JDK text where reachable.
- Uncaught CLI exception: first line `Exception in thread "main" <toString>` and `Caused by:` lines are compared; frames are free.
- NPE: where Java output shows an NPE text (fixture), throw `NullPointerException` with that text; elsewhere free.

## S9 Concurrency-derived ordering (was P11/P13 parts)
- MultiThreadedJLanguageTool: match order = rule index, then sentence order, then stable `fromPos` sort in filters; sequential port preserves it. Optional parallelism must re-merge in this order.
- Server: per-request results never depend on other requests; caches only return results equal to a fresh check.
- `allowIncompleteResults` partial results are timing dependent in Java: fixtures compare structure only.
- Language detection for out-of-scope languages: `InternalLanguage` (short code only, never registered) for CommonWordsDetector es/ca/pt; full optimaize profile set loaded as in the Java distribution so confidences are equal (DEV-006 filter on the winner).

## S10 Environment (was P12)
- Default locale en_US, `file.encoding` UTF-8, `line.separator` `\n`; extra system properties (`monitorActiveRules`, `lt.default.port`, `enableMLSuggestionsOrdering`) from env `LTJS_JAVA_OPTS` (`-Dk=v`). -> `System.js` (small).
- `LT_TEST_ONLY_*` env read once at TextChecker init (SRV-0144).

## S11 Typed values (was P14/P15 parts)
- A JS number is ambiguous between Java int/long/float/double: wherever the Java type decides output text (`StringBuilder.append`, concatenation, `String.valueOf`), call the typed variant (`appendDouble`, `appendFloat`, `javaFloatToString`, ...). Hashes that feed ordering use `typedHash` for non-int boxed numbers.

## Obsolete under D-044 (no longer binding)
- P4 part: Jackson number text in JSON (`1.0E10`, FloatingDecimal in JSON) -> JSON content compared by value.
- P5 part: Properties/Hashtable key order (only log warnings), `requestParams` map order in logs, `ConcurrentHashMap` order, `MultiThreadedJLanguageTool` `HashMap<Rule,BitSet>`.
- P6 part: JDK `Headers` name casing -> Express is case-insensitive; response header casing not compared.
- P7 part: `SimpleDateFormat` patterns for logs/HTTP `Date`/ServerTools timestamps, CLDR month names for logs.
- P8 part: JDK helpful NPE texts at internal sites, stack frame format (DEV-003 moot), StackOverflow/OOM thresholds (DEV-004 moot).
- P9: Jackson generator escapes/compact layout and parser node types (except S6 trailing-content rule).
- P10: SLF4J/logback message formatting and layouts.
- P11 part: `jvmOnce` once-per-JVM print gating.
- P13 part: `Thread.interrupted()` read-and-clear details, ThreadPoolExecutor queue kinds and cancelled-task counting, `fs.writeSync` cross-thread line ordering, JVM signal exit codes 143/130, shared clock origin across workers.
- P14/P15 part: boxed-number `Objects.equals` -0 printing, helpful NPE texts per JDK entry point.
- General rules "System.exit flush order", "stdout/stderr buffering order": streams are compared separately by content.

## Check pipeline (F15)
- Offsets: all match/sentence positions are UTF-16 code-unit indices (JS string indices), never code points.
- Java `String.split(regex)` drops trailing empty strings and keeps a leading empty string only if the match is not at index 0 with zero width; use `javaSplit` from src/lib/java/strings.js, never `String.prototype.split`.
- Language ignored-character patterns (soft hyphen etc.) are Java regexes: compile via src/lib/java/regex.
- `getCategories()` is a HashMap in Java; its order matters only where emitted (none in API v2 check); use JavaHashMap only if an output path iterates it.
