# Fehler-Suite

Testtexte in aktueller Rechtschreibung mit absichtlich gesetzten und markierten Fehlern, vor allem Grammatik. Die Suite zeigt, welche Fehler LanguageTool findet und welche nicht. Gegen eine Baseline gemessen erkennt sie, ob eine Regeländerung etwas verbessert oder verschlechtert hat.

## Aufbau

- `de/texts.txt`, `en/texts.txt`: die Texte. Fehler sind markiert als `{{falsch=>richtig|typ}}`; weitere richtige Varianten mit `;;` (`{{falsch=>richtig;;variante|typ}}`). Kopfzeile pro Text: `### <id> | <sprache> | <genre>`, z. B. `### de-g03 | de-AT | Forumsbeitrag`.
- Alles außerhalb der Markierungen muss korrekt sein. Die korrigierte Fassung (alle Fehler ersetzt) wird mitgeprüft: jeder Treffer dort ist ein Fehlalarm.
- `de-blind/texts.txt`: BLINDER Satz (50 Texte, 398 Fehler, 5 Kontrolltexte), getrennt von der Regelentwicklung geschrieben. Wer Regeln baut, liest ihn nicht und schreibt keine Regeln nach seinen Fehlern; er dient nur zum ehrlichen Messen. Aufruf mit `--set de-blind`, die Ausgabe zeigt dann nur Zahlen (keine Wörter, keine Fundstellen).
- Texte ohne Markierung sind Kontrolltexte (z. B. `de-k02` mit österreichischem Wortschatz).
- `baseline/<config>.json`: gespeicherter Stand pro Konfiguration (Erkennungsstufe je Fehler, bekannte Fehlalarme).
- Typen Deutsch: kongruenz, kasus, subjekt_verb, verbform, pronomen, vergleich, verwechslung, gross_klein, getrennt_zusammen, rechtschreibung, wiederholung, ausdruck, das_dass, komma. Englisch: agreement, verb_form, pronoun, confusion, article, comparison, preposition, capitalization, spelling, word_choice, repetition.

## Erkennungsstufen

- `exact`: ein Vorschlag ergibt genau die Korrektur
- `flagged`: eine Grammatik-/Stilregel markiert die Stelle, aber ohne passenden Vorschlag
- `speller`: nur die Rechtschreibprüfung markiert die Stelle (z. B. „mehreres" als Tippfehler statt Kongruenzfehler)
- `missed`: nicht gefunden

## Aufruf

LT-JS läuft im selben Prozess (`check()` aus `src/index.js`), Java über seinen HTTP-Server. Auf Rechnern mit wenig RAM ggf. `NODE_OPTIONS=--max-old-space-size=2048` setzen.

```bash
npm run suite -- --lang de                                 # Kurzform
node tests/eval/suite/run.mjs --lang de                    # LT-JS mit LTJS-Regelschicht
node tests/eval/suite/run.mjs --lang de --ltjs off         # ohne LTJS-Regelschicht (= Java-Verhalten)
node tests/eval/suite/run.mjs --lang de --engine java      # Java-Original (Pfad wie tests/eval/run.mjs, LTJS_EVAL_JDK / LTJS_EVAL_LT überschreiben)
node tests/eval/suite/run.mjs --lang de --type kasus,kongruenz --verbose
node tests/eval/suite/run.mjs --lang de --update-baseline  # Baseline neu schreiben (nur nach bewusster Prüfung!)
node tests/eval/suite/run.mjs --set de-blind               # blinder Satz, nur Zahlen
```

Ausgabe: Tabelle pro Typ, Liste der nicht erkannten Fehler, Fehlalarme, Vergleich mit der Baseline; Rohdaten in `tests/eval/results/suite-<config>.json`. Exit-Code 1 bei Verschlechterung (ein Fehler wird schlechter erkannt als in der Baseline, oder ein neuer Fehlalarm).

## Arbeitsweise für neue Regeln

1. Suite laufen lassen, nicht erkannte Fehler ansehen.
2. Regel bauen, Suite erneut laufen lassen: Verbesserungen werden aufgelistet, Verschlechterungen lassen den Lauf scheitern.
3. Zusätzlich `--set de-blind` laufen lassen: keine Verschlechterung, keine neuen Fehlalarme. Der blinde Satz zeigt, ob die Regel über die Entwicklungstexte hinaus trägt.
4. Erst wenn es keine Verschlechterung gibt, Baseline mit `--update-baseline` aktualisieren und mit committen.
5. Neue Testfälle in `de/texts.txt` ergänzen (nie in `de-blind/`) (bestehende IDs nicht umbenennen: der Baseline-Schlüssel ist `<text-id>:<falsch>=><richtig>`).
