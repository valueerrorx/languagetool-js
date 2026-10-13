# Inventory: Italian (languagetool-language-modules/it)

Java original: `/home/valueerror/STUFF/DEV/LanguageTool/languagetool`, commit 9b0be9db8cb4589cd031e85bd929c95c8ce57e49.
Path legend: `J/` = `languagetool-language-modules/it/src/main/java/org/languagetool/`, `R/` = `languagetool-language-modules/it/src/main/resources/org/languagetool/`, `T/` = `languagetool-language-modules/it/src/test/java/org/languagetool/`, `CORE/` = `languagetool-core/src/main/`.
Maven: only dependency `languagetool-core` (+ test-jar). No external dictionary artifact; all dictionaries ship in the module.
Registration: `src/main/resources/META-INF/org/languagetool/language-module.properties` -> `languageClasses=org.languagetool.language.Italian`.
Acceptance of XML rule files = all `<example>` sentences of all rules (Java `ItalianPatternRuleTest`, `DisambiguationRuleTest` via `ItalianTest`).

Row format: `| ID | behaviour (one line) | Java source (path#member) | Java tests | fixtures | status |`

## Language class and wiring

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| IT-0001 | Language metadata: name "Italian", shortCode "it", countries [IT, CH] (=> shortCodeWithCountryAndVariant "it", 2 countries), maintainer Contributor("Paolo Bianchini"), maintained state ActivelyMaintained; extends LanguageWithModel (ngram LM hook, see IT-0003); no variant classes | J/language/Italian.java#getName,getShortCode,getCountries,getMaintainers,getMaintainedState | ItalianTest | - | todo |
| IT-0002 | getRelevantRules order (all default on): 1 WhitespaceBeforePunctuationRule, 2 CommaWhitespaceRule, 3 DoublePunctuationRule, 4 GenericUnpairedBracketsRule(start ["[","(","{","»","«"], end ["]",")","}","«","»"]; quote pair commented out), 5 MorfologikItalianSpellerRule(messages,this,userConfig,altLanguages), 6 UppercaseSentenceStartRule, 7 ItalianWordRepeatRule, 8 MultipleWhitespaceRule; returned via Arrays.asList (fixed order) | J/language/Italian.java#getRelevantRules | ItalianTest (testJavaRules) | - | todo |
| IT-0003 | getRelevantLanguageModelRules -> singleton list [ItalianConfusionProbabilityRule(messages, languageModel, this)]; only when an ngram index dir "it" exists (LanguageWithModel.initLanguageModel prints "WARN: ngram index dir <dir> not found for Italian" once otherwise) | J/language/Italian.java#getRelevantLanguageModelRules; CORE/java/org/languagetool/LanguageWithModel.java | - | - | later |
| IT-0004 | Sentence tokenizer: new SRXSentenceTokenizer(this) -> core segment.srx languagerule "Italian" (17 rules, lines 6708-6786, languagemap "(IT\|it).*") followed by "Default"/general rules | J/language/Italian.java#createDefaultSentenceTokenizer; CORE/resources/org/languagetool/resource/segment.srx | ItalianSRXSentenceTokenizerTest | - | todo |
| IT-0005 | Word tokenizer: not overridden -> core default WordTokenizer | CORE/java/org/languagetool/Language.java#createDefaultWordTokenizer | ItalianTaggerTest (uses WordTokenizer) | - | todo |
| IT-0006 | Tagger wiring: createDefaultTagger -> new ItalianTagger() (new instance per Language) | J/language/Italian.java#createDefaultTagger | ItalianTaggerTest | - | todo |
| IT-0007 | Disambiguator wiring: createDefaultDisambiguator -> new ItalianRuleDisambiguator() (which itself instantiates a second `new Italian()`) | J/language/Italian.java#createDefaultDisambiguator | ItalianTest (DisambiguationRuleTest) | - | todo |
| IT-0008 | Synthesizer wiring: ItalianSynthesizer.INSTANCE (singleton) | J/language/Italian.java#createDefaultSynthesizer | ItalianSynthesizerTest | - | todo |
| IT-0009 | Chunker: none (createDefaultChunker / PostDisambiguationChunker = null, core default) | CORE/java/org/languagetool/Language.java | - | - | todo |
| IT-0010 | Default spelling rule: createDefaultSpellingRule -> new MorfologikItalianSpellerRule(messages, this, null, null) (used by Language#getDefaultSpellingRule, e.g. server/word suggestions) | J/language/Italian.java#createDefaultSpellingRule | MorfologikItalianSpellerRuleTest | - | todo |
| IT-0011 | Priorities: no getPriorityForId / getPriorityMap override (core defaults only) | CORE/java/org/languagetool/Language.java#getPriorityForId | - | - | todo |
| IT-0012 | Default disabled/enabled rules: no Java override (getDefaultDisabledRulesForVariant/EnabledRules = core default); only Java rule defaults (all on) and XML default="off" (14 ids + 3 sub-rules, see IT-0030) | J/language/Italian.java | ItalianTest | - | todo |
| IT-0013 | Other Language overrides: none (no custom quotes, no advanced typography, no filterRuleMatches, no adaptSuggestion, no ignored-characters regex, default getRuleFileNames = it/grammar.xml only since no style.xml) | J/language/Italian.java | - | - | todo |
| IT-0052 | Registration: src/main/resources/META-INF/org/languagetool/language-module.properties `languageClasses=org.languagetool.language.Italian`; core Languages#getAllLanguages reads every such file via ClassLoader.getResources, splits on `\s*,\s*`, instantiates via public no-arg ctor in listed order (duplicates skipped); this order is the order of Languages.get() and of server /v2/languages | languagetool-language-modules/it/src/main/resources/META-INF/org/languagetool/language-module.properties; CORE/java/org/languagetool/Languages.java#getAllLanguages | (all tests via Languages) | - | todo |

## Java rule classes

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| IT-0014 | ItalianWordRepeatRule: id "ITALIAN_WORD_REPEAT_RULE"; extends WordRepeatRule; ignore() true for repetitions of "così", "passo", "piano", "via" (wordRepetitionOf), else super.ignore | J/rules/it/ItalianWordRepeatRule.java#getId,ignore | ItalianWordRepeatRuleTest | - | todo |
| IT-0015 | MorfologikItalianSpellerRule: id "MORFOLOGIK_RULE_IT_IT", dictionary "/it/hunspell/it_IT.dict"; orderSuggestions drops a capitalized suggestion when the misspelled word is not capitalized and the lowercase form of that suggestion is also among the original suggestions (order otherwise kept) | J/rules/it/MorfologikItalianSpellerRule.java#getFileName,getId,orderSuggestions | MorfologikItalianSpellerRuleTest, LanguageSpecificSpellcheckerTest (it) | - | todo |
| IT-0016 | ItalianConfusionProbabilityRule: ngram ConfusionProbabilityRule subclass, no example pair | J/rules/it/ItalianConfusionProbabilityRule.java | - | - | later |

## Rule filter classes

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| IT-0017 | DateCheckFilter (it): AbstractDateCheckFilter; calendar Calendar.getInstance(Locale.UK); getDayOfWeek(String) lowercases and maps prefixes do/lu/ma/me/gi/ve/sa (or full names) to Calendar.SUNDAY..SATURDAY, else RuntimeException "Could not find day of week for '<s>'"; getDayOfWeek(Calendar) maps English UK display name to domenica/lunedì/martedì/mercoledì/giovedì/venerdì/sabato ("" otherwise); getMonth prefixes gen,feb,mar,apr,mag,giu,lug,ago,set,ott,nov,dic -> 1..12 else RuntimeException "Could not find month '<s>'"; used 2x in grammar.xml; semantics: dayStr/monthStr.toLowerCase() without Locale = default-locale lowercasing (DateCheckFilter.java:40,68); getDisplayName(DAY_OF_WEEK, LONG, Locale.UK) depends on JDK 17 CLDR data (oracle fixture) | J/rules/it/DateCheckFilter.java | ItalianPatternRuleTest (examples) | - | todo |

## NLP component classes

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| IT-0018 | ItalianTagger: plain BaseTagger("/it/italian.dict", Locale.ITALIAN); core BaseTagger behaviour (lowercase/uppercase lookup, manual added.txt/removed.txt/added_custom.txt/removed_custom.txt from /it/) | J/tagging/it/ItalianTagger.java; CORE/java/org/languagetool/tagging/BaseTagger.java | ItalianTaggerTest (testDictionary, testTagger) | - | todo |
| IT-0019 | ItalianRuleDisambiguator: AbstractDisambiguator delegating to XmlRuleDisambiguator(new Italian()) (no global disambiguation) loading /it/disambiguation.xml | J/tagging/disambiguation/rules/it/ItalianRuleDisambiguator.java#disambiguate | ItalianTest (DisambiguationRuleTest) | - | todo |
| IT-0020 | ItalianSynthesizer: singleton INSTANCE = BaseSynthesizer("/it/italian_synth.dict", "/it/italian_tags.txt", "it"), no soros file; deprecated public ctor ItalianSynthesizer(Language) delegates to private ctor | J/synthesis/it/ItalianSynthesizer.java | ItalianSynthesizerTest | - | todo |

## XML rule resource files

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| IT-0030 | grammar.xml: 141 `<rule>` (39 top-level ids, 33 rulegroups) in 14 categories (CAT1..CAT13, SEMANTICS), 277 examples (165 with correction), 33 antipatterns, 4 internal entities; default="off" ids: ER_01_001a, ER_01_002a, ER_01_004, ER_02_002, ER_02_003, GR_01_001, GR_02_001, GR_05_002, GR_10_001, NUMBER_DAYS_MONTH, ST_02_001, ST_03_002, ST_04_001, ST_04_002 (+3 sub-rules without own id inside groups: GR_04_002 rule [1], ER_01_001 rule [2], ER_01_003 rule [2]; total 17 `default="off"` attributes in grammar.xml); filter used: org.languagetool.rules.it.DateCheckFilter; loaded by Language#getPatternRules via PatternRuleLoader | R/rules/it/grammar.xml | ItalianPatternRuleTest, ItalianTest (demo text) | - | todo |
| IT-0031 | disambiguation.xml: 3 rules (1 rulegroup), 0 examples, 4 internal entities; loaded by XmlRuleDisambiguator (IT-0019) | R/resource/it/disambiguation.xml | ItalianTest (DisambiguationRuleTest) | - | todo |

## Binary and data resources

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| IT-0040 | Tagger dictionary italian.dict (456530 bytes, morfologik FSA) + italian.info (separator "_", encoding iso-8859-15, encoder SUFFIX); morph-it! lexicon; loaded by BaseTagger; semantics: FSA bytes are iso-8859-15 encoded: encode/decode with ISO-8859-15 (differs from Latin-1 for €, Š, š, Ž, ž, Œ, œ, Ÿ) | R/resource/it/italian.dict, italian.info | ItalianTaggerTest | - | todo |
| IT-0041 | Synthesizer dictionary italian_synth.dict (260827 bytes) + italian_synth.info (separator "_", utf-8, SUFFIX); loaded by BaseSynthesizer | R/resource/it/italian_synth.dict, italian_synth.info | ItalianSynthesizerTest | - | todo |
| IT-0042 | italian_tags.txt: 663 POS tags, one per line, used by BaseSynthesizer for regexp tag synthesis | R/resource/it/italian_tags.txt | ItalianSynthesizerTest | - | todo |
| IT-0043 | Speller dictionary hunspell/it_IT.dict (452116 bytes, morfologik speller FSA, not hunspell format) + it_IT.info (separator "+", ISO-8859-15, SUFFIX; no speller.* options => core defaults); loaded by MorfologikSpellerRule/MorfologikMultiSpeller; semantics: FSA bytes are ISO-8859-15 encoded: encode/decode with ISO-8859-15, not UTF-8 | R/resource/it/hunspell/it_IT.dict, it_IT.info | MorfologikItalianSpellerRuleTest | - | todo |
| IT-0044 | hunspell/spelling.txt: 274 additional accepted words (SpellingCheckRule spelling file, also added to speller as runtime dictionary) | R/resource/it/hunspell/spelling.txt; CORE/java/org/languagetool/rules/spelling/SpellingCheckRule.java | LanguageSpecificSpellcheckerTest, ItalianTest (WordListValidatorTest) | - | todo |
| IT-0045 | hunspell/ignore.txt: 1 word ignored by the speller | R/resource/it/hunspell/ignore.txt | ItalianTest (WordListValidatorTest) | - | todo |
| IT-0046 | added.txt (7 entries, tab-separated form/lemma/tag) and added_custom.txt (comments only): manual tagger additions; added.txt also read by BaseSynthesizer | R/resource/it/added.txt, added_custom.txt | ItalianTaggerTest | - | todo |
| IT-0047 | removed.txt and removed_custom.txt (comments only, no entries): manual tagger/synth removals | R/resource/it/removed.txt, removed_custom.txt | - | - | todo |
| IT-0048 | common_words.txt: 9953 most common words, used by language identification (CommonWordsDetector) | R/resource/it/common_words.txt; CORE/java/org/languagetool/Language.java#getCommonWordsPath | (standalone CommonWordsTest) | - | todo |
| IT-0049 | confusion_sets.txt: header only, no sets; used only by ngram ConfusionProbabilityRule | R/resource/it/confusion_sets.txt | - | - | later |
| IT-0050 | MessagesBundle_it.properties: 294 UI/rule message keys (6 \u escapes, ASCII), Italian translation of core MessagesBundle; loaded via ResourceBundle for locale it | R/MessagesBundle_it.properties | ItalianTest (testNoLineBreaksEtcInMessage) | - | todo |
| IT-0051 | Non-runtime packaged files (no Java loader): tagset.txt (tag documentation), README.txt, hunspell/README_it_IT.txt, morph_data_italian.awk, not_smi.awk; shipped in jar only; not ported (D-010) | R/resource/it/tagset.txt, README.txt, hunspell/README_it_IT.txt, *.awk | - | - | n/a |

## Whole-pipeline acceptance

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| IT-0060 | Demo text "Inserite qui il vostro testo... Oppure controlate direttamente questo ed avrete un assaggio di quali errori possono essere identificati con LanguageTool." yields rule ids [MORFOLOGIK_RULE_IT_IT, ST_03_001] in order | T/rules/it/ItalianTest.java#testLanguage | ItalianTest | - | todo |
| IT-0061 | LanguageSpecificTest checks for Italian: word list validity, no line breaks in messages, no quotes around suggestions, Java rule examples, confusion set loading, coherency baseforms, replace-rule replacements, disambiguation examples; note: the testConfusionSetLoading sub-check belongs to the `later` item IT-0049 (ngram), not to this ID | CORE test LanguageSpecificTest#runTests | ItalianTest | - | todo |
| IT-0062 | Concurrency: parallel checks with a shared Italian instance give identical results | T/ItalianConcurrencyTest.java (AbstractLanguageConcurrencyTest) | ItalianConcurrencyTest | - | todo |

## Test class mapping

- ItalianConcurrencyTest -> IT-0062
- rules/it/ItalianPatternRuleTest -> IT-0030, IT-0017
- rules/it/ItalianTest -> IT-0001, IT-0002, IT-0012, IT-0031, IT-0044, IT-0045, IT-0050, IT-0060, IT-0061
- rules/it/ItalianWordRepeatRuleTest -> IT-0014
- rules/it/LanguageSpecificSpellcheckerTest -> IT-0015, IT-0044
- rules/it/MorfologikItalianSpellerRuleTest -> IT-0015, IT-0043
- synthesis/it/ItalianSynthesizerTest -> IT-0020, IT-0041, IT-0042
- tagging/it/ItalianTaggerTest -> IT-0018, IT-0040, IT-0046
- tokenizers/it/ItalianSRXSentenceTokenizerTest -> IT-0004

## Coverage

- Java main files: 8 (Italian, DateCheckFilter, ItalianConfusionProbabilityRule, ItalianWordRepeatRule, MorfologikItalianSpellerRule, ItalianSynthesizer, ItalianTagger, ItalianRuleDisambiguator) -> IT-0001..IT-0020, all covered.
- Resource files: 33 (incl. META-INF properties) -> IT-0030..0051.
- Test classes: 9 -> mapped above.


## Totals

IT: 37 IDs (todo 34, spec 0, ported 0, verified 0, later 3: IT-0003, IT-0016, IT-0049; n/a 1 excluded: IT-0051).
