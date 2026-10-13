# Critic round 1: it/es/sl/ru/sk/pl -> REVISE (fixes to apply)
1. RU-0002 item 22: RussianDashRule NOT picky (RussianDashRule.java:41 setTags(emptyList)); align with RU-0024.
2. ES-0060 SpanishTagger.java:42-58: exact regexes: `VMP00SF|A[QO].[FC]S.`; CASE_INSENSITIVE|UNICODE_CASE `(auto)([^r]...+)`, `(autor)(r...+)`, no-prefix `(anti|pre|ex|pro|afro|ultra|super|súper)`, `(super)(.*[aeiouàéèíòóïü].+[aeiouàéèíòóïü].*)` tags `AQ.*|V.P.*`. Copy from source.
3. RU-0061 RussianWordTokenizer.java:43-49: exact replace order; " .. "/" . " placeholders restored before StringTokenizer, only keep " ." from applying inside them; only б/у, б/н and " ." (-> " "+SP_DOT, restored per token) survive.
4. Registration ID per language: language-module.properties languageClasses (es: Spanish,SpanishVoseo; order relevant for Languages list and /v2/languages).
5. ES-0019 es-AR: getLanguageForShortCode("es-AR") -> SpanishVoseo though Spanish lists AR (Spanish.java:77-80); es-MX etc. -> Spanish; VOSEO default-off only es-AR, priority -40 (:249); disambiguator built for "es". Needs oracle fixtures.
6. Status `n/a` + "not ported (D-010)": ES-0101, IT-0051, SL-0035, SK-0032, SK-0049, RU-0098, PL-0063.
7. IT-0030: 17 default="off"; add the 3 sub-rules inside groups by group id.
8. ES-0022: /es/hunspell/spelling_custom.txt absent; skipped silently via resourceExists (core MorfologikSpellerRule.java:258).
9. ES-0018 -> todo (D-020); non-AI matches pass unchanged (Spanish.java:352-398); test es JLanguageToolTest.java:103.
10. ES-0111, RU-0101, IT-0061: testConfusionSetLoading sub-check belongs to later items ES-0099, RU-0096, IT-0049.
11. "semantics:" notes: default-locale toLowerCase in it/es/ru/pl DateCheckFilters/DateFilterHelpers; Calendar getDisplayName ru/pl/UK (JDK17 CLDR, oracle fixture); (float)10E12/10E18 ES-0050 (Math.fround); HashSet order ES-0029, PL-0033, RU-0028; Locale.FRANCE week rules ES-0044; koi8-r / iso-8859-2/-15 dict encodings RU-0080..0084, SL-0030, IT-0040/0043.
