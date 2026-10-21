# F74 oracle (X-AUDIT)
Fixtures: `tests/golden/X-AUDIT` (188 cases: 174 cli, 14 http), all expected values from the real Java jars (env D-018, ports 19100-19199, `ORACLE_PORT_MIN/MAX`). Generator: `node oracle/scripts/gen-cases-audit.mjs` (wipes and rewrites `oracle/cases/X-AUDIT`, inputs only); regenerate with `npm run oracle -- X-AUDIT [<case>]` (env `ORACLE_CASES=<regex>` selects). Parity: `LTJS_CASE=<regex> npm run parity -- X-AUDIT` (whole ID takes about 14 min).
Existing adapters/case kinds only (cli, http); no new adapter.

## Cases
| group | cases | ids |
|---|---|---|
| `bt-length-{en-de,de-en,fr-de}` | TRANSLATION_LENGTH boundaries (src/trg 25/10, 26/10, 24/10, 10/33, 10/34, 3/10, 3/11, 250/100, 1000/2, 2/1000, umlauts, astral, empty source) both directions | CORE-0291, CORE-0451 |
| `bt-length-empty-*` (6) | U-1 empty target (with/without newline, de->en, only rule enabled, --json) | CORE-0451 |
| `bt-punct-{en-de,de-en,all-rules}`, `bt-punct-degenerate-0..5` | DIFFERENT_PUNCTUATION (. ? ! , ... ; : ellipsis, CJK, Arabic ?, quotes, trailing blank) and single-punctuation targets | CORE-0451 |
| `bt-same-{en-de,de-en,fr-en,all-rules,json}` | SAME_TRANSLATION token-count boundary (1..4 tokens), case, whitespace, NBSP, astral, umlauts | CORE-0451 |
| `http-bitext-{en-de,de-en,degenerate,edge}` | the same boundaries through /v2/check sourceText+sourceLanguage; empty/blank text/source, multi-sentence, enabled/disabled rules, same variant | CORE-0451, SRV-0136 |
| `rf-*` (58) + `rx-*` (7) | `--rulefile` load-time errors, one malformed file per error text of CORE-0452 (XMLRuleHandler 425/429/437/506/536/635, PatternToken 404/415/426/429, RuleFilterCreator, RegexRuleFilterCreator, Example, malformed/empty/not-XML/undefined entity/missing file/directory), boundary-ok controls (skip -1/127, max 127), de/fr variants | CORE-0452 |
| `flt-*` (39) | filter-argument errors from user XML for en, de, fr (YMDDateCheckFilter, YMDNewYearDateFilter, DMYDateCheckFilter, DateFilterHelper, Partial pos tag filters, WordWithDeterminerFilter, InterrogativeVerbFilter, RegexAntiPatternFilter) | CORE-0452, EN-0224, DE-0227, FR-0222 |
| `ff-*` (17) | `--falsefriends`: same lang, triggers_error, malformed/empty/not-XML/skip/regex errors, example type variants, missing file | CORE-0452 |
| `bt-xml-*` (24) | `--bitextrules`: triggers_error, malformed, empty, missing file, unknown langs, forward ref, skip/min/max, chunk, regex, examples | CORE-0452 |
| `srv-rulesfile-*` (5), `srv-cachesize-*` (2) | server rulesFile (cfg style: xml content, missing file, garbage, motherTongue), ResultCache cacheSize -1 / abc at start | CORE-0452 (reachability), SRV-0041 |
| `u2-preferred-variants`, `-get` | U-2, 41 + 3 requests | SRV-0120 |
| `u4-*` (6 cli, 1 http) | U-4 SENTENCE_FRAGMENT prio, rule order, --json, --clean-overlapping | EN-0004 |
| `u5-users-me-options*` (3) | U-5 OPTIONS/GET /v2/users/me, Access-Control-Request-Headers variants, with/without `--allow-origin` | SRV-0105, SRV-0199 |

