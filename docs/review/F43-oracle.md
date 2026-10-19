# F43 oracle (X-HUNSPELL)
Status: DONE (15 cases, golden 1.2M, ~170 requests). `npm run oracle -- X-HUNSPELL`; `npm run parity -- X-HUNSPELL`. Generator `node oracle/scripts/gen-cases-spellrule.mjs` (shared with X-SPELLRULE). Compare: jsonl, normalize `paths`. Env: pinned oracle env (native Hunspell via the original dumonts library works in the sandbox; results are deterministic).
Java: oracle/harness/src/ltjs/oracle/HunspellOps.java (ops `hs-dict`, `hs-rule`) plus SpellRuleOps sr-check/sr-word for German rules.
- hs-dict {language, prefix? | dic+aff, words, sugg?, add?}: Hunspell.forDictionaryInResources -> spell/suggest per word (add() persists in the cached dictionary within the case); load errors recorded (missing dic/aff, wrong files, empty/null language, unknown language, en dir without hunspell dic).
- hs-rule {lang, id, words, sugg}: GermanSpellerRule / Austrian / Swiss (CompoundAwareHunspellRule) isMisspelled + getSuggestions.
Cases: dict-{de-DE,de-AT,de-CH} (corpus tokens, seeded typos, case variants, compounds, hyphen/umlaut/long/emoji specials), rule-{de-DE,de-AT,de-CH}, words-{de-*} (ignore.txt/prohibit.txt/spelling.txt/variant lists, ignore logic), check-{de-*} (corpus sentences with typos), check-special-de-DE (URLs, compounds, hyphens, user words, ignore/accept lists, levels/modes), dict-errors, fr-probe.
## UNORACLED
- French Hunspell: fr has no hunspell .dic (Morfologik speller instead, fixtured in X-SPELLRULE); fr-probe records the Java error.
- HunspellRule (plain, non-German) match output: only German rule classes use it in de/en/fr; other languages (pt, es, ...) not in scope.
- Hunspell temp-file TRACE logs and the `Could not read aff/ignore file` ERROR logs (not captured).
## Parity state
No adapters (src not ported): all 15 cases NOT PORTED.
