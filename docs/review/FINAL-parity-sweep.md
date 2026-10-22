# FINAL parity sweep

Date 2026-10-22. All 86 golden IDs run via `npm run parity -- <ID>` (big IDs sliced with LTJS_CASE). Counts are per case/request group as printed by the harness. Totals: 7347 pass, 8 fail, 53 dev, 55 not ported.

Note: X-DESPELL slice b-addsugg-de-DE-00..03 + a-*/b-check exceeded the 540 s limit as one slice (de-DE suggestion cases take 70-125 s each); run per case, all 12 pass (counted in the table).

| ID | pass | fail | dev | not ported |
|---|---|---|---|---|
| X-AUDIT | 176 | 0 | 12 | 0 |
| X-BITEXT | 6 | 0 | 2 | 3 |
| X-CHECK-PIPE | 63 | 0 | 0 | 0 |
| X-CHUNK | 72 | 0 | 0 | 0 |
| X-CLI-BASIC | 127 | 0 | 0 | 0 |
| X-CLI-BITEXT | 120 | 0 | 0 | 0 |
| X-CLI-OPTS | 396 | 0 | 4 | 2 |
| X-CORPUS | 444 | 0 | 0 | 0 |
| X-CORPUS-W2 | 240 | 0 | 0 | 0 |
| X-DECHECK | 60 | 0 | 0 | 0 |
| X-DECHUNK | 47 | 0 | 0 | 1 |
| X-DEFILTERS | 59 | 0 | 0 | 0 |
| X-DEFILTERS-U | 8 | 1 | 0 | 0 |
| X-DERULES-A | 114 | 0 | 0 | 0 |
| X-DERULES-AC | 44 | 0 | 0 | 0 |
| X-DERULES-B | 82 | 0 | 0 | 0 |
| X-DERULES-XML | 55 | 0 | 1 | 0 |
| X-DESPELL | 52 | 0 | 0 | 0 |
| X-DISAMB | 127 | 0 | 0 | 0 |
| X-ENCHECK | 58 | 0 | 0 | 1 |
| X-ENCHUNK | 42 | 0 | 0 | 0 |
| X-ENFILTERS | 58 | 0 | 0 | 0 |
| X-ENREPLACE | 41 | 0 | 0 | 0 |
| X-ENRULES-B | 74 | 0 | 0 | 0 |
| X-ENRULES-XML | 83 | 6 | 0 | 1 |
| X-ENSPELL | 87 | 0 | 0 | 0 |
| X-ESCHECK | 770 | 0 | 2 | 0 |
| X-FILTERS | 80 | 0 | 1 | 0 |
| X-FRCHECK | 62 | 0 | 0 | 0 |
| X-FRDISAMB | 44 | 0 | 0 | 0 |
| X-FRFILTERS | 43 | 0 | 3 | 0 |
| X-FRRULES | 70 | 0 | 0 | 0 |
| X-FRRULES-XML | 68 | 0 | 1 | 0 |
| X-FSA | 36 | 0 | 0 | 1 |
| X-HUNSPELL | 15 | 0 | 0 | 0 |
| X-I18N | 5 | 0 | 0 | 0 |
| X-ITCHECK | 148 | 0 | 1 | 0 |
| X-JSON | 27 | 0 | 0 | 0 |
| X-LANG-META | 46 | 0 | 0 | 0 |
| X-LANG-REGISTRY | 13 | 0 | 0 | 0 |
| X-LANGDETECT | 13 | 0 | 0 | 0 |
| X-LANGUAGES | 1 | 0 | 0 | 0 |
| X-LOCALE | 0 | 0 | 0 | 2 |
| X-LOGS | 40 | 0 | 1 | 0 |
| X-NUMFMT | 3 | 0 | 0 | 0 |
| X-OPENNLP | 25 | 0 | 0 | 0 |
| X-ORACLE-CHECK | 14 | 0 | 0 | 0 |
| X-PIPE | 31 | 0 | 0 | 0 |
| X-PLCHECK | 497 | 0 | 1 | 0 |
| X-PROBE-COLLECTIONS | 4 | 0 | 0 | 13 |
| X-PROBE-FORMAT | 0 | 0 | 0 | 12 |
| X-PROBE-NUMBERS | 27 | 0 | 0 | 0 |
| X-PROBE-STRINGS | 17 | 0 | 0 | 1 |
| X-REGEX | 58 | 0 | 0 | 0 |
| X-REPLACE | 21 | 0 | 0 | 5 |
| X-RUCHECK | 352 | 0 | 2 | 0 |
| X-RULEINFRA | 38 | 0 | 0 | 0 |
| X-RULELOAD | 307 | 0 | 1 | 0 |
| X-RULEMATCH | 118 | 0 | 0 | 0 |
| X-RULES-CORE | 54 | 0 | 0 | 0 |
| X-SELFTEST | 0 | 0 | 0 | 1 |
| X-SEQMATCH | 91 | 0 | 0 | 0 |
| X-SKCHECK | 109 | 0 | 0 | 0 |
| X-SLCHECK | 59 | 0 | 0 | 0 |
| X-SPELL | 9 | 0 | 0 | 1 |
| X-SPELLRULE | 33 | 0 | 0 | 1 |
| X-SRV-BASIC | 38 | 0 | 2 | 0 |
| X-SRV-CHECK | 24 | 0 | 3 | 0 |
| X-SRV-ENDPOINTS | 23 | 0 | 1 | 0 |
| X-SRV-EXEC | 87 | 0 | 1 | 0 |
| X-SRV-GUARDS | 114 | 0 | 4 | 0 |
| X-SRV-START | 360 | 1 | 4 | 0 |
| X-SRX | 51 | 0 | 0 | 1 |
| X-STYLE | 14 | 0 | 6 | 0 |
| X-SYNTH | 211 | 0 | 0 | 0 |
| X-TAGGER | 51 | 0 | 0 | 0 |
| X-TAGGER-DE | 50 | 0 | 0 | 1 |
| X-TEXT | 54 | 0 | 0 | 2 |
| X-TOKMATCH | 32 | 0 | 0 | 0 |
| X-TOOLS | 3 | 0 | 0 | 3 |
| X-UNICODE | 13 | 0 | 0 | 0 |
| X-UNIFY | 38 | 0 | 0 | 0 |
| X-UNIT | 12 | 0 | 0 | 0 |
| X-WORDSPLIT | 40 | 0 | 0 | 0 |
| X-WORDTOK | 43 | 0 | 0 | 1 |
| X-XML | 6 | 0 | 0 | 2 |
| TOTAL | 7347 | 8 | 53 | 55 |

