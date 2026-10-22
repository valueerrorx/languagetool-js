# W42 oracle (X-CORPUS-W2)
Status: DONE (fixtures + parity for it, pl, sl, sk, ru). All expected values come from the real Java jar (env D-018, fixed clock). Same structure as X-CORPUS (docs/review/F72-oracle.md).

## Corpora (oracle/corpus/<lang>/corpus.txt + SOURCE.md, built by oracle/scripts/fetch-corpus.mjs <lang>)
| lang | sources (public domain) | paragraphs | size |
|---|---|---|---|
| it | Gutenberg #52484 Pinocchio, #45334 I promessi sposi v.1, #25179 La carita del prossimo | 79 | 28 KB |
| pl | Gutenberg #8119 Sklepy cynamonowe, #34635 Menazerya ludzka, #38459 Bez przewodnika, #28014 Jeden miesiac zycia | 80 | 29 KB |
| sl | Gutenberg #75797 Deseti brat, #59722 Trdina (partly diacritic-less OCR-like spelling) | 51 | 23 KB (sentence quota not reached, only two usable Gutenberg prose texts) |
| sk | sk.wikisource "Dva dni v Chujave" (Zaborsky, 1873, old spelling; Gutenberg has no Slovak) | 78 | 28 KB |
| ru | ru.wikisource Chekhov "Palata No. 6" ch. I-XIX (Gutenberg ru texts are ASCII-only/HTML) | 72 | 27K chars (54 KB UTF-8) |
| es | Gutenberg #320 Lazarillo de Tormes, #52597 Insolacion y Morrina, #25777 El idilio de un enfermo | 73 | 34 KB |
fetch-corpus.mjs gained a Wikisource source type (`wiki`, `page`; extract, fallback to action=raw wikitext), retries and a User-Agent. Only the six new languages were fetched; de/en/fr corpora untouched.

## Cases
Generator `node oracle/scripts/gen-cases-corpus-w2.mjs` (wipes and rewrites oracle/cases/X-CORPUS-W2, inputs only; chunks of 14 paragraphs). Variants: it, pl-PL, sl-SI, sk-SK, ru-RU, es, es-AR. Channels `h-`, `http-`, `cli-` x levels default/picky, names `<channel>-<variant>-<level>-<n>`. 240 cases (80 per channel), golden 22 MB.
Java facts: all 1012 /v2/check requests HTTP 200, all 80 CLI runs exit 0, no harness errors. Harness match totals per level (default/picky): it 252/252, pl 261/261, sl 480/480, sk 249/249, ru 102/119, es 203/321, es-AR 203/321.

## Generate / run
- Fixtures: `ORACLE_PORT_MIN=19500 ORACLE_PORT_MAX=19599 ORACLE_CASES='^h-(it|pl-PL)-' npm run oracle -- X-CORPUS-W2` (about 6 s per case; channels can run in parallel with disjoint port subranges).
- Parity: `LTJS_CASE='<regex>' npm run parity -- X-CORPUS-W2`.

## Parity result (2026-10-22)
| lang | harness | /v2/check | CLI --json |
|---|---|---|---|
| it | 12/12 | 12/12 | 12/12 |
| pl | 12/12 | 12/12 | 12/12 |
| sl | 8/8 | 8/8 | 8/8 |
| sk | 12/12 | 12/12 | 12/12 |
| ru | 12/12 | 12/12 | 12/12 |
| es, es-AR | not run (es port in progress) | | |
168 pass, 0 fail, 0 skip. Runtimes: harness 1.3 min, CLI 2.8 min, http 8 min for all five languages. No failures, so no diffs to report. The 72 es/es-AR cases (`LTJS_CASE='^(h|http|cli)-es'`) are still to be run once es is ported.
