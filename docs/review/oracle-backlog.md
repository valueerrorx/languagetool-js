# Oracle backlog (batch into next oracle step)
- Porter backlog: add one-line comment in errors.js Throwable ctor about P14b (do with next src/lib/java step).
- Porter backlog S09: charDigit.js Character.digit/getNumericValue must use the JDK 17 Unicode 13 tables (currently Node tables, partial getNumericValue).
- Risk note S04: HotSpot Math.sin/cos/tan/exp/log/log10/pow (Intel libm intrinsics) modelled as correctly rounded (libm.js); rare last-bit differences possible. Every LT call site of Math.exp/log/log10/pow must get oracle fixtures in its step; mismatches -> escalate.
- F03 follow-up: api comparator dev006-languages filter for /v2/languages (needed by server step); JUnit-derived texts per language step.
- BUG F03: oracle/corpus/de/corpus.txt is English (Gutenberg #2591 English Grimm). Refetch a German public-domain text (e.g. Grimm KHM German original) before German corpus fixtures (F51+).
- F04 gaps: dynamic regex sites (AbstractUnitConversionRule, HunspellRule wordchars, Soros, containsRegexToTheLeft callers) need fixtures in their own steps; StringMatcher fast paths (CORE-0390) need own check vs Pattern.matches.
- Never run `npm run oracle -- --all` casually (regenerates everything).
