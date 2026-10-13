# Inventory: Polish (languagetool-language-modules/pl)

Java original: `/home/valueerror/STUFF/DEV/LanguageTool/languagetool`, commit 9b0be9db8cb4589cd031e85bd929c95c8ce57e49.
Path legend: `J/` = `languagetool-language-modules/pl/src/main/java/org/languagetool/`, `R/` = `languagetool-language-modules/pl/src/main/resources/org/languagetool/`, `T/` = `languagetool-language-modules/pl/src/test/java/org/languagetool/`, `CORE/` = `languagetool-core/src/main/`.
Maven: only `languagetool-core` (+ test-jar). No external dictionary artifact (PoliMorfologik dictionaries ship in the module).
Registration: `META-INF/org/languagetool/language-module.properties` -> `languageClasses=org.languagetool.language.Polish`.
Acceptance of XML rule files = all `<example>` sentences (Java `PolishPatternRuleTest`, `DisambiguationRuleTest` via `PolishTest`).

Row format: `| ID | behaviour (one line) | Java source (path#member) | Java tests | fixtures | status |`

## Language class and wiring

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| PL-0001 | Language metadata: name "Polish", shortCode "pl", countries [PL] (=> "pl-PL"), maintainer Contributors.MARCIN_MILKOWSKI, ActivelyMaintained; extends Language (no ngram LM) | J/language/Polish.java | PolishTest, JLanguageToolTest (getCountries "[PL]") | - | todo |
| PL-0002 | getRelevantRules order: 1 CommaWhitespaceRule, 2 UppercaseSentenceStartRule, 3 WordRepeatRule (core, WORD_REPEAT_RULE), 4 MultipleWhitespaceRule, 5 SentenceWhitespaceRule, 6 PolishUnpairedBracketsRule, 7 MorfologikPolishSpellerRule, 8 PolishWordRepeatRule (default off), 9 CompoundRule (pl), 10 SimpleReplaceRule (pl), 11 WordCoherencyRule (pl), 12 DashRule (pl, picky) | J/language/Polish.java#getRelevantRules | PolishTest, JLanguageToolTest#testPolish | - | todo |
| PL-0003 | Sentence tokenizer: SRXSentenceTokenizer(this) -> segment.srx languagerule "Polish" (256 rules, lines 42-1108, map "(PL\|pl).*") + Default | J/language/Polish.java#createDefaultSentenceTokenizer; CORE/resources/org/languagetool/resource/segment.srx | PolishSentenceTokenizerTest | - | todo |
| PL-0004 | Word tokenizer wiring: new PolishWordTokenizer() with setTagger(getTagger()) (hyphen-compound splitting needs the tagger) | J/language/Polish.java#createDefaultWordTokenizer | PolishWordTokenizerTest | - | todo |
| PL-0005 | Tagger wiring: new PolishTagger() | J/language/Polish.java#createDefaultTagger | PolishTaggerTest | - | todo |
| PL-0006 | Disambiguator wiring: new PolishHybridDisambiguator() (creates a second `new Polish()` inside) | J/language/Polish.java#createDefaultDisambiguator | PolishTest, PolishDisambiguationRuleTest | - | todo |
| PL-0007 | Synthesizer wiring: PolishSynthesizer.INSTANCE; chunker: none | J/language/Polish.java#createDefaultSynthesizer | PolishSynthesizerTest | - | todo |
| PL-0008 | Default spelling rule: new MorfologikPolishSpellerRule(messages, this, null, null) | J/language/Polish.java#createDefaultSpellingRule | MorfologikPolishSpellerRuleTest | - | todo |
| PL-0009 | Priorities: getPriorityForId "ZDANIA_ZLOZONE" -> -1, else super | J/language/Polish.java#getPriorityForId | PolishTest | - | todo |
| PL-0010 | Default disabled/enabled rules, quotes, typography: none overridden; Java default-off rule PL_WORD_REPEAT (enabled via enableRule in test); XML default-off ids see PL-0040 | J/language/Polish.java | JLanguageToolTest#testPolish | - | todo |
| PL-0065 | Registration: src/main/resources/META-INF/org/languagetool/language-module.properties `languageClasses=org.languagetool.language.Polish`; core Languages#getAllLanguages reads every such file via ClassLoader.getResources, splits on `\s*,\s*`, instantiates via public no-arg ctor in listed order (duplicates skipped); this order is the order of Languages.get() and of server /v2/languages | languagetool-language-modules/pl/src/main/resources/META-INF/org/languagetool/language-module.properties; CORE/java/org/languagetool/Languages.java#getAllLanguages | (all tests via Languages) | - | todo |

