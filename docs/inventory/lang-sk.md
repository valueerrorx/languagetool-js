# Inventory: Slovak (languagetool-language-modules/sk)

Java original: `/home/valueerror/STUFF/DEV/LanguageTool/languagetool`, commit 9b0be9db8cb4589cd031e85bd929c95c8ce57e49.
Path legend: `J/` = `languagetool-language-modules/sk/src/main/java/org/languagetool/`, `R/` = `languagetool-language-modules/sk/src/main/resources/org/languagetool/`, `T/` = `languagetool-language-modules/sk/src/test/java/org/languagetool/`, `CORE/` = `languagetool-core/src/main/`.
Maven: only `languagetool-core` (+ test-jar). No external dictionary artifact.
Registration: `META-INF/org/languagetool/language-module.properties` -> `languageClasses=org.languagetool.language.Slovak`.
Acceptance of XML rule files = all `<example>` sentences (Java `SlovakPatternRuleTest` over grammar.xml and grammar-typography.xml).

Row format: `| ID | behaviour (one line) | Java source (path#member) | Java tests | fixtures | status |`

## Language class and wiring

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| SK-0001 | Language metadata: name "Slovak", shortCode "sk", countries [SK] (=> "sk-SK"), maintainer Contributor("Zdenko Podobný", "http://sk-spell.sk.cx"); getMaintainedState not overridden (core default); extends Language (no ngram LM) | J/language/Slovak.java | SlovakTest | - | verified |
| SK-0002 | getRelevantRules order (all default on): 1 CommaWhitespaceRule, 2 DoublePunctuationRule, 3 GenericUnpairedBracketsRule(start ["[","(","{","„","»","«","\""], end ["]",")","}","“","«","»","\""]), 4 UppercaseSentenceStartRule, 5 WordRepeatRule (core), 6 MultipleWhitespaceRule, 7 CompoundRule (sk), 8 MorfologikSlovakSpellerRule; SlovakVesRule commented out | J/language/Slovak.java#getRelevantRules | SlovakTest | - | verified |
| SK-0003 | getRuleFileNames: super list (rules/sk/grammar.xml; no style.xml) plus "<rulesDir>/sk/grammar-typography.xml"; grammar-nezaradene.xml is NOT added | J/language/Slovak.java#getRuleFileNames,RULE_FILES | SlovakPatternRuleTest | - | verified |
| SK-0004 | Sentence tokenizer: SRXSentenceTokenizer(this) -> segment.srx languagerule "Slovak" (418 rules, lines 1989-3662, map "(SK\|sk).*") + Default | J/language/Slovak.java#createDefaultSentenceTokenizer; CORE/resources/org/languagetool/resource/segment.srx | SlovakSentenceTokenizerTest | - | verified |
| SK-0005 | Word tokenizer: core default WordTokenizer | CORE/java/org/languagetool/Language.java#createDefaultWordTokenizer | SlovakTaggerTest | - | verified |
| SK-0006 | Tagger wiring: new SlovakTagger() | J/language/Slovak.java#createDefaultTagger | SlovakTaggerTest | - | verified |
| SK-0007 | Disambiguator: core default DEMO_DISAMBIGUATOR (no sk/disambiguation.xml); chunker: none | CORE/java/org/languagetool/Language.java | - | - | verified |
| SK-0008 | Synthesizer wiring: SlovakSynthesizer.INSTANCE | J/language/Slovak.java#createDefaultSynthesizer | SlovakSynthesizerTest | - | verified |
| SK-0009 | Default spelling rule: new MorfologikSlovakSpellerRule(messages, this, null, null) | J/language/Slovak.java#createDefaultSpellingRule | LanguageSpecificSpellcheckerTest (sk) | - | verified |
| SK-0010 | Priorities, default disabled/enabled rules, quotes, typography: none overridden (core defaults); XML default-off ids see SK-0030 | J/language/Slovak.java | - | - | verified |
| SK-0052 | Registration: src/main/resources/META-INF/org/languagetool/language-module.properties `languageClasses=org.languagetool.language.Slovak`; core Languages#getAllLanguages reads every such file via ClassLoader.getResources, splits on `\s*,\s*`, instantiates via public no-arg ctor in listed order (duplicates skipped); this order is the order of Languages.get() and of server /v2/languages | languagetool-language-modules/sk/src/main/resources/META-INF/org/languagetool/language-module.properties; CORE/java/org/languagetool/Languages.java#getAllLanguages | (all tests via Languages) | - | verified |

## Java rule classes

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| SK-0011 | CompoundRule (sk): final AbstractCompoundRule, id "SK_COMPOUNDS", description "Slová so spojovníkom napr. použite „česko-slovenský” namiesto „česko slovenský”", messages "Toto slovo sa zvyčajne píše so spojovníkom." / "Toto slovo sa obvykle píše bez spojovníka." / "Tento výraz sa bežne píše s alebo bez spojovníka." / short "Problém spájania slov"; data "/sk/compounds.txt" lazily (static, double-checked); no example pair | J/rules/sk/CompoundRule.java | CompoundRuleTest (sk) | - | verified |
| SK-0012 | MorfologikSlovakSpellerRule: final, id "MORFOLOGIK_RULE_SK_SK", dict "/sk/hunspell/sk_SK.dict"; otherwise core behaviour | J/rules/sk/MorfologikSlovakSpellerRule.java | LanguageSpecificSpellcheckerTest (sk) | - | verified |

