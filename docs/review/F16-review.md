# F16 review
- [x] core rules (Comma, DoublePunct, Brackets+SymbolLocator+UnsyncStack, Quotes, Uppercase, WordRepeat, MultipleWs, SentenceWs, WsBeforePunct) read branch by branch vs Java: no divergence
- [x] en (UnpairedBrackets/Quotes/WordRepeat) and de (CommaWs, DoublePunct, Brackets, Quotes, WordRepeat, SentenceWs) read: identical; word list order/precedence checked
- [x] adapter check-rules.mjs vs CheckPipeOps#checkRules and English/French#getRelevantRules: identical rule args; instantiated path matches
- [x] helpers: StringUtils isNumeric/isNumericSpace/equalsAny, URL, getUrl, MessageFormat.format: OK
- [x] regex dialect spot checks ($ before final \n in matches(), && intersections, DOTALL): OK
- [x] npm test 326/8 skipped, lint clean, parity X-RULES-CORE 18 pass/0 fail/36 notPorted
VERDICT: ACCEPT. Minor: multi-line comment SentenceWhitespaceRule.js addRepeatedWhitespaceMatches; Symbol not exported (needed by later lang subclasses).
