# F20 porter checkpoint
Status: DONE 2026-10-16 (not committed)
- [x] 1 read Java (HTTPServer, Server, HTTPServerConfig, LanguageToolHttpHandler, ApiV2, V2TextChecker, TextChecker, ServerTools, Pipeline*) + oracle fixtures
- [x] 2 lib helpers: src/lib/java/{clock,charset,net}.js (+tests)
- [x] 3 src/server: HTTPServerConfig, ServerTools, JsonTree (Jackson subset), TextChecker/V2TextChecker/Pipeline (interim rule list), ApiV2, LanguageToolHttpHandler, HTTPServer; bin/lt-server.mjs; express dep installed (package.json)
- [x] 4 parity runner oracle/adapters/http.mjs + cli.mjs
- [ ] 5 tests/server
- [ ] 6 lint/test/parity
Decisions: data param (SRV-0098) minimal Jackson subset implemented because X-SRV-BASIC/params uses it; premium status-check text, request limiter, DB, users, words, languages/info/configinfo endpoints -> notPorted (later IDs).

Parity X-SRV-BASIC: 38 pass / 2 fail (validation[28] language=de, check-auto[6] auto-detected de-DE: German tagger F22, not flagged portLater by the oracle generator). normalizers.mjs buildDate/commit extended for '(build date: X, Y)' startup line.
Tests: tests/server/{HTTPServerConfig,ServerTools,ApiV2,JsonTree,HTTPServer}.test.js, tests/lib/java/{net,charset}.test.js (new helpers src/lib/java/{clock,charset,net}.js need review tests: written).
Results: lint clean; npm test green; full parity 541+ pass; failures: X-SRV-BASIC/validation[28] and check-auto[6] (German, F22, not flagged portLater in the oracle generator).
Adapter notes: http.mjs throws notPorted for cases using later endpoints (languages/info/configinfo/words/users/admin) and for the old X-ORACLE-CHECK/http-check (needs full rule lists + German).
Not implemented (notPortedYet, later IDs): premium status check text, RequestLimiter/ErrorRequestLimiter, DB/user accounts (apiKey/password/tokenV2/JWT), words/*, languages/info/configinfo, ruleValues, bitext sourceText, remote rules, language model, rulesFile, lang-xx dynamic languages, check time limit (maxCheckTimeMillis, needs worker pool), result cache/pipeline pool.
