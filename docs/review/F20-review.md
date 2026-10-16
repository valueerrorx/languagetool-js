# F20 review (server skeleton)
- [x] handler dispatch/error mapping vs LanguageToolHttpHandler: identical order; getRequestQuery/parseQuery/URLDecoder (key IAE -> 500, value IAE -> 400) ok
- [x] ApiV2 check/maxtextlength/dispatch ok; other endpoints notPortedYet (F68)
- [x] TextChecker/V2TextChecker: validation order, texts, detection per request, preferredVariants ok; premium status text, apiKey/username, ruleValues, bitext notPortedYet (F69)
- [x] HTTPServerConfig arg parsing/config file ok (stderr-only nit: /s flag in --opt=value regex)
- [x] interimRules/Noop override isolated in src/server/{interimRules,Pipeline}.js, PLAN notes F32/F50/F59/F63
- [x] npm test 395 pass, lint clean, parity X-SRV-BASIC 40/0, X-JSON+X-LANGDETECT green (71 pass, 9 notPorted)
Verdict: ACCEPT (minor items only)
