# I01 eval baseline (de-DE, 2026-10-22)

Corpus: tests/eval/de, with 60 texts (6195 words, 15 of them control texts).
Runner: `node tests/eval/run.mjs --engine java|js --lang de-DE [--level picky]`.
Java and JS give identical results (129/129 default, 130/130 picky). Default and picky also score the same.

| Type | Gold | Found | Flagged-only | Missed | False alarms | Recall | Precision |
|---|---|---|---|---|---|---|---|
| das_dass | 75 | 33 | 4 | 38 | 0 | 44.0% | 100% |
| comma_missing | 98 | 56 | 2 | 40 | 0 | 57.1% | 100% |
| comma_superfluous | 22 | 10 | 0 | 12 | 0 | 45.5% | 100% |
| other | 12 | 10 | 0 | 2 | 7 | 83.3% | 58.8% |

Top missed patterns:
- das->dass after verbs of saying, thinking or perceiving (16)
- missing comma closing a fronted subordinate clause (10)
- das->dass after a noun, adjective or "es" construction (9)
- superfluous comma before und/oder joining two verbs with the same subject (6)
- indirect question (6)
- infinitive group (6)
- closing comma after an embedded relative clause (5)
- "das das" (4)
- "dass" used as relative pronoun (4)
- relative clause der/die (4)
- so ..., das (2)
- sentence-initial "Das" (2)
- others
Details: tests/eval/results/*.json, details.missed.
