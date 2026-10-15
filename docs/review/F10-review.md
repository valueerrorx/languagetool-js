# F10 review
Verified: npm test 224 pass, lint clean, parity full 232 pass/0 fail/53 not ported (X-LANG-REGISTRY 12 pass, http-languages not ported).
Walked: Languages.js, Language.js, LanguageBuilder.js, DynamicLanguage.js vs Java branch by branch (lookup, -x-, 2/3-part split, global, locale fallback, long-code map, getLangCodes sort, NBSP/typography patterns): no divergence.
dev006.mjs: GermanyGerman.hasVariant forced false = pure DEV-006 (SimpleGerman extends GermanyGerman, out of scope; GermanyGerman.isVariant is true so isHiddenFromGui unaffected). isNegative is loose (any RuntimeException/boolean/null accepted for filtered items) but only for dev006Filtered items.
Stand-ins (i18n-bundle OUT_OF_SCOPE, string-tools OUT_OF_SCOPE): inputs to port code, outputs still compared to the Java fixture, cannot mask; but violate the "no Java-only values in adapters" note.
Unreachable list: Languages 'global' returns first in-scope language (Java: first of full distribution), getLanguageForLocale null NPE only when languages exist, JavaHashMap no tree bins, getRelevantLanguageModelRules/CapableRules notPortedYet (ngram, DEV-001).
Verdict: ACCEPT.