## Java rule classes

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| PL-0011 | CompoundRule (pl): id "PL_COMPOUNDS", description "Sprawdza wyrazy z łącznikiem, np. „łapu capu” zamiast „łapu-capu”", messages "Ten wyraz pisze się z łącznikiem." / "Ten wyraz pisze się razem (bez spacji ani łącznika)." / "Ten wyraz pisze się z łącznikiem lub bez niego." / short "Brak łącznika lub zbędny łącznik", example "Rabce Zdroju" -> "Rabce-Zdroju", data "/pl/compounds.txt" lazily | J/rules/pl/CompoundRule.java | CompoundRuleTest (pl) incl. testCompoundFile | - | todo |
| PL-0012 | DashRule (pl): AbstractDashRule (id "DASH_RULE", picky), description "Sprawdza, czy wyrazy pisane z łącznikiem zapisano z myślnikami (np. „Lądek — Zdrój” zamiast „Lądek-Zdrój”).", message "Błędne użycie myślnika zamiast łącznika.", Aho-Corasick trie from "/pl/compounds.txt" lazily | J/rules/pl/DashRule.java | DashRuleTest | - | todo |
| PL-0013 | MorfologikPolishSpellerRule: final, id "MORFOLOGIK_RULE_PL_PL", dict "/pl/hunspell/pl_PL.dict", category TYPOS, example "bledem" -> "błędem"; tokenizingPattern "(?:[Qq]uasi\|[Nn]iby)-"; getRuleMatches override: flag if (misspelled and isNotCompound) or prohibited; message bundle keys "spelling"/"desc_spelling_short"; no suggestions when userConfig suggestions disabled; if lowercase form is correct -> single lowercase suggestion; createSuggestions only while matches so far <= maxSpellingSuggestions (else suggestion = bundle "too_many_errors"); suggestions = speller + additional top/additional, ordered then pruned (drop "x y" when y in banned suffixes {ami, ach, e, ego, em, emu, ie, im, m, om, owie, owi, ze}); isNotCompound: for splits i>=2, prefix in 29-item set with correct longer remainder, or tagger says adja/num:comp(not adv) + adj: => word added to ignore tokens (mutates rule state, persists across checks) and not flagged | J/rules/pl/MorfologikPolishSpellerRule.java | MorfologikPolishSpellerRuleTest, LanguageSpecificSpellcheckerTest (pl) | - | todo |
| PL-0014 | PolishUnpairedBracketsRule: id "PL_UNPAIRED_BRACKETS", start ["[","(","{","„","»","\""], end ["]",")","}","”","«","\""], example "„cudzysłowem." | J/rules/pl/PolishUnpairedBracketsRule.java | PolishUnpairedBracketsRuleTest | - | todo |
| PL-0015 | PolishWordRepeatRule: AdvancedWordRepeatRule (default off), id "PL_WORD_REPEAT", description "Powtórzenia wyrazów w zdaniu (monotonia stylistyczna)", message "Powtórzony wyraz w zdaniu", short "Powtórzenie wyrazu", excluded words {nie, tuż, aż, to, siebie, być, ani, ni, albo, lub, czy, bądź, jako, zł, np, coraz, bardzo, bardziej, proc, ten, jak, mln, tys, swój, mój, twój, nasz, wasz, i, zbyt, się}, excluded POS "prep:.*\|ppron.*", excluded non-words "&quot\|&gt\|&lt\|&amp\|[0-9].*\|<roman>$" | J/rules/pl/PolishWordRepeatRule.java | PolishWordRepeatRuleTest, JLanguageToolTest | - | todo |
| PL-0016 | SimpleReplaceRule (pl): AbstractSimpleReplaceRule id "PL_SIMPLE_REPLACE" (no sub-rule ids), Misspelling, category new Category(CategoryId "PRAWDOPODOBNE_LITEROWKI", "Prawdopodobne literówki"), no lemma check, case-insensitive, Locale "pl", data "/pl/replace.txt", description "Typowe literówki i niepoprawne wyrazy (domowi, sie, niewiadomo, duh, cie…)", short "Literówka", message "Wyraz „<token>” to najczęściej literówka; poprawnie pisze się: <r1, r2>.", example "sei" -> "się" | J/rules/pl/SimpleReplaceRule.java | SimpleReplaceRuleTest (pl) | - | todo |
| PL-0017 | WordCoherencyRule (pl): id "PL_WORD_COHERENCY", data "/pl/coherency.txt", message "Formy „w1” i „w2” zwykle nie powinny być używane jednocześnie.", description "Jednolita pisownia wyrazów o obocznej dopuszczalnej pisowni", example Grapefruity/Grejpfrut | J/rules/pl/WordCoherencyRule.java | WordCoherencyRuleTest (pl) | - | todo |