## NLP component classes

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| SK-0020 | SlovakTagger: plain BaseTagger("/sk/slovak.dict", Locale "sk") incl. manual added/removed files | J/tagging/sk/SlovakTagger.java | SlovakTaggerTest | - | verified |
| SK-0021 | SlovakSynthesizer: singleton BaseSynthesizer("/sk/slovak_synth.dict", "/sk/slovak_tags.txt", "sk"); deprecated public ctor(Language) | J/synthesis/sk/SlovakSynthesizer.java | SlovakSynthesizerTest | - | verified |

## XML rule resource files

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| SK-0030 | grammar.xml: 156 `<rule>` (16 top-level ids, 13 rulegroups) in 4 categories (CAT1 Kapitalizácia, CAT2 Rôzne, PODSTATNE_A_PRIDAVNE_MENA, CIARKY), 315 examples (158 corrections), no filters/entities/antipatterns; default off: MUZSKY_ROD, MUZSKY_ROD_A, STREDNY_ROD, ZENSKY_ROD | R/rules/sk/grammar.xml | SlovakPatternRuleTest | - | verified |
| SK-0031 | grammar-typography.xml: 14 rules (14 ids, 7 rulegroups), category TYPOGRAPHY "Typografia", 37 examples (18 corrections); loaded as additional rule file (SK-0003) | R/rules/sk/grammar-typography.xml | SlovakPatternRuleTest | - | verified |
| SK-0032 | grammar-nezaradene.xml: 36 rules (31 ids, 24 rulegroups), 5 categories, 73 examples; not referenced by Slovak#getRuleFileNames nor by any test, i.e. never loaded at runtime (dead file shipped in jar); not ported (D-010) | R/rules/sk/grammar-nezaradene.xml | - | - | n/a |

## Binary and data resources

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| SK-0040 | Tagger dictionary slovak.dict (760313 bytes) + slovak.info (separator "$", utf8, encoder prefix) | R/resource/sk/slovak.dict, slovak.info | SlovakTaggerTest | - | verified |
| SK-0041 | Synthesizer dictionary slovak_synth.dict (2590243 bytes) + slovak_synth.info (separator "$", utf8, SUFFIX) | R/resource/sk/slovak_synth.dict, slovak_synth.info | SlovakSynthesizerTest | - | verified |
| SK-0042 | slovak_tags.txt: 1457 synthesizer tags | R/resource/sk/slovak_tags.txt | SlovakSynthesizerTest | - | verified |
| SK-0043 | Speller dictionary hunspell/sk_SK.dict (855216 bytes) + sk_SK.info (separator "+", utf-8, SUFFIX; no speller.* options) | R/resource/sk/hunspell/sk_SK.dict, sk_SK.info | LanguageSpecificSpellcheckerTest (sk) | - | verified |
| SK-0044 | hunspell/spelling.txt and hunspell/ignore.txt (comments only, no words) | R/resource/sk/hunspell/spelling.txt, ignore.txt | SlovakTest (WordListValidatorTest) | - | verified |
| SK-0045 | added.txt, added_custom.txt, removed.txt, removed_custom.txt (comments only, no entries) | R/resource/sk/added*.txt, removed*.txt | SlovakTaggerTest | - | verified |
| SK-0046 | compounds.txt (1809 entries) for SK_COMPOUNDS | R/resource/sk/compounds.txt | CompoundRuleTest (sk) | - | verified |
| SK-0047 | common_words.txt (4912 words) for language identification | R/resource/sk/common_words.txt | (standalone CommonWordsTest) | - | verified |
| SK-0048 | MessagesBundle_sk.properties: 294 keys (ASCII, 154 \u escaped lines) | R/MessagesBundle_sk.properties | SlovakTest | - | verified |
| SK-0049 | Non-runtime packaged files: tagset.txt, README.txt, create_dictionary.sh, bin/filter_lft.py, hunspell/README_en.txt, hunspell/README_sk.txt; not ported (D-010) | R/resource/sk/* | - | - | n/a |

## Whole-pipeline acceptance

| ID | behaviour | Java source | Java tests | fixtures | status |
|---|---|---|---|---|---|
| SK-0050 | LanguageSpecificTest checks for Slovak (no demo text, the old one is commented out) | T/rules/sk/SlovakTest.java | SlovakTest | - | todo |
| SK-0051 | Concurrency: parallel checks give identical results | T/SlovakConcurrencyTest.java | SlovakConcurrencyTest | - | todo |

## Test class mapping

- SlovakConcurrencyTest -> SK-0051
- rules/sk/CompoundRuleTest -> SK-0011, SK-0046
- rules/sk/LanguageSpecificSpellcheckerTest -> SK-0012, SK-0043
- rules/sk/SlovakPatternRuleTest -> SK-0003, SK-0030, SK-0031
- rules/sk/SlovakTest -> SK-0001, SK-0002, SK-0044, SK-0048, SK-0050
- synthesis/sk/SlovakSynthesizerTest -> SK-0021, SK-0041, SK-0042
- tagging/sk/SlovakTaggerTest -> SK-0020, SK-0040, SK-0045
- tokenizers/sk/SlovakSentenceTokenizerTest -> SK-0004

## Coverage

- Java main files: 5 (Slovak, CompoundRule, MorfologikSlovakSpellerRule, SlovakSynthesizer, SlovakTagger) -> SK-0001..SK-0021.
- Resource files: 30 + META-INF properties -> SK-0030..SK-0049.
- Test classes: 8 -> mapped above.

## Totals

SK: 28 IDs (todo 2, spec 0, ported 0, verified 26, later 0; n/a 2 excluded: SK-0032, SK-0049).