## Real failures (8 cases, 3 distinct causes; all reproduced when re-run alone)

1. X-DEFILTERS-U/ymd-datecheck: Java `{"error":{"class":"java.lang.NumberFormatException","message":"For input string: \"2014-08-25\""}}` for requests 1..n, JS returns `{"result":null}`. Likely cause: JS date filter ymd-datecheck does not throw NumberFormatException on a yyyy-mm-dd string where Java's Integer.parseInt does.
2. X-SRV-START/cfg-language-model-dir: Java 200 + JSON check result (server runs with languageModel dir without ngram data); JS answers 500 "Internal Error: not ported yet: PipelinePool#createPipeline language model rules (DEV-001)". Likely cause: language-model-rule creation in the pipeline is unported.
3. X-ENRULES-XML/rulelist-direct-en-{AU,CA,GB,NZ,US,ZA} (request id 4): Java `"languageModelRulesNullLm":{"error":{...NullPointerException}}`, JS `"languageModelRulesNullLm":[]` (first diff at char 4265 of the line). This is the DEV-026 behaviour (null LM -> empty list) but oracle/deviations.json has no `X-ENRULES-XML/rulelist-direct-en-*#4` mask (the de entries exist as X-DERULES-XML/rulelist-direct-de#N), so it reports FAIL rather than DEV. Probably a missing deviations.json entry, not a code defect.

## Notes
- No flaky failures: every FAIL reproduced alone. Timeouts seen only from slice size (CLI cases about 2-5 s each, de-DE speller suggestions very slow), not from hangs.
