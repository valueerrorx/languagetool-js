# F09 review log
Verdict: ACCEPT. npm test 191/191, lint clean, parity X-TEXT 55 pass / 0 fail / 1 not ported (tagger).
Checked side by side: AnnotatedText(+Builder, TextPart, MappingValue), ContextTools, StringTools (all methods), AnalyzedToken, AnalyzedTokenReadings, AnalyzedSentence, ChunkTag, GlobalConfig, io.js StringReader/inputStreamReader, 4 adapters, ported tests (counts match Java @Test).
Minor / unreachable:
1. string-tools.mjs:9-19 hardcodes unknown-language message + supported list; :113 hardcodes loadLines("") -> both must become notPorted (throw {notPorted:true}) until F10 / classpath listing exists.
2. io.js inputStreamReader supports only utf-8/latin1/ascii/utf-16 aliases; other JDK charsets throw UnsupportedEncodingException (Java core callers only use utf-8).
3. AnalyzedSentence.getTokenSet/getLemmaSet return copies in insertion order (Java HashMap key order); all Java consumers are order independent (RuleSet, AbstractTokenBasedRule, AbstractCompoundRule).
4. AnnotatedTextBuilder custom/enum metadata maps iterate in insertion order (Java HashMap); only lookups in Java.
5. StringToolsTest.testReadStream reads inline buffer instead of src/test/resources/testinput.txt.
6. AnalyzedTokenReadings#isImmunized debug log omitted (documented).
