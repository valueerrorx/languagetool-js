# Ziel: LanguageTool von Java nach JavaScript portieren

## Auftrag
Das bestehende Java-Tool (Pfad und Commit in CLAUDE.md) wird vollständig nach JavaScript portiert. Die finale Java-Version ist die Spezifikation. Ziel ist **absolute Feature-Parität**: Der Port kann exakt dasselbe wie das Original und liefert für jede Eingabe dasselbe Ergebnis.

## Was das Tool macht
LanguageTool ist eine Grammatik-, Stil- und Rechtschreibprüfung. Sie arbeitet mit XML- und Java-Regeln, Tokenizern, POS-Taggern, Disambiguierung und Wörterbüchern (morfologik, hunspell). Portiert werden der Core, die Kommandozeile (languagetool-commandline) und der HTTP-Server (languagetool-server, /v2/... API). Sprachen: de (inkl. de-AT), en, fr, it, es, sl, ru, sk, pl (D-003).

## Ziel-Plattform
Express-Server auf Node.js (ESM), dazu die CLI. Keine GUI (D-002, D-004).

## Parität bedeutet (D-042..D-044)
- Funktionaler Port, kein 1:1-Klassenport. Interne Umsetzung frei, npm-Libraries erwünscht, wenn die Ergebnisse gleich sind.
- API- und CLI-Ergebnisse inhaltlich gleich wie Java: gleiche Matches, Offsets, Regel-IDs, Meldungen, Vorschläge in gleicher Reihenfolge, gleiche Felder. JSON-Formatierung, Zahlendarstellung, HTTP-Header, Logzeilen und Stacktraces sind egal.
- Nicht schlechter: Qualität (Regel-Testsätze, Korpora) und Performance (Benchmark gegen Java).
- Maßstab ist die Fehlererkennung (D-056): Der Port erkennt mindestens alles, was das Original erkennt, gern mehr/besser. Java-Bugs und Abstürze werden nicht nachgebaut, wenn es einen besseren Weg gibt; bessere Lösungen und besserer Code sind ausdrücklich erwünscht. Schnittstellen (API-Felder, CLI-Optionen, Ausgabeformate) bleiben kompatibel. Jede bewusste Abweichung von Java steht kurz in docs/DEVIATIONS.md, damit Golden-Diffs erklärbar bleiben.

## Bekannte Besonderheiten
Referenz-JDK 17 (D-008). Binäre Wörterbücher (morfologik .dict, hunspell) werden als Daten übernommen. ngram/Lucene, fastText, ONNX/neuronale Modelle und Remote-Rules sind zurückgestellt (D-005).

## Nicht-Ziele
- Keine neuen Features außerhalb von LanguageTool; Verbesserungen an bestehendem Verhalten sind erlaubt (D-056).
- Standalone-GUI, Office-Extension und nicht gewählte Sprachen (D-002, D-003).

## Abnahme
- Jede ID in docs/INVENTORY.md hat Status `verified`.
- `npm test`, `npm run lint` und `npm run parity` grün.
- End-to-End-Vergleich Java vs. JS (Regel-Beispielsätze, JUnit-Texte, Korpora) ohne inhaltlichen Unterschied, Benchmark erfüllt.
- docs/DEVIATIONS.md enthält nur von mir genehmigte Einträge.
- Unabhängiger Abschluss-Scan des Java-Codes findet kein fehlendes Feature.
- nicht das code repository ist das ziel sondern die finale app  auch zu finden unter ../LanguageTool-6.9-SNAPSHOT/