## Rule filter classes

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| PL-0020 | DateCheckFilter (pl): AbstractDateCheckFilter; calendar Locale "pl"; day prefixes pon MON, wt TUE, śr WED, czw THU, "pt"/piątk*/"piątek" FRI, sob SAT, niedz SUN else RuntimeException "Could not find day of week for '<s>'"; day name from Calendar = JDK display name (Locale pl, LONG); months exact genitive names stycznia..grudnia or Roman I..XII else "Could not find month '<s>'"; 3 uses; semantics: dayStr/monthStr.toLowerCase() without Locale = default-locale lowercasing (DateCheckFilter.java:38,57); Calendar.getInstance(Locale "pl") week rules and getDisplayName(DAY_OF_WEEK, LONG, Locale "pl") JDK 17 CLDR data (oracle fixture) | J/rules/pl/DateCheckFilter.java | DateCheckFilterTest (pl), PolishPatternRuleTest | - | todo |
| PL-0021 | DecadeSpellingFilter: arg "lata" (e.g. "1960"): decade = substring(2), century = first 2 digits parsed + 1 as Roman numeral (M..I table); message placeholders {dekada}/{wiek} replaced; new RuleMatch with same positions, pattern positions, startWithUppercase = (fromPos==0), keeps type; IllegalArgumentException -> null; 3 uses (rule DATA_DEKADY) | J/rules/pl/DecadeSpellingFilter.java | PolishPatternRuleTest | - | todo |

