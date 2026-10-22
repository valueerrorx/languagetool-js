# AUDIT wave 2 (it, es, sl, ru, sk, pl) - reviewer
HIGH 0, MED 0, LOW 2.

- LOW src/lang/it/language/Italian.js:70-75 vs Italian.java:98-102: getRelevantLanguageModelRules(null model) throws NullPointerException (Java also NPE in ConfusionProbabilityRule ctor); es/ru return [] (DEV-026 text says all wave-2 languages give []). API only, no detection effect. DEV-026 wording does not match it; DEV-001 covers the non-null case.
- LOW src/lang/pl/tagging/PolishHybridDisambiguator.js:disambiguate vs PolishHybridDisambiguator.java: JS forwards checkCanceled, Java 1-arg call never checks cancellation. Not a detection loss.

Verified (differential Java 17 oracle vs JS, in-process, same inputs):
- getAllRules for it/es/sl/ru/sk/pl/es-AR/es-ES: 4835 + 3368 rows, id/class/category/defaultOff/tempOff/office/tags/active identical, same order.
- Rule metadata (priority via getRulePriority, description, url, examples, issue type, options) identical.
- check() with default rules: 30154 example/mutated sentences, identical matches (id, subId, offsets, message, suggestions); with all rules + categories enabled: 4965 paragraph/word-list inputs identical; 206 tokenizer edge inputs identical (both modes).
- analyzeText (tokens, POS, lemmas, chunk tags, synthesizer output per reading) on 3556 inputs identical.
- Language metadata (name, countries, quotes, ignored chars regex, maintainers, state, rule file names, component classes, priority map) identical.
- Bitext rules en->{it,es,sl,ru,sk,pl}: 282 rules identical.
- Resources of the 6 modules byte-identical (only language-module.properties differs, by design); es-ES dict/synth/tags equal to spanish-pos-dict-2.5.jar.
- All filter classes referenced by the XML files registered; no notPorted/stub/TODO in src/lang for these modules (only FIXME copied from Java).
