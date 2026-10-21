# Inventory: Slovenian (languagetool-language-modules/sl)

Java original: `/home/valueerror/STUFF/DEV/LanguageTool/languagetool`, commit 9b0be9db8cb4589cd031e85bd929c95c8ce57e49.
Path legend: `J/` = `languagetool-language-modules/sl/src/main/java/org/languagetool/`, `R/` = `languagetool-language-modules/sl/src/main/resources/org/languagetool/`, `T/` = `languagetool-language-modules/sl/src/test/java/org/languagetool/`, `CORE/` = `languagetool-core/src/main/`.
Maven: only `languagetool-core` (+ test-jar). No external dictionary artifact.
Registration: `META-INF/org/languagetool/language-module.properties` -> `languageClasses=org.languagetool.language.Slovenian`.
Note: Slovenian has no POS tagger, no disambiguation file, no synthesizer; XML rules can only match token text.
Acceptance of grammar.xml = all `<example>` sentences (Java `SlovenianPatternRuleTest`).

Row format: `| ID | behaviour (one line) | Java source (path#member) | Java tests | fixtures | status |`

## Language class and wiring

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| SL-0001 | Language metadata: name "Slovenian", shortCode "sl", countries [SI] (=> "sl-SI"), maintainer "Martin Srebotnjak"; class annotated @Deprecated (unmaintained since 3.6); getMaintainedState not overridden (core default); extends Language (no ngram LM) | J/language/Slovenian.java | SlovenianTest | - | ported |
| SL-0002 | getRelevantRules order (all default on): 1 CommaWhitespaceRule, 2 DoublePunctuationRule, 3 GenericUnpairedBracketsRule(start ["[","(","{","„","»","«","\""], end ["]",")","}","”","«","»","\""]), 4 MorfologikSlovenianSpellerRule(userConfig, altLanguages), 5 UppercaseSentenceStartRule, 6 WordRepeatRule (core, id WORD_REPEAT_RULE), 7 MultipleWhitespaceRule | J/language/Slovenian.java#getRelevantRules | SlovenianTest | - | ported |
| SL-0003 | Sentence tokenizer: SRXSentenceTokenizer(this) -> segment.srx languagerule "Slovenian" (37 rules, lines 4662-4811, map "(SL\|sl).*") + Default | J/language/Slovenian.java#createDefaultSentenceTokenizer; CORE/resources/org/languagetool/resource/segment.srx | SlovenianTest (demo text) | - | ported |
| SL-0004 | Word tokenizer: core default WordTokenizer | CORE/java/org/languagetool/Language.java#createDefaultWordTokenizer | - | - | ported |
| SL-0005 | Tagger: core default DEMO_TAGGER (no POS tags) | CORE/java/org/languagetool/Language.java#createDefaultTagger | - | - | ported |
| SL-0006 | Disambiguator: core default DEMO_DISAMBIGUATOR (no-op); no sl/disambiguation.xml | CORE/java/org/languagetool/Language.java#createDefaultDisambiguator | - | - | ported |
| SL-0007 | Synthesizer: none (null); Chunker: none | CORE/java/org/languagetool/Language.java | - | - | ported |
| SL-0008 | Default spelling rule: new MorfologikSlovenianSpellerRule(messages, this, null, null) | J/language/Slovenian.java#createDefaultSpellingRule | LanguageSpecificSpellcheckerTest (sl) | - | ported |
| SL-0009 | Priorities, default disabled/enabled rules, quotes, typography, filterRuleMatches: none overridden (core defaults); rule files = sl/grammar.xml only | J/language/Slovenian.java | - | - | ported |
| SL-0036 | Registration: src/main/resources/META-INF/org/languagetool/language-module.properties `languageClasses=org.languagetool.language.Slovenian`; core Languages#getAllLanguages reads every such file via ClassLoader.getResources, splits on `\s*,\s*`, instantiates via public no-arg ctor in listed order (duplicates skipped); this order is the order of Languages.get() and of server /v2/languages | languagetool-language-modules/sl/src/main/resources/META-INF/org/languagetool/language-module.properties; CORE/java/org/languagetool/Languages.java#getAllLanguages | (all tests via Languages) | - | ported |

