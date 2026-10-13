# S06 porter checkpoint
Done: strings.js, hash.js, StringTokenizer.js, charCase.js (interim simple case mapping for CI compares, S09 replaces), adapter probe-strings.mjs, tests/lib/java/strings.test.js.
Parity X-PROBE-STRINGS: 11 pass; 7 fail only because the adapter throws NotPorted (case-mapping-default/-locales, char-case, char-info, normalize-bytes, replaceAll-regex, split); parity.mjs has no per-request notPorted.
Verified CI compare/equalsIgnoreCase/regionMatches against JDK 17 on 6.8M generated pairs (surrogate-aware only when both strings UTF16).

## Review fixes (P15)
Fixed: replace(null) NPE; indexOf/lastIndexOf/StringBuilder NPE texts per entry point; regionMatches NPE by ignoreCase (non-CI: NPE before offset checks, CI: after; JDK verified); repeat OOM (MAX/len < count; "a".repeat(MAX) is a real heap allocation, not emulated); join(delim,null) bare NPE; append(number) safe ints only + appendLong(BigInt); insert/replace non-string -> TypeError (typed insert variants not added, no use site); hash.js typedHash.{Double,Float,Long,Short}; charCase TODO; StringTokenizer dead code removed.
StringBuilder not ported, no use site yet: capacity, ensureCapacity, trimToSize, append(CharSequence,int,int), append(char[]), compareTo, chars.
