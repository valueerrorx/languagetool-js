# F46 oracle (X-ENSPELL)
Status: DONE (87 cases, 170 requests, golden 14M). `npm run oracle -- X-ENSPELL`; `npm run parity -- X-ENSPELL`. Generator `node oracle/scripts/gen-cases-enspell.mjs` (also writes X-ENREPLACE; wipes both case dirs; seeded PRNG, sha-ordered picks). Compare: jsonl, normalize `paths`. Env: pinned oracle env (TZ Europe/Vienna, JDK 17, en/US, UTF-8, fixed clock).
Reused (not duplicated): X-SPELLRULE words-*/check-*/check-special-*/check-user-* (sr-check, sr-word on en-US/GB first 120 corpus sentences, specials, user words, ignoreTokens, acceptPhrases). This ID adds the slices and areas below.
Java: oracle/harness/src/ltjs/oracle/EnSpellOps.java, op `enspell-misc` (Harness.java dispatch + probe mapper prefix `enspell-`). Other ops reused: sr-check, sr-word, sr-misc.
- enspell-misc kind prepare {lang, lines}: Language#prepareLineForSpeller (en, en-GB; de as contrast) (EN-0006).
- kind inflect {cases:[{token,tag}]}: package-private Inflector#inflect and #inflectSingleWord by reflection, 34 tokens x 25 German tags incl. null/empty/multiword (EN-0121).
- kind beolingus {lines, ops, missingFile?}: lines are written to a temp file, `new BeoLingusTranslator(File)` (no singleton), ops translate/split/splitAtSemicolon/clean/suffix, deEnSize, message, DataSource fields; translation goes through the real German tagger + Inflector (EN-0081, EN-0120). kind instance: getInstance(null) / getInstance(GlobalConfig without file) -> null.
- kind dynamic {name, code, dict?, noInfo?, missingDict?, cases}: package-private DynamicMorfologikLanguage over en_US/en_GB/en_AU .dict(+.info) copied to a temp dir; active rule `<CODE>_SPELLER_RULE`, matches via CheckPipeOps.runCase (EN-0221).
- sr-misc multitoken lang en/en-GB/en-AU: EnglishMultitokenSpeller suggestions for multiwords.txt / spelling_global.txt entries plus typos/case variants (EN-0028).
Cases: misc-prepare, misc-inflect, misc-beolingus-{test,own,errors}, misc-dynamic, misc-multitoken-en; variant-<v>-00..02 + variant-words-<v> for the 6 variants (en-US-GB.txt pairs in sentences, word-level suggestions; EN-0043..0049, EN-0176); topsugg-en-US-00..05 (every key of getTopSuggestions/IgnoreCase in a sentence), topsugg-words-en-US, topsugg-case-en-US, topsugg-<v> (other 5 variants); lists-<v>-NN + lists-words-<v> (prohibit/prohibit_custom, ignore, spelling/spelling_custom, spelling_<v>.txt words; EN-0180..0182, EN-0040); corpus-<v>-00..01 (127 unseen corpus sentences with seeded typos); special-<v> (hyphens, contractions, case, digits, do-not-suggest words, DEFAULT and PICKY).
Findings: BeoLingusTranslator error paths (item count mismatch IOException, missing " :: " ArrayIndexOutOfBounds, missing file NoSuchFileException) are recorded as Java behaviour. Most en-US-GB pairs are accepted by the GB dict, so only a few sentences yield "is American English" messages.
## UNORACLED
- BeoLingus-driven suggestions inside spelling matches: core MorfologikSpellerRule hard-codes `translator = null` (EN-0081), so only the translator class itself is oracled.
- EN-0080 NER filter (needs BaseLanguageModel/ngram data, not in build).
- BeoLingusTranslator.getInstance(GlobalConfig with file) singleton: not driven (the JVM-wide singleton would couple cases); constructor used instead.
- SuggestionsChanges/ML-ranked suggestions (never initialised in the pinned build).
## Parity state
sr-check/sr-word/sr-misc cases run against existing adapters; `enspell-misc` has no adapter (NOT PORTED). Run `npm run parity -- X-ENSPELL` for the current state.
