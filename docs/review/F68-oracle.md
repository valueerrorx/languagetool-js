# F68/F69 oracle (X-SRV-ENDPOINTS, X-SRV-CHECK)
Status: DONE. Fixtures are real Java server runs (standalone jar, `java -cp languagetool-server.jar org.languagetool.server.HTTPServer`, env D-018, fixed clock 2026-03-15 10:00 Europe/Vienna, one JVM per distinct serverArgs/config in a run). Generators (inputs only): oracle/scripts/gen-cases-srv-endpoints.mjs, oracle/scripts/gen-cases-srv-check.mjs -> oracle/cases/<ID>/; fixtures tests/golden/<ID>/<case>/responses.json. Regenerate: `ORACLE_PORT_MIN=18200 ORACLE_PORT_MAX=18299 npm run oracle -- <ID> [<case>]` (env vars optional; without them a random free port is used). Determinism checked by regenerating defaults, mother-tongue, premium-test-text, user-limits: byte-identical.

## Infra changes (small, shared)
- oracle/lib/http-run.mjs: ORACLE_PORT_MIN/MAX restrict the port search; request field `recordHeaders:[names]` adds `headers` (lower-case names) to the response record; request field `languagesList:true` is passed through.
- oracle/comparators/api.mjs: compares `headers` when the fixture has them; for `languagesList` responses the Java /v2/languages array is reduced to entries with code de/en/fr (DEV-006) before the compare.
- Both IDs use compare `api` with normalisers buildDate, commit. Error texts containing "Supported language codes are: <list>" are cut by compareApi (DEV-006). Status 0 = connection closed without response (log-IP magic text, SRV-0100).

## X-SRV-ENDPOINTS (F68), 24 cases (21 http, 3 cli), 20 MB (configinfo bodies)
- languages (9: GET/POST/HEAD/OPTIONS/PUT, trailing slash; SRV-0092), maxtextlength (4) + -config (maxTextLength=1234, maxTextLengthAnonymous=77) + -config-all + -premium (SRV-0093), info (6) + info-premium-always (SRV-0094).
- configinfo: de-DE, de-AT, en-US, en-GB, fr, fr-CA (rules, rule options, Integer/Boolean options, SRV-0095/0096); configinfo-errors (missing/empty/unknown/auto/underscore/space/case variants, wrong parameter name, 200 chars); configinfo-post (GET doubled parameter, POST, HEAD); configinfo-maxhard (maxTextHardLength=4321).
- words (24), words-add (29), words-delete (17): method checks, no user id, username/apiKey/password/tokenV2 combinations, AuthException 403 text, blank username/apiKey (500 "username must be set"), Authorization headers (Basic, Bearer, blank), dict/dicts/offset/limit, word validation (empty, blank, spaces, NBSP, ideographic space, tabs, newline, 2000 chars), batch mode (SRV-0193, 0195, 0197, 0199).
- users-me (36) + users-me-origin: methods, OPTIONS with/without Access-Control-Request-Headers (headers recorded, 204), Basic auth parsing (missing, empty, bad base64, no colon, extra colons, umlauts, lower-case scheme), authMethod password/apiKey/addonToken/bogus/empty, format minimal/extended, query username/apiKey ignored (SRV-0105).
- refresh-user (17: SRV-0104).
- access-anonymous-denied (anonymousAccessAllowed=false on check and other endpoints), access-premium-always (config premiumAlways=true: words/add/delete/refreshUser reach the DB-less access: {"words":[]}, {"added":false/true}, {"deleted":false}, {"success":false}, NPE text for batch without words), db-config-no-driver (dbUrl/dbUsername/dbPassword without dbDriver), logging-no-db (skipLoggingChecks/RuleMatches, log params) (SRV-0199, SRV-0201).
- cli start-fail-premium-always-flag, start-fail-premium-only, start-fail-dblogging (startup exceptions, exit 1; SRV-0048, SRV-0201).
Covered IDs: SRV-0092..0096, SRV-0104, SRV-0105, SRV-0193, SRV-0195, SRV-0197, SRV-0199, SRV-0201 (+ SRV-0048 startup, SRV-0111/0112 text paths).

