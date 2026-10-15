# F12 oracle checkpoint: X-WORDTOK (CORE-0202, CORE-0203, DE-0020, EN-0020, FR-0020)

Generator: `node oracle/scripts/gen-cases-wordtok.mjs` (inputs only) -> `oracle/cases/X-WORDTOK/` (44 case files); fixtures `npm run oracle -- X-WORDTOK` -> `tests/golden/X-WORDTOK/` (8.8 MB). Java ops: `oracle/harness/src/ltjs/oracle/WordTokOps.java`. No JS adapters exist yet (parity reports NOT PORTED); F12 must add `oracle/adapters/{word-tokenize,wordtok-static}.mjs`. Comparator `jsonl`. Env: D-018 pin (JDK 17, TZ Europe/Vienna, en_US, UTF-8, fixed clock).

## Ops
- `word-tokenize` args `{lang, texts:[string|null], tokenizer?:"core", split?:bool}`. Default tokenizer = `Languages.getLanguageForShortCode(lang).getWordTokenizer()` (cached on the Language); `"core"` = `new WordTokenizer()`. Result `{class, tokenizingCharacters (getTokenizingCharacters() if WordTokenizer, else null), results:[tokens[] | {error:{class,message}}]}`. With `split:true` each text is first split by the language sentence tokenizer (default mode) and each sentence tokenized: result entry `{sentences[], tokens:[[...]...]}` (core uses the en-US sentence tokenizer). Tokens are exact strings incl. whitespace tokens.
- `wordtok-static` args `{fn: getProtocols|isUrl|isEMail|isCurrencyExpression|splitCurrencyExpression|<bad>, texts}` -> list of results per text (or `{error}`); getProtocols returns the list directly.

## Cases
- `edge-<variant>` (14 variants, 425-471 inputs each): URLs, e-mails, @/#, numbers, dates/times, percent, currency, units, abbreviations, apostrophes (' and U+2019, English contractions, French elision), hyphens/dashes (incl. U+2011, U+2013, U+2014), soft hyphen, ZWJ/ZWNJ, BOM, many Unicode spaces, NBSP/narrow NBSP French spacing, emoji (skin tones, ZWJ sequences, flags, keycaps), non-BMP letters, lone surrogates, quotes, brackets, slash, ampersand, German compounds ("E-Mail-Adresse", "100-prozentig", gender forms), French "-t-il"/enclitics/doNotSplit words, decimal commas and digit groups, long inputs; plus language specific lists.
- `core-edge`: union of all inputs on the core WordTokenizer. `corpus-core`.
- `corpus-<variant>-NN` (de-DE, de-AT, de-CH, en-US, en-GB, fr): every corpus paragraph, split into sentences then tokenized (`split:true`). `examples-<de-DE|en-US|fr>-NN`, `examples-variant-<v>-0`: rule example texts as in X-SRX, split + tokenized.
- `static`: isUrl, isEMail, isCurrencyExpression, splitCurrencyExpression, getProtocols, unknown fn. `errors`: null text (NPE message `Cannot invoke "String.length()" because "str" is null`), unknown language zz (op-level error), pl-PL (out of scope, PolishWordTokenizer). `long`: 100k-char inputs.

## Facts found in Java
- All German variants (incl. de-DE-x-simple-language) use GermanWordTokenizer, all English variants EnglishWordTokenizer, all French variants FrenchWordTokenizer (class name recorded per case). CORE-0203 interfaces have no behaviour of their own (covered through these).
- Out-of-scope languages in the op (pl etc.) are notPorted (DEV-006), as for sentence-tokenize.
- Porter note: JUnit inputs of WordTokenizerTest, (De|En|Fr)WordTokenizerTest, TokenizeMultiwordsTest are not separately oracled; port them into tests/.
