# Wave-1 residual sweep (2026-10-21)

Method: per id the fixtures were re-run per case (`npm run parity -- <ID>` with `LTJS_CASE`), the notPorted requests were listed by replaying the adapters, JUnit ports run with vitest. Blocker classes: W2 = wave 2 language (it/es/sl/ru/sk/pl, D-054), OOS = out-of-scope language (DEV-006), DEV-001, D-026/DEV-002, UNORACLED.

Port gap closed: `DictionarySpellMatchFilter` (src/core/rules/DictionarySpellMatchFilter.js, Aho-Corasick phrase search with a Guava-style cache of 100/600 s), added in `PipelinePool.createPipeline` as in Java; `PipelineSettings(lang, userConfig)` built a QueryParams with null mode/level (NPE), now Mode.ALL / Level.DEFAULT. Tests: tests/server/DictionaryMatchFilter.test.js (3), tests/server/DictionarySpellMatchFilter.test.js (4 of 5, testLoading is @Ignore), testAccessDenied in tests/server/HTTPServer.test.js.

| ID | new status | evidence / blocker |
|---|---|---|
| CORE-0009 | verified | X-UNICODE 13/13, X-PROBE-STRINGS 17 pass, StringToolsTest 25/25. Open parts are unreachable JDK helper dumps (D-043): X-LOCALE locale-dump adapter stub (displayName, DecimalFormatSymbols, DateFormatSymbols of ~50 locales), X-PROBE-STRINGS/normalize-bytes `bytes`/`fromBytes` (84 requests, charsets other than UTF-8) |
| CORE-0057 | ported | X-BITEXT: pl/es (W2), ja (OOS) requests notPorted |
| CORE-0186 | verified | DictionarySpellMatchFilter ported, DictionaryMatchFilterTest 3/3, DictionarySpellMatchFilterTest 4/4 |
| CORE-0233 | ported | SuggestionsChanges, SuggestionChangesExperiment, SuggestionsOrdererFeatureExtractor not ported: only active with enableMLSuggestionsOrdering / experiments (DEV-001); the other helpers pass (X-SPELL rank, DetailedDamerauLevenstheinDistanceTest) |
| CORE-0237 | ported | X-SPELLRULE misc-multitoken: es, it (W2), pt, ca, nl (OOS) requests notPorted; en/de/fr parts pass |
| CORE-0266 | ported | TestRemoteRule missing (only built from remote-rule config, Language.java:238, DEV-001); Demo/Fake/SpecificId/TestHackHelper pass |
| CORE-0423 | ported | only subclass is uk PunctuationCheckRule (OOS); X-REPLACE punctuation-uk notPorted |
| CORE-0424 | ported | only subclasses fa, km (OOS); X-REPLACE spacebefore-fa/-km notPorted |
| CORE-0426 | ported | only subclasses ca, nl (OOS); X-REPLACE checkcase-ca/-nl notPorted |
| CORE-0292 | ported | X-BITEXT load-resource /pl /ru /gl bitext.xml: pl, ru (W2), gl (OOS) |
| CORE-0293 | ported | X-BITEXT tools-bitext: pl, ru, es (W2), gl (OOS) |
| CORE-0300 | ported | X-BITEXT ff-pairs: pl, es (W2), ja, sv (OOS) |
| CORE-0315 | verified | X-SRV-START cfg-local-api-mode*, cfg-preferred-languages, lang-prefs-keys pass; SimpleLanguageIdentifierTest |
| CORE-0317 | verified | LanguageAnnotator is no stub any more (PARTIALS class C was stale); LanguageAnnotatorTest 6/6 |
| CORE-0328 | ported | X-TOOLS misc: profile parts now pass; paragraphEnd es, ru (W2), uk, ja, zh (OOS) notPorted |
| CORE-0332 | verified | X-TOOLS util 32/35; the 3 `ics` regex+interrupt requests are DEV-007 (V8 regexes never call charAt) |
| CORE-0333 | verified | X-SRV-EXEC harness-thread-pool, queue-*, pipeline-pool-exhausted pass; CircuitBreakers belong to remote rules (DEV-001) |
| CORE-0336 | verified | X-LOGS 40 pass, 1 differs (srv-errors: Java 500 `Index 1 out of bounds`, port 400 by DEV-021, golden unchanged, not yet in oracle/deviations.json); log statements of deferred classes: DEV-001/DEV-002 |
| CORE-0345 | verified | X-ENSPELL misc-beolingus-test/-own/-errors pass (Translator, DataSource, TranslationData, TranslationEntry exist) |
| CORE-0450 | ported | X-TOOLS lm-warning: nl, zh (OOS), ru (W2) requests notPorted; en/de/fr pass |
| CLI-0009 | verified | X-CLI-OPTS adl-* pass (41 pass with json-*) |
| CLI-0032 | verified | X-CLI-OPTS json-*, combo-json-*, X-CLI-BASIC pass |
| CLI-0044 | ported | X-CLI-OPTS adl-undetectable, adl-no-lang-arg-mixed, json-stdin-adl-undetectable notPorted: Java detects ca/ga (OOS) / it (W2) |
| CLI-0045 | ported | UNORACLED: Main.changeLanguage wrapper is ported but no input reaches it (a real Java run of `-adl -d NOSUCHRULE` shows Tools.selectRules ignores unknown ids); needs an oracle case with a failing JLanguageTool constructor, none found |
| CLI-0067 | verified | JnaTools sets jna.nosys, no observable output |
| CLI-0070 | verified | CommandLineParserTest/CommandLineToolsTest/MainTest (39/40; the failure is the DEV-019 test update of the lead, `--level` last) |
| SRV-0005 | verified | X-SRV-START args-config-*, lm-config-*, lm-cli-overrides-config pass (args-config-last: DEV-020 in flight) |
| SRV-0009 | verified | HTTPServerTest#testAccessDenied ported (empty allow-list: 403 v1 and v2); DEFAULT_ALLOWED_IPS |
| SRV-0015 | ported | UNORACLED: root-user warning (needs a Java run with `-Duser.name=root`, JS reads os username); DB init log line is covered by X-LOGS |
| SRV-0181 | ported | X-SRV-START cfg-language-model-dir: language model rules (DEV-001), port answers 500 notPortedYet |
| SRV-0185 | verified | X-SRV-START redis-keys, redis-sentinel, num-redis*, num-sentinelPort-abc pass; configured Redis is D-026/DEV-002 |
| SRV-0051 | verified | X-SRV-START db-*, num-db* pass; configured DB is D-026/DEV-002 |
| SRV-0187 | verified | X-SRV-START prometheus-garbage/-off/-on, num-prometheusPort-* pass; exporter is D-026/DEV-002 |
| SRV-0070 | verified | X-LOGS Handling/Handled lines pass |
| SRV-0089 | verified | X-LOGS 40/41 (see CORE-0336) |
| SRV-0174 | verified | X-LOGS 40/41 (see CORE-0336) |
| DE-0220 | verified | data only; X-DESPELL b-regression-inputs pass; SuggestionRegressionTest both @Ignore |
| EN-0002 | ported | X-ENCHECK mothertongue-es (W2 false-friends), mothertongue-nl (OOS) notPorted; de/fr pass, X-ENRULES-XML rulelist-all-en-US-mt-de/-fr pass |
| FR-0010 | verified | X-LANG-META 46/46, X-FRRULES-XML rulelist-all-fr-BE |
| FR-0011 | verified | X-LANG-META, X-FRRULES-XML rulelist-all-fr-CA |
| FR-0012 | verified | X-LANG-META, X-FRRULES-XML rulelist-all-fr-CH |
| FR-0025 | verified | fr JLanguageToolTest#testMultitokenSpeller, X-SPELLRULE misc-multitoken fr request pass |

Counts: 25 verified, 17 stay ported (12 wave-2/out-of-scope language parts, 3 DEV-001, 2 unoracled). Steps flipped to verified: F35, F60, F70, F71.

Observed, not mine: X-CLI-BITEXT (120 cases) does not finish within 590 s in one parity process (run per case); X-SRV-START failures args-config-last, args-port-last, https-config-last, lm-last and X-SRV-BASIC start-fail-config-no-arg, start-fail-port-missing are DEV-020 (Missing value for option) not yet mapped in oracle/deviations.json.
