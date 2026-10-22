# Inventory: Russian (languagetool-language-modules/ru)

Java original: `/home/valueerror/STUFF/DEV/LanguageTool/languagetool`, commit 9b0be9db8cb4589cd031e85bd929c95c8ce57e49.
Path legend: `J/` = `languagetool-language-modules/ru/src/main/java/org/languagetool/`, `R/` = `languagetool-language-modules/ru/src/main/resources/org/languagetool/`, `T/` = `languagetool-language-modules/ru/src/test/java/org/languagetool/`, `CORE/` = `languagetool-core/src/main/`.
Registration: `META-INF/org/languagetool/language-module.properties` -> `languageClasses=org.languagetool.language.Russian`.
Acceptance of XML rule files = all `<example>` sentences (Java `RussianPatternRuleTest`, `DisambiguationRuleTest` via `RussianTest`).

## External Maven artifact

- `edu.washington.cs.knowitall:openregex:1.1.1` (root pom property `edu.washington.cs.knowitall.openregex.version`, line 160; dependencyManagement line 419 with exclusion of com.google.code.findbugs). Present at `~/.m2/repository/edu/washington/cs/knowitall/openregex/1.1.1/openregex-1.1.1.jar` and in the built app `LanguageTool-6.9-SNAPSHOT/libs/openregex.jar` (sha256 33021c9cca70c6292d53ff7dac5d1832d422e986aba52ec998532a5f47f921f8, 81 entries). Code library (regular expressions over token sequences), not a dictionary; used by RussianChunker (RU-0063) together with core TokenExpressionFactory/ChunkTaggedToken (also used by the German chunker).
- No external dictionary artifact; all dictionaries ship in the module.

Row format: `| ID | behaviour (one line) | Java source (path#member) | Java tests | fixtures | status |`

