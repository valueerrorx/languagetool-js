# F72 oracle (X-CORPUS)
Status: DONE (fixtures). All expected values come from the real Java jar (env D-018, fixed clock). Parity results: see end of file.

## What
Every paragraph of oracle/corpus/{de,en,fr}/corpus.txt (de 81, en 75, fr 70 paragraphs, split at blank lines) checked with the default rule set of each variant, level DEFAULT and PICKY, through three channels:
- `h-<variant>-<level>-<n>`: harness op `check` ({lang, text, level}), one request per paragraph; comparator `check`.
- `http-<variant>-<level>-<n>`: POST /v2/check ({language, text, level=default|picky}), one request per paragraph; comparator `api` (buildDate, commit normalised).
- `cli-<variant>-<level>-<n>`: CLI `-l <variant> --json --level DEFAULT|PICKY -` with the chunk joined by blank lines on stdin; comparator `cli`.
Variants: de-DE, de-AT, de-CH; en-US, en-GB, en-AU, en-CA, en-NZ, en-ZA; fr, fr-BE, fr-CA, fr-CH. `<level>` is lowercase `default|picky`. `<n>` = chunk of 14 paragraphs (de 0..5, en 0..5, fr 0..4; last chunk shorter).

## Sizes
444 cases (148 per channel): de 36, en 72, fr 40 per channel. Golden: tests/golden/X-CORPUS 37 MB (h 12, http 15, cli 11). Java facts: 1946 /v2/check requests, all HTTP 200; 5792 matches over both the harness and the HTTP channel (identical totals); all 148 CLI runs exit 0; no harness errors.

## Generate / run
- Generator (wipes and rewrites oracle/cases/X-CORPUS, inputs only): `node oracle/scripts/gen-cases-corpus.mjs`.
- Fixtures: `ORACLE_PORT_MIN=18800 ORACLE_PORT_MAX=18899 npm run oracle -- X-CORPUS <case>` for one case, or `ORACLE_CASES='^h-' ... npm run oracle -- X-CORPUS` for a channel (regex over case names; `^http-`, `^cli-`, `-picky-`, `-fr-CH-`). A whole channel takes about 40 min (about 15-30 s per case: Java side, one JVM per case). Three channels can run in parallel with disjoint port ranges (h 18800-29, http 18830-59, cli 18860-99).
- Parity per case or group: `LTJS_CASE='<regex>' npm run parity -- X-CORPUS`, e.g. `LTJS_CASE='^h-de-DE-default-0$'` (one case, JS side a few seconds to ~1 min), `LTJS_CASE='^http-en-GB-'`, `LTJS_CASE='^cli-fr'`. Never run the whole ID in one go (about 444 cases); split by channel and language group (e.g. `^h-de-`, `^http-en-US-`).
- Case-size rule: a single case (14 paragraphs, 5-8 KB of text) finishes in well under 5 min in parity for all channels.

## Parity result (2026-10-21)
444 pass, 0 fail, 0 skip, 0 not ported (h 148 in about 8 min, cli 148 in about 28 min, http 148 in about 55 min, run in parallel per channel with `LTJS_CASE='^h-'|'^http-'|'^cli-'`). No deviations needed. Slowest single case stays far below 5 min.
