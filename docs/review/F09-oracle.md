# F09 oracle checkpoint (X-TEXT)

Status: done. Fixtures tests/golden/X-TEXT (8.4 MB, 56 cases, largest response file 0.5 MB after dropping common_words), cases by oracle/scripts/gen-cases-text.mjs (inputs only), Java ops oracle/harness/src/ltjs/oracle/TextOps.java (`annotated-text`, `string-tools`, `context-tools`, `analyzed-token`). JS adapters: none yet (parity: 56 NOT PORTED). Regenerate: `node oracle/scripts/gen-cases-text.mjs && npm run oracle -- X-TEXT` (25 s). Responses are ASCII-escaped JSON (lone surrogates survive). Per-item failures are `{error:{class,message}}` (data); an op-level failure is the usual `{ok:false,error}` envelope.
IDs: CORE-0100..0104 (annotated-text), CORE-0320/0321 (context-tools), CORE-0329/0444/0445/0446 (string-tools), CORE-0214..0216 (analyzed-token), CORE-0352 (small types: UNORACLED, no behaviour).

## Ops
- `annotated-text {parts[], positions?[int], customKeys?[str]}`. parts: `{t:"text",v}` addText, `{t:"markup",v,interpretAs?}` addMarkup(1|2 args), `{t:"meta",key,value}` addGlobalMetaData as ApiV2 (MetaDataKey.valueOf else custom key), `{t:"customMeta",key,value}` custom-string key always, `{t:"add",type:TEXT|MARKUP|FAKE_CONTENT,v}` add(TextPart) (package-private ctor via reflection). Result: plainText, textWithMarkup, originalText, toString, parts [[TYPE,string]], positions [[pos, from, to]] where from/to = getOriginalTextPositionFor(pos,false/true) or `{error}`; default positions = -1, 0..len(plain)+1; metaData {key -> getGlobalMetaData(key,"<default>")} for the 4 enum keys, customMetaData {customKeys -> value or "<default>"}, globalMetaDataMap, customMetaDataMap (sorted).
- `context-tools {calls:[{text,from,to,contextSize?,escapeHtml?,marker?:[start,end],markerStart?,markerEnd?}]}` -> list of `{context, plain}` (getContext / getPlainTextContext, each possibly `{error}`), defaults of ContextTools.
- `string-tools {calls:[{fn,args[]}]}` -> list of results. Reflective dispatch over public static StringTools methods by name, arity and JSON arg type: string/null -> String, int, bool, array -> List<String>, `{lang:"de"}` -> Language, `{bytesHex,}` -> InputStream, `{reader}` -> Reader, `{char}` -> char. Arrays returned as lists, enums as names. Pseudo-fns: `ApiPrintMode.values` ([name, ordinal, toString]*), `UPPERCASE_GREEK_LETTERS`, `LOWERCASE_GREEK_LETTERS` (sorted). No matching method -> `{error: IllegalArgumentException "no method <fn>/<n>"}`.
- `analyzed-token {mode}`: `tagger {lang,text}` = CommandLineTools#tagText (sentenceTokenize + getAnalyzedSentence) -> sentences[] of sentence info; `synthetic {tokens:[{token,readings:[[pos,lemma]],startPos?,chunkTags?,whitespaceBefore?,sentEnd?,paraEnd?,immunize?}]}` -> one sentence info; `token {token,pos,lemma}` -> AnalyzedToken toString/posTag/lemma/matches. Sentence info: toString (CLI --taggeronly line), toString(";"), toShortString(","), getText, getAnnotations, nonWhitespaceTokenCount, lemmaSet, tokens[] (toString, token, start/endPos, isWhitespace/Linebreak/SentStart/SentEnd/ParaEnd/Tagged/WhitespaceBefore, whitespaceBefore, cleanToken, isImmunized, isIgnoredBySpeller, readings [token,pos,lemma,toString], chunkTags).

## Cases (56)
annotated-text (1 case file, 66 ops): plain, empty parts, markup start/end/adjacent, interpretAs (newlines, empty, shorter/longer, adjacent, first-wins fake), surrogates incl. lone, CRLF, umlauts, NBSP/ZWSP, hidden chars U+00AD/202D/202C (become MARKUP), long texts (10000 chars, 200 parts), add(TextPart), null parts, metadata (enum/custom/overwrite/null/unicode), invalid positions, "Could not map" messages with mapping sizes <5 (HashMap order printed) and >=5.
context-tools (1 case, 8 ops ~1000 calls): 14 texts x 7 position pairs, context sizes 0..1000 (incl. negative), escapeHtml on/off x 5 marker pairs, multi-line/CRLF/tab text, invalid positions, null text.
string-tools: one case per single-string function (44 fns x 440 strings: ASCII, umlauts, sharp s, Turkish i, Greek sigma, digits, apostrophes, NBSP/ZWSP/BOM/controls, combining marks, non-BMP, emoji, Arabic/Hebrew/CJK, markup/entity strings, 300-5000 char strings), -null, -list (isAllUppercase(List), allStartWithLowercase), -pairs (getDifference, equalsIgnoreCaseAndDiacritics, preserveCase(+WordByWord), numberOf, isAnagram), -uppercaseFirstChar-lang and -lang (10 languages; nl ij hack, fr addSpace, de toId, null language), -io (isPositiveNumber, readStream/readerToString/streamToString with encodings/BOM/line endings, isParagraphEnd, enums, Greek sets), -loadlines (resource files), -misc.
analyzed-token-synthetic (21), analyzed-token-tagger (25: de/en/fr texts, same path as CLI --taggeronly).

## Findings pinned
- getOriginalTextPositionFor uses strict `<` on mapping keys: the position equal to the last mapped key (e.g. plain length) throws RuntimeException "Could not map ..."; message prints the HashMap (insertion/hash order, `totalPos:N,fakeMarkupLen=M`) only when size < 5.
- trimWhitespace and others throw on odd inputs (StringIndexOutOfBounds); recorded as per-item errors.
- AnalyzedTokenReadings with an empty reading list throws ArrayIndexOutOfBounds; null token -> NPE "token cannot be null".

## UNORACLED
- CORE-0352 small types (data holders/interfaces, no observable behaviour; LanguageMaintainedState enum is covered by X-LANGUAGES if used). Manual check: JUnit-level only.
- StringTools.loadLines success path is covered only for resource files; titlecase exception lists are covered through titlecaseGlobal inputs only (not all words).
- AnalyzedSentence#getAnnotations non-empty, historical annotations, copy(): not exercised (needs disambiguation rule hits).

## Environment
JDK 17, pinned env per docs/ORACLE.md (fixed clock, TZ Europe/Vienna, UTF-8, en_US).