## Language class and wiring

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| RU-0001 | Language metadata: name "Russian", shortCode "ru", countries [RU] (=> "ru-RU"), maintainer Contributor("Yakov Reztsov", "http://myooo.ru/content/view/83/43/"), ActivelyMaintained, extends LanguageWithModel; public ctor throws RuntimeException("Language was already instantiated, see the cause stacktrace below.", trace) on second instantiation (protected Russian(boolean) bypass); static getInstance() -> Languages.getLanguageForShortCode("ru"), else "Russian language expected, got <lang>" | J/language/Russian.java#Russian(),getInstance,getName,getShortCode,getCountries,getMaintainers,getMaintainedState | RussianTest | X-RUCHECK | verified |
| RU-0002 | getRelevantRules order: 1 CommaWhitespaceRule(wrong "Не род<marker> ,</marker> а ум поставлю в воеводы.", fixed "Не род<marker>,</marker> а ум ..."), 2 UppercaseSentenceStartRule(wrong "Закончилось лето. <marker>дети</marker> снова сели за школьные парты.", fixed "...<marker>Дети</marker>..."), 3 MorfologikRussianSpellerRule, 4 MultipleWhitespaceRule, 5 SentenceWhitespaceRule, 6 WhiteSpaceBeforeParagraphEnd (off), 7 WhiteSpaceAtBeginOfParagraph (off), 8 LongSentenceRule(userConfig, 50) (picky), 9 LongParagraphRule (off), 10 ParagraphRepeatBeginningRule (off), 11 RussianFillerWordsRule (off), 12 PunctuationMarkAtParagraphEnd2 (off), 13 MorfologikRussianYOSpellerRule (off), 14 RussianUnpairedBracketsRule, 15 RussianCompoundRule, 16 RussianSimpleReplaceRule, 17 RussianSimpleWordRepeatRule, 18 RussianWordCoherencyRule, 19 RussianWordRepeatRule (off), 20 RussianWordRootRepeatRule (off), 21 RussianVerbConjugationRule, 22 RussianDashRule (NOT picky: RussianDashRule.java:41 setTags(emptyList), see RU-0024), 23 RussianSpecificCaseRule; DoublePunctuationRule/WordRepeatRule/EmptyLineRule/PunctuationMarkAtParagraphEnd/ReadabilityRule commented out | J/language/Russian.java#getRelevantRules | RussianTest | X-RUCHECK | verified |
| RU-0003 | getRelevantLanguageModelRules -> [RussianConfusionProbabilityRule] (ngram) | J/language/Russian.java#getRelevantLanguageModelRules | - | - | later |
| RU-0004 | Sentence tokenizer: SRXSentenceTokenizer(this) -> segment.srx languagerule "Russian" (30 rules, lines 4488-4616, map "(RU\|ru).*") + Default | J/language/Russian.java#createDefaultSentenceTokenizer; CORE/resources/org/languagetool/resource/segment.srx | RussianSRXSentenceTokenizerTest | X-RUCHECK | verified |
| RU-0005 | Word tokenizer wiring: new RussianWordTokenizer() | J/language/Russian.java#createDefaultWordTokenizer | RussianTaggerTest | X-RUCHECK | verified |
| RU-0006 | Tagger wiring: RussianTagger.INSTANCE | J/language/Russian.java#createDefaultTagger | RussianTaggerTest | X-RUCHECK | verified |
| RU-0007 | Disambiguator wiring: RussianHybridDisambiguator.getInstance() (lazy singleton) | J/language/Russian.java#createDefaultDisambiguator | RussianTest (DisambiguationRuleTest) | X-RUCHECK | verified |
| RU-0008 | Post-disambiguation chunker wiring: new RussianChunker() (runs after disambiguation); no pre-disambiguation chunker | J/language/Russian.java#createDefaultPostDisambiguationChunker | RussianPatternRuleTest (chunk-based rules) | X-RUCHECK | verified |
| RU-0009 | Synthesizer wiring: RussianSynthesizer.INSTANCE | J/language/Russian.java#createDefaultSynthesizer | RussianSynthesizerTest | X-RUCHECK | verified |
| RU-0010 | Default spelling rule: new MorfologikRussianSpellerRule(messages, this, null, null) | J/language/Russian.java#createDefaultSpellingRule | MorfologikRussianSpellerRuleTest | X-RUCHECK | verified |
| RU-0011 | Priorities (getPriorityForId switch): RU_DASH_RULE 12, RU_COMPOUNDS 11, RUSSIAN_SIMPLE_REPLACE_RULE 10, RUSSIAN_SPECIFIC_CASE 9, MORFOLOGIC_RULE_RU_RU_YO 2, MORFOLOGIC_RULE_RU_RU 1, Word_root_repeat -1, PUNCT_DPT_2 -2, TOO_LONG_PARAGRAPH -15, else super. Note: keys RUSSIAN_SIMPLE_REPLACE_RULE, RUSSIAN_SPECIFIC_CASE, MORFOLOGIC_* do not equal the actual rule ids (RU_SIMPLE_REPLACE, RU_SPECIFIC_CASE, MORFOLOGIK_RULE_RU_RU[_YO]) so those priorities never apply (bug-compatible) | J/language/Russian.java#getPriorityForId | RussianTest | X-RUCHECK | verified |
| RU-0012 | Default disabled/enabled rules: no Java override; default-off Java rules listed in RU-0002, XML default/temp_off ids in RU-0070 | J/language/Russian.java | RussianTest | X-RUCHECK | verified |
| RU-0013 | Typography: double quotes "«"/"»", single quotes "‘"/"’", isAdvancedTypographyEnabled true | J/language/Russian.java#getOpeningDoubleQuote,getClosingDoubleQuote,getOpeningSingleQuote,getClosingSingleQuote,isAdvancedTypographyEnabled | RussianPatternRuleTest | X-RUCHECK | verified |
| RU-0014 | getIgnoredCharactersRegex = "[­́̀]" (soft hyphen, combining acute and grave accents are ignored by core when checking; new Pattern per call) | J/language/Russian.java#getIgnoredCharactersRegex; CORE/java/org/languagetool/JLanguageTool.java (line ~1862) | RussianTest | X-RUCHECK | verified |
| RU-0099 | Registration: src/main/resources/META-INF/org/languagetool/language-module.properties `languageClasses=org.languagetool.language.Russian`; core Languages#getAllLanguages reads every such file via ClassLoader.getResources, splits on `\s*,\s*`, instantiates via public no-arg ctor in listed order (duplicates skipped); this order is the order of Languages.get() and of server /v2/languages | languagetool-language-modules/ru/src/main/resources/META-INF/org/languagetool/language-module.properties; CORE/java/org/languagetool/Languages.java#getAllLanguages | (all tests via Languages) | X-RUCHECK | verified |

