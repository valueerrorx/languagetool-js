# F18 critic log
Verdict: REVISE
Findings (see final report): 
1. Spec silent on call sites: TextChecker.detectLanguageOfString runs on EVERY request (also explicit language) -> JSON detectedLanguage{name,code,confidence,source} (RuleMatchesAsJsonSerializer:171-178); preferredVariants loop + BadRequest texts (TextChecker:1010-1027); forcePreferredLanguages (V2TextChecker:106); noopLanguages only with auto (TextChecker:472); IllegalArgumentException from prepareDetectLanguage (variant in preferredLanguages) path to HTTP status.
2. CLI -adl: Main.java:176-183,239 (per line with --line-by-line?), null -> en-US message.
3. Missing: getDetectedLanguageScores(count>1) rounding (Math.round*100/100f), fasttext newScore formula not reachable (DEV-001), ForeignLanguageChecker uses getInitialized (ForeignLanguageChecker:61), SimpleLanguageIdentifier needs spellers (local API mode), LanguageAnnotator needs VagueSpellChecker (LanguageAnnotator:68) -> both speller dependent; LanguageAnnotatorTest is in languagetool-standalone.
4. DEV-006 reference: restricting only Languages.get() ; CommonWordsDetector static es/ca/pt (CommonWordsDetector:41-43) resolve via getLanguageForShortCode -> null if list is restricted before class init; word2langs built from Languages.get() so es/ca/pt words also missing, and esLang etc null -> NPE-free? (map key null) ; Spec must state which of getLanguageCodes/CommonWords/noop/getLanguageForShortCode(additionalLangs) results are compared. Unicode additionalLangs (ru, zh...) make Java full-set return Noop lang with code of dominant script, port restricted differs -> user visible: decide.

## Round 2
R0-R6 resolve fixes 1-4 and implement D-051/DEV-008. Nit: R2 says "PLAN note on F20 / F67" but PLAN notes are on F69 (and F46/F64); no F20/F67 note. Verdict: APPROVED (fix R2 wording).
