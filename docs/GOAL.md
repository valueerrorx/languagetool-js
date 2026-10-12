# Ziel: <Toolname> von Java nach JavaScript portieren

## Auftrag
Das bestehende Java-Tool (Pfad und Commit in CLAUDE.md) wird vollständig nach JavaScript portiert. Die finale Java-Version ist die Spezifikation. Ziel ist **absolute Feature-Parität**: Der Port kann exakt dasselbe wie das Original und liefert für jede Eingabe dasselbe Ergebnis.

## Was das Tool macht
<2-5 Sätze: Zweck, Nutzer, Art (CLI / GUI / Library / Server)>

## Ziel-Plattform
<z. B. Node.js CLI | Electron + Vue 3 | npm-Library | Express-Server>
<Bei GUI: gleiche Screens, Felder, Reihenfolge, Texte, Validierung, Meldungen; Look darf modernisiert werden: ja/nein>

## Parität bedeutet
- Alle Funktionen, Optionen, Einstellungen und Dateiformate des Originals sind vorhanden.
- Gleiche Eingabe ergibt gleiche Ausgabe: Text byte-genau (inkl. Whitespace, Zeilenenden, Zahlenformat), gleiche Dateien, gleiche Exit-Codes, gleiche Fehlermeldungen.
- Dateien, die das Java-Tool erzeugt, kann der Port lesen, und umgekehrt.
- Bugs und Eigenheiten des Originals werden mitportiert, außer ich genehmige eine Abweichung (docs/DEVIATIONS.md).
- Keine neuen Features, keine "Verbesserungen", nichts weggelassen.
- Alle bestehenden JUnit-Tests werden 1:1 portiert und sind grün.

## Bekannte Besonderheiten
<optional: Locale/Zeitzone, Encoding, externe Libraries, Threads, Datenbanken, Netzwerk>

## Nicht-Ziele
- Kein Refactoring des Verhaltens, keine neue Architektur-Idee, keine Performance-Optimierung über das Original hinaus.
- <weitere>

## Abnahme
- Jede ID in docs/INVENTORY.md hat Status `verified`.
- `npm test`, `npm run lint` und `npm run parity` grün.
- End-to-End-Differenzlauf Java vs. JS mit realen Szenarien ohne Unterschied.
- docs/DEVIATIONS.md enthält nur von mir genehmigte Einträge.
- Unabhängiger Abschluss-Scan des Java-Codes findet kein fehlendes Feature.
