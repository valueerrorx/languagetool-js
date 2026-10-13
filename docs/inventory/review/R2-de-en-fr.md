# Critic round 2: de/en/fr -> REVISE, small fixes applied by lead (DE-0003/0031/0078/0090/0102 notes). Treated as APPROVED.
Pending for core.md (after core revision agent finishes):
- New core ID: com.hankcs AhoCorasickDoubleArrayTrie 1.2.2 library port (build from LinkedHashMap, parseText hit order begin/end/value); users: core AbstractDashRule (CORE-0273), DictionarySpellMatchFilter, EN-0058 EnglishDashRule, DE-0078 OldSpellingRule/SpellingData, pl/ru dash rules.
- New core ID (todo, D-028): LanguageWithModel.java:42-43 stderr "WARN: ngram index dir <dir> not found for <Language>" once per instance (noLmWarningPrinted compareAndSet) when LM dir given without <code> subdir.
