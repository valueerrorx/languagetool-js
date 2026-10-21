# Partial / unverified ids: re-check 2026-10-21

Re-run per fixture ID (`npm run parity -- <ID>`, big ones with `LTJS_CASE=<regex>` chunks; nothing failed, only notPorted). Reasons of notPorted requests via a scratch replay of the adapters.

## Fixture results now
| ID | result |
|---|---|
| X-PIPE | 28 pass, 0 fail, 3 notPorted (cache-de-DE/en-US/fr: ResultCache F70) |
| X-STYLE | 19 pass, 1 notPorted (other-langs: pl-PL, ru-RU) |
| X-REPLACE | 21 pass, 5 notPorted (checkcase-ca, checkcase-nl, punctuation-uk, spacebefore-fa, spacebefore-km) |
| X-BITEXT | 5 pass, 6 notPorted (only pl/es/ja/sv/ru/gl requests) |
| X-TOOLS | 3 pass (correct, diffs, rules), 3 partial notPorted (lm-warning nl/ru/zh; misc es/uk/ja/zh/ru + 5 profile requests; util 3 ics) |
| X-SPELL | 9 pass, 1 notPorted (speller-errors: empty resource name = class path root) |
| X-SPELLRULE | 33 pass, 1 notPorted (misc-multitoken: es/pt/ca/nl/it) |
| X-HUNSPELL | 15/15 pass (run per case group; whole ID exceeds 550 s) |
| X-RULES-CORE | 54 pass |
| X-FILTERS | 81 pass |
| X-ENCHECK | 57 pass, 2 notPorted (mothertongue-es, -nl) |
| X-ENRULES-XML | 62 + 9 pass, 8 notPorted (rulelist-direct-* es/nl parts, rulelist-all-en-US-mt-es/-nl) |
| X-RULELOAD | all pass (OOM when run as one ID in a single process: use LTJS_CASE chunks) |
| X-CHECK-PIPE 63, X-DISAMB 127, X-RULEINFRA 38, X-CLI-BASIC 127, X-LANGUAGES 1 | all pass |
| X-CLI-OPTS adl cases | 15 pass, 3 notPorted (adl-undetectable, adl-no-lang-arg-mixed, json-stdin-adl-undetectable: Java detects ca/it/ga) |
| X-LANG-META | 39 pass, 7 notPorted (priority-* `real:true`): obsolete adapter guard, see below; a scratch replay of all 7 rows matches Java exactly (6220/6201/5328/5328/5336/6858/6858 rules) |
| X-ORACLE-CHECK | 12 pass, 2 notPorted: http-check (obsolete guard; scratch replay PASS), disambiguation-examples-de-sample (no adapter `disambiguation-examples.mjs`; `disamb-examples.mjs` exists under another op name) |

## Class A: passes now, can be verified (26, +6 conditional)
- CORE-0054, 0058, 0059, 0060, 0084, 0085, 0086, 0087, 0088, 0091 (X-PIPE all en/de/fr cases pass; no case.json id mapping, based on PLAN review F35 notes; 0087 not named there, check mapping)
- CORE-0259, 0260, 0262, 0263, 0264 and CORE-0427..0432 (X-STYLE en/de/fr incl. repwords, statistic, stylerepeated, readability pass)
- CORE-0272 (X-REPLACE compound-en-US and compound-de-DE pass)
- CORE-0327 (X-TOOLS correct passes incl. text mode)
- CORE-0239 (X-SPELLRULE misc-vague/misc-foreign pass), CORE-0436, CORE-0437 (sr-check all pass with real analysis)
- Conditional: EN-0009..0014 (rule lists verified, F50 note: wait for ConcurrencyTests port)

## Class B: only out-of-scope languages (DEV-006/008) or DEV-001 (17)
- CORE-0057, 0292, 0293, 0300 (bitext/false friends: pl, es, ja, sv, ru, gl requests; guard javaLanguages.js)
- CORE-0423, 0424, 0426 (ca, nl, uk, fa, km module rules)
- CORE-0328 (paragraphEnd es/uk/ja/zh/ru; also 5 `profile` requests, adapter bug: obsolete, see below, so en/de profile parts will pass after the adapter fix)
- CORE-0450 (nl/ru/zh)
- CORE-0237 (es/pt/ca/nl/it multitoken)
- CORE-0233 (SuggestionsChanges, SuggestionChangesExperiment, SuggestionsOrdererFeatureExtractor: ML/LM, DEV-001)
- CORE-0266 (TestRemoteRule missing: remote rules DEV-001; X-TOOLS rules passes)
- EN-0002 (mothertongue es/nl), FR-0025 (other-language multitoken parts)
- CLI-0009, CLI-0032, CLI-0044 (adl: ca/it/ga detected by Java)

