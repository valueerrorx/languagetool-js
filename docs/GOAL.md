# Ziel: LanguageTool von Java nach JavaScript portieren

## Auftrag
Das bestehende Java-Tool (Pfad und Commit in CLAUDE.md) wird vollständig nach JavaScript portiert. Die finale Java-Version ist die Spezifikation. Ziel ist **absolute Feature-Parität**: Der Port kann exakt dasselbe wie das Original und liefert für jede Eingabe dasselbe Ergebnis.

## Was das Tool macht
LanguageTool ist eine Grammatik-, Stil- und Rechtschreibprüfung. Sie arbeitet mit XML- und Java-Regeln, Tokenizern, POS-Taggern, Disambiguierung und Wörterbüchern (morfologik, hunspell). Portiert werden der Core, die Kommandozeile (languagetool-commandline) und der HTTP-Server (languagetool-server, /v2/... API). Sprachen: de (inkl. de-AT), en, fr, it, es, sl, ru, sk, pl (D-003).

## Ziel-Plattform
Express-Server auf Node.js (ESM), dazu die CLI. Keine GUI (D-002, D-004).

## Parität bedeutet
- Alle Funktionen, Optionen, Einstellungen und Dateiformate des Originals sind vorhanden.
- Gleiche Eingabe ergibt gleiche Ausgabe: Text byte-genau (inkl. Whitespace, Zeilenenden, Zahlenformat), gleiche Dateien, gleiche Exit-Codes, gleiche Fehlermeldungen.
- Dateien, die das Java-Tool erzeugt, kann der Port lesen, und umgekehrt.
- Bugs und Eigenheiten des Originals werden mitportiert. Offensichtliche Bugs dürfen gefixt werden, aber nur nach Einzelfreigabe in docs/DEVIATIONS.md (D-007).
- HTTP-API byte-genau, inklusive JSON-Key-Reihenfolge (D-006).
- Keine neuen Features, keine "Verbesserungen", nichts weggelassen.
- Alle bestehenden JUnit-Tests werden 1:1 portiert und sind grün.

## Bekannte Besonderheiten
Referenz-JDK 17 (D-008). Binäre Wörterbücher (morfologik .dict, hunspell) werden als Daten übernommen. ngram/Lucene, fastText, ONNX/neuronale Modelle und Remote-Rules sind zurückgestellt (D-005).

## Nicht-Ziele
- Kein Refactoring des Verhaltens, keine neue Architektur-Idee, keine Performance-Optimierung über das Original hinaus.
- Standalone-GUI, Office-Extension und nicht gewählte Sprachen (D-002, D-003).

## Abnahme
- Jede ID in docs/INVENTORY.md hat Status `verified`.
- `npm test`, `npm run lint` und `npm run parity` grün.
- End-to-End-Differenzlauf Java vs. JS mit realen Szenarien ohne Unterschied.
- docs/DEVIATIONS.md enthält nur von mir genehmigte Einträge.
- Unabhängiger Abschluss-Scan des Java-Codes findet kein fehlendes Feature.
- nicht das code repository ist das ziel sondern die finale app  auch zu finden unter ../LanguageTool-6.9-SNAPSHOT/
