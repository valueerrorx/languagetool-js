# F26 review

Started. Scope: StringMatcher sequence matcher, Collections/JavaHashMap, RuleSet, probe-collections, tests.

## Section 1: StringMatcher side-by-side
RunSequenceMatcher/tryCreateSequenceMatcher/parse*/containsInClass/literalPredicate/caseInsensitivePredicate: line-by-line identical to Java 504-988. Constructor NPE OK (Guava intern null).
## Section 2: Collections/JavaHashMap/RuleSet diff read; treeify binCount condition equivalent.

## Section 3: own probe e1 (354 entries x ~200 probes: case data, surrogates, quantifiers, class edge cases, Unicode 14+ chars): 0 diffs vs Java
## Section 4: further probes vs Java (harness string-matcher, scratchpad only)
- e2: 2500 random sequence-style patterns x 36 probes (cs mix, (?-i), ^$, alternations, surrogate/line-terminator inputs): 0 diffs
- e3: every BMP char with a case mapping (JDK or Node), c+ / [c]+ / x\p{Lu}+ CI: 7113 entries, 0 diffs
- e4: syntax boundaries (errors, ranges, &&, possessive/lazy, {0}, {1}, empty alts, MAX_MATCH_LENGTH): 206 entries, 0 diffs
- e5: null pattern / null probe: 0 diffs. No slow paths (JS 1s for e2).
- npm test 531 pass, lint clean, parity X-TOKMATCH 32/0, X-PROBE-COLLECTIONS 4 pass/13 notPorted.
## Findings
1 MINOR oracle/adapters/probe-collections.mjs:75-80 HashMap(Map) putMapEntries sizing implemented in the adapter, not in JavaHashMap (probe tests adapter code, not the port).
2 MINOR oracle/adapters/probe-collections.mjs:82 HashSet copy dedups src before JavaHashSet(collection); Java sizes by c.size() incl. duplicates (untriggered: no fixture has duplicate keys).
3 MINOR src/lib/java/collections/Collections.js:133 asList get with negative index returns undefined; Java AIOOBE "Index -1 out of bounds for length n".
4 MINOR docs/PLAN.md:8 F25a stub list still lists RunSequenceMatcher (F26) as stub to remove; docs/inventory/core.md CORE-0390 notes still "needs oracle fixtures" although X-TOKMATCH exists.
5 MINOR untracked oracle/cases/X-CLI-BASIC.bak/ (stray backup, must not be committed).
VERDICT: ACCEPT
