# Oracle backlog (batch into next oracle step)
- Porter backlog: add one-line comment in errors.js Throwable ctor about P14b (do with next src/lib/java step).
- Porter backlog S09: charDigit.js Character.digit/getNumericValue must use the JDK 17 Unicode 13 tables (currently Node tables, partial getNumericValue).
- Risk note S04: HotSpot Math.sin/cos/tan/exp/log/log10/pow (Intel libm intrinsics) modelled as correctly rounded (libm.js); rare last-bit differences possible. Every LT call site of Math.exp/log/log10/pow must get oracle fixtures in its step; mismatches -> escalate.
- F03 follow-up: api comparator dev006-languages filter for /v2/languages (needed by server step); JUnit-derived texts per language step.
