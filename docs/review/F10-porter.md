# F10 porter checkpoint (language model and registry)

Status: done. `npm run parity` 232 pass / 0 fail / 53 not ported; `npm test` 224 pass; lint clean. Ported tests: tests/core/{LanguagesTest,LanguageTest,LanguageBuilderTest}.test.js, tests/lib/java/collections-file.test.js. Not ported (need JLanguageTool/Demo/other languages): LanguagesTest#testGet with Demo, testCreateDefaultJLanguageTool, GermanTest/EnglishTest rule-based tests.

## Files
- Helpers: src/lib/java/collections/JavaHashMap.js, src/lib/java/io/File.js, src/lib/java/StringUtils.js, scannerLines in src/lib/java/io.js.
- Core: src/core/{Language,Languages,LanguageWithModel,DynamicLanguage,LanguageMaintainedState,languagesRef}.js, src/core/language/{Contributor,Contributors,RuleFilenameException,LanguageBuilder,components}.js, src/core/noop/*, src/core/tools/MultiKeyProperties.js.
- Wave 1: src/lang/{de,en,fr}/language/*.js (+ id2prio*.js generated from the Java static initialisers), src/lang/register.js.
- Oracle side: oracle/adapters/{_lang-common,lang-lookup,lang-describe,lang-dynamic,X-LANGUAGES}.mjs, oracle/comparators/dev006.mjs, i18n-bundle.mjs and string-tools.mjs use Languages.

## Design notes
- Language classes self-register in the ClassBroker registry; `src/lang/register.js` must be imported once before `Languages` is used (entry points, adapters, tests). Languages discovers classes from `META-INF/org/languagetool/language-module.properties` copies in resources/ (de, en, fr) exactly as Java does.
- Language components (taggers, tokenizers, disambiguators, chunkers, synthesizers, multitoken spellers, speller rules, UnifierConfiguration, JLanguageTool) come from `src/core/language/components.js`: `createComponent(fqcn, ...args)` / `sharedComponent(fqcn)` return the factory result registered by `registerComponent(fqcn, factory)` (later steps), else a placeholder whose class name is known (`componentClassName`) and whose members throw `notPorted`.
- Rule lists (getRelevantRules etc.), filterRuleMatches bodies, adjustFrenchRuleMatch, compound splitters throw `notPortedYet(...)` and belong to F17/F16/F23; filterRuleMatches returns [] for empty input like Java.
- getLongCodeToLangMapping uses a JavaHashMap with capacity 64 (the Java map of the full distribution has 46 entries) so the in-scope entries keep the Java iteration order (DEV-006, fixture-verified).
- Language.getRulePriority compares the ITS issue type by enum name `Style` until ITSIssueType exists (F14).

## DEV-006 handling (oracle/comparators/dev006.mjs)
compareJsonl delegates to compareDev006 when the expected text contains `"dev006` markers or `Supported language codes are`. Rules: expected `dev006Filtered:true` items pass if the JS item is the unknown-language error / null / boolean / an in-scope fallback language; lists drop filtered entries and out-of-scope class rows; code lists in unknown-language messages are masked; builder results over an out-of-scope base (ast, ca, es) are accepted as DEV-006 consequences; `hasVariant` of GermanyGerman is forced to false on the Java side (SimpleGerman is a subclass there); the Java work dir (`/tmp/ltjs-oracle-*`, `<CASE>`) equals process.cwd(). `structure:dev006-languages` (X-LANGUAGES) filters the Java list to the 15 in-scope classes.
Registry state: lang-dynamic adapter resets dynamic languages after each request (each Java case is its own JVM).

## Open points for later steps
- F17: rule lists, filterRuleMatches (de/en/fr/Swiss), adjustFrenchRuleMatch, getRelevantLanguageModelCapableRules, compound splitters (F23); replace the `notPortedYet` stubs.
- X-LANG-REGISTRY/http-languages stays NOT PORTED (server step); CORE-0020 discovery errors, CORE-0031 getRulePriority(rule), CORE-0029 stay UNORACLED (see F10-oracle.md).
- X-I18N bundle-dump-other / i18n-format-keys use stand-in descriptors for out-of-scope languages (ca, es, pl, uk, nl, pt, ar, sv, zh, ja, ga, el, ru, simple German) because their expected values are Java-only (DEV-006).
- Quirks reproduced: second `new AmericanEnglish()/BritishEnglish()/CanadianEnglish()/French()/CanadianFrench()/...` throws "Language was already instantiated"; LanguageBuilder over such a base fails the same way; unknown 3-letter builder base gives ArrayIndexOutOfBounds in getCountries; `prepareLineForSpeller` of English/French with a line like "\t" throws AIOOBE; Languages.getLanguageForLocale(null) NPE only when languages exist.
