# Oracle backlog (batch into next oracle step)
- parity.mjs: unknown op without adapter (X-NUMFMT/invalid-input request op "no-such-op") must be compared against Java's harness error, not reported NOT PORTED (e.g. built-in adapter for unknown ops reproducing the Java harness error message).
- parity.mjs errorEnvelope: cause classes must use `javaClass` (FQCN), not constructor.name.
- Verify SAXParseException.toString format via oracle (used in src/lib/java/errors.js).
- Porter backlog: add one-line comment in errors.js Throwable ctor about P14b (do with next src/lib/java step).
- Porter backlog S09: charDigit.js Character.digit/getNumericValue must use the JDK 17 Unicode 13 tables (currently Node tables, partial getNumericValue).
- Risk note S04: HotSpot Math.sin/cos/tan/exp/log/log10/pow (Intel libm intrinsics) modelled as correctly rounded (libm.js); rare last-bit differences possible. Every LT call site of Math.exp/log/log10/pow must get oracle fixtures in its step; mismatches -> escalate.
