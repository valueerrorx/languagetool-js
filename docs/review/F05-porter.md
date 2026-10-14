# F05 porter checkpoint (Java regex -> JS)

Plan (sub-steps, tick when done):
- [ ] 1 charset.js (RangeSet algebra), props.js (Java \p names on Unicode 13 tables), casefold.js
- [ ] 2 parser.js (Pattern.java compile port -> AST, PatternSyntaxException messages/indices)
- [ ] 3 emit.js (AST -> JS RegExp source, u flag, own case folding) + analyze (needs interpreter?)
- [ ] 4 interp.js (backtracking matcher for constructs JS cannot express exactly)
- [ ] 5 Pattern.js / Matcher.js (API, split, replace, quote), index.js
- [ ] 6 adapters oracle/adapters/regex.mjs + probe-strings regex fns
- [ ] 7 tests tests/lib/java/regex/*.test.js, lint, parity

Decisions:
- u flag (not v): class algebra is done at translation time on Unicode 13 range sets, output is flat classes.
- Ad hoc Java oracle for experiments: scratchpad jx.mjs/q.mjs (runHarness, no goldens written).
- Java index in PatternSyntaxException = cursor-1 in code points of the (\Q..\E-rewritten) pattern.

## Status (checkpoint 1)
- Done: charset.js, props.js, casefold.js, names.js (Latin-1 only), parser.js, emit.js, interp.js, Pattern.js (Pattern+Matcher), index.js, adapters regex.mjs + unicode-dump pattern part + probe-strings regex fns.
- X-REGEX 58/58 PASS (33969 requests), X-UNICODE pattern-classes PASS, X-PROBE-STRINGS regex cases PASS (see parity run).
- TODO: tests/lib/java/regex/*.test.js, lint, differential fuzz vs Java (jx.mjs), perf check, strings.js re-export, report.

## Checkpoint 2
- Hardening via differential fuzz vs real Java (scratchpad fuzz.mjs/targeted.mjs/startcheck.mjs): StartS rule (global hasSupplementary = pattern text has supplementary cps OR a non-Bmp CharProperty was built), study() as CPS port, GroupCurly port, Curly port, lone-surrogate/pair handling (engine falls back to interp for texts with surrogate pairs when pairSafe is false).
- interpReason rules: \G, \X, \b{g}, CI backref, backref to maybe-unset group, nullable quantified body, group not in every iteration, captures inside look-around/atomic/possessive/GroupCurly body, quantified \R.
- Next: tests, lint, perf, more fuzz, strings.js re-export, final report.

## Checkpoint 3
- pattern.test.js: 3 failures were wrong test expectations (verified vs real Java): 'STRAßE' input was identical to pattern (Java true, now uses 'STRASSE' -> false); end('y') is 7; \Ga on 'aab' finds [0,1],[1,2]. Also confirmed Java: 'ß' vs 'ẞ' (CI|UC) false, 'ßx' vs 'ẞx' true.
- strings.js re-export of javaSplit/ReplaceAll/ReplaceFirst/Matches already present.
- Perf (all 33969 harvested X-REGEX patterns, 157022 find-all runs over their inputs): compile 517 ms total (~15 us/pattern), matching 4.1 s total (~26 us/run). Nothing pathological.
