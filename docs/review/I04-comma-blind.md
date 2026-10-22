# I04: blind held-out set de-comma-blind (comma errors)

Blind set for comma rule work. Rule developers must not read `tests/eval/de-comma-blind/src/` or the per-text JSON.
This report gives counts only, never individual missed errors or example sentences.

## Corpus
- `tests/eval/de-comma-blind/` (60 texts, IDs cb-001..cb-060, 7712 words, 4 control texts), sources in `src/corpus-1..6.txt`, same markup as de-heldout / de-heldout2.
- Genres: chats (friends, siblings, parents group, study group, work team), e-mails (business, supplier, complaint, HR, university, neighbour, private, invitation, doctor's office, teacher to parents, airline), forum posts (gardening, gaming, parenting, cars, cooking), school essays (argumentative, narrative, book report, discussion, poem analysis, letter to the editor), news (fire, local politics, sports, science, weather, culture), press release, technical docs (driver install, REST API, user manual, merge-request workflow, safety instructions), recipe, travel and fitness blog, product review / description, fiction (lighthouse, crime, dialogue, children's story, short story), meeting minutes, job application, volunteer instructions.
- Gold: 241 comma_missing, 83 comma_superfluous, 255 comma negatives (correct comma or correct no-comma spots, many tricky: same-subject `und`, `als`/`wie` + noun, closing commas, correlates, `zwar ..., aber`, `ohne dass`, reporting clauses after quotes), 34 optional spots (`[[..|opt]]`: bare infinitive groups without correlate, `und`/`oder` between main clauses, fronted participle group, closing date comma). No das/dass or other errors annotated.
- Rules: amtliche Regelung (2024); only unambiguous cases annotated as errors, everything with a legitimate choice marked optional.
- Build: `node tests/eval/build-corpus.mjs --lang de --dir de-comma-blind` (--check passes). 10 texts are slightly under 120 words (97-119); all are within the validator range 80-250.

## Results (default level)
Runs:
- `node tests/eval/run.mjs --engine java --lang de-DE --dir de-comma-blind --port 19860 --out tests/eval/results/heldout-comma-de-DE-java.json`
- `LTJS_EXTRA_RULES=0 node tests/eval/run.mjs --engine js --lang de-DE --dir de-comma-blind --port 19861 --out tests/eval/results/heldout-comma-de-DE-js-off.json`

| run | type | gold | found | flagged-only | missed | false alarms | recall | recall(flagged) | precision |
|---|---|---|---|---|---|---|---|---|---|
| java | comma_missing | 241 | 138 | 7 | 96 | 0 | 57.3% | 60.2% | 100.0% |
| java | comma_superfluous | 83 | 12 | 0 | 71 | 0 | 14.5% | 14.5% | 100.0% |
| js-off | comma_missing | 241 | 138 | 7 | 96 | 0 | 57.3% | 60.2% | 100.0% |
| js-off | comma_superfluous | 83 | 12 | 0 | 71 | 0 | 14.5% | 14.5% | 100.0% |

- js-off is identical to Java: 186 matches each, raw matches identical in all 60 texts.
- No match on any of the 255 negatives or 34 optional spots; 0 false alarms in the 4 control texts.
- Unscored non-comma matches (both runs, same): 20 (speller on names/code identifiers/English words, word repeat, question-mark style, `Mach ich`, compound infinitive, weekday check, repeated-word style). 7 suggestion-less SUBJUNKTION_KOMMA_2 matches counted as duplicates of gold errors already scored in the same sentence.

## Recall by subcategory (found, +flagged-only; java = js-off)
| subcategory | gold | found |
|---|---|---|
| cm A: fronted subordinate / conditional clause, comma before main verb | 61 | 38 (+3) |
| cm B: before subordinating conjunction (dass/weil/ob/wenn/als/bis/...) | 63 | 50 |
| cm C: before relative clause (incl. preposition + relative) | 38 | 18 (+1) |
| cm D: closing comma after embedded clause / apposition | 11 | 4 |
| cm E: indirect question (w-word) | 15 | 4 (+1) |
| cm F: infinitive group with um/ohne/statt/anstatt | 13 | 11 |
| cm G: infinitive group with correlate or noun | 6 | 4 |
| cm H: adversative aber/sondern | 10 | 1 |
| cm I: apposition (opening comma) | 2 | 0 |
| cm J: address / interjection | 7 | 0 |
| cm K: comparison clause (als/wie + clause) | 2 | 0 |
| cm L: je ... desto | 2 | 2 |
| cm M1: quote / reporting clause | 4 | 3 |
| cm M2: asyndetic main clauses / denn | 4 | 0 (+2) |
| cm M3: indirect speech without conjunction | 2 | 2 |
| cm M4: und zwar | 1 | 1 |
| cs S1: before und/oder/sowie (same subject, list) | 48 | 1 |
| cs S2: between subject and finite verb | 18 | 7 |
| cs S3: after fronted constituent (Vorfeld) | 8 | 3 |
| cs S4: inside verb phrase (before object / complement / infinite verb) | 7 | 0 |
| cs S5: before als/wie + non-clause | 2 | 1 |

Subcategories were assigned by a classifier over the gold corrections plus a manual override list (kept outside the repo).

## Weak spots (counts only)
- Superfluous comma before `und`/`oder` joining predicates with the same subject: 1/48.
- Adversative `aber`/`sondern`: 1/10. Address/interjection: 0/7. Indirect questions: 4/15.
- Relative clauses: 18/38; closing commas after embedded clauses/appositions: 4/11.
- Superfluous comma inside the verb phrase: 0/7.

## Notes
- No other results file changed. `src/lang/de/ltjs/KommaTools.js` was untracked in the working tree during this work (not created here); the js-off run does not load the LTJS layer, so it does not affect these numbers.
- Nothing committed.
