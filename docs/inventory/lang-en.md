# Inventory: languagetool-language-modules/en (English)

Java original: `/home/valueerror/STUFF/DEV/LanguageTool/languagetool`, commit 9b0be9db8cb4589cd031e85bd929c95c8ce57e49.
Row format: `| ID | behaviour (one line) | Java source (path#member) | Java tests | fixtures | status |` (see docs/INVENTORY.md).

Path prefixes used below:
- `JE:` = `languagetool-language-modules/en/src/main/java/org/languagetool/`
- `RE:` = `languagetool-language-modules/en/src/main/resources/org/languagetool/`
- `TE:` = `languagetool-language-modules/en/src/test/java/org/languagetool/` (test class names below are relative to it)
- `core:` = `languagetool-core/src/main/java/org/languagetool/`

Notes valid for the whole file:
- `EnglishTest` extends core `LanguageSpecificTest` and runs `runTests(lang, null, "ÆæāýÅåøšùçıčćö")`: word list validation, message checks, the examples of every Java rule, confusion-set loading, coherency.txt / replace.txt checks, core `DisambiguationRuleTest`, plus a demo text with expected rule IDs.
- XML rule files are accepted through their `<example>` sentences: `EnglishPatternRuleTest` (`testRules`: all en files; `testL2Languages`: grammar-l2-de.xml / grammar-l2-fr.xml via L2 test languages), disambiguation.xml via `EnglishDisambiguationRuleTest` and core `DisambiguationRuleTest`.
- The English POS, synthesis and speller dictionaries are NOT in this module; they come from Maven artifact `org.languagetool:english-pos-dict:0.6` (EN-0200..0203). Chunker models come from `edu.washington.cs.knowitall:opennlp-*-models:1.5` (EN-0204..0206). Neither is present in `~/.m2/repository` at inventory time; the jars were inspected in `LanguageTool-6.9-SNAPSHOT/libs/`.
- Rule default state: "on" unless stated. `later` = deferred per D-005.

## Language classes and variants