## Java rule classes

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| RU-0020 | MorfologikRussianSpellerRule: final, id "MORFOLOGIK_RULE_RU_RU", dict "/ru/hunspell/ru_RU.dict", example "каждя" -> "каждая"; rule option (RuleOption default 0, range 0..1, text "Проверять слова на латинице, только термины (0/1)") read from userConfig; when option != 1 tokens not fully matching `[-а-яёо́а́е́у́и́ы́э́ю́я́о̀а̀ѐу̀ѝы̀э̀ю̀я̀ʼА-ЯЁ]*` are ignored; filterNoSuggestWords removes [блоггер, дрочим, анальный, орочем] (case-insensitive); isLatinScript false | J/rules/ru/MorfologikRussianSpellerRule.java | MorfologikRussianSpellerRuleTest, LanguageSpecificSpellcheckerTest (ru) | X-RUCHECK | verified |
| RU-0021 | MorfologikRussianYOSpellerRule: same as RU-0020 but id "MORFOLOGIK_RULE_RU_RU_YO", dict "/ru/hunspell/ru_RU_yo.dict", default OFF, description "Проверка орфографии. Только «Ё» (экспериментальное правило).", no-suggest list adds "елка" | J/rules/ru/MorfologikRussianYOSpellerRule.java | MorfologikRussianYOSpellerRuleTest | X-RUCHECK | verified |
| RU-0022 | RussianCompoundRule: id "RU_COMPOUNDS", description "Правописание через дефис", messages "Эти слова должны быть написаны через дефис." / "Эти слова должны быть написаны слитно." / "Эти слова могут быть написаны через дефис или слитно.", sentenceStartsWithUpperCase = true, example "конференц зале" -> "конференц-зале", data "/ru/compounds.txt" lazily (static) | J/rules/ru/RussianCompoundRule.java | RussianCompoundRuleTest | X-RUCHECK | verified |
| RU-0023 | RussianConfusionProbabilityRule: ngram rule, no example | J/rules/ru/RussianConfusionProbabilityRule.java | - | - | later |
| RU-0024 | RussianDashRule: AbstractDashRule id "RU_DASH_RULE", tags set to empty (not picky despite AbstractDashRule default), description "Тире вместо дефиса («из — за» вместо «из-за»).", message "Использовано тире вместо дефиса.", boundary = token not matching single Cyrillic char [Ѐ-ӿ], compounds trie (Aho-Corasick) from "/ru/compounds.txt" lazily | J/rules/ru/RussianDashRule.java | RussianDashRuleTest | X-RUCHECK | verified |
| RU-0025 | RussianFillerWordsRule: AbstractFillerWordsRule, id "FILLER_WORDS_RU", default off (statistic style rule, default min percent 8, category CREATIVE_WRITING), filler words {ах, аа, ааа, аааа, ау, бу, вау, ох, однако, эээ, э, эй, эх, ух-ты, ух}; isException always false | J/rules/ru/RussianFillerWordsRule.java | - | X-RUCHECK | ported |
| RU-0026 | RussianSimpleReplaceRule: AbstractSimpleReplaceRule2, id "RU_SIMPLE_REPLACE", Misspelling, category new Category(CategoryId "MISC", "Общие правила"), file "/ru/replace.txt", description "Поиск просторечий и ошибочных фраз", short "Ошибка?", message "«$match» — просторечие, исправление: $suggestions", Locale "ru", example "Экспрессо" -> "Эспрессо" | J/rules/ru/RussianSimpleReplaceRule.java | RussianSimpleReplaceRuleTest | X-RUCHECK | verified |
| RU-0027 | RussianSimpleWordRepeatRule: WordRepeatRule (id stays "WORD_REPEAT_RULE"); ignore repetitions of "-", "и", "по", "что"; ignore "ПО по"/"по ПО"; ignore single-letter tokens [a-zA-Zа-яёА-ЯЁ] repeated when position>1 (spelled-out letters); else super | J/rules/ru/RussianSimpleWordRepeatRule.java#ignore | RussianTest | X-RUCHECK | verified |
| RU-0028 | RussianSpecificCaseRule: id "RU_SPECIFIC_CASE", category CASING, Misspelling, description "Написание специальных наименований в верхнем или нижнем регистре"; phrases from resource "/ru/specific_case.txt" (skip empty/#, trimmed), maxLen = max word count; for each start token, grows phrase up to maxLen, lowercase lookup; match when not all-uppercase and differs from proper spelling, skip at sentence start if proper spelling starts lowercase; message "Для специальных наименований используйте начальную заглавную букву." if all words capitalized else "Для специальных наименований используйте предложенное написание заглавных и строчных букв."; suggestion = proper spelling; lc map built from fastutil ObjectOpenHashSet iteration (duplicate lowercase keys: last in hash order wins); semantics: fastutil ObjectOpenHashSet iteration order (RussianSpecificCaseRule.java:36) decides which phrase wins for duplicate lowercase keys (oracle fixture) | J/rules/ru/RussianSpecificCaseRule.java | RussianSpecificCaseRuleTest | X-RUCHECK | verified |
| RU-0029 | RussianUnpairedBracketsRule: id "RU_UNPAIRED_BRACKETS", start ["(","{","„","\"","'","“"], end [")","}","“","\"","'","”"], numerals regex `(?i)\d{1,2}?[а-я]*\|[а-я]\|[А-Я]\|[а-я][а-я]\|[А-Я][А-Я]\|(?i)\d{1,2}?[a-z']*\|M*(D?C{0,3}\|C[DM])(L?X{0,3}\|X[LC])(V?I{0,3}\|I[VX])$`, example pair with "(" | J/rules/ru/RussianUnpairedBracketsRule.java | RussianUnpairedBracketsRuleTest | X-RUCHECK | verified |
| RU-0030 | RussianVerbConjugationRule: id "RU_VERB_CONJUGATION", category GRAMMAR, description "Согласование личных местоимений с глаголами", example "Я идёт" -> "Я иду"; for tokens 1..n-2 using first reading: pronoun tag "PNN:(.*):Nom:(.*)" not preceded by "и", next token tag "VB:(Fut\|Real):...:(g4):(g5)" -> wrong if person differs or (pronoun Masc/Fem/Neut and verb PL) or number differs; or "VB:Past:...:(g3)" -> wrong if pronoun Sin and verb PL/Neut, else pronoun != verb; exceptions "может быть", next token "целую"; match spans pronoun..verb, message "Неверное спряжение глагола или неверное местоимение", short "Неверное спряжение глагола" | J/rules/ru/RussianVerbConjugationRule.java | RussianVerbConjugationRuleTest | X-RUCHECK | verified |
| RU-0031 | RussianWordCoherencyRule: id "RU_WORD_COHERENCY", data "/ru/coherency.txt" via WordCoherencyDataLoader, message "«w1» и «w2» не следует использовать одновременно", description "Единообразное написание слов с более чем одним допустимым написанием", example офлайн/оффлайн | J/rules/ru/RussianWordCoherencyRule.java | RussianWordCoherencyRuleTest | X-RUCHECK | verified |
| RU-0032 | RussianWordRepeatRule: AdvancedWordRepeatRule (default off), id "RU_WORD_REPEAT", description/message/short "Повтор слов в предложении", excluded words {не, ни, а, их, на, в, по, минута, друг, час, секунда, ПАО, ООО, табл, рис}, excluded POS "INTERJECTION\|PRDC\|PREP\|CONJ\|PARTICLE\|ABR\|NumC:.*\|Num:.*", excluded non-words "&quot\|&gt\|&lt\|&amp\|[0-9].*\|<roman numeral>$", example "доме доме" | J/rules/ru/RussianWordRepeatRule.java | RussianWordRepeatRuleTest | X-RUCHECK | verified |
| RU-0033 | RussianWordRootRepeatRule: AbstractWordCoherencyRule, id "RU_WORD_ROOT_REPEAT", default OFF, data "/ru/wordrootrep.txt", message "«w1» и «w2» – однокоренные слова, их не стоит использовать одновременно", description "Повтор однокоренных слов", example абрикос/абрикосный | J/rules/ru/RussianWordRootRepeatRule.java | - | X-RUCHECK | verified |

## Rule filter classes

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| RU-0040 | AdvancedSynthesizerFilter (ru): empty subclass of core AbstractAdvancedSynthesizerFilter; 4 uses in grammar.xml | J/rules/ru/AdvancedSynthesizerFilter.java | RussianPatternRuleTest | X-RUCHECK | verified |
| RU-0041 | DateCheckFilter (ru): AbstractDateCheckFilter; calendar Locale "ru"; day: startsWith пн or "понедельник" MON, вт TUE, ср WED, чт or "четверг" THU, "пт" or startsWith пятниц FRI, сб/суббот SAT, вс or "воскресенье" SUN, else RuntimeException "Could not find day of week for '<s>'"; day name from Calendar = JDK display name (Locale ru, LONG; JDK/CLDR locale data); month: exact full/genitive names, short (янв, фев, мар, апр, авг, сен, окт, ноя, дек, plus "ин"=6, "ил"=7) or Roman I..XII (case-sensitive on original) -> 1..12, else "Could not find month '<s>'"; 2 uses; semantics: dayStr/monthStr.toLowerCase() without Locale = default-locale lowercasing (DateCheckFilter.java:38,57); Calendar.getInstance(Locale "ru") week rules and getDisplayName(DAY_OF_WEEK, LONG, Locale "ru") from JDK 17 CLDR data (oracle fixture) | J/rules/ru/DateCheckFilter.java | DateCheckFilterTest (ru), RussianTest (demo DATE_WEEKDAY1) | X-RUCHECK | verified |
| RU-0042 | DateFilterHelper (ru): calendar Locale "ru"; trimSpecialCharacters then lowercase; day prefixes суб, вс, вос, пн, пон, вт, ср, чт, чет, пт, пят, сб; month prefixes янв..дек incl. "май"/"мая"; used only by FutureDateFilter; semantics: trimSpecialCharacters(..).toLowerCase() without Locale = default-locale lowercasing (DateFilterHelper.java:38,60); Calendar Locale "ru" and getDisplayName Locale "ru" JDK 17 CLDR data (oracle fixture) | J/rules/ru/DateFilterHelper.java | RussianPatternRuleTest | X-RUCHECK | verified |
| RU-0043 | FutureDateFilter (ru): core AbstractFutureDateFilter with DateFilterHelper month/calendar; 2 uses (depends on current date); semantics: via DateFilterHelper (RU-0042): default-locale toLowerCase, Locale "ru" calendar/display names | J/rules/ru/FutureDateFilter.java | RussianPatternRuleTest | X-RUCHECK | verified |
| RU-0044 | INNNumberFilter: arg "inn" (required); if all digits: 10 digits -> checksum (2,4,10,3,5,9,4,6,8)·d mod 11, >9 -> -10, valid if equals d10 => return null (no error) else match; 12 digits -> two checksums (7,2,4,10,3,5,9,4,6,8) and (3,7,2,4,10,3,5,9,4,6,8) vs d11, d12; other lengths or non-digit -> null; IllegalArgumentException swallowed -> null; 1 use | J/rules/ru/INNNumberFilter.java | RussianPatternRuleTest | X-RUCHECK | verified |
| RU-0045 | NoDisambiguationRussianPartialPosTagFilter: PartialPosTagFilter tagging the token with Languages.getLanguageForShortCode("ru").getTagger() only (no disambiguation); IOException -> RuntimeException "Could not tag and disambiguate '<token>'"; 19 uses in disambiguation.xml | J/rules/ru/NoDisambiguationRussianPartialPosTagFilter.java | RussianTest (DisambiguationRuleTest) | X-RUCHECK | verified |
| RU-0046 | RussianPartialPosTagFilter: PartialPosTagFilter that tags with Russian.getInstance() tagger and runs the Russian disambiguator on the single-token sentence; 16 uses in grammar.xml | J/rules/ru/RussianPartialPosTagFilter.java | RussianPatternRuleTest | X-RUCHECK | verified |
| RU-0047 | RussianSuppressMisspelledSuggestionsFilter: empty subclass of core AbstractSuppressMisspelledSuggestionsFilter; 1 use | J/rules/ru/RussianSuppressMisspelledSuggestionsFilter.java | RussianPatternRuleTest | X-RUCHECK | verified |

## NLP component classes

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| RU-0060 | RussianTagger: BaseTagger("/ru/russian.dict", Locale "ru"), INSTANCE; for words of length>1: mayMissingYo if word has no ё/Ё, contains е/Е and no stressed vowel; strips stress (о́ а́ е́ у́ и́ ы́ э́ ю́ я́, о̀ а̀ ѐ у̀ ѝ ы̀ э̀ ю̀ я̀) and maps "ʼ"->"ъ"; readings via getAnalyzedTokens(word); if mayMissingYo and lowercase word with е->ё is in the dictionary, sets chunk tag "MayMissingYO"; position advances by the modified word length | J/tagging/ru/RussianTagger.java#tag | RussianTaggerTest | X-RUCHECK | verified |
| RU-0061 | RussianWordTokenizer: tokenizing chars = core WordTokenizer TOKENIZING_CHARACTERS + "'" + "." (does not contain \u0001); tokenize(text) applies String.replace (literal, all occurrences, left to right) in exactly this order (RussianWordTokenizer.java:43-49): 1 "б/у" -> "\u0001\u0001SOCR_BU\u0001\u0001", 2 "б/н" -> "\u0001\u0001SOCR_BN\u0001\u0001", 3 " .. " -> "\u0001\u0001SP_DDOT_SP\u0001\u0001", 4 " . " -> "\u0001\u0001SP_DOT_SP\u0001\u0001", 5 " ." -> " \u0001\u0001SP_DOT\u0001\u0001", 6 SP_DDOT_SP placeholder -> " .. ", 7 SP_DOT_SP placeholder -> " . "; i.e. steps 3/4 only shield " .. " and " . " from step 5 and are restored BEFORE tokenization (those dots are then split normally); only б/у, б/н and " ." (not followed by a space or second dot) survive into tokenization as placeholders. Then StringTokenizer(auxText, chars, returnDelims=true); per token replace SOCR_BU->"б/у", SOCR_BN->"б/н", SP_DOT placeholder->"." (so " .ru" yields tokens " ", ".ru": the dot is glued to the following word chars; "б/у" stays one token); then joinEMailsAndUrls | J/tokenizers/ru/RussianWordTokenizer.java | RussianTaggerTest | X-RUCHECK | verified |
| RU-0062 | RussianHybridDisambiguator: lazy singleton; MultiWordChunker("/ru/multiwords.txt") (default flags) then XmlRuleDisambiguator(Russian.getInstance()) (no global disambiguation); passes checkCanceled | J/tagging/disambiguation/ru/RussianHybridDisambiguator.java | RussianTest (DisambiguationRuleTest) | X-RUCHECK | verified |
| RU-0063 | RussianChunker (@Experimental, since 5.6): builds ChunkTaggedTokens (tag "O") for non-whitespace tokens without chunk "MayMissingYO"; applies 21 OpenRegex expressions REGEXES1 (names NP, initials NP, verb chains VP, если/поэтому SBAR, adj+noun NP, ADJP participle phrases, DPT adverbial participles, "тов" NP) then 3 REGEXES2 (Name и/или Name -> NPP, не+VB -> VP); syntax expansion <NP>/<VP>/<ADJP>/<DPT>; overwrite mode removes tags in {PP, NPP, NPS, MayMissingYO, VP, SBAR, ADJP, DPT}; NP->B-NP/I-NP, NPP->B-NP-plural/I-NP-plural, VP->B-VP/I-VP, ADJP->B-ADJP/I-ADJP, DPT->B-DPT/I-DPT, others -> phrase name; new tag removes "O"; result replaces readings' chunk tags; static debug flag prints to stdout; error -> RuntimeException "Could not apply chunk regexp '<regex>' to tokens: <tokens>" | J/chunking/RussianChunker.java | RussianPatternRuleTest | X-RUCHECK | verified |
| RU-0064 | RussianSynthesizer: singleton BaseSynthesizer("/ru/russian_synth.dict", "/ru/tags_russian.txt", "ru"), no soros; deprecated public ctor(Language) | J/synthesis/ru/RussianSynthesizer.java | RussianSynthesizerTest | X-RUCHECK | verified |

## XML rule resource files

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| RU-0070 | grammar.xml: 892 `<rule>` (481 top-level ids, 297 rulegroups) in 8 categories (LOGIC, PUNCTUATION, TYPOGRAPHY, GRAMMAR, STYLE, TYPOS, CASING, EXTEND), 2449 examples (1026 corrections), 146 antipatterns, 30 picky, 22 internal entities, 20 chunk-based tokens; default off: COMPLEX_SOUZ_PUNCT_2, KAVITCHKI, MissingYO, Num_plus_Noun1, Obobchajuchee_slovo, PREDLOGI_KROME, PUNKT_KOTORIJ1, Prep_i_2, Skazuem_sovmestnoje_dejstvije, Three_dot; temp_off: MISSING_PUNCT_IN_BULLET, Punct_PT_oborot_2, TAK_JE, Verb_INF_OR_3P; filters: ru.AdvancedSynthesizerFilter, ru.DateCheckFilter, ru.FutureDateFilter, ru.INNNumberFilter, ru.RussianPartialPosTagFilter, ru.RussianSuppressMisspelledSuggestionsFilter | R/rules/ru/grammar.xml | RussianPatternRuleTest, RussianTest | X-RUCHECK | verified |
| RU-0071 | disambiguation.xml: 77 rules (11 rulegroups), 8 examples; filter NoDisambiguationRussianPartialPosTagFilter (19 uses) | R/resource/ru/disambiguation.xml | RussianTest (DisambiguationRuleTest) | X-RUCHECK | verified |
| RU-0072 | bitext.xml: 1 bitext rule (category NEG "negation"), 2 examples; loaded by core Tools.getBitextRules("/ru/bitext.xml") for CLI bitext mode | R/rules/ru/bitext.xml; CORE/java/org/languagetool/tools/Tools.java | (standalone StandaloneBitextPatternRuleTest) | X-RUCHECK | verified |

## Binary and data resources

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| RU-0080 | Tagger dictionary russian.dict (2322253 bytes) + russian.info (separator "+", koi8-r, SUFFIX); AOT dictionary (LGPL); semantics: FSA bytes are koi8-r encoded (fsa.dict.encoding=koi8-r): lookup keys must be encoded and results decoded as koi8-r, not UTF-8 | R/resource/ru/russian.dict, russian.info | RussianTaggerTest | X-RUCHECK | verified |
| RU-0081 | Synthesizer dictionary russian_synth.dict (1481255 bytes) + russian_synth.info (separator "+", koi8-r, SUFFIX); semantics: FSA bytes are koi8-r encoded (fsa.dict.encoding=koi8-r): lookup keys must be encoded and results decoded as koi8-r, not UTF-8 | R/resource/ru/russian_synth.dict, russian_synth.info | RussianSynthesizerTest | X-RUCHECK | verified |
| RU-0082 | tags_russian.txt: 1201 synthesizer tags; semantics: plain UTF-8 text (only the .dict files of RU-0080/0081/0083/0084 are koi8-r) | R/resource/ru/tags_russian.txt | RussianSynthesizerTest | X-RUCHECK | verified |
| RU-0083 | Speller dictionary hunspell/ru_RU.dict (1889147 bytes) + ru_RU.info (separator "+", koi8-r, SUFFIX, frequency-included, speller.runon-words=true, ignore-diacritics=false, replacement-pairs "тс ц, ц тс, е ё, о ё, н нн, нн н, л лл, лл л, тся ться, ться тся, йо ё, а о, е я, э е, т ть, c cc, cc c, а у, е и, и е, не ни, ни не"); semantics: FSA bytes are koi8-r encoded (fsa.dict.encoding=koi8-r): lookup keys must be encoded and results decoded as koi8-r, not UTF-8 | R/resource/ru/hunspell/ru_RU.dict, ru_RU.info | MorfologikRussianSpellerRuleTest | X-RUCHECK | verified |
| RU-0084 | Speller dictionary hunspell/ru_RU_yo.dict (1783672 bytes) + ru_RU_yo.info (same options as RU-0083); semantics: FSA bytes are koi8-r encoded (fsa.dict.encoding=koi8-r): lookup keys must be encoded and results decoded as koi8-r, not UTF-8 | R/resource/ru/hunspell/ru_RU_yo.dict, ru_RU_yo.info | MorfologikRussianYOSpellerRuleTest | X-RUCHECK | verified |
| RU-0085 | hunspell/spelling.txt (1620 accepted words) | R/resource/ru/hunspell/spelling.txt | LanguageSpecificSpellcheckerTest, RussianTest | X-RUCHECK | verified |
| RU-0086 | hunspell/ignore.txt (comments only) and hunspell/prohibit.txt (31 prohibited words) | R/resource/ru/hunspell/ignore.txt, prohibit.txt | MorfologikRussianSpellerRuleTest | X-RUCHECK | verified |
| RU-0087 | added.txt (1282 entries) + added_custom.txt (comments only): manual tagger/synth additions | R/resource/ru/added.txt, added_custom.txt | RussianTaggerTest | X-RUCHECK | verified |
| RU-0088 | removed.txt (60 entries) + removed_custom.txt (comments only) | R/resource/ru/removed.txt, removed_custom.txt | RussianTaggerTest | X-RUCHECK | verified |
| RU-0089 | multiwords.txt (217 entries) for MultiWordChunker | R/resource/ru/multiwords.txt | RussianTest | X-RUCHECK | verified |
| RU-0090 | compounds.txt (26473 entries) shared by RU_COMPOUNDS and RU_DASH_RULE | R/resource/ru/compounds.txt | RussianCompoundRuleTest, RussianDashRuleTest | X-RUCHECK | verified |
| RU-0091 | specific_case.txt (17 phrases) for RU_SPECIFIC_CASE (resource dir) | R/resource/ru/specific_case.txt | RussianSpecificCaseRuleTest | X-RUCHECK | verified |
| RU-0092 | rules/ru/replace.txt (288 lines "wrong=right<TAB>comment") for RU_SIMPLE_REPLACE | R/rules/ru/replace.txt | RussianSimpleReplaceRuleTest | X-RUCHECK | verified |
| RU-0093 | rules/ru/coherency.txt (16 "a;b" pairs) for RU_WORD_COHERENCY | R/rules/ru/coherency.txt | RussianWordCoherencyRuleTest | X-RUCHECK | verified |
| RU-0094 | rules/ru/wordrootrep.txt (13122 "a;b" pairs) for RU_WORD_ROOT_REPEAT | R/rules/ru/wordrootrep.txt | - | X-RUCHECK | verified |
| RU-0095 | common_words.txt (9951 words) for language identification | R/resource/ru/common_words.txt | (standalone CommonWordsTest) | X-RUCHECK | verified |
| RU-0096 | confusion_sets.txt (2 sets) for ngram ConfusionProbabilityRule | R/resource/ru/confusion_sets.txt | RussianTest (testConfusionSetLoading) | - | later |
| RU-0097 | MessagesBundle_ru.properties: 294 keys (ASCII, 298 \u escaped lines) | R/MessagesBundle_ru.properties | RussianTest | X-RUCHECK | verified |
| RU-0098 | Non-runtime packaged files (no Java loader): russian_manual_add.txt (11008 lines, dictionary build input), tagset.txt, README.txt, make_dict_ru.sh, yo.awk, hunspell/README.txt, hunspell/*.sh, hunspell/*.awk; not ported (D-010) | R/resource/ru/* | - | - | n/a |

## Whole-pipeline acceptance

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| RU-0100 | Demo text "Вставьте ваш текст сюда .. или проверьте этот текстт. Релиз LanguageTool 4.7 состоялся в четверг 28 сентября 2019 года." yields [DOUBLE_PUNCTUATION, UPPERCASE_SENTENCE_START, MORFOLOGIK_RULE_RU_RU, DATE_WEEKDAY1] | T/rules/ru/RussianTest.java#testLanguage | RussianTest | X-RUCHECK | verified |
| RU-0101 | LanguageSpecificTest checks for Russian; note: the testConfusionSetLoading sub-check belongs to the `later` item RU-0096 (ngram), not to this ID | CORE test LanguageSpecificTest#runTests | RussianTest | tests/lang/ru | verified |
| RU-0102 | Concurrency: parallel checks give identical results | T/RussianConcurrencyTest.java | RussianConcurrencyTest | tests/lang/ru | verified |

## Test class mapping

- RussianConcurrencyTest -> RU-0102
- rules/ru/DateCheckFilterTest -> RU-0041
- rules/ru/LanguageSpecificSpellcheckerTest -> RU-0020, RU-0085
- rules/ru/MorfologikRussianSpellerRuleTest -> RU-0020, RU-0083, RU-0086
- rules/ru/MorfologikRussianYOSpellerRuleTest -> RU-0021, RU-0084
- rules/ru/RussianCompoundRuleTest -> RU-0022, RU-0090
- rules/ru/RussianDashRuleTest -> RU-0024, RU-0090
- rules/ru/RussianPatternRuleTest -> RU-0070, RU-0040..RU-0047, RU-0063, RU-0013
- rules/ru/RussianSimpleReplaceRuleTest -> RU-0026, RU-0092
- rules/ru/RussianSpecificCaseRuleTest -> RU-0028, RU-0091
- rules/ru/RussianTest -> RU-0001, RU-0002, RU-0011, RU-0012, RU-0014, RU-0027, RU-0071, RU-0100, RU-0101
- rules/ru/RussianUnpairedBracketsRuleTest -> RU-0029
- rules/ru/RussianVerbConjugationRuleTest -> RU-0030
- rules/ru/RussianWordCoherencyRuleTest -> RU-0031, RU-0093
- rules/ru/RussianWordRepeatRuleTest -> RU-0032
- synthesis/ru/RussianSynthesizerTest -> RU-0064, RU-0081, RU-0082
- tagging/ru/RussianTaggerTest -> RU-0060, RU-0061, RU-0080, RU-0087
- tokenizers/ru/RussianSRXSentenceTokenizerTest -> RU-0004

## Coverage

- Java main files: 28 (Russian, RussianChunker, 22 in rules/ru, RussianSynthesizer, RussianHybridDisambiguator, RussianTagger, RussianWordTokenizer) -> RU-0001..RU-0064, all covered.
- Resource files: 46 + META-INF properties -> RU-0070..RU-0098.
- Test classes: 18 -> mapped above.

## Totals

RU: 66 IDs (todo 0, spec 0, ported 1, verified 62, later 3: RU-0003, RU-0023, RU-0096; n/a 1 excluded: RU-0098).
