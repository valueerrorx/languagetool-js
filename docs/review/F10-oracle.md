# F10 oracle checkpoint (X-LANG-REGISTRY)

Status: done. Fixtures tests/golden/X-LANG-REGISTRY (1.4 MB, 13 cases), cases by oracle/scripts/gen-cases-lang-registry.mjs (inputs only), Java ops oracle/harness/src/ltjs/oracle/LangOps.java (`lang-lookup`, `lang-describe`, `lang-dynamic`). JS adapters: stubs (parity: 13 NOT PORTED). Regenerate: `node oracle/scripts/gen-cases-lang-registry.mjs && npm run oracle -- X-LANG-REGISTRY` (20 s). Responses ASCII-escaped JSON. Per-item failures are `{error:{class,message}}`. Existing X-LANGUAGES (Languages.get() identity only) is kept, not duplicated.
IDs: CORE-0020..0028, CORE-0030..0036, DE-0014, EN-0015, FR-0013.

## DEV-006 marking
`dev006OutOfScope` / `dev006Filtered`: true when the resulting language class is not one of the 15 registered classes of DE-0014/EN-0015/FR-0013 (SimpleGerman `de-DE-x-simple-language` is therefore marked out of scope, as are all other modules and dynamic/builder languages unless extending de/en/fr). The real Java value is always kept. JS must skip filtered entries (expect the Java unknown-language error instead). Unknown-language error messages list ALL Java codes ("Supported language codes are: ..."), so those messages differ by design (DEV-006): compare up to the code list only. `/v2/languages` and "Supported language codes" bodies likewise.

## Ops
- `lang-lookup {calls:[{fn, ...}]}` -> list. fn: `shortCode {code, noop?:[..], level}` (getLanguageForShortCode 1/2 args), `name {name}`, `supported {code}`, `locale {locale:{language,country,variant}|null}`, `className {className}` (getOrAddLanguageByClassName), `list`/`listWithDemo {level}`, `longCodes` (getLongCodeToLangMapping HashMap order: [key, shortCodeWithCountryAndVariant, outOfScope]), `listUnmodifiable`. Result `{value, dev006Filtered, dev006Reason?}` or `{error}`.
- `lang-describe {codes[], level}` -> per code like lookup shortCode.
- `lang-dynamic {calls}`: fn `add {name,code,path}` (Languages.addLanguage), `builder {path}` (LanguageBuilder.makeAdditionalLanguage(File)), `byClassName`, `list`, `shortCode`, `supported`, `name`, `locale`. Mutates the registry; each case file is its own JVM.
- describe level 0: dev006OutOfScope, class, shortCode, shortCodeWithCountryAndVariant, name, toString, countries, variant, locale, localeWithCountryAndVariant, defaultLanguageVariant (code), defaultLanguageVariantIsSelf, isVariant, hasVariant, maintainers [[name,url,toString]], maintainedState, isSpellcheckOnlyLanguage, isExternal, isHiddenFromGui, hasMinMatchesRules, hashCode, translatedName.en/de/fr (getTranslatedName with bundles of en/de/fr). Level 1 adds: commonWordsPath, defaultEnabled/DisabledRulesForVariant, ruleFileNames, ignoredCharactersRegex, quotes [open2, close2, open1, close1], isAdvancedTypographyEnabled, consistencyRulePrefix, priorityMap (sorted), priorityForId (protected getPriorityForId via reflection, 14 ids), toAdvancedTypography (10 samples), adaptSuggestion rows [adaptSuggestion, adaptSuggestionsList, prepareLineForSpeller], hasNGramFalseFriendRule.en/.de, equalsConsiderVariants rows [code, equals, equalsConsiderVariantsIfSpecified]. Level 2 adds class names of tagger, disambiguator, sentenceTokenizer, wordTokenizer, chunker, postDisambiguationChunker, synthesizer, multitokenSpeller, taggerCached, unifierConfiguration.

## Cases (13)
shortcode (188 codes: all wave-1 codes, case/underscore variants, near-misses, "-x-" forms, other modules, blank/NBSP/zero-width/null, 2000-char), supported (same codes), shortcode-noop, name (54), locale (105 incl. null), lists, errors (17 unknown-code messages), hooks-wave1 (17 variants, level 2), hooks-all (45 other codes level 1 + list level 1), hooks-info, dynamic (addLanguage .dict/.dic/bad suffix/null, byClassName), builder (26 rule file names), http-languages (GET/POST /v2/languages, unknown/empty/odd language codes on /v2/check).

## Findings pinned
- Unknown code error lists getLangCodes incl. dynamic codes and long-code mappings, e.g. `de-DE-x-simple-language-DE`.
- LanguageBuilder.ExtendedLanguage reinstantiates the base class: second extension of the same base language, and some bases, throw RuntimeException "Language was already instantiated, see the cause stacktrace below."; unknown base with 3-letter code ("eng") gives ArrayIndexOutOfBounds in getShortCodeWithCountryAndVariant.
- addLanguage with null path: NPE with helpful message; Demo class name is not in the distribution.

## UNORACLED
- CORE-0020 discovery errors (missing key / class not found in a properties resource): needs a custom classpath, not reachable with the distribution. Manual check: JUnit LanguagesTest reading.
- CORE-0031 getRulePriority(rule) (needs Rule objects), CORE-0029 pattern-rule loading and default on/off activation: covered by check fixtures, not here.
- CORE-0034 NoopLanguage only via shortcode-noop (xyz/zz); CORE-0036 Contributor via maintainers; CORE-0030 setters not exercised.

## Environment
JDK 17, pinned env per docs/ORACLE.md.
