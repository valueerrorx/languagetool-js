# F13 oracle checkpoint: X-TAGGER (CORE-0210..0213, EN-0023, EN-0170, EN-0171, EN-0200, FR-0022, FR-0170, FR-0171, FR-0200)

Status: DONE. Generator `node oracle/scripts/gen-cases-tagger.mjs` (inputs only; reads X-WORDTOK case files, so run gen-cases-wordtok.mjs first) -> `oracle/cases/X-TAGGER/` (51 case files); fixtures `npm run oracle -- X-TAGGER` -> `tests/golden/X-TAGGER/` (12.6 MB). Java ops: `oracle/harness/src/ltjs/oracle/TagOps.java`. No JS adapters yet (parity: 51 NOT PORTED); F13 must add `oracle/adapters/{tag,manual-tagger}.mjs`. Comparator `jsonl`. Env: D-018 pin.

## Ops
- `tag` {lang, texts:[string|null], split?:true | tokenLists:[[string|null]]} -> {taggerClass, wordTokenizerClass, results}. texts: language sentence tokenizer -> word tokenizer -> `language.getTagger().tag(tokens)`; result per text = list of {tokens, tagged}. tokenLists: tag(list) directly (single words, whitespace tokens, [], null token). No sentence start/end, no disambiguator, no whitespaceBefore post-processing (JLanguageTool does that later). Per token compact `[token, startPos, endPos, flags, readings, chunkTags]`, flags bits 1 isTagged, 2 isWhitespace, 4 isLinebreak, 8 isWhitespaceBefore, 16 hasTypographicApostrophe; readings `[token, lemma, posTag]` in Java order. Errors per text `{error:{class,message}}`.
- `manual-tagger` {tagger: spec, words} -> {class, results:[[lemma,pos]...|{error}]} or {buildError}. Spec kinds: `manual` {content (inline UTF-8) | lang+files (resource files concatenated like BaseTagger), internTags}, `dict` {dict, internTags} (MorfologikTagger), `combining` {tagger1,tagger2,removal?,overwrite} (CombiningTagger), `language` {lang} (BaseTagger#getWordTagger via reflection = what the language tagger uses). Constructors run in the op: build exceptions are data.

## Cases
- `words-<variant>-N`: ~700 edge words per language as single-token lists (case variants, all caps, title, apostrophes, hyphen/prefix words, non-BMP, numbers, units, words from added/removed); en-US, en-GB, en-AU, en-CA, en-NZ, en-ZA, fr, fr-CA, fr-BE, fr-CH (non-base variants: every 3rd word). `edge-<variant>`: X-WORDTOK edge texts (variants: every 4th). `manual-words-<en-US|fr>-N`: all forms of added/removed (+custom) with lower/upper/title/’ variants. `sequences-*`, `errors` (null text; pl-PL = PolishTagger, out of scope DEV-006), `long`.
- `corpus-<en-US|en-GB|fr>-NN`: whole corpora. `examples-<en-US|en-GB|fr>-NN`: rule example texts (capped ~450 per language, evenly sampled).
- `wordtagger-<en|fr>-N`: per form list: ManualTagger(added+custom), ManualTagger(removed+custom), raw dictionary, internTags dictionary, language word tagger, combining(dict, added, removed, overwrite=true), combining(dict, added, overwrite=false). `manual-content`: 29 inline ManualTagger files (separator header incl. regex/invalid/empty, late header, comments, trailing comment, NBSP error, field-count errors, BOM, CRLF, empty lemma/form, unicode, 70 readings, 300 forms). `combining`: union/overwrite/removal over inline taggers incl. duplicates. `errors-wordtagger`.

## Facts found in Java
- All English variants -> org.languagetool.tagging.en.EnglishTagger, all French variants -> fr.FrenchTagger (class recorded per case; tagger instance behaviour identical across variants).
- ManualTagger: UTF-8 BOM is not stripped (first form keeps U+FEFF); `hash-in-field` ("fo#o") is cut at the first # -> IOException; trailing tab / empty last field -> 2 parts -> IOException; invalid separator regex -> PatternSyntaxException; header `#separatorRegExp=` applies from the following lines only.
- fr removed.txt uses `#separatorRegExp=;`; fr added.txt is ';' separated.
- Missing dict -> UncheckedExecutionException(NoSuchFileException); unknown resource files -> NPE (null stream).

## UNORACLED
- Raw analyzed sentence (getRawAnalyzedSentence): covered by existing `analyze` op with preDisambiguation (F03), not duplicated.
- JUnit-only synthetic inputs of EnglishTaggerTest/FrenchTaggerTest are covered by the tag cases (same words); the JUnit tests themselves stay as ported tests.
