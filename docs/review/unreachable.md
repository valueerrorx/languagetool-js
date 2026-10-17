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
| F16 | GermanWordRepeatRule.ANTI_PATTERNS lazy notPorted | de-DE notPorted until German tagger; port with PatternToken (F25/F34) |
| F22 | ManualSynthesizer returns null instead of [] when two keys share a hash | unreachable with shipped data |
| F24 | ManualSynthesizer: >255 forms per lemma/tag hash - which group throws first follows Int2ObjectOpenHashMap order, port uses insertion order | unreachable with shipped data |
| F25 | tests: Demo language is a test stand-in (tests/support/DemoLanguage.js, no-op disambiguator/chunker instead of DemoDisambiguator2/DemoChunker) | only used by ported JUnit tests |
| F25b | JavaConcurrentHashMap: tree bins (table >= 64 with a bin of 8+ nodes) throw instead of modelling TreeBin order | UnifierConfiguration holds a few features/types per language |
| F25b | PatternRuleXmlCreator toXML: rule ids that inject valid XPath ("A' or 'x", operators, "[", "/", "]" after the closing quote, ":" tokens) throw notPorted instead of evaluating the XPath | ids are identifiers; only the Xalan lexer/predicate errors are modelled (probed against JDK 17) |
| F25b | URL: relative-path normalisation of URLStreamHandler#parseURL (needs a context URL), jar handler context parsing (always NPE without context) | the port only builds URL(String) |
| F25b | StringMatcher#parseCharClass: range ending at U+FFFF loops forever in Java (char overflow), JS terminates | pattern with a class range up to ￿ in a postag regexp |
| F25b | filterRegistry: filter="<existing non-filter Java class>" (e.g. java.util.HashMap) gives "Could not find filter class" instead of Java constructor/cast message; only stubs for fixture-named classes | only reachable via user --rulefile with a non-filter JDK/LT class; JS cannot enumerate the Java classpath |
| F26 | JavaHashMap: tree bins (>8 collisions in one bucket, table >= 64) not modelled - iteration order may differ (flag treeBinsNeeded) | needs >8 String keys with identical (hash & (n-1)) in one bucket; not seen in LT data |