## NLP component classes

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| PL-0030 | PolishTagger: BaseTagger("/pl/polish.dict", Locale "pl"); tag(): readings exact + lowercase (if not lowercase) + capitalized-first lookup (if none and lowercase); each reading's tag split on "+" into separate readings; if still none: additionalTags for joined "nie" + comparative/superlative (since 6.9, 2026 spelling reform): word length >= 7, starts "nie", not mixed case, not in nie_compar_exceptions.txt -> look up base without "nie" once, keep readings whose tag matches "(adv\|adj:.+):(com\|sup)", lemma "nie"+baseLemma; else null reading; exceptions loaded per instance via CachingWordListLoader | J/tagging/pl/PolishTagger.java#tag,additionalTags,addTokens | PolishTaggerTest (testDictionary, testTagger, testJoinedNegation, testJoinedNegationAgainstDictionaryVerdicts) | - | todo |
| PL-0031 | PolishWordTokenizer: tokenizing chars = core + "–" (n-dash) + "‚"; tokens ending "-" split into word + "-"; leading "-" split and rest re-tokenized; inner hyphen: keep if first part in 29 prefixes or no tagger; numeric last part -> split at "-" (keeping "-"); else tag parts + whole: if whole untagged and (2 parts adja+adj:, subst:+subst:, num:+num: or 3 parts adja+adja+adj:) split, else keep; then joinEMailsAndUrls; IOException -> RuntimeException | J/tokenizers/pl/PolishWordTokenizer.java#tokenize,setTagger | PolishWordTokenizerTest | - | todo |
| PL-0032 | PolishHybridDisambiguator: XmlRuleDisambiguator(new Polish()) FIRST, then MultiWordChunker("/pl/multiwords.txt") (order reversed vs. es/ru); disambiguate(input) only (no checkCanceled overload) | J/tagging/disambiguation/pl/PolishHybridDisambiguator.java | PolishDisambiguationRuleTest, PolishTest | - | todo |
| PL-0033 | PolishSynthesizer: singleton BaseSynthesizer("/pl/polish_synth.dict", "/pl/polish_tags.txt", "pl"); synthesize(token, posTag): null posTag -> null; negation if posTag contains ":neg" (index>0) or token tag contains ":neg" and posTag has no "com"/"sup"; posTag with "+" -> regexp mode; lookup "lemma\|tag" (negated: tag ":neg"->":aff", forms prefixed "nie"); regexp mode: loads tag list lazily (instance field, not thread-safe), "+" -> "\|", ":neg" -> ":aff?", PatternSyntaxException printed via printStackTrace and ignored, results de-duplicated through HashSet (output order = HashSet iteration order); getPosTagCorrection rewrites tag parts like "a.b" to "(.*a.*\|.*b.*)"; semantics: HashSet<String> de-duplication (PolishSynthesizer.java:137) -> output order = Java HashSet iteration order (String.hashCode buckets), oracle fixture | J/synthesis/pl/PolishSynthesizer.java | PolishSynthesizerTest, MatchTest | - | todo |

## XML rule resource files

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| PL-0040 | grammar.xml: 1784 `<rule>` (1136 top-level ids, 291 rulegroups) in 16 categories (PUNCTUATION, NUMBERS, TYPOGRAPHY, GRAMMAR, WORD_ORDER, SYNTAX, STYLE, REDUNDANCY, PHONETICS, MISC, GENDER, SEMANTICS, CASING, SPELLING, TYPOS, CONFUSED_WORDS), 5255 examples (2141 corrections), 958 antipatterns, 4 picky, 10 internal entities; default off: BRAK_PRZECINKA_I_KWITA, BRAK_PRZECINKA_I_TAK, NA_CALE_SZCZESCIE, NIE_A, NIE_ULEGA_WATPLIWOSCI, PRZECIAGNIJ-I-UPUSC, RYMY, TAK_JAK_I_ZARWNO_JAK_I, W_WYPADKU (+ rules inside groups); filters: core DateRangeChecker, ShortenedYearRangeChecker, pl.DateCheckFilter, pl.DecadeSpellingFilter | R/rules/pl/grammar.xml | PolishPatternRuleTest, PolishTest, JLanguageToolTest, ToolsTest | - | todo |
| PL-0041 | disambiguation.xml: 1282 rules (67 rulegroups), 1179 examples, 6 internal entities | R/resource/pl/disambiguation.xml | PolishTest (DisambiguationRuleTest), JLanguageToolTest | - | todo |
| PL-0042 | bitext.xml: 1 bitext rule (category NEG), 2 examples; loaded by core Tools.getBitextRules for CLI bitext mode | R/rules/pl/bitext.xml; CORE/java/org/languagetool/tools/Tools.java | (standalone StandaloneBitextPatternRuleTest) | - | todo |

