# Unreachable mismatches (D-043) — logged, not fixed

| Step | Item | Why unreachable |
|---|---|---|
| F09 | io.js inputStreamReader supports only utf-8/latin1/ascii/utf-16 | core callers use utf-8 only |
| F09 | AnalyzedSentence getTokenSet/getLemmaSet insertion order vs HashMap keySet | all consumers order-independent |
| F09 | AnnotatedTextBuilder metadata maps insertion order vs HashMap | lookups only |
| F09 | StringTools.loadLines("") classpath listing | not used by API/CLI; adapter notPorted |
| F09 | AnalyzedTokenReadings#isImmunized debug log omitted | logs not part of acceptance (D-045) |
| F09 | AnnotatedText "Could not map" message HashMap order | internal exception text (D-045) |
| F08 | X-FSA info-synthetic noInfo: random temp dir in message | internal exception text |
| F07 | XMLValidator XSD/DTD validity + Xerces texts | test-only class (D-048) |
| F10 | Languages 'global' returns first in-scope language (Java: first of full set) | DEV-006 consequence |
| F10 | getLanguageForLocale(null) NPE only when languages exist | internal |
| F10 | JavaHashMap without tree bins | order identical for wave-1 sizes |
| F10 | adapter stand-ins (i18n-bundle, string-tools) carry locale data of out-of-scope langs as port inputs | output still compared to Java (D-042); convert to notPorted when cheap |