| ID | behaviour (one line) | Java source (path#member) | Java tests | fixtures | status |
|---|---|---|---|---|---|
| EN-0001 | `English` base "en": name "English", countries [] (empty), default variant AmericanEnglish.getInstance(), SRX sentence tokenizer, `EnglishWordTokenizer`, `EnglishTagger.INSTANCE`, pre-disambiguation chunker `new EnglishChunker()`, `EnglishSynthesizer.INSTANCE`, disambiguator `EnglishHybridDisambiguator(defaultVariant)`, maintainers (Mike Unwalla, Marcin Miłkowski, Daniel Naber), ActivelyMaintained, `hasMinMatchesRules()=true`, `getMultitokenSpeller()=EnglishMultitokenSpeller.INSTANCE`, default spelling rule `MorfologikAmericanSpellerRule(messages,this,null,[])`, deprecated public ctor | JE:language/English.java | JLanguageToolTest#testEnglish, EnglishTest | - | todo |
| EN-0002 | `English.getRelevantRules`: if motherTongue "de" prepend rules of `/org/languagetool/rules/en/grammar-l2-de.xml`, if "fr" of `grammar-l2-fr.xml` (Guava cache, PatternRuleLoader, expireAfterWrite 30 min); then fixed order (36 rules): CommaWhitespaceRule(example "We had coffee<marker> ,</marker> cheese ..."), DoublePunctuationRule(URL), UppercaseSentenceStartRule(example "This house is old. <marker>it</marker> ..."/URL), MultipleWhitespaceRule, SentenceWhitespaceRule(messages,2), WhiteSpaceBeforeParagraphEnd(off), WhiteSpaceAtBeginOfParagraph(off), EmptyLineRule(off), LongSentenceRule(en, 40, picky), LongParagraphRule(on, picky), ParagraphRepeatBeginningRule(off), PunctuationMarkAtParagraphEnd(on, picky), PunctuationMarkAtParagraphEnd2(off), ConsistentApostrophesRule(temp_off), EnglishSpecificCaseRule, EnglishUnpairedBracketsRule, EnglishUnpairedQuotesRule, EnglishWordRepeatRule, AvsAnRule, EnglishWordRepeatBeginningRule, CompoundRule, ContractionSpellingRule, EnglishWrongWordInContextRule, EnglishDashRule(picky), WordCoherencyRule, EnglishDiacriticsRule, EnglishPlainEnglishRule(off), EnglishRedundancyRule(off), SimpleReplaceRule, SimpleReplaceProfanityRule(picky), ReadabilityRule(difficult, off), ReadabilityRule(simple, off), EnglishRepeatedWordsRule(picky), StyleTooOftenUsedVerb/Noun/AdjectiveRule(off) | JE:language/English.java#getRelevantRules,cache | EnglishTest, EnglishPatternRuleTest#testL2Languages | - | todo |
| EN-0003 | `English.getRelevantLanguageModelRules`: UpperCaseNgramRule, EnglishConfusionProbabilityRule, EnglishNgramProbabilityRule; `getRelevantLanguageModelCapableRules`: with LM and motherTongue fr/de/es/nl -> EnglishFor{French,Germans,Spaniards,Dutchmen}FalseFriendRule; `hasNGramFalseFriendRule(mt)` true for de/fr/es/nl | JE:language/English.java#getRelevantLanguageModelRules,getRelevantLanguageModelCapableRules,hasNGramFalseFriendRule | - | - | later |
| EN-0004 | `English.getPriorityForId`: id2prio HashMap with 330 entries (e.g. I_E 10, CHILDISH_LANGUAGE 8, RUDE_SARCASTIC 6, MISSING_HYPHEN 5, ..., PROFANITY 1, GOOD_FLUCK 2, ... negative ones for style/AI); fallbacks: EN_COMPOUNDS_* 2, PRP_VBZ -2, CONFUSION_RULE_* -20, EN_UPPER_CASE_NGRAM -12, AI_SPELLING_RULE* -9, EN_MULTITOKEN_SPELLING_* -9, EN_GB_SIMPLE_REPLACE*/EN_US_SIMPLE_REPLACE* -5, QB_EN_OXFORD -51, EN_SIMPLE_REPLACE*GRAMME(S) -49, AI_HYDRA_LEO* (MISSING_COMMA -51, CP_YOU_YOUARE* -1, CP* 2, MISSING_TO* -14, else -11), AI_EN_LECTOR* -11, `EN_FOR_[A-Z]+_SPEAKERS_FALSE_FRIENDS.*` -21, else core; `getDefaultRulePriorityForStyle()` = -50 (Style ITS rules without explicit prio) | JE:language/English.java#id2prio,getPriorityForId,getDefaultRulePriorityForStyle | EnglishTest (indirect) | - | todo |
| EN-0005 | `English.filterRuleMatches`: for errors longer than 2 chars starting with "'" (suggestion not starting with ' ’ or space) or "n't" (suggestion not starting with n't/n’t) prefix suggestion with " "; dedupe suggestions; EN_SIMPLE_REPLACE*GRAMME(S) specific ids get ITS type LocaleViolation (mutates rule) | JE:language/English.java#filterRuleMatches | JLanguageToolTest#testAdaptSuggestions | - | todo |
| EN-0006 | `English.prepareLineForSpeller`: split "#"; lines containing "+" -> [""]; form/tag split by TAB; keep form only for tags starting NN or JJ, else [""]; no tag -> [line] | JE:language/English.java#prepareLineForSpeller | - | - | todo |
| EN-0007 | English typography: quotes “ ” ‘ ’, advanced typography enabled (core conversion) | JE:language/English.java#getOpening*Quote,isAdvancedTypographyEnabled | JLanguageToolTest#testAdvancedTypography | - | todo |
| EN-0008 | `English.getRemoteEnhancedRules`: wraps MORFOLOGIK_RULE_EN* spellers in BERTSuggestionRanking when a remote config exists | JE:language/English.java#getRemoteEnhancedRules | - | - | later |
| EN-0009 | `AmericanEnglish` "en-US": name "English (US)", countries [US]; public ctor throws "Language was already instantiated, see the cause stacktrace below." on 2nd instantiation (protected ctor(boolean) bypass); rules = English + AmericanReplaceRule(`/en/en-US/replace.txt`) + UnitConversionRuleUS; default speller MorfologikAmericanSpellerRule; LM-capable rules add SymSpellRule when experiment "SymSpell"/"SymSpell+NewSuggestionsOrderer" runs, else MorfologikAmericanSpellerRule(messages,this,globalConfig,userConfig,altLanguages,lm,motherTongue); rule files incl. en-US/grammar.xml, en-US/style.xml; `getInstance()` via Languages "en-US" | JE:language/AmericanEnglish.java | AmericanEnglishConcurrencyTest, JLanguageToolTest#testEnglishVariants | - | todo |
| EN-0010 | `BritishEnglish` "en-GB": name "English (GB)", countries [GB], single-instantiation guard, rules + BritishReplaceRule(`/en/en-GB/replace.txt`) + UnitConversionRuleImperial, speller MorfologikBritishSpellerRule; own id2prio OXFORD_SPELLING_ISATION_NOUNS -20, OXFORD_SPELLING_ISE_VERBS -21, OXFORD_SPELLING_IZE -22 then English prio; rule files incl. en-GB/grammar.xml, en-GB/style.xml | JE:language/BritishEnglish.java | BritishEnglishConcurrencyTest, JLanguageToolTest#testEnglishVariants | - | todo |
| EN-0011 | `AustralianEnglish` "en-AU": name "English (Australian)", [AU], rules + UnitConversionRuleImperial, speller MorfologikAustralianSpellerRule, rule files incl. en-AU/grammar.xml | JE:language/AustralianEnglish.java | AustralianEnglishConcurrencyTest | - | todo |
| EN-0012 | `CanadianEnglish` "en-CA": name "English (Canadian)", [CA], single-instantiation guard, rules + UnitConversionRuleImperial, speller MorfologikCanadianSpellerRule, en-CA/grammar.xml, `getInstance()` | JE:language/CanadianEnglish.java | CanadianEnglishConcurrencyTest | - | todo |
| EN-0013 | `NewZealandEnglish` "en-NZ": name "English (New Zealand)", [NZ], rules + NewZealandReplaceRule(`/en/en-NZ/replace.txt`) + UnitConversionRuleImperial, speller MorfologikNewZealandSpellerRule, en-NZ/grammar.xml | JE:language/NewZealandEnglish.java | NewZealandEnglishConcurrencyTest | - | todo |
| EN-0014 | `SouthAfricanEnglish` "en-ZA": name "English (South African)", [ZA], rules = English rules only, speller MorfologikSouthAfricanSpellerRule, no variant XML | JE:language/SouthAfricanEnglish.java | SouthAfricanEnglishConcurrencyTest | - | todo |
| EN-0015 | Language registration `language-module.properties`: English, AmericanEnglish, BritishEnglish, AustralianEnglish, CanadianEnglish, NewZealandEnglish, SouthAfricanEnglish | RE:../../META-INF/org/languagetool/language-module.properties | - | - | todo |

## Tokenizers, tagger, synthesizer, disambiguator, chunker

| ID | behaviour (one line) | Java source (path#member) | Java tests | fixtures | status |
|---|---|---|---|---|---|
| EN-0020 | `EnglishWordTokenizer`: regex `[wordChars]+\|[^wordChars]` with wordChars "±§©@€£¥$\p{L}\d-̀-ͯ¨°%‰‱&�­¬，？", protects apostrophes (xxAPOSTYPEWxx/xxAPOSTYPOGxx placeholders), splits contractions, keeps hyphenated words known to EnglishTagger, URL/e-mail handling, soft hyphen handling | JE:tokenizers/en/EnglishWordTokenizer.java#tokenize,wordsToAdd | EnglishWordTokenizerTest, TokenizeMultiwordsTest | - | todo |
| EN-0021 | `GoogleStyleWordTokenizer`: approximation of Google ngram tokenization (used by ngram rules) | JE:rules/en/GoogleStyleWordTokenizer.java | GoogleStyleWordTokenizerTest | - | later |
| EN-0022 | Sentence tokenizer: core `SRXSentenceTokenizer` with English rules from core segment.srx | JE:language/English.java#createDefaultSentenceTokenizer | EnglishSRXSentenceTokenizerTest | - | todo |
| EN-0023 | `EnglishTagger.INSTANCE` (BaseTagger `/en/english.dict`, Locale.ENGLISH, tagLowercaseWithUppercase=false, internTags=true; + added.txt/removed.txt): replaces ’ by ' for words > 1 char, adds lowercase readings for non-mixed-case words, first-upper readings for all-uppercase words, "in'" -> "ing" readings, unknown -> null reading | JE:tagging/en/EnglishTagger.java#tag | EnglishTaggerTest | - | todo |
| EN-0024 | `EnglishSynthesizer.INSTANCE` (soros `/en/en.sor`, `/en/english_synth.dict`, `/en/english_tags.txt`): POS tag suffix "+DT" returns [a/an form, "the "+form] and "+INDT" only the a/an form (a/an via AvsAnRule), exceptions ne'er/e'er/o'er/ol'/ma'am/n't/informations excluded | JE:synthesis/en/EnglishSynthesizer.java | EnglishSynthesizerTest | - | todo |
| EN-0025 | `EnglishHybridDisambiguator`: XmlRuleDisambiguator(en) over MultiWordChunker(`/en/multiwords.txt`, ignoreSpelling, removePreviousTags) over MultiWordChunker(`/spelling_global.txt`, tagForNotAddingTags) | JE:tagging/en/EnglishHybridDisambiguator.java | EnglishDisambiguationRuleTest | - | todo |
| EN-0026 | `EnglishChunker` (pre-disambiguation chunker): OpenNLP 1.9.5 TokenizerME/POSTaggerME/ChunkerME on models `/en-token.bin`, `/en-pos-maxent.bin`, `/en-chunker.bin` (loaded once, static, SHA-256 verified via Tools.getStream), maps OpenNLP tokens back to LT tokens, error "Length of results must be the same: ..."; BUG-compatible `cleanZeroWidthWhitespaces` adds the whole token for every ﻿ split | JE:chunking/EnglishChunker.java | EnglishChunkerTest | - | todo |
| EN-0027 | `EnglishChunkFilter`: post-processes OpenNLP B-NP/I-NP into B-NP-singular/-plural, I-NP-*, E-NP-* by noun number of the phrase end; IllegalStateException "Unknown chunk type" | JE:chunking/EnglishChunkFilter.java | EnglishChunkFilterTest | - | todo |
| EN-0028 | `EnglishMultitokenSpeller.INSTANCE`: MultitokenSpeller over `/en/multiwords.txt`, `/spelling_global.txt` | JE:rules/en/EnglishMultitokenSpeller.java | JLanguageToolTest | - | todo |

## Java rules

| ID | behaviour (one line) | Java source (path#member) | Java tests | fixtures | status |
|---|---|---|---|---|---|
| EN-0040 | `AbstractEnglishSpellerRule` (MorfologikSpellerRule) check logic: ignoreWordsWithLength=1, checkCompound, example "This <marker>sentenc</marker> ...", variant ignore file `<spellingFile>_<code>.txt`, additional spelling files `en/hunspell/spelling_custom.txt`, `spelling_global.txt`, `/en/multiwords.txt`; isValidInOtherVariant (VariantInfo) messages for words valid in other English variant; irregular-form messages (e.g. wrong plural/past), filter suggestions containing tokens like "timezone s" | JE:rules/en/AbstractEnglishSpellerRule.java#match,getRuleMatches,isValidInOtherVariant,filterSuggestions | MorfologikAmericanSpellerRuleTest, SpellingCheckRuleTest, SpellIgnoreTest | - | todo |
| EN-0041 | `AbstractEnglishSpellerRule` suggestions: static topSuggestions / topSuggestionsIgnoreCase maps (~650 lines), hyphen suggestions, getOnlySuggestions, filterNoSuggestWords | JE:rules/en/AbstractEnglishSpellerRule.java#getTopSuggestions,getTopSuggestionsIgnoreCase,getAdditionalTopSuggestions,addHyphenSuggestions | MorfologikAmericanSpellerRuleTest | - | todo |
| EN-0042 | `AbstractEnglishSpellerRule` optional external services: BeoLingus translator (GlobalConfig beolingusFile) and NERService (GlobalConfig nerUrl) to skip named entities | JE:rules/en/AbstractEnglishSpellerRule.java#AbstractEnglishSpellerRule(GlobalConfig...); JE:rules/en/translation/BeoLingusTranslator.java | - | - | later |
| EN-0043 | `MorfologikAmericanSpellerRule` MORFOLOGIK_RULE_EN_US: dict `/en/hunspell/en_US.dict`, variant file `en/hunspell/spelling_en-US.txt`, British->US map from `en/en-US-GB.txt` (column 1) for "valid in en-GB" messages | JE:rules/en/MorfologikAmericanSpellerRule.java | MorfologikAmericanSpellerRuleTest | - | todo |
| EN-0044 | `MorfologikBritishSpellerRule` MORFOLOGIK_RULE_EN_GB: `/en/hunspell/en_GB.dict`, `spelling_en-GB.txt`, US map (column 0) | JE:rules/en/MorfologikBritishSpellerRule.java | MorfologikBritishSpellerRuleTest | - | todo |
| EN-0045 | `MorfologikAustralianSpellerRule` MORFOLOGIK_RULE_EN_AU: `/en/hunspell/en_AU.dict`, `spelling_en-AU.txt` | JE:rules/en/MorfologikAustralianSpellerRule.java | MorfologikAustralianSpellerRuleTest | - | todo |
| EN-0046 | `MorfologikCanadianSpellerRule` MORFOLOGIK_RULE_EN_CA: `/en/hunspell/en_CA.dict`, `spelling_en-CA.txt` | JE:rules/en/MorfologikCanadianSpellerRule.java | MorfologikCanadianSpellerRuleTest | - | todo |
| EN-0047 | `MorfologikNewZealandSpellerRule` MORFOLOGIK_RULE_EN_NZ: `/en/hunspell/en_NZ.dict`, `spelling_en-NZ.txt` | JE:rules/en/MorfologikNewZealandSpellerRule.java | MorfologikNewZealandSpellerRuleTest | - | todo |
| EN-0048 | `MorfologikSouthAfricanSpellerRule` MORFOLOGIK_RULE_EN_ZA: `/en/hunspell/en_ZA.dict`, `spelling_en-ZA.txt` | JE:rules/en/MorfologikSouthAfricanSpellerRule.java | MorfologikSouthAfricanSpellerRuleTest | - | todo |
| EN-0049 | `VariantInfo`: value object (variant name + other-variant spelling) for speller messages | JE:rules/en/VariantInfo.java | MorfologikBritishSpellerRuleTest | - | todo |
| EN-0050 | `AmericanReplaceRule` EN_US_SIMPLE_REPLACE (STYLE, LocaleViolation) "British words easily confused in American English: $match", data `/en/en-US/replace.txt` | JE:rules/en/AmericanReplaceRule.java | AmericanReplaceRuleTest | - | todo |
| EN-0051 | `BritishReplaceRule` EN_GB_SIMPLE_REPLACE (STYLE, LocaleViolation) "American words easily confused in British English: $match", `/en/en-GB/replace.txt` | JE:rules/en/BritishReplaceRule.java | BritishReplaceRuleTest | - | todo |
| EN-0052 | `NewZealandReplaceRule` EN_NZ_SIMPLE_REPLACE (STYLE, LocaleViolation) "English words easily confused in New Zealand English", `/en/en-NZ/replace.txt` | JE:rules/en/NewZealandReplaceRule.java | NewZealandReplaceRuleTest | - | todo |
| EN-0053 | `AvsAnRule` EN_A_VS_AN (MISC, Misspelling): a/an by first letter/sound with exception lists from AvsAnData (`/en/det_a.txt`, `/en/det_an.txt`), example "a hour" -> "an hour", URL; public helper for suggestion | JE:rules/en/AvsAnRule.java; JE:rules/en/AvsAnData.java | AvsAnRuleTest | - | todo |
| EN-0054 | `CompoundRule` EN_COMPOUNDS: compounds from `/en/compounds.txt`, description "Hyphenated words: $match" | JE:rules/en/CompoundRule.java | CompoundRuleTest | - | todo |
| EN-0055 | `ConsistentApostrophesRule` EN_CONSISTENT_APOS (temp_off, text-level): mixed ' and ’ in one text, example "doesn’t" -> "doesn't" | JE:rules/en/ConsistentApostrophesRule.java | ConsistentApostrophesRuleTest | - | todo |
| EN-0056 | `ContractionSpellingRule` (TYPOS, Misspelling) EN_CONTRACTION_SPELLING: missing apostrophe in contractions from `/en/contractions.txt` | JE:rules/en/ContractionSpellingRule.java | ContractionSpellingRuleTest | - | todo |
| EN-0057 | `EnglishConfusionProbabilityRule`: ngram confusion sets with English exception lists | JE:rules/en/EnglishConfusionProbabilityRule.java | EnglishConfusionProbabilityRuleTest | - | later |
| EN-0058 | `EnglishDashRule` EN_DASH_RULE (picky): compounds written with dashes instead of hyphens, trie from `/en/compounds.txt` | JE:rules/en/EnglishDashRule.java | EnglishDashRuleTest | - | todo |
| EN-0059 | `EnglishDiacriticsRule` EN_DIACRITICS_REPLACE_ORTHOGRAPHY (TYPOS, Misspelling): "Suggest diacritics for '$match'", data `/en/diacritics.txt` | JE:rules/en/EnglishDiacriticsRule.java | EnglishTest (examples) | - | todo |
| EN-0060 | `EnglishForL2SpeakersFalseFriendRule` + `EnglishFor{Germans,French,Spaniards,Dutchmen}FalseFriendRule` EN_FOR_{DE,FR,ES,NL}_SPEAKERS_FALSE_FRIENDS: ngram false friends from `confusion_sets_l2_{de,fr,es,nl}.txt` | JE:rules/en/EnglishFor*FalseFriendRule.java | - | - | later |
| EN-0061 | `EnglishNgramProbabilityRule` (off): ngram probability of trigrams | JE:rules/en/EnglishNgramProbabilityRule.java | - | - | later |
| EN-0062 | `EnglishPlainEnglishRule` EN_PLAIN_ENGLISH_REPLACE (PLAIN_ENGLISH, Style, off) "1. Wordiness (General)", data `/en/wordiness.txt` | JE:rules/en/EnglishPlainEnglishRule.java | EnglishTest (examples) | - | todo |
| EN-0063 | `EnglishRedundancyRule` EN_REDUNDANCY_REPLACE (REDUNDANCY, Style, off) "1. Redundancy (General)", data `/en/redundancies.txt` | JE:rules/en/EnglishRedundancyRule.java | EnglishTest (examples) | - | todo |
| EN-0064 | `EnglishRepeatedWordsRule` EN_REPEATEDWORDS (REPETITIONS_STYLE, picky): repeated words within distance, synonyms `/en/synonyms.txt`, description "Suggest synonyms for repeated words." | JE:rules/en/EnglishRepeatedWordsRule.java | EnglishRepeatedWordsRuleTest | - | todo |
| EN-0065 | `EnglishSpecificCaseRule` EN_SPECIFIC_CASE: proper-noun casing from `/en/specific_case.txt`, "Checks upper/lower case spelling of some proper nouns" | JE:rules/en/EnglishSpecificCaseRule.java | EnglishSpecificCaseRuleTest | - | todo |
| EN-0066 | `EnglishUnpairedBracketsRule` EN_UNPAIRED_BRACKETS: [ ( { / ] ) } with English exceptions (preventMatch, isNoException overrides) | JE:rules/en/EnglishUnpairedBracketsRule.java | EnglishUnpairedBracketsRuleTest | - | todo |
| EN-0067 | `EnglishUnpairedQuotesRule` EN_UNPAIRED_QUOTES: start “ " ' ‘ / end ” " ' ’ with apostrophe exceptions | JE:rules/en/EnglishUnpairedQuotesRule.java | EnglishUnpairedQuotesRuleTest | - | todo |
| EN-0068 | `EnglishWordRepeatBeginningRule` ENGLISH_WORD_REPEAT_BEGINNING_RULE: adds English adverb lists and messages | JE:rules/en/EnglishWordRepeatBeginningRule.java | EnglishWordRepeatBeginningRuleTest | - | todo |
| EN-0069 | `EnglishWordRepeatRule` ENGLISH_WORD_REPEAT_RULE: English exceptions ("had had", "that that", ...) | JE:rules/en/EnglishWordRepeatRule.java | EnglishWordRepeatRuleTest, WordRepeatRuleTest | - | todo |
| EN-0070 | `EnglishWrongWordInContextRule` ENGLISH_WRONG_WORD_IN_CONTEXT: `/en/wrongWordInContext.txt`, "commonly confused words: $match" | JE:rules/en/EnglishWrongWordInContextRule.java | EnglishWrongWordInContextRuleTest | - | todo |
| EN-0071 | `LongSentenceRule` (en) TOO_LONG_SENTENCE (picky): 40 words default, short message "Long sentence", URL | JE:rules/en/LongSentenceRule.java | EnglishTest (examples) | - | todo |
| EN-0072 | `SimpleReplaceRule` EN_SIMPLE_REPLACE: `/en/replace.txt` + `/en/replace_custom.txt`, "Check for wrong words/phrases: $match" | JE:rules/en/SimpleReplaceRule.java | EnglishTest (replace check) | - | todo |
| EN-0073 | `SimpleReplaceProfanityRule` PROFANITY (STYLE, Style, picky): words from `/en/replace_profanity.txt`, no suggestions, description "Profanity" | JE:rules/en/SimpleReplaceProfanityRule.java | EnglishTest (examples) | - | todo |
| EN-0074 | `StyleTooOftenUsedVerbRule` / `NounRule` / `AdjectiveRule` TOO_OFTEN_USED_{VERB,NOUN,ADJECTIVE}_EN (off): "Statistical Style Analysis: Overused ..." | JE:rules/en/StyleTooOftenUsed*Rule.java | EnglishTest (examples) | - | todo |
| EN-0075 | `UnitConversionRule` METRIC_UNITS_EN_GENERAL (picky): metric equivalents, "Suggests or checks conversion of units to their metric equivalents." | JE:rules/en/UnitConversionRule.java | UnitConversionRuleTest | - | todo |
| EN-0076 | `UnitConversionRuleImperial` METRIC_UNITS_EN_IMPERIAL (en-GB/AU/CA/NZ) | JE:rules/en/UnitConversionRuleImperial.java | UnitConversionRuleImperialTest | - | todo |
| EN-0077 | `UnitConversionRuleUS` METRIC_UNITS_EN_US (en-US) | JE:rules/en/UnitConversionRuleUS.java | UnitConversionRuleUSTest | - | todo |
| EN-0078 | `UpperCaseNgramRule` EN_UPPER_CASE_NGRAM (CASING, Misspelling): ngram-based wrong uppercase words, uses `en/specific_case.txt` | JE:rules/en/UpperCaseNgramRule.java | UpperCaseNgramRuleTest | - | later |
| EN-0079 | `WordCoherencyRule` EN_WORD_COHERENCY: `/en/coherency.txt`, "Coherent spelling of words with two admitted variants." | JE:rules/en/WordCoherencyRule.java | WordCoherencyRuleTest, EnglishTest | - | todo |

## Rule filters

| ID | behaviour (one line) | Java source (path#member) | Java tests | fixtures | status |
|---|---|---|---|---|---|
| EN-0100 | `AdverbFilter` (1 XML use): maps adverb suggestion to adjective (large static table) | JE:rules/en/AdverbFilter.java | EnglishPatternRuleTest | - | todo |
| EN-0101 | `AdvancedSynthesizerFilter` (core abstract with English synthesizer; no direct XML class reference) | JE:rules/en/AdvancedSynthesizerFilter.java | - | - | todo |
| EN-0102 | `DateCheckFilter` + `DateFilterHelper` (9 uses): weekday/date consistency, English names | JE:rules/en/DateCheckFilter.java; JE:rules/en/DateFilterHelper.java | DateCheckFilterTest | - | todo |
| EN-0103 | `YMDDateCheckFilter`, `FutureDateFilter` (36 uses), `NewYearDateFilter` (4), `YMDNewYearDateFilter` (1): date filters depending on current date | JE:rules/en/YMDDateCheckFilter.java, FutureDateFilter.java, NewYearDateFilter.java, YMDNewYearDateFilter.java | EnglishPatternRuleTest | - | todo |
| EN-0104 | `EnglishConvertToSentenceCaseFilter` (no XML reference) | JE:rules/en/EnglishConvertToSentenceCaseFilter.java | - | - | todo |
| EN-0105 | `EnglishNumberInWordFilter` (1 use) | JE:rules/en/EnglishNumberInWordFilter.java | EnglishNumberInWordFilterTest | - | todo |
| EN-0106 | `EnglishPartialPosTagFilter` (runs disambiguator on single token) / `NoDisambiguationEnglishPartialPosTagFilter` (11 uses) | JE:rules/en/EnglishPartialPosTagFilter.java; NoDisambiguationEnglishPartialPosTagFilter.java | EnglishPatternRuleTest | - | todo |
| EN-0107 | `EnglishSuppressMisspelledSuggestionsFilter` (4 uses) | JE:rules/en/EnglishSuppressMisspelledSuggestionsFilter.java | EnglishRemoteRuleSuppressMisspelledTest, EnglishPatternRuleTest | - | todo |
| EN-0108 | `FindSuggestionsFilter` (4 uses): speller-based suggestions using `/en/english.dict` | JE:rules/en/FindSuggestionsFilter.java | EnglishPatternRuleTest | - | todo |
| EN-0109 | `OrdinalSuffixFilter` (5 uses): "1nd" -> "1st" | JE:rules/en/OrdinalSuffixFilter.java | EnglishPatternRuleTest | - | todo |

## Translation helpers

| ID | behaviour (one line) | Java source (path#member) | Java tests | fixtures | status |
|---|---|---|---|---|---|
| EN-0120 | `BeoLingusTranslator`: German/English dictionary translator from external BeoLingus file (GlobalConfig), used for speller suggestions of German words | JE:rules/en/translation/BeoLingusTranslator.java | - | - | later |
| EN-0121 | `Inflector`: inflects English words by German POS tag (for translations) | JE:rules/en/translation/Inflector.java | InflectorTest | - | todo |

## XML rule resources

| ID | behaviour (one line) | Java source (path#member) | Java tests | fixtures | status |
|---|---|---|---|---|---|
| EN-0150 | `rules/en/grammar.xml` (8.3 MB): 5568 `<rule>`s, 971 rulegroups, 13 categories (APRIL, CASING, COLLOCATIONS, COMPOUNDING, CONFUSED_WORDS, GRAMMAR, MULTITOKEN_SPELLING, NONSTANDARD_PHRASES, PROPER_NOUNS, PUNCTUATION, SEMANTICS, TYPOGRAPHY, TYPOS), 96 entities, 22707 examples, 65 off, 28 temp_off; heavy use of `chunk`/`chunk_re` (EnglishChunker tags) | RE:rules/en/grammar.xml | EnglishPatternRuleTest#testRules | - | todo |
| EN-0151 | `rules/en/style.xml`: 547 rules, 75 rulegroups (CREATIVE_WRITING, PLAIN_ENGLISH, REDUNDANCY, REPETITIONS_STYLE, STYLE, TON_ACADEMIC, WIKIPEDIA), 87 entities, 2044 examples, 34 off, 4 temp_off | RE:rules/en/style.xml | EnglishPatternRuleTest | - | todo |
| EN-0152 | `rules/en/grammar-l2-de.xml`: 5 rules (GRAMMAR) for German native speakers, loaded only with motherTongue de | RE:rules/en/grammar-l2-de.xml | EnglishPatternRuleTest#testL2Languages | - | todo |
| EN-0153 | `rules/en/grammar-l2-fr.xml`: 1 rule (TYPOS) for French native speakers | RE:rules/en/grammar-l2-fr.xml | EnglishPatternRuleTest#testL2Languages | - | todo |
| EN-0154 | `rules/en/en-US/grammar.xml` (36 rules, 6 rulegroups, 125 examples, 1 off) + `en-US/style.xml` (20 rules, 55 examples, 1 off) | RE:rules/en/en-US/*.xml | EnglishPatternRuleTest | - | todo |
| EN-0155 | `rules/en/en-GB/grammar.xml` (28 rules, 112 examples, 1 off; AMERICAN_ENGLISH, SEMANTICS, TYPOS) + `en-GB/style.xml` (8 rules, 91 examples; BRE_STYLE_OXFORD_SPELLING) | RE:rules/en/en-GB/*.xml | EnglishPatternRuleTest | - | todo |
| EN-0156 | `rules/en/en-AU/grammar.xml` (4 rules, 25 examples) | RE:rules/en/en-AU/grammar.xml | EnglishPatternRuleTest | - | todo |
| EN-0157 | `rules/en/en-CA/grammar.xml` (5 rules, 26 examples) | RE:rules/en/en-CA/grammar.xml | EnglishPatternRuleTest | - | todo |
| EN-0158 | `rules/en/en-NZ/grammar.xml` (4 rules, 25 examples) | RE:rules/en/en-NZ/grammar.xml | EnglishPatternRuleTest | - | todo |
| EN-0159 | `rules/en/remote-rule-filters.xml`: 306 rules / 51 rulegroups (AI_RULES), 482 examples | RE:rules/en/remote-rule-filters.xml | EnglishRemoteRuleFilterTest | - | later |
| EN-0160 | `resource/en/disambiguation.xml`: 1062 rules, 104 rulegroups, 12 entities, 1957 examples (uses chunk tags) | RE:resource/en/disambiguation.xml | EnglishDisambiguationRuleTest, EnglishTest | - | todo |

## Plain-text data resources

| ID | behaviour (one line) | Java source (path#member) | Java tests | fixtures | status |
|---|---|---|---|---|---|
| EN-0170 | `resource/en/added.txt` + `added_custom.txt`: tagger/synthesizer additions | RE:resource/en/added*.txt | EnglishTaggerTest | - | todo |
| EN-0171 | `resource/en/removed.txt` + `removed_custom.txt`: removed readings | RE:resource/en/removed*.txt | EnglishTaggerTest | - | todo |
| EN-0172 | `resource/en/do-not-synthesize.txt` | RE:resource/en/do-not-synthesize.txt | EnglishSynthesizerTest | - | todo |
| EN-0173 | `resource/en/multiwords.txt`: multiword tags for EnglishHybridDisambiguator, speller dictionary input, multitoken speller | RE:resource/en/multiwords.txt | TokenizeMultiwordsTest | - | todo |
| EN-0174 | `resource/en/compounds.txt`: CompoundRule + EnglishDashRule | RE:resource/en/compounds.txt | CompoundRuleTest, EnglishDashRuleTest | - | todo |
| EN-0175 | `resource/en/specific_case.txt`: EnglishSpecificCaseRule (and UpperCaseNgramRule) | RE:resource/en/specific_case.txt | EnglishSpecificCaseRuleTest | - | todo |
| EN-0176 | `resource/en/en-US-GB.txt`: US<->GB spelling pairs for variant speller messages | RE:resource/en/en-US-GB.txt | MorfologikBritishSpellerRuleTest | - | todo |
| EN-0177 | `resource/en/common_words.txt`: language identifier common words | RE:resource/en/common_words.txt | - | - | todo |
| EN-0178 | `resource/en/word_definitions.txt`: ShortDescriptionProvider data | RE:resource/en/word_definitions.txt | - | - | todo |
| EN-0179 | `resource/en/confusion_sets.txt`, `confusion_sets_l2_{de,es,fr,nl}.txt` (+ `confusion_sets_l2_nl_wip.txt`, `confusion_sets_extended.txt` not loaded): ngram confusion data (loaded by EnglishTest confusion-set check) | RE:resource/en/confusion_sets*.txt | EnglishTest | - | later |
| EN-0180 | `resource/en/hunspell/spelling.txt`, `spelling_custom.txt`, `spelling_en-{US,GB,AU,CA,NZ,ZA}.txt`: accepted words (ignore list and morfologik runtime dictionary additions) | RE:resource/en/hunspell/spelling*.txt | MorfologikAmericanSpellerRuleTest | - | todo |
| EN-0181 | `resource/en/hunspell/ignore.txt`: ignored words | RE:resource/en/hunspell/ignore.txt | SpellIgnoreTest | - | todo |
| EN-0182 | `resource/en/hunspell/prohibit.txt`, `prohibit_custom.txt` | RE:resource/en/hunspell/prohibit*.txt | MorfologikAmericanSpellerRuleTest | - | todo |
| EN-0183 | `rules/en/det_a.txt`, `det_an.txt`: AvsAnData exceptions | RE:rules/en/det_a.txt | AvsAnRuleTest | - | todo |
| EN-0184 | `rules/en/contractions.txt`: ContractionSpellingRule | RE:rules/en/contractions.txt | ContractionSpellingRuleTest | - | todo |
| EN-0185 | `rules/en/diacritics.txt`: EnglishDiacriticsRule | RE:rules/en/diacritics.txt | EnglishTest | - | todo |
| EN-0186 | `rules/en/wordiness.txt`: EnglishPlainEnglishRule | RE:rules/en/wordiness.txt | EnglishTest | - | todo |
| EN-0187 | `rules/en/redundancies.txt`: EnglishRedundancyRule | RE:rules/en/redundancies.txt | EnglishTest | - | todo |
| EN-0188 | `rules/en/replace.txt`, `replace_custom.txt`: SimpleReplaceRule | RE:rules/en/replace*.txt | EnglishTest | - | todo |
| EN-0189 | `rules/en/replace_profanity.txt`: SimpleReplaceProfanityRule | RE:rules/en/replace_profanity.txt | EnglishTest | - | todo |
| EN-0190 | `rules/en/en-US/replace.txt`, `en-GB/replace.txt`, `en-NZ/replace.txt`: variant replace rules | RE:rules/en/en-*/replace.txt | AmericanReplaceRuleTest, BritishReplaceRuleTest, NewZealandReplaceRuleTest | - | todo |
| EN-0191 | `rules/en/synonyms.txt`: EnglishRepeatedWordsRule | RE:rules/en/synonyms.txt | EnglishRepeatedWordsRuleTest | - | todo |
| EN-0192 | `rules/en/wrongWordInContext.txt` | RE:rules/en/wrongWordInContext.txt | EnglishWrongWordInContextRuleTest | - | todo |
| EN-0193 | `rules/en/coherency.txt`: EN_WORD_COHERENCY | RE:rules/en/coherency.txt | WordCoherencyRuleTest | - | todo |
| EN-0194 | `resource/en/en.sor`: Soros number-to-words for EnglishSynthesizer | RE:resource/en/en.sor | EnglishSynthesizerTest | - | todo |

## Binary dictionaries and external artifacts

| ID | behaviour (one line) | Java source (path#member) | Java tests | fixtures | status |
|---|---|---|---|---|---|
| EN-0200 | Maven artifact `org.languagetool:english-pos-dict:0.6` (libs/english-pos-dict.jar; not in ~/.m2): `org/languagetool/resource/en/english.dict` (625361 B, morfologik FSA, separator "+", SUFFIX) + `english.info` -> EnglishTagger, FindSuggestionsFilter | jar; JE:tagging/en/EnglishTagger.java | EnglishTaggerTest | - | todo |
| EN-0201 | same artifact: `english_synth.dict` (591310 B) + `english_synth.info`, `english_tags.txt` (543 B) -> EnglishSynthesizer | jar; JE:synthesis/en/EnglishSynthesizer.java | EnglishSynthesizerTest | - | todo |
| EN-0202 | same artifact: speller FSAs `hunspell/en_US.dict` (718075 B), `en_GB.dict` (720262), `en_AU.dict` (716861), `en_CA.dict` (718706), `en_NZ.dict` (716647), `en_ZA.dict` (746599) with `.info` each (e.g. en_US: speller.locale en_US, ignore-diacritics=true, replacement-pairs list, frequency-included) -> Morfologik*SpellerRule | jar; JE:rules/en/Morfologik*SpellerRule.java | Morfologik*SpellerRuleTest | - | todo |
| EN-0203 | same artifact also contains 12 empty `SynthDictionaryBuilder*.txt` files (build leftovers, no behaviour) | jar | - | - | todo |
| EN-0204 | Maven artifact `edu.washington.cs.knowitall:opennlp-tokenize-models:1.5`: `/en-token.bin` (439890 B, SHA-256 2d0dd64f...437c) | jar; JE:chunking/EnglishChunker.java | EnglishChunkerTest | - | todo |
| EN-0205 | `edu.washington.cs.knowitall:opennlp-postag-models:1.5`: `/en-pos-maxent.bin` (5696197 B, SHA-256 645a094f...cf3d) | jar; JE:chunking/EnglishChunker.java | EnglishChunkerTest | - | todo |
| EN-0206 | `edu.washington.cs.knowitall:opennlp-chunk-models:1.5`: `/en-chunker.bin` (2560304 B, SHA-256 7861a0c2...76cc); runtime library `org.apache.opennlp:opennlp-tools:1.9.5` | jar; JE:chunking/EnglishChunker.java | EnglishChunkerTest | - | todo |

## Cross-cutting tests in the module

| ID | behaviour (one line) | Java source (path#member) | Java tests | fixtures | status |
|---|---|---|---|---|---|
| EN-0220 | AnnotatedText handling with English (fake markup, empty content) and Tools.correct* with English | core:markup/AnnotatedTextBuilder.java; core:tools/Tools.java | AnnotatedTextBuilderTest, ToolsTest | - | todo |
| EN-0221 | DynamicMorfologikLanguage with English dictionaries (core dynamic language loading from a .dict path) | core:DynamicMorfologikLanguage.java | DynamicMorfologikLanguageTest | - | todo |
| EN-0222 | JLanguageTool behaviour with English: overlap filter, analyzed sentence output, text-level rules, adapt suggestions | core:JLanguageTool.java | JLanguageToolTest (14 tests, 3 @Ignore) | - | todo |

## Coverage

Counts for `languagetool-language-modules/en`:
- Java main classes: 77 files (language 7, rules/en 62, rules/en/translation 2, chunking 2, synthesis 1, tagging 2, tokenizers 1); every file appears in exactly one row: language EN-0001..0014; tokenizer/tagger/synth/chunker/disambiguator EN-0020..0028 (incl. GoogleStyleWordTokenizer EN-0021, EnglishMultitokenSpeller EN-0028); rules EN-0040..0079 (incl. AvsAnData in EN-0053, VariantInfo EN-0049, false-friend family EN-0060); filters EN-0100..0109 (incl. DateFilterHelper, YMDDateCheckFilter); translation EN-0120..0121.
- Priority map entries: 330 (English) + 3 (BritishEnglish).
- XML rule files: 11 rule files + disambiguation.xml (EN-0150..0160); `<rule>` elements in grammar/style/variant/L2 files: 6226; disambiguation rules: 1062.
- Resource files (main): 81 (incl. META-INF properties). Runtime-relevant ones: EN-0015, EN-0150..0160, EN-0170..0194. Files without runtime behaviour (no ID): `12dicts-readme.html`, `agid-readme.txt`, `pos-readme.txt`, `confusion_sets.README`, `confusion_set_candidates.txt` (not loaded), `confusion_sets_extended.txt`/`confusion_sets_l2_nl_wip.txt` (not loaded), `errors.txt` (pointer), `tagset.txt` (doc), `spelling_correction_model.bin` (not loaded), `hunspell/spelling_merged.txt` (empty; only dev scripts/tests mention it), `filter-archaic.txt` (languagetool-tools SynthDictionaryBuilder only), `rules/en/indent.sh`; excluded from jar by pom: `partlycountable.txt`, `uncountable.txt`, `filter*.txt`, `*.awk` (filter_out, get_all_english_cardinal, get_unc, remap, synteza, tags, test_dict), `numbers.txt`.
- External artifacts: english-pos-dict 0.6 (EN-0200..0203), opennlp models 1.5 x3 + opennlp-tools 1.9.5 (EN-0204..0206).
- Test classes: 59 in en/src/test/java, all mapped in the "Java tests" column (AbstractEnglishSpellerRuleTest is an abstract base; concurrency tests map to EN-0009..0014; EnglishRemoteRuleFilterTest -> EN-0159 later; EnglishConfusionProbabilityRuleTest -> EN-0057 later; UpperCaseNgramRuleTest -> EN-0078 later; GoogleStyleWordTokenizerTest -> EN-0021 later).

Totals: 122 IDs; todo 111, later 11 (EN-0003, EN-0008, EN-0021, EN-0042, EN-0057, EN-0060, EN-0061, EN-0078, EN-0120, EN-0159, EN-0179), spec 0, ported 0, verified 0.
