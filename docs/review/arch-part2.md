# Critic arch part 2 (PORT-MAP coverage, SEMANTICS, step order) -> REVISE minor (saved by lead)
1. PORT-MAP: add full ID->step index (all 808 wave-1 todo IDs; 193 currently hidden behind "first 8 ..." truncation, e.g. 46 CLI IDs) incl. a "non-class IDs" table (resources, config, regex, logging, test-support) with owning step. Regenerate by script from inventory files.
2. CLI classes: emit full ID lists.
3. CORE-0360..0364, 0367 -> S1 (regex translator); CORE-0371 -> S4 (morfologik).
4. DE-0015, FR-0014 (MessagesBundle) -> S3 ResourceBundle; CORE-0336 (logging) -> S2.
5. Cyclic-import policy: S3 classes (NoopLanguage, LanguageBuilder, DynamicLanguage, DynamicHunspellLanguage, Tools, Language) may reference later-step classes only lazily inside method bodies (no top-level instantiation), or move them to S5/S5/S6/S7. Decide one.
6. SEMANTICS P3: String.trim() (<= U+0020) with helper name.
7. P3: String.split edge cases "" -> [""], "a,,b", trailing empties removed.
8. P3: literal String.replace vs regex replaceAll trap (note: DE-0031 line.replace("#.*","") is a no-op because CachingWordListLoader already strips comments, see lang-de.md R2 correction; the general trap stays).
9. New rule: Language#getLocale() for AmericanReplaceRule/BritishReplaceRule/NewZealandReplaceRule new Locale("en-US") etc. = malformed single-language locale (language "en-us"), not en_US; Locale.js constructor semantics; lowercasing/formatting must not treat it as en_US.
10. Lib table: hankcs AhoCorasick parseText hit order oracle-verified (CORE-0449). S9 note: EN BeoLingus rows verified after S10.
