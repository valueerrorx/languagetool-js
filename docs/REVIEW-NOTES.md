# Review Notes

- Boxed numbers: JS number stands for Java Integer/Long/Double; Objects.equals on numbers = Object.is (matches Double.equals NaN/-0, identical for ints); -0 always prints "-0.0"; route String.valueOf/equals/hash through one shared helper (Objects.js).
- Do not drop Java precondition checks in ported JDK methods (e.g. Throwable#initCause self-causation/overwrite).
- Keep typed overloads distinct (Object vs String vs Throwable constructor forms), e.g. AssertionError(Object) -> String.valueOf + initCause.
- "Verify via oracle" items need a fixture before merge; never ship from memory.
- Comments: one line only, also file headers.
- Oracle adapters must reproduce Harness.java error paths for malformed input.
- int helpers must never return -0 (use `| 0`); adapters/tests compare with Object.is so -0 is not hidden by printing.
- JDK overload sets: pick JS variant by Java static type (P15); NPE texts per entry point (P15).
- D-042: do not reject idiomatic JS solutions that are fixture-verified identical; reject only observable divergence or unverified claims.
- D-043: block only divergences reachable from API/CLI output or degrading results; log unreachable JDK edge cases in docs/review/unreachable.md.
