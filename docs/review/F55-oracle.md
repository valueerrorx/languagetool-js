# F55 oracle (X-DERULES-AC, case-*)
Status: DONE (same ID as F54; DE_CASE 539 matches). `npm run oracle -- X-DERULES-AC`. Env/compare as F54. Ops: `replace-check` mode `rules`, ids [DE_CASE], DEFAULT and PICKY; names op of `lang-deagree` for DE-0132.
Cases (de-DE/de-AT/de-CH): case-test-<v> (CaseRuleTest literals), case-targeted-<v> (about 110 hand-written capitalisation errors/good forms), case-antipatterns-<v> (CaseRuleAntiPatterns token lists), case-exceptions-<v> (literal entries of case_rule_exceptions.txt in 4 sentence frames, original and lower-cased) + case-exceptions-patterns (alternation entries, first alternative), case-eigennamen-<v> (eigennamen_gross.txt), case-languagenames-<v> (LanguageNames x 16 frames, capital/lower), case-corpus-<v> + case-corpus-wide (corpus clean and with injected case changes), combined-de-DE (agreement + case together).
## UNORACLED / notes
- Regex-class entries of case_rule_exceptions.txt (character classes, wildcards) are not instantiated; covered only indirectly by corpus.
- Antipatterns only where the token list resolves to plain words.