## Class C: real port gap (3)
- CORE-0095 ResultCache (SimpleInputSentence, InputSentence, CacheUtils): case X-PIPE/cache-de-DE, cache-en-US, cache-fr (9/10 requests); guard src/core/JLanguageTool.js:1018 and :1374 (planned F70)
- CORE-0332 InterruptibleCharSequence: X-TOOLS/util `ics` (3 requests), the regex engine never calls charAt, so Matcher.find interruption is not modelled (adapter tools-util.mjs)
- CORE-0317 LanguageAnnotator#detectLanguages (src/core/LanguageAnnotator.js:10): stub throws notPortedYet "needs VagueSpellChecker", but VagueSpellChecker and the rule lists exist now (inventory says ported; not in the requested steps, found by the guard grep; no fixture)

## Class D: unoracled (3)
- CORE-0186: DictionaryMatchFilter / DictionarySpellMatchFilter (server module; src/server/Pipeline.js:18 comment, no classes in src), DictionaryMatchFilterTest/DictionarySpellMatchFilterTest not ported; SameRuleGroup/RuleWithMax/SuggestionFilter exist
- CORE-0345 (Translator marker interface / DataSource), CLI-0045

## Obsolete bypasses and guards
Oracle adapters (candidates for removal; each verified by scratch replay where noted):
- oracle/adapters/lang-priority.mjs:6 `a.real === true` notPorted: obsolete, all 7 X-LANG-META priority-* real rows match Java
- oracle/adapters/http.mjs:31,35 NEEDS_FULL_RULES guard: obsolete, X-ORACLE-CHECK/http-check passes with it removed
- oracle/adapters/tools-misc.mjs:75 `profile` notPorted ("built-in Java rules not ported, F45+") together with line 71-72 using `lt(a.lang, null)` (bare tool without rules, newTool); Java ToolsOps uses `new JLanguageTool(lang)` (ToolsOps.java:133). With a real `new JLanguageTool(lang)` the 4 profile results (error text-level, 0, 3, 1) match Java; NO_SUCH_RULE case also needs the Java NPE (rule null) instead of notPorted
- oracle/adapters/replace-check.mjs:106-108 f37Rules (always throws), :15 `case 'rules'`; oracle/adapters/unit-check.mjs:3,6-8 f38Rules wrapper: dead after F50/F59/F63
- oracle/adapters/style-check.mjs:33-37 nativeRules (default throws), :51-57 NoopChunker/withNoopAnalysis branch for other languages (only reached for languages that fail earlier anyway)
- oracle/adapters/tools-correct.mjs:35 notPorted rule list guard: only fires for non-en/de/fr (legitimate DEV-006, keep)
- oracle/adapters/_spellrule-common.mjs:71 spellingRules per variant instead of Language#getRelevantRules (F42 interim; real list available now; sr-* results already pass)
- oracle/adapters/check-rules.mjs:1,~79 mirrored rule lists "until F17" (only de/en/fr synthetic lists; real list available)
- oracle/adapters/lt-api.mjs:1 comment 'default'/'mother:' use no built-ins; oracle/adapters/pipe-check.mjs:19-20 and _check-pipe-common.mjs:27 withNoopAnalysis (deliberate R4 bypass, X-PIPE passes, only keep for synthetic rules)
- oracle/adapters/pipe-check.mjs:25 ResultCache notPorted (C, still needed)

src guards:
- src/core/language/javaLanguages.js:1-30 (isUnportedJavaLanguage etc.): still needed (DEV-006) for BitextPatternRuleHandler.js:4 and FalseFriendRuleHandler.js:6,32
- src/core/patterns/filterRegistry.js:46-58 PENDING_RULE_FILTERS fr entries (12 fr classes): obsolete, all registered via src/lang/register.js (hasClass guard makes them no-ops); ca/es/nl/ru entries (lines 59-62) hold real classes too, but are out of scope; pendingFilterClass :66-76 dead
- src/core/LanguageAnnotator.js:10 stub (class C above)
- src/core/language/components.js:12-35 PendingComponent / createComponent fallback: still used for unregistered classes
- src/core/JLanguageTool.js:349,639,743 remote rules (DEV-001, keep); :1018,1374 ResultCache (F70, keep)
- src/cli/Main.js:540 out-of-scope language guard (keep)
- src/server/interimRules.js is gone; no interim -eo guard left (grep for interim in src: none)
- src/server/Pipeline.js:9-10 language model (DEV-001) and rulesConfigFile, TextChecker.js:137 remote rules (DEV-001), request limiters/database (server steps)

## Counts
A 26 (+6 conditional), B 17, C 3, D 3. Failures in re-run fixtures: 0.
