# Oracle

Spec: docs/ORACLE.md. Commands: `npm run oracle -- <ID> [<case>] | --all | --selftest`, `npm run parity [-- <ID>...]`.

- Pinned env: env -i, PATH=/usr/bin:/bin, HOME=<work>/home, LANG=LC_ALL=C.UTF-8, TZ=Europe/Vienna, JDK 17 (/usr/lib/jvm/java-17-openjdk), -Duser.language=en -Duser.country=US -Dfile.encoding=UTF-8, tmpdir=<work>/tmp.
- Fixed clock: libfaketime v0.9.13 (oracle/scripts/build-faketime.sh -> oracle/tools/, gitignored), start-at 2026-03-15 10:00:00 Europe/Vienna. `--selftest` checks it.
- Harness: oracle/harness/src (build: oracle/scripts/build-harness.sh), JSON-lines protocol `{id,op,args}` -> `{id,ok,result|error}`. Ops: probe, X-LANGUAGES, num-tostring. Clock values in probe are truncated to the minute.
- Cases: oracle/cases/<ID>/<case>.json (harness kind only so far). Fixtures: tests/golden/<ID>/<case>/.
- JS twins: oracle/adapters/<op>.mjs exporting `run(args)`; `export const notPorted = true` marks a stub (reported "NOT PORTED", not a failure). An adapter may also throw an error with `notPorted === true` to mark a single request NOT PORTED; such requests are dropped from the comparison, the remaining ones are compared, and a case with no mismatches but some notPorted requests is reported NOT PORTED. Ops without an adapter that Harness.java does not know are answered with its `java.lang.IllegalArgumentException: unknown op: <op>` envelope and compared. Error envelopes use `javaClass` (FQCN) when present, else constructor.name, for the error and its causes.
- Pseudo-IDs: X-SELFTEST (probe), X-LANGUAGES, X-NUMFMT (Double/Float.toString; no inventory ID owns it, it is a lib helper in toString.js).
- Probe topics (S01/S05/S11/S19): ops probe-numbers/-strings/-format/-collections (Probe*.java), case generators oracle/scripts/gen-probe-cases-*.mjs write oracle/cases/X-PROBE-*/ (inputs only). Numbers travel as {t,v} strings; probe responses are ASCII-escaped JSON so lone surrogates survive; strings are returned with their UTF-16 `units`.