## Results from Java (facts the port must reproduce)
- U-1: through the CLI an empty target never reaches DifferentLengthRule. `TabBitextReader.tab2StringPair` throws `RuntimeException: Unexpected format, expected two tab-separated columns: Hello world<TAB>` (exit 1, the rest of the file is lost). Empty source (`<TAB>Hallo Welt`) is accepted: TRANSLATION_LENGTH fires, printed from column 1 over the whole target. Through /v2/check an empty/blank `text` or `sourceText` is covered in `http-bitext-edge`.
- New Java bug (reproduce): DIFFERENT_PUNCTUATION on a target that is a single punctuation token (`Hi./.`, `Hi/?`, `!/.`, `Hi/!`) throws `IllegalArgumentException: fromPos (1) must be less than toPos (1)` (CLI: uncaught, exit 1; server: 500 `Error: Internal Error: java.lang.IllegalArgumentException: fromPos (1) must be less than toPos (1), detected: en-US`, `fromPos (0)... toPos (0)` for one pair). `.`/`.` and `Hi/ .` do not throw (case-by-case in `bt-punct-degenerate-N`).
- `-b2 --json` -> `java.lang.IllegalArgumentException: JSON output format is not implemented for Bitext`.
- Bitext rules are selected with `-e ID` (not `-eo -e`, which fails with "No rules are active").
- U-2: the second text (TextChecker.java:1023 "no such language/variant found") was NOT reachable in any of 44 requests: `parseLanguage` throws first (`'en-XX' is not a language code known to LanguageTool. Supported language codes are: ...`, `'en-' isn't a valid language code`). Unknown prefix (`xx-YY`, `de-XX` on English text) is silently ignored (200). Missing dash -> 400 "Invalid format ..."; with language!=auto -> 400 "You specified 'preferredVariants' ...". Treat :1023 as unreachable.
- U-4: effective SENTENCE_FRAGMENT priority is `prio=-51` (CLI line `Rule ID: SENTENCE_FRAGMENT[1] premium: false prio=-51`). SPURIOUS_APOSTROPHE (put twice, 1) produced no match in the chosen text, so its value is UNORACLED here (check by `lang-priority` harness fixtures if needed).
- U-5: OPTIONS /v2/users/me -> 204, `access-control-allow-methods: GET, OPTIONS`, allow-headers echoes the request header verbatim (`x-a,x-b`), absent without request header (see responses.json for the origin variants and the GET/auth branches).
- ff-example-no-type: Java ends with a helpful-NPE text (`Cannot invoke "String.equals(Object)" because the return value of "org.xml.sax.Attributes.getValue(String)" is null`), D-044/DEV-005 says the text is free, but the JS run must still fail (exit 1, no matches).

## Unreachable / not covered
- CORE-0452: DisambiguationRuleHandler:282, XmlRuleDisambiguator:60,67 (only shipped disambiguation files), FalseFriendRuleHandler:106 (test mode only; `ff-same-lang` loads fine in CLI), Tools:182 "Failed to load bitext rules" (fixed class list), PatternRuleXmlCreator:76,79, PatternRuleMatcher:119,121 (WordWithDeterminer path covered: `flt-fr-wwd-sameunk` gives "Error analyzing sentence"), GenericUnpairedBrackets/QuotesRule constructors, JLanguageTool:2123 (U-3, n/a), :2158, AnalyzedTokenReadings:774, ExampleSentence:35,38,41 (needs unbalanced `<marker>` = not well-formed XML, so unreachable; nested/two markers covered), PatternToken minOccurrences:415 (`rf-min-2/-min-neg` load without error in Java, recorded as is).
- Server `rulesFile` is a `.languagetool.cfg` properties file, never rule XML: no XML load error text is reachable through the server; only the cfg cases above exist. Unknown `rulesFile` path -> start failure.
- CORE-0453, DE-0227 (LineExpander, SpellingData, ProhibitedCompoundRule, UpperCaseNgramRule, GermanSpellerRule, CaseRule, UnitConversionRule, SubjectVerbAgreementRule), EN-0224 (AmericanEnglish/BritishEnglish/CanadianEnglish guards, AbstractEnglishSpellerRule:388, EnglishPartialPosTagFilter/NoDisambiguation `Could not tag and disambiguate`, EnglishChunkFilter:53), FR-0222 (GrammalecteRule): UNORACLED - only reachable with corrupt shipped data files or programmatic API calls (IOException/constructor guards); no CLI/server input path. Proposed manual check: none (n/a under D-043). The reachable user-XML filter-argument texts of en/de/fr are oracled in `flt-*`.
- Filter ok-controls (`flt-*-ok*`): Java also fails there (`weekDay:\1` resolves to the matched token and the date helper parses it), kept as recorded.

## Port status (npm run parity -- X-AUDIT)
Final: 7 of 188 fail, the rest pass:
- `bt-punct-degenerate-1/-3/-4`: stderr differs by stack frame lines (JS prints `\tat #init(file:///.../RuleMatch.js:102:13)`, normaliser does not drop it; exception class and message equal). Comparator/normaliser matter, not a result difference.
- `bt-xml-bad-srclang`, `bt-xml-bad-targetlang`: "Caused by: ... 'xx' is not a language code known to LanguageTool. Supported language codes are: ..." list differs (out-of-scope languages, DEV-006).
- `ff-example-no-type`: Java exit 1 (NPE), JS prints matches (exit 0): JS port does not fail on a false-friend `<example>` without `type`.
- `u2-preferred-variants` request 38 (`Das ist ein Test.`, `language=auto`, `preferredVariants=de-DE-x-simple-language`): Java returns sentenceRanges `[[0,17]]`, JS `[]`.
All others (bitext rules both directions CLI+http, all `rf-`, `rx-`, `flt-`, other `ff-`, `bt-xml-`, `srv-`, `u4-`, `u5-`) pass.
