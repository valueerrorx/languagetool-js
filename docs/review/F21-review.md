# F21 review log
- npm test 79 files green, lint clean, parity X-CLI-BASIC 105 pass/0 fail/17 skip/5 notPorted; X-SRV-BASIC/X-RULES-CORE/X-CHECK-PIPE total 204 pass 0 fail.
- Usage text byte-identical to Java (diffed). Parser, option defaults, error texts, exit paths match Java branch by branch.
- MT ordering by rule index verified in Java MultiThreadedJLanguageTool#performCheck (TreeMap by index): porter claim correct, CLI-0071 note wrong.
- CleanOverlappingFilter matches Java line by line; CleanOverlappingFilterTest (219 lines) and MultiThreadedJLanguageToolTest not ported.
- -eo guard only a code comment, not tracked in PLAN/DECISIONS.
- io.js charsets: only utf-8/16/32, latin1, ascii; -c windows-1252 etc. -> UnsupportedEncodingException (Java accepts).

## Round 2
- npm test 81 files green, lint clean, parity X-CLI-BASIC X-SRV-BASIC 145 pass/0 fail/17 skip/5 notPorted.
- CleanOverlappingFilterTest ports testFilter 1:1 (matches1-12, comma, missing-the, unordered exception) plus derived cases; MT test ports 3 of 5 (2 skipped, no thread pool, documented).
- Main.js TODO(F50/F59/F63)+"not ported yet" present; io.js cp1252/ISO-8859-15 present; analyzeSentences override matches Java (>=2 path); filter headers present.
- Verdict ACCEPT.
