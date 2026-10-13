# Inventory: languagetool-language-modules/fr (French)

Java original: `/home/valueerror/STUFF/DEV/LanguageTool/languagetool`, commit 9b0be9db8cb4589cd031e85bd929c95c8ce57e49.
Row format: `| ID | behaviour (one line) | Java source (path#member) | Java tests | fixtures | status |` (see docs/INVENTORY.md).

Path prefixes used below:
- `JF:` = `languagetool-language-modules/fr/src/main/java/org/languagetool/`
- `RF:` = `languagetool-language-modules/fr/src/main/resources/org/languagetool/`
- `TF:` = `languagetool-language-modules/fr/src/test/java/org/languagetool/`
- `core:` = `languagetool-core/src/main/java/org/languagetool/`

Notes valid for the whole file:
- `rules/fr/FrenchTest` extends core `LanguageSpecificTest` (`runTests(lang)`: word lists, messages, examples of every Java rule, confusion sets, coherency/replace checks, core `DisambiguationRuleTest`) plus a demo text. `language/FrenchTest` tests advanced typography, rule list and sentence tokenizer.
- XML rule files are accepted through their `<example>` sentences (`FrenchPatternRuleTest`, core `DisambiguationRuleTest`).
- The French POS/synthesis dictionaries come from Maven artifact `org.languagetool:french-pos-dict:0.7` (FR-0200..0201); the French speller uses the POS dictionary `french.dict` itself (no hunspell). Not present in `~/.m2/repository` at inventory time; inspected in `LanguageTool-6.9-SNAPSHOT/libs/french-pos-dict.jar`.
- No variant-specific XML files exist for French. Rule default "on" unless stated. `later` = deferred per D-005.
- D-021 (reduced oracle classpath = de en fr it es sl ru sk pl): behaviour that depends on "all languages on the classpath" (LanguageSpecificTest rule examples, SpellcheckerTest, `Languages.getLanguageForShortCode("en-US")` in IsEnglishWordFilter, FR-0153) is specified for that classpath. The Maven test classpath of `fr` contains only core + fr, so in the JUnit baseline IsEnglishWordFilter finds no en-US and returns null (its 11 disambiguation rules are inert); with the D-021 oracle classpath they are active.
- D-025: no fr test uses an out-of-scope language; nothing dropped.

## Language classes and variants