## Binary and data resources

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| PL-0050 | Tagger dictionary polish.dict (2797415 bytes) + polish.info (author morfologik.blogspot.com, created 2016-02-13, BSD license, separator ";", UTF-8, encoder PREFIX); tags may contain "+" joined alternatives | R/resource/pl/polish.dict, polish.info | PolishTaggerTest | - | todo |
| PL-0051 | Synthesizer dictionary polish_synth.dict (2872448 bytes) + polish_synth.info (separator ";", UTF-8, PREFIX); keys "lemma\|tag" | R/resource/pl/polish_synth.dict, polish_synth.info | PolishSynthesizerTest | - | todo |
| PL-0052 | polish_tags.txt: 1095 synthesizer tags | R/resource/pl/polish_tags.txt | PolishSynthesizerTest | - | todo |
| PL-0053 | Speller dictionary hunspell/pl_PL.dict (3717599 bytes) + pl_PL.info (separator "+", UTF-8, encoder none, frequency-included, speller.locale pl_PL, ignore-diacritics true, ignore-camel-case false, ignore-all-uppercase false, ignore-numbers false, ignore-punctuation true, equivalent-chars "x ź, l ł, u ó, ó u, u y, i j, u ł, d t, v w, - —, - –, 0 O", long replacement-pairs list) | R/resource/pl/hunspell/pl_PL.dict, pl_PL.info | MorfologikPolishSpellerRuleTest | - | todo |
| PL-0054 | hunspell/spelling.txt (139 accepted words), hunspell/ignore.txt (174 ignored), hunspell/prohibit.txt (10 prohibited) | R/resource/pl/hunspell/spelling.txt, ignore.txt, prohibit.txt | LanguageSpecificSpellcheckerTest, MorfologikPolishSpellerRuleTest, PolishTest | - | todo |
| PL-0055 | added.txt (1 entry) + added_custom.txt; removed.txt + removed_custom.txt (comments only) | R/resource/pl/added*.txt, removed*.txt | PolishTaggerTest | - | todo |
| PL-0056 | multiwords.txt (230 entries) for MultiWordChunker (e.g. "to znaczy" <TO_ZNACZY>, "z uwagi na" <PREP:ACC>) | R/resource/pl/multiwords.txt | PolishDisambiguationRuleTest | - | todo |
| PL-0057 | nie_compar_exceptions.txt (32 words) excluded from joined-"nie" tagging | R/resource/pl/nie_compar_exceptions.txt | PolishTaggerTest#testJoinedNegation* | - | todo |
| PL-0058 | compounds.txt (1828 entries) shared by PL_COMPOUNDS and DASH_RULE | R/resource/pl/compounds.txt | CompoundRuleTest (pl), DashRuleTest | - | todo |
| PL-0059 | rules/pl/replace.txt (228 lines) for PL_SIMPLE_REPLACE | R/rules/pl/replace.txt | SimpleReplaceRuleTest (pl) | - | todo |
| PL-0060 | rules/pl/coherency.txt (320 lines) for PL_WORD_COHERENCY | R/rules/pl/coherency.txt | WordCoherencyRuleTest (pl) | - | todo |
| PL-0061 | common_words.txt (9986 words) for language identification | R/resource/pl/common_words.txt | (standalone CommonWordsTest) | - | todo |
| PL-0062 | MessagesBundle_pl.properties: 294 keys (UTF-8 text plus 193 \u escaped lines; read as UTF-8 by Java 9+ ResourceBundle) | R/MessagesBundle_pl.properties | PolishTest | - | todo |
| PL-0063 | Non-runtime packaged files: tagset.txt, README.txt, hunspell/README_en.txt; not ported (D-010) | R/resource/pl/* | - | - | n/a |
| PL-0064 | Test resource nie_verdicts.tsv (expected joined-negation verdicts) | languagetool-language-modules/pl/src/test/resources/org/languagetool/tagging/pl/nie_verdicts.tsv | PolishTaggerTest#testJoinedNegationAgainstDictionaryVerdicts | - | todo |

## Whole-pipeline acceptance

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| PL-0070 | Demo text "Wpisz tekst lub użyj istniejącego przykładu. To jest przykładowy tekst który pokazuje, jak jak działa LanguageTool. LanguageTool ma jusz korektor psowni, który wyrurznia bledy na czewrono." yields [BRAK_PRZECINKA_KTORY, WORD_REPEAT_RULE, PL_SIMPLE_REPLACE, MORFOLOGIK_RULE_PL_PL x4] | T/rules/pl/PolishTest.java#testLanguage | PolishTest | - | todo |
| PL-0071 | LanguageSpecificTest checks for Polish with extra validation char "ą" | CORE test LanguageSpecificTest#runTests | PolishTest | - | todo |
| PL-0072 | End-to-end assertions: Polish without XML rules (disambiguation immunization, antipatterns, unification), with XML rules, PL_WORD_REPEAT enable, English text -> 6 matches, listUnknownWords "[., Polish, This, is, text]", column positions 17/16 relative to sentence ends | T/JLanguageToolTest.java#testPolish | JLanguageToolTest | - | todo |
| PL-0073 | Tools.correctText applies first suggestions across sentences ("To jest jest problem." -> "To jest problem.", missing comma "przecinka, bo") with cleanOverlappingMatches false | T/tools/ToolsTest.java | ToolsTest | - | todo |
| PL-0074 | Core rules exercised with Polish: MultipleWhitespaceRule, UppercaseSentenceStartRule (Polish special cases), WordRepeatRule, MatchState speller/synthesizer ("AON" subst:sg:gen:m3 -> "AON-u", "<mistake/>" marker) | T/rules/pl/MultipleWhitespaceRuleTest, UppercaseSentenceStartRuleTest, WordRepeatRuleTest, MatchTest | those tests | - | todo |
| PL-0075 | Concurrency: parallel checks give identical results | T/PolishConcurrencyTest.java | PolishConcurrencyTest | - | todo |

## Test class mapping

- JLanguageToolTest -> PL-0072, PL-0001, PL-0002, PL-0010, PL-0015, PL-0040, PL-0041
- PolishConcurrencyTest -> PL-0075
- rules/pl/CompoundRuleTest -> PL-0011, PL-0058
- rules/pl/DashRuleTest -> PL-0012, PL-0058
- rules/pl/DateCheckFilterTest -> PL-0020
- rules/pl/LanguageSpecificSpellcheckerTest -> PL-0013, PL-0054
- rules/pl/MatchTest -> PL-0074, PL-0033
- rules/pl/MorfologikPolishSpellerRuleTest -> PL-0013, PL-0053, PL-0054
- rules/pl/MultipleWhitespaceRuleTest -> PL-0074
- rules/pl/PolishPatternRuleTest -> PL-0040, PL-0020, PL-0021
- rules/pl/PolishTest -> PL-0001, PL-0002, PL-0009, PL-0041, PL-0062, PL-0070, PL-0071
- rules/pl/PolishUnpairedBracketsRuleTest -> PL-0014
- rules/pl/PolishWordRepeatRuleTest -> PL-0015
- rules/pl/SimpleReplaceRuleTest -> PL-0016, PL-0059
- rules/pl/UppercaseSentenceStartRuleTest -> PL-0074
- rules/pl/WordCoherencyRuleTest -> PL-0017, PL-0060
- rules/pl/WordRepeatRuleTest -> PL-0074
- synthesis/pl/PolishSynthesizerTest -> PL-0033, PL-0051, PL-0052
- tagging/disambiguation/PolishDisambiguationRuleTest -> PL-0032, PL-0056
- tagging/pl/PolishTaggerTest -> PL-0030, PL-0050, PL-0055, PL-0057, PL-0064
- tokenizers/pl/PolishSentenceTokenizerTest -> PL-0003
- tokenizers/pl/PolishWordTokenizerTest -> PL-0031, PL-0004
- tools/ToolsTest -> PL-0073

## Coverage

- Java main files: 14 (Polish, 9 in rules/pl, PolishSynthesizer, PolishHybridDisambiguator, PolishTagger, PolishWordTokenizer) -> PL-0001..PL-0033, all covered.
- Resource files: 37 + META-INF properties (+1 test resource) -> PL-0040..PL-0064.
- Test classes: 23 -> mapped above.

## Totals

PL: 47 IDs (todo 47, spec 0, ported 0, verified 0, later 0).
