# Java -> JavaScript semantics rules

Binding for porter, parity-tester and parity-reviewer. The port-architect extends this file with project-specific traps.
Rule format: trap -> rule -> helper in src/lib/java/.

## Numbers
- `int` is 32-bit and wraps on overflow; JS Number does not. -> Use `x | 0` after arithmetic that can overflow, `Math.imul(a, b)` for int multiplication. Helper: `int.js`.
- `long` is 64-bit; JS Number is exact only up to 2^53-1. -> Use BigInt (`BigInt.asIntN(64, x)` for wrap) wherever values can exceed 2^53 (ids, hashes, timestamps in ns, bit masks). Helper: `long.js`.
- Integer division truncates toward zero; int division by zero throws ArithmeticException. -> `Math.trunc(a / b)` plus explicit zero check that throws the same message ("/ by zero").
- `%` sign follows the dividend in both languages (same), but only for integers; check float cases.
- `float` is 32-bit. -> `Math.fround` after every float operation.
- `>>` vs `>>>`: same operators, but JS works on 32-bit; long shifts need BigInt.
- `Double.toString` differs from JS `String(n)`: Java prints `1.0` (JS `1`), uses scientific notation below 1e-3 and from 1e7 with Java's own format `1.0E7` (JS below 1e-6 and from 1e21 as `1e+21`), and prints `-0.0` (JS `0`). -> Never use template literals or `String()` on Java doubles. Helper: `javaDoubleToString()`, `javaFloatToString()`.
- `String.format` / `printf` / `DecimalFormat` / `NumberFormat`: locale-dependent (de_AT uses `,` as decimal separator). -> Helper: `javaFormat(locale, fmt, ...args)`; locale from DECISIONS.md, never the JS default.
- `Integer.parseInt` / `Double.parseDouble` throw on invalid input; JS `parseInt` silently parses prefixes. -> Helper with identical acceptance rules and exception messages.
- `Math.round` behaves the same for doubles (floor(x + 0.5)), but returns long; `BigDecimal` needs a decimal library with identical RoundingMode.

## Strings and characters
- `char` is a UTF-16 code unit; JS strings are UTF-16 too, `length` and `charAt` match. Surrogate pairs behave identically. Do not use `for...of` or `[...str]` where Java iterates chars (they iterate code points).
- Char arithmetic: `'a' + 1` is int 98 in Java, string "a1" in JS. -> `charCodeAt` / `String.fromCharCode`.
- `String.compareTo` compares code units and returns the difference. -> Never `localeCompare`; helper `javaCompare(a, b)`.
- `toUpperCase()` / `toLowerCase()` without argument use the Java default Locale. -> Use the locale from DECISIONS.md; check Turkish-i and ß (`"ß".toUpperCase()` is `SS` in both).
- `String.trim()` removes chars <= U+0020 only; JS `trim()` removes all Unicode whitespace (NBSP etc.). -> Helper `javaTrim()`. `strip()` is Unicode-aware like JS trim.
- `String.split(regex)` takes a regex, removes trailing empty strings and has its own `limit` semantics. -> Helper `javaSplit(str, regex, limit)`.
- `String.replace(CharSequence, ...)` replaces all occurrences; JS `replace` with string replaces the first only. -> `replaceAll` with escaped literal.
- `replaceAll` / `replaceFirst` use a regex and `$1`/`\` in the replacement. -> Helper converting Java replacement syntax.
- `Character.isLetter/isDigit/isWhitespace` -> Unicode regex with the `u` flag matching Java's definition, helper `character.js`.
- `String.hashCode` is part of observable behaviour when it influences ordering or output. -> Helper `javaStringHash()` (32-bit wrap).

## Regex
- Java `Pattern` vs JS RegExp: `matches()` requires a full match (anchor it), possessive quantifiers and atomic groups, `\p{...}` classes (need `u` flag), `(?i)` inline flags, `\Z`/`\z`, character class intersections `[a-z&&[^e]]`, `Pattern.quote`. -> Translate each pattern explicitly and test it with oracle fixtures.

## Collections and ordering
- `HashMap` / `HashSet` iteration order depends on hash codes; JS `Map`/`Set` keep insertion order. -> If Java output depends on that order, reproduce it (helper `JavaHashMap` with identical bucket order) or prove via fixtures that order is irrelevant.
- `TreeMap` / `TreeSet` / `Comparator` -> sorted structures with the exact comparator.
- JS `Array.sort()` without comparator sorts as strings. -> Always pass a comparator. Java `List.sort` is stable, JS sort is stable (ES2019) as well.
- Object keys: Java `equals`/`hashCode` vs JS reference identity in Map/Set. -> Key by a canonical string or a helper map.
- `Collections.unmodifiableList` etc. throw on mutation. -> `Object.freeze` where the throw is observable.

## Null and exceptions
- NullPointerException where Java dereferences null; JS may silently produce `undefined` or `"null"`/`"undefined"` strings. -> Where the throw is observable, throw the same way; string concatenation of null prints `null` in Java.
- Exception class names and messages that reach the user, logs or exit codes must match exactly. -> Error classes in `errors.js` mirroring Java names.
- `System.exit(n)` -> `process.exitCode = n` with identical flush order of stdout/stderr.

## I/O and environment
- Default charset (UTF-8 since JDK 18, platform charset before) and `System.lineSeparator()`. -> Explicit encoding and line endings per DECISIONS.md.
- `.properties` files: ISO-8859-1 with `\uXXXX` escapes (Java 8) vs UTF-8 (`ResourceBundle` since Java 9). -> Helper `properties.js`.
- `System.out.println` = text + line separator; buffered vs unbuffered ordering of stdout/stderr.
- File listing order (`File.listFiles`) is unspecified; if output depends on it, match the OS behaviour or sort as Java effectively does.

## Dates and time
- `java.time` / `SimpleDateFormat` / `Calendar` vs JS `Date`: time zone, DST, pattern letters (`yyyy` vs `YYYY`, `SSS`), month 0/1-based, locale month names. -> Helper `datetime.js` using a library with IANA zones; patterns translated explicitly and covered by fixtures.
- Default `TimeZone` and `Locale` are pinned in the oracle environment and in the port.

## Randomness and time
- Seeded `java.util.Random` produces a defined sequence. -> Helper `JavaRandom` with the identical LCG (48-bit, BigInt) if seeds are used.
- Unseeded randomness and current time: not reproducible, verify structure only and document in INVENTORY.

## Concurrency
- Threads, `ExecutorService`, `synchronized`, timers -> async/await or worker_threads. Observable ordering (output, file writes) must stay identical; document the mapping in ARCHITECTURE.md.

## Project-specific rules
<filled in by port-architect>
