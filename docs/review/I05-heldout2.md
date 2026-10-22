# I05: blind held-out set de-heldout2 (das/dass)

Blind set for the das/dass rule layer. Rule developers must not read `tests/eval/de-heldout2/src/` or the per-text JSON.
This report gives counts only, never individual missed errors.

## Corpus
- `tests/eval/de-heldout2/` (60 texts, IDs h2-001..h2-060, 8679 words, 6 control texts), sources in `src/corpus-1..6.txt`, same markup as de-heldout.
- Genres: emails (business, private, school, university, HR), forum posts, chats (incl. lowercase gaming chat), school essays (argumentative, narrative, book report, poem analysis, letter to the editor), news, technical docs (install guide, API, wiki, manual, release notes), recipe, blog, fiction (incl. crime, children's story).
- Gold: 176 das/dass errors (134 das->dass, 42 dass->das), 355 das/dass negatives (relative, article, demonstrative, correct dass; many after verbs of saying/thinking, after `Gefühl/Problem/Glück` + correct dass, `statt das X zu`, absolute accusative after comma, `das heißt`). No comma or other errors annotated.
- Build: `node tests/eval/build-corpus.mjs --lang de --dir de-heldout2` (--check passes).

## Results (default level)
Runs: `node tests/eval/run.mjs --engine <e> --lang de-DE --dir de-heldout2 --port 1984x --out tests/eval/results/heldout2-de-DE-<name>.json`

| run | gold | found | flagged-only | missed | false alarms | recall | recall(flagged) | precision |
|---|---|---|---|---|---|---|---|---|
| java | 176 | 61 | 4 | 111 | 1 | 34.7% | 36.9% | 98.5% |
| js-off (LTJS_EXTRA_RULES=0) | 176 | 61 | 4 | 111 | 1 | 34.7% | 36.9% | 98.5% |
| js-ltjs (default) | 176 | 128 | 3 | 45 | 1 | 72.7% | 74.4% | 99.2% |

Other types (no gold): comma_missing 2 false alarms, other 2 false alarms, the same in all three runs.
js-off is identical to Java (same 130 matches).

## Recall by subcategory (found / gold)
| subcategory | gold | java = js-off | js-ltjs |
|---|---|---|---|
| das->dass after verb/adjective + comma | 97 | 34 | 78 |
| das->dass after noun (Tatsache, Gefühl, Problem, ...) | 12 | 4 | 8 |
| das->dass after ohne / anstatt | 7 | 0 | 0 |
| das->dass sentence-initial (Das -> Dass) | 11 | 8 | 10 |
| das->dass so ADJ, dass | 3 | 2 | 3 |
| das->dass "so das" -> sodass | 4 | 2 (+1 flagged) | 3 |
| dass->das relative pronoun | 28 | 5 | 20 |
| dass->das demonstrative, sentence-initial | 10 | 5 (+3 flagged) | 5 (+3 flagged) |
| dass->das demonstrative after comma / lowercase start | 4 | 1 | 1 |

Subcategories are assigned automatically from the left context of each gold error.

## False alarms
- LTJS_* rules: none. All 67 LTJS matches hit gold errors (VERB 40, RELATIVPRONOMEN 15, NOMEN 5, SATZANFANG 2, DAS_DAS 2, SO_ADJ_DASS 1, SODASS 1, ADJ 1).
- das/dass false alarm (all runs, Java rule): GERMAN_WORD_REPEAT_RULE on a correct "verstärkt das das Problem" (h2-021).
- Other false alarms (all runs, Java rules): KOMMA_DASS on a negative "das" (h2-029), SUBJUNKTION_KOMMA_2 on a verbless quoted fragment (h2-027), 2x GERMAN_SPELLER_RULE on names/quoted strings (h2-010 control, h2-056 control).

## Weak spots (counts only)
- ohne/anstatt + das: 0/7 in all runs.
- dass->das demonstrative: 6/14 found (+3 flagged-only), the LTJS layer adds nothing here.
- dass->das relative: 8/28 still missed with LTJS.

## Notes
- The js-ltjs run used the working tree as it was on 2026-10-22 around 23:55, including uncommitted changes in `src/lang/de/ltjs/DasDassRules.js` and `DasDassTools.js` made by another session.
- Gold total is 176 errors, more than the planned ~150.