## Java rule classes

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| SL-0010 | MorfologikSlovenianSpellerRule: final, id "MORFOLOGIK_RULE_SL_SI", dictionary "/sl/hunspell/sl_SI.dict"; otherwise core MorfologikSpellerRule behaviour | J/rules/sl/MorfologikSlovenianSpellerRule.java | LanguageSpecificSpellcheckerTest (sl), SlovenianTest | - | ported |

## XML rule resource files

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| SL-0020 | grammar.xml: 86 `<rule>` (82 top-level ids, 57 rulegroups) in 6 categories (CAT1 "Slog - številke", CAT2 "Napake pri kraticah", CAT3 "Napake pri postavljanju ločil", CAT4 "Napake uporabe predlogov", CAT5 "Polvikanje", CAT6 "Pogoste napake"), 104 examples (90 with correction), no antipatterns, no filters, no entities; default off: TO_JE_BREZ_VEJICE | R/rules/sl/grammar.xml | SlovenianPatternRuleTest, SlovenianTest, JLanguageToolTest | - | ported |

## Binary and data resources

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| SL-0030 | Speller dictionary hunspell/sl_SI.dict (316633 bytes, morfologik speller FSA) + sl_SI.info (separator "+", iso-8859-2, SUFFIX; no speller.* options); semantics: FSA bytes are iso-8859-2 encoded (fsa.dict.encoding=iso-8859-2): encode/decode with ISO-8859-2, not UTF-8 | R/resource/sl/hunspell/sl_SI.dict, sl_SI.info | LanguageSpecificSpellcheckerTest (sl) | - | ported |
| SL-0031 | hunspell/spelling.txt (comments only, 0 words) | R/resource/sl/hunspell/spelling.txt | SlovenianTest (WordListValidatorTest) | - | ported |
| SL-0032 | hunspell/ignore.txt (5 words ignored by speller) | R/resource/sl/hunspell/ignore.txt | SlovenianTest | - | ported |
| SL-0033 | common_words.txt (2093 words) for language identification | R/resource/sl/common_words.txt | (standalone CommonWordsTest) | - | ported |
| SL-0034 | MessagesBundle_sl.properties: 294 keys (ASCII, 123 \u escapes) | R/MessagesBundle_sl.properties | SlovenianTest | - | ported |
| SL-0035 | Non-runtime packaged file: hunspell/README_sl_SI.txt; not ported (D-010) | R/resource/sl/hunspell/README_sl_SI.txt | - | - | n/a |

## Whole-pipeline acceptance

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| SL-0040 | Demo text "Tukaj vnesite svoje besedilo... Pa poglejmo primer besedila s nekaj napakami ki jih lahko razpozna orodje LanguageTool; ko opazite napake, jih lahko enostavno popiravite. ( Obenem se izvrši tudi preverjanje črkovanja črkovanja." yields [TROPIČJETRI, PREDLOG_S, KI_BREZ_VEJICE, MORFOLOGIK_RULE_SL_SI, COMMA_PARENTHESIS_WHITESPACE, WORD_REPEAT_RULE] | T/rules/sl/SlovenianTest.java#testLanguage | SlovenianTest | - | verified |
| SL-0041 | "Kupil je npr. jajca, moko in mleko." -> exactly 1 match | T/JLanguageToolTest.java#testSlovenian | JLanguageToolTest | - | verified |
| SL-0042 | LanguageSpecificTest checks (word lists, messages, Java rule examples, disambiguation examples) | CORE test LanguageSpecificTest#runTests | SlovenianTest | - | verified |
| SL-0043 | Concurrency: parallel checks give identical results | T/SlovenianConcurrencyTest.java | SlovenianConcurrencyTest | - | verified |

## Test class mapping

- JLanguageToolTest -> SL-0041
- SlovenianConcurrencyTest -> SL-0043
- rules/sl/LanguageSpecificSpellcheckerTest -> SL-0010, SL-0030, SL-0008
- rules/sl/SlovenianPatternRuleTest -> SL-0020
- rules/sl/SlovenianTest -> SL-0001, SL-0002, SL-0003, SL-0031, SL-0032, SL-0034, SL-0040, SL-0042

## Coverage

- Java main files: 2 (Slovenian, MorfologikSlovenianSpellerRule) -> SL-0001..SL-0010.
- Resource files: 9 (+ META-INF properties) -> SL-0020..SL-0035.
- Test classes: 5 -> mapped above.

## Totals

SL: 21 IDs (todo 4, spec 0, ported 17, verified 0, later 0; n/a 1 excluded: SL-0035).