## X-SRV-CHECK (F69), 27 http cases, 1306 requests, 4 MB
- data-json (75): text/annotation/metaData, de/en/fr, every error text of SRV-0098/0099, odd node types (numbers, null, nested), JSON edge syntax (trailing garbage, BOM, duplicate key), data + text, JSON request body.
- text-length (+ -hard, -premium): maxTextLengthAnonymous=30 boundaries 29/30/31, emoji (UTF-16 units), umlauts, whitespace, annotation markup excluded, hard length, premium limit (SRV-0114).
- dicts (37), text-session (32): dicts/filterDictionaryMatches/textSessionId values, no DB (SRV-0116..0118).
- auto (171): auto + preferredVariants (valid, invalid, mixed, spaces), noopLanguages, preferredLanguages, forcePreferredLanguages, ld, multilingual, explicit language with these parameters, degenerate texts, out-of-scope winners (es, nl) marked `expect:dev006` (SRV-0120..0123); detect-explicit (24): detectedLanguage for foreign/short texts with explicit language.
- mother-tongue (78): all de/en/fr pairs, invalid values, auto, picky false-friend matches (de->en, fr->en; SRV-0125); es/pt/nl/ru/it marked dev006.
- enabled-only-alt (74): enabledOnly truthiness (true/yes/TRUE/1/...), conflicts and error texts, altLanguages parsing and variant error (SRV-0126); rule-lists (117): enabled/disabled Rules/Categories splitting, empties (500 "Category id must not be empty"), unknown ids (SRV-0127); temp-off (48): enableTempOffRules, allowIncompleteResults, enableHiddenRules (SRV-0128, 0129 without timeout).
- mode-level-tone (189): mode, level (all valid and invalid values), toneTags (all tags, unknown, combinations) with default rule sets (SRV-0130..0132); callback-logging-rulevalues (123): JSONP validation, inputLogging, ruleValues incl. errors (SRV-0133..0135); bitext (56): pairs de/en/fr, missing/unknown sourceLanguage, IllegalArgumentException "fromPos" bug (SRV-0136).
- premium-test-text (41, non-premium: premiumHint, ordinary check), premium-always (44) and premium-always-flag (config premiumAlways=true: PREMIUM_FAKE_RULE, no premiumHint, hidden rules ignored; SRV-0048, 0113); user-limits (63) and anonymous-denied (12): username/apiKey/password/tokenV2/Authorization combinations (SRV-0111, 0112).
- log-ip, log-ip-pattern (--logIpMatchingPattern), log-ip-off (--notLogIP): status 0 for matches (SRV-0100); log-params (33: v, languageChanged, instanceId, useragent, abtest, optInThirdPartyAI, c, unknown parameters, SRV-0143); abtest-config, abtest-bad-rollout (SRV-0144); defaults (24: default rule sets with spelling/grammar errors de/en/fr, picky, c=1).
Covered IDs: SRV-0098..0100, 0111..0114, 0116..0118, 0120..0123, 0125..0136, 0143 (response side), 0144 (parameter side), 0173 (no behaviour).

## Notes
- German texts are not marked portLater (German is ported); out-of-scope detected languages carry `expect:dev006`.
- Premium status via startup flag --premiumAlways is rejected by Java (IllegalArgumentException "Cannot use --premiumAlways with non-premium version"); only the config key works.
- Java peculiarities recorded: empty callback is rejected; blank username -> 500 "username must be set"; lower-case `get` method in the harness yields status 0 (dropped from the cases).

## UNORACLED
- Timeout / ErrorRateTooHigh incomplete results (SRV-0129 warnings text) and SRV-0138 timeouts: wall-clock dependent. Manual check: TextCheckerTest/HTTPServerTest testTimeout with the JS clock hook.
- Log output (SRV-0070, 0143 "Check done", A/B restricted-rules INFO lines): logs not compared (D-045).
- Restricted-rules A/B test mode (env LT_TEST_ONLY_*, SRV-0144) and the PremiumAbTestService: not set in these runs.
- DB-backed paths (SRV-0116 user dictionary words, SRV-0194/0196/0198, users/me with a found user, valid JWT/Authorization success, request limiter, ping bookkeeping SRV-0201): no database in the open-source setup.
- /v2/languages exact order of the HashMap-derived extra entries is recorded but the list is filtered to de/en/fr (DEV-006).