| ID | behaviour (one line) | Java source (path#member) | Java tests | fixtures | status |
|---|---|---|---|---|---|
| FR-0001 | `French` "fr": name "French", countries [FR, "", LU, MC, CM, CI, HT, ML, SN, CD, MA, RE] (note empty string entry), default variant = Languages.getLanguageForShortCode("fr") (itself), SRX sentence tokenizer, `FrenchWordTokenizer`, `FrenchTagger.INSTANCE`, `FrenchSynthesizer.INSTANCE`, `new FrenchHybridDisambiguator()`, maintainer Dominique Pellé, ActivelyMaintained, `hasMinMatchesRules()=true`, `getMultitokenSpeller()=FrenchMultitokenSpeller.INSTANCE`; public ctor throws "Language was already instantiated, see the cause stacktrace below." on 2nd instantiation (protected ctor(boolean) used by variants); `getInstance()` throws "French(Premium) language expected, got ..." | JF:language/French.java | JLanguageToolTest, language/FrenchTest, FrenchConcurrencyTest | - | todo |
| FR-0002 | `French.getRelevantRules` fixed order (14 rules): CommaWhitespaceRule(messages,false), DoublePunctuationRule, GenericUnpairedBracketsRule([ ( { / ] ) }), speller (`getDefaultSpellingRule()` if userConfig==null && altLanguages empty, else new MorfologikFrenchSpellerRule(messages,this,userConfig,altLanguages)), UppercaseSentenceStartRule, MultipleWhitespaceRule, SentenceWhitespaceRule, LongSentenceRule(40, picky), LongParagraphRule(on, picky), CompoundRule, QuestionWhitespaceStrictRule(temp_off, picky), QuestionWhitespaceRule, SimpleReplaceRule, FrenchRepeatedWordsRule | JF:language/French.java#getRelevantRules | language/FrenchTest#testRules, GenericUnpairedBracketsRuleTest | - | todo |
| FR-0003 | `French.getRelevantRulesGlobalConfig`: adds GrammalecteRule when GlobalConfig.getGrammalecteServer() != null | JF:language/French.java#getRelevantRulesGlobalConfig | GrammalecteRuleTest | - | later |
| FR-0004 | `French.getRelevantLanguageModelRules`: FrenchConfusionProbabilityRule (ngram) | JF:language/French.java#getRelevantLanguageModelRules | FrenchConfusionProbabilityRuleTest | - | later |
| FR-0005 | `French.getPriorityForId`: id2prio HashMap with 99 entries (e.g. AGREEMENT_EXCEPTIONS 100, ..., FR_SPELLING_RULE -100, ELISION -200, UPPERCASE_SENTENCE_START -300, FRENCH_WHITESPACE_STRICT -350, FRENCH_WHITESPACE -400, TOUT_MAJUSCULES -400; note SE_CE is -10 despite comment); fallbacks: FR_COMPOUNDS* 500, CAT_TYPOGRAPHIE/CAT_TOURS_CRITIQUES/CAT_HOMONYMES_PARONYMES 20, SON -5, CAR* -50, CONFUSION_RULE_PREMIUM -50, FR_MULTITOKEN_SPELLING_* -90, FR_SIMPLE_REPLACE* 150, grammalecte_* -150, AI_FR_HYDRA_LEO* -101, AI_FR_GGEC_REPLACEMENT_ORTHOGRAPHY* -101, else core | JF:language/French.java#id2prio,getPriorityForId,getPriorityMap | FrenchTest (indirect) | - | todo |
| FR-0006 | `French.filterRuleMatches`: every match first passes `adjustFrenchRuleMatch`; then AI_FR_GGEC period-drop and merge logic as in German (overlap skip, adjacency gap 0/1, same picky status, same ITS type or both non-Style); merged: message "Il pourrait y avoir un problème ici.", short "Erreur potentielle", id AI_FR_MERGED_MATCH + "_STYLE" if both Style + "_PICKY" if both picky; ITS Grammar if types differ else Style if both Style | JF:language/French.java#filterRuleMatches,mergeMatches | JLanguageToolTest#testMergingOfGrammarCorrections,#testMatchfiltering | - | todo |
| FR-0007 | `French.adjustFrenchRuleMatch(rm, enabledRules)`: sets original error string; single-suggestion AI_FR_GGEC case-only change -> message "Un usage différent des majuscules et des minuscules est recommandé.", short "Majuscules et minuscules", ITS Typographical, category CASING, specific id ORTHOGRAPHY->CASING; MISSING_PRONOUN_LAPOSTROPHE "on"->"l'on" with "si on" -> id AI_FR_GGEC_SI_LON + picky; REPLACEMENT_PUNCTUATION_QUOTE -> AI_FR_GGEC_QUOTES, picky, Typographical; if enabledRules contains APOS_TYP every suggestion longer than 1 char gets ' -> ’ | JF:language/French.java#adjustFrenchRuleMatch | JLanguageToolTest#testLanguageDependentFilter,#testQuotes | - | todo |
| FR-0008 | French typography: quotes « » ‘ ’, advanced typography enabled; `toAdvancedTypography`: core conversion, then apostrophe fixes after BEFORE_APOS words (c j n m t s l d qu jusqu lorsqu puisqu quoiqu, all cases) `'`->`’`, `’"`->`’«`, `’'`->`’‘`, then narrow NBSP (U+202F) before ; ! ? (replacing existing NBSP), NBSP (U+00A0) before : and », after «, then whitespace dedupe (NBSP NBSP, U+202F x2, double space, NBSP+space, space+NBSP, space+U+202F, U+202F+space) | JF:language/French.java#toAdvancedTypography | language/FrenchTest#testAdvancedTypography | - | todo |
| FR-0009 | `French.prepareLineForSpeller`: split "#", form/tag split by `[\t;]`, "Ho Chi Minh" excluded, keep form only for tags starting Z or N or equal "A", else ""; no tag -> [line] | JF:language/French.java#prepareLineForSpeller | - | - | todo |
| FR-0010 | `BelgianFrench` "fr-BE": name "French (Belgium)", countries [BE], single-instantiation guard, `getDefaultDisabledRulesForVariant()` = [DOUBLER_UNE_CLASSE] | JF:language/BelgianFrench.java | FrenchTest | - | todo |
| FR-0011 | `CanadianFrench` "fr-CA": name "French (Canada)", [CA], default disabled [DOUBLER_UNE_CLASSE] | JF:language/CanadianFrench.java | - | - | todo |
| FR-0012 | `SwissFrench` "fr-CH": name "French (Switzerland)", [CH], default disabled [DOUBLER_UNE_CLASSE] | JF:language/SwissFrench.java | - | - | todo |
| FR-0013 | Language registration `language-module.properties`: French, CanadianFrench, SwissFrench, BelgianFrench | RF:../../META-INF/org/languagetool/language-module.properties | - | - | todo |
| FR-0014 | `MessagesBundle_fr.properties`: French UI/rule message bundle; semantics: file is pure ASCII with 164 `\uXXXX` escapes (Java properties unescaping, MessageFormat quoting where used) -> port must decode identically | RF:MessagesBundle_fr.properties | FrenchTest (message checks) | - | todo |

## Tokenizers, tagger, synthesizer, disambiguator

| ID | behaviour (one line) | Java source (path#member) | Java tests | fixtures | status |
|---|---|---|---|---|---|
| FR-0020 | `FrenchWordTokenizer`: tokenizing chars = core + "-", decimal comma and digit-group spaces protected, doNotSplit list (rendez-vous, c'est-à-dire, sars-cov-2, ...), 7 regexes splitting elisions (c' j' n' m' t' s' l' d' qu' jusqu' lorsqu' puisqu' quoiqu') and enclitic pronouns (-t-il, -je, -moi, ...), apostrophe ' and ’ | JF:tokenizers/fr/FrenchWordTokenizer.java | FrenchWordTokenizerTest | - | todo |
| FR-0021 | Sentence tokenizer: core SRXSentenceTokenizer with French rules from core segment.srx | JF:language/French.java#createDefaultSentenceTokenizer | FrenchSentenceTokenizerTest, language/FrenchTest#testSentenceTokenizer | - | todo |
| FR-0022 | `FrenchTagger.INSTANCE` (BaseTagger `/fr/french.dict`, Locale.FRENCH, tagLowercaseWithUppercase=false; overwriteWithManualTagger=false): ’->' normalisation, lowercase/uppercase variants, ambiguous "-Le/-Les/-Il/..." tokens, additionalTags for prefixed verbs (auto, auto-, re-, sur-) and nouns/adjectives (post-, sur-, mini-, méga-, anti-, ...; mini/méga without hyphen) copying tags with prefixed lemma | JF:tagging/fr/FrenchTagger.java | FrenchTaggerTest | - | todo |
| FR-0023 | `FrenchSynthesizer.INSTANCE` (soros `fr/fr.sor`, `/fr/french_synth.dict`, `/fr/french_tags.txt`, "fr") | JF:synthesis/FrenchSynthesizer.java | FrenchSynthesizerTest | - | todo |
| FR-0024 | `FrenchHybridDisambiguator()`: field initializers `MultiWordChunker.getInstance("/fr/multiwords.txt", true, true, false)` (no default tag; ctor `setRemovePreviousTags(true)`, NOT ignoreSpelling), `new XmlRuleDisambiguator(French.getInstance(), true)` (always the base French rules, also for fr-BE/CA/CH), `getInstance("/spelling_global.txt", false, true, false, tagForNotAddingTags)` with `setIgnoreSpelling(true)`; `disambiguate(input[, cb])` execution order: spelling_global -> multiwords -> XML (FrenchHybridDisambiguator.java:41-64); single-arg delegates with cb=null; semantics: getInstance instances are cached per (file, flags, defaultTag) and shared JVM-wide: the spelling_global instance is the same object as DE's (DE-0028) | JF:tagging/disambiguation/fr/FrenchHybridDisambiguator.java | FrenchRuleDisambiguatorTest, TestFrenchDisambiguator | - | todo |
| FR-0025 | `FrenchMultitokenSpeller.INSTANCE`: `/fr/multiwords.txt`, `/spelling_global.txt`, `/fr/hyphenated_words.txt` | JF:rules/fr/FrenchMultitokenSpeller.java | JLanguageToolTest#testMultitokenSpeller | - | todo |

## Java rules

| ID | behaviour (one line) | Java source (path#member) | Java tests | fixtures | status |
|---|---|---|---|---|---|
| FR-0040 | `MorfologikFrenchSpellerRule` FR_SPELLING_RULE: morfologik speller on POS dict `/fr/french.dict`, spelling file `/fr/hunspell/spelling.txt`, setIgnoreTaggedWords, useInOffice=true; orderSuggestions moves run-on/prefix/elision/hyphenated-pronoun/imperative suggestions to top (patterns APOSTROF_*, HYPHEN_*, PREFIX_WITH_WHITESPACE, TOKEN_AT_START, SPLIT_DIGITS_AT_END, exceptionsEgrave), uses tagger to validate split suggestions | JF:rules/fr/MorfologikFrenchSpellerRule.java | MorfologikFrenchSpellerRuleTest (21) | - | todo |
| FR-0041 | `CompoundRule` FR_COMPOUNDS: compounds from `/fr/compounds.txt`, description "Mots avec trait d’union : $match" | JF:rules/fr/CompoundRule.java | CompoundRuleTest | - | todo |
| FR-0042 | `QuestionWhitespaceRule` FRENCH_WHITESPACE (MISC): flags ? ! ; : » (and « followed by non-space) when the previous token is not whitespace (any whitespace accepted), suggesting U+202F before ? ! ; and U+00A0 before : and inside « », messages e.g. "Le point d'interrogation est précédé d'une espace fine insécable.", "Les deux-points sont précédés d'une espace insécable.", "Les guillemets sont toujours accompagnés d'une espace insécable.", URL exception for ":", skips after ( [ and immunized tokens | JF:rules/fr/QuestionWhitespaceRule.java | QuestionWhitespaceRuleTest | - | todo |
| FR-0043 | `QuestionWhitespaceStrictRule` FRENCH_WHITESPACE_STRICT (picky, temp_off): flags only when the preceding token is ordinary whitespace (U+202F, U+00A0 and non-whitespace allowed), so it is mutually exclusive with FRENCH_WHITESPACE | JF:rules/fr/QuestionWhitespaceStrictRule.java | QuestionWhitespaceStrictRuleTest | - | todo |
| FR-0044 | `SimpleReplaceRule` FR_SIMPLE_REPLACE_SIMPLE (TYPOS, Misspelling): `/fr/replace.txt` + `/fr/replace_custom.txt`, "Mot incorrect : $match" | JF:rules/fr/SimpleReplaceRule.java | SimpleReplaceRuleTest | - | todo |
| FR-0045 | `FrenchRepeatedWordsRule` FR_REPEATEDWORDS (REPETITIONS_STYLE): synonyms `/fr/synonyms.txt`, description "Synonymes de mots répétés." | JF:rules/fr/FrenchRepeatedWordsRule.java | FrenchRepeatedWordsRuleTest | - | todo |
| FR-0046 | `FrenchConfusionProbabilityRule`: ngram confusion with `/fr/confusion_sets.txt` | JF:rules/fr/FrenchConfusionProbabilityRule.java | FrenchConfusionProbabilityRuleTest | - | later |
| FR-0047 | `GrammalecteRule` FR_GRAMMALECTE: queries a local Grammalecte HTTP server (GlobalConfig), maps its errors to RuleMatches, static ignoreRules set of Grammalecte rule ids, "Returns matches of a local Grammalecte server" | JF:rules/fr/GrammalecteRule.java | GrammalecteRuleTest (1 of 2 @Ignore) | - | later |

## Rule filters

| ID | behaviour (one line) | Java source (path#member) | Java tests | fixtures | status |
|---|---|---|---|---|---|
| FR-0060 | `AdvancedSynthesizerFilter` (8 XML uses) | JF:rules/fr/AdvancedSynthesizerFilter.java | FrenchPatternRuleTest | - | todo |
| FR-0061 | `DateCheckFilter` (3 uses) + `DateFilterHelper` (French day/month names) + `DMYDateCheckFilter` (1 use, dd-mm-yyyy) | JF:rules/fr/DateCheckFilter.java, DateFilterHelper.java, DMYDateCheckFilter.java | FrenchPatternRuleTest | - | todo |
| FR-0062 | `NewYearDateFilter` (1 use, current date dependent) | JF:rules/fr/NewYearDateFilter.java | FrenchPatternRuleTest | - | todo |
| FR-0063 | `FindSuggestionsFilter` (189 uses): speller-based suggestions with French specifics | JF:rules/fr/FindSuggestionsFilter.java | FrenchPatternRuleTest | - | todo |
| FR-0064 | `FrenchNumberInWordFilter` (1 use) | JF:rules/fr/FrenchNumberInWordFilter.java | FrenchPatternRuleTest | - | todo |
| FR-0065 | `FrenchPartialPosTagFilter` (runs disambiguator; no XML reference) | JF:rules/fr/FrenchPartialPosTagFilter.java | - | - | todo |
| FR-0066 | `FrenchSuppressMisspelledSuggestionsFilter` (118 uses) | JF:rules/fr/FrenchSuppressMisspelledSuggestionsFilter.java | FrenchPatternRuleTest | - | todo |
| FR-0067 | `InterrogativeVerbFilter` (6 uses): builds inverted interrogative verb forms (-t-il etc.) | JF:rules/fr/InterrogativeVerbFilter.java | FrenchPatternRuleTest | - | todo |
| FR-0068 | `MakeContractionsFilter` (1 use): fixContractions in suggestions: `\bde le\b`->du, `\bà le\b`->au, `\bde les\b`->des, `\bà les\b`->aux (case-insensitive, Unicode) | JF:rules/fr/MakeContractionsFilter.java | FrenchPatternRuleTest | - | todo |
| FR-0069 | `PostponedAdjectiveConcordanceFilter` (1 use, AGREEMENT_POSTPONED_ADJ): postponed adjective agreement with any previous noun, many exceptions | JF:rules/fr/PostponedAdjectiveConcordanceFilter.java | FrenchPatternRuleTest | - | todo |
| FR-0070 | `SuggestionsFilter` (28 uses) | JF:rules/fr/SuggestionsFilter.java | FrenchPatternRuleTest | - | todo |
| FR-0071 | `WordWithDeterminerFilter` (13 uses): suggestions for determiner + noun/adjective in all 4 gender/number combos (MS, FS, MP, FP), elision rules CET_CE/CE_CET/MA_VOYELLE/MON_NFS/VIEUX checked | JF:rules/fr/WordWithDeterminerFilter.java | FrenchPatternRuleTest | - | todo |

## XML rule resources

| ID | behaviour (one line) | Java source (path#member) | Java tests | fixtures | status |
|---|---|---|---|---|---|
| FR-0150 | `rules/fr/grammar.xml` (9.1 MB): 5340 `<rule>`s, 507 rulegroups, 13 categories (AGREEMENT, CASING, CAT_ELISION, CAT_GRAMMAIRE, CAT_HOMONYMES_PARONYMES, CAT_MAJUSCULES, CAT_MARQUES_DE_COMMERCE, CAT_TOURS_CRITIQUES, CAT_TYPOGRAPHIE, MULTITOKEN_SPELLING, PONCTUATION_POINT, PONCTUATION_VIRGULE, SEMANTICS), 65 entities, 16792 examples, 65 off, 78 temp_off | RF:rules/fr/grammar.xml | FrenchPatternRuleTest | - | todo |
| FR-0151 | `rules/fr/style.xml` (1.4 MB): 1680 rules, 211 rulegroups (CAT_ANGLICISMES_FOREIGN_TERMS, CAT_ARCHAISMES, CAT_CALQUES, CAT_PLEONASMES, CAT_REGIONALISMES, CAT_REGLES_DE_BASE, PONCTUATION_STYLE_OS, REPETITIONS_STYLE, STYLE), 58 entities, 2623 examples, 38 off, 9 temp_off | RF:rules/fr/style.xml | FrenchPatternRuleTest | - | todo |
| FR-0152 | `rules/fr/remote-rule-filters.xml`: 77 rules / 17 rulegroups (AI_RULES) | RF:rules/fr/remote-rule-filters.xml | FrenchRemoteRuleFilterTest | - | later |
| FR-0153 | `resource/fr/disambiguation.xml`: 1030 rules, 141 rulegroups, 11 entities, 17 examples; 11 `<filter>`s, all core `IsEnglishWordFilter` (ctor `Languages.getLanguageForShortCode("en-US")`, exception swallowed; tagger = en-US EnglishTagger (EN-0023); args formPositions[, postags]: keep only if every form is tagged (matching postag regex); count mismatch -> RuntimeException "The number of forms and postags has to be the same in disambiguation rule with filter IsEnglishWordFilter."; no en-US -> null): runtime dependency FR -> EN (see header note on D-021) | RF:resource/fr/disambiguation.xml | FrenchTest (DisambiguationRuleTest), FrenchRuleDisambiguatorTest | - | todo |

## Plain-text data resources

| ID | behaviour (one line) | Java source (path#member) | Java tests | fixtures | status |
|---|---|---|---|---|---|
| FR-0170 | `resource/fr/added.txt` + `added_custom.txt`: tagger/synthesizer additions | RF:resource/fr/added*.txt | FrenchTaggerTest | - | todo |
| FR-0171 | `resource/fr/removed.txt` + `removed_custom.txt` | RF:resource/fr/removed*.txt | FrenchTaggerTest | - | todo |
| FR-0172 | `resource/fr/multiwords.txt`: MultiWordChunker tags + multitoken speller | RF:resource/fr/multiwords.txt | FrenchRuleDisambiguatorTest | - | todo |
| FR-0173 | `resource/fr/hyphenated_words.txt`: multitoken speller (hyphenated words) | RF:resource/fr/hyphenated_words.txt | JLanguageToolTest#testMultitokenSpeller | - | todo |
| FR-0174 | `resource/fr/compounds.txt`: CompoundRule | RF:resource/fr/compounds.txt | CompoundRuleTest | - | todo |
| FR-0175 | `resource/fr/confusion_sets.txt`: ngram confusion sets (also loaded by FrenchTest check) | RF:resource/fr/confusion_sets.txt | FrenchTest | - | later |
| FR-0176 | `resource/fr/common_words.txt`: language identifier | RF:resource/fr/common_words.txt | - | - | todo |
| FR-0177 | `resource/fr/hunspell/spelling.txt` (454 KB), `spelling_custom.txt`: words added to speller | RF:resource/fr/hunspell/spelling*.txt | MorfologikFrenchSpellerRuleTest | - | todo |
| FR-0178 | `resource/fr/hunspell/ignore.txt`, `prohibit.txt` | RF:resource/fr/hunspell/ignore.txt, prohibit.txt | MorfologikFrenchSpellerRuleTest, LanguageSpecificSpellcheckerTest (core SpellcheckerTest: no word in both prohibit.txt and spelling.txt for any language on the classpath, else RuntimeException "Word(s) appear in both spelling.txt and prohibit.txt - this doesn't make sense: ...") | - | todo |
| FR-0179 | `rules/fr/replace.txt`, `replace_custom.txt`: FR_SIMPLE_REPLACE_SIMPLE data | RF:rules/fr/replace*.txt | SimpleReplaceRuleTest | - | todo |
| FR-0180 | `rules/fr/synonyms.txt`: FrenchRepeatedWordsRule | RF:rules/fr/synonyms.txt | FrenchRepeatedWordsRuleTest | - | todo |
| FR-0181 | `resource/fr/fr.sor`: Soros number-to-words for FrenchSynthesizer | RF:resource/fr/fr.sor | FrenchSynthesizerTest | - | todo |

## Binary dictionaries and external artifacts

| ID | behaviour (one line) | Java source (path#member) | Java tests | fixtures | status |
|---|---|---|---|---|---|
| FR-0200 | Maven artifact `org.languagetool:french-pos-dict:0.7` (libs/french-pos-dict.jar; not in ~/.m2): `org/languagetool/resource/fr/french.dict` (1137949 B, morfologik FSA) + `french.info` (separator "_", SUFFIX, speller replacement-pairs, runon-words=true, ignore-punctuation=true, ignore-diacritics=true, convert-case=true, frequency-included) -> FrenchTagger and MorfologikFrenchSpellerRule, FindSuggestionsFilter | jar; JF:tagging/fr/FrenchTagger.java; JF:rules/fr/MorfologikFrenchSpellerRule.java | FrenchTaggerTest, MorfologikFrenchSpellerRuleTest | - | todo |
| FR-0201 | same artifact: `french_synth.dict` (649325 B) + `french_synth.info`, `french_tags.txt` (3744 B) -> FrenchSynthesizer | jar; JF:synthesis/FrenchSynthesizer.java | FrenchSynthesizerTest | - | todo |

## Cross-cutting tests in the module

| ID | behaviour (one line) | Java source (path#member) | Java tests | fixtures | status |
|---|---|---|---|---|---|
| FR-0220 | AnnotatedText with French: interpretAs before/after, `<br>`, fake markup, multiple simple markup -> correct offsets of French matches | core:markup/AnnotatedTextBuilder.java | AnnotatedTextTest (6) | - | todo |
| FR-0221 | Test-only disambiguator `src/test/resources/disambiguator.xml` with test class TestFrenchDisambiguator | languagetool-language-modules/fr/src/test/resources/disambiguator.xml | TestFrenchDisambiguator | - | todo |

## Coverage

Counts for `languagetool-language-modules/fr`:
- Java main classes: 31 (language 4 -> FR-0001..0012; rules/fr 23 -> FR-0025, FR-0040..0047, FR-0060..0071; synthesis 1 -> FR-0023; tagging 1 -> FR-0022; disambiguation 1 -> FR-0024; tokenizers 1 -> FR-0020).
- Priority map entries: 99 (FR-0005).
- XML rule files: 3 + disambiguation.xml (FR-0150..0153); `<rule>` elements in grammar/style: 7020; disambiguation rules: 1030.
- Resource files (main): 26 (incl. META-INF properties and MessagesBundle_fr). Runtime-relevant: FR-0013, FR-0014, FR-0150..0153, FR-0170..0181. Files without runtime behaviour (no ID): `README_lexique.txt`, `hunspell/README_fr.txt`, `tagset.txt` (documentation).
- External artifacts: french-pos-dict 0.7 (FR-0200..0201).
- Test classes: 23 in fr/src/test/java, all mapped (round-1 fix: LanguageSpecificSpellcheckerTest -> FR-0178 was previously unmapped; no test uses an out-of-scope language, D-025; FrenchConcurrencyTest -> FR-0001; GrammalecteRuleTest, FrenchConfusionProbabilityRuleTest, FrenchRemoteRuleFilterTest -> `later` IDs).

- Runtime dependency on other in-scope modules: FR-0153 (IsEnglishWordFilter -> en-US tagger, D-021).

Totals: 60 IDs (n/a excluded); todo 54, later 6 (FR-0003, FR-0004, FR-0046, FR-0047, FR-0152, FR-0175), spec 0, ported 0, verified 0; n/a 0.
