# LT-JS

LT-JS ist ein Port von [LanguageTool](https://languagetool.org) 6.9-SNAPSHOT (Java, Commit `9b0be9db8cb4589cd031e85bd929c95c8ce57e49`) nach JavaScript (ES-Module, Node.js >= 24) für neun Sprachen: de, en, fr, it, es, sl, ru, sk, pl.
Die Schnittstellen sind kompatibel: Kommandozeile wie `languagetool-commandline`, HTTP-Server mit `/v2/check`-API wie der LanguageTool-Server, dazu eine JS-API.
Mit abgeschalteter LTJS-Regelschicht ist das Ergebnis identisch zu Java, geprüft mit Golden-Fixtures aus echten Java-Läufen.

LT-JS ist ein Port des Open-Source-Projekts [LanguageTool](https://languagetool.org) ([GitHub](https://github.com/languagetool-org/languagetool)); alle Regeln, Wörterbücher und die Logik stammen aus diesem Projekt und seiner Community.

## Installation und Nutzung

```bash
npm install
```

Kommandozeile (Optionen wie beim Java-Original):

```bash
node bin/lt-cli.mjs -l de-DE text.txt
```

HTTP-Server (Standard-Port 8081, Option `--port`):

```bash
node bin/lt-server.mjs --port 8081
curl localhost:8081/v2/check --data-urlencode "text=Ich glaube, das es geht." -d language=de-DE
```

JS-API:

```js
import { check, startServer, listLanguages } from './src/index.js';

const result = await check('Ich glaube, das es geht.', {
  language: 'de-DE',          // oder 'auto'
  disabledRules: [],          // auch enabledRules, enabledCategories, disabledCategories, enabledOnly, level: 'picky', motherTongue
  extraRules: true,           // LTJS-Regelschicht (Standard), false schaltet sie ab
});
console.log(result.matches);  // /v2/check-JSON

const srv = await startServer({ port: 8081 });  // { port, host, server, close() }
```

Npm-Pakete: `@valueerror/ltjs-core` plus je Sprache `@valueerror/ltjs-lang-<code>`. `npm run build` erzeugt sie in `dist/packages` (Tarballs in `dist/tarballs/valueerror-ltjs-<name>-<version>.tgz`); `npm run smoke:packages` prüft sie, `npm run publish:packages -- --dry-run` simuliert die Veröffentlichung (veröffentlicht wird später).

## Verbesserungen gegenüber dem Original

- **LTJS-Regelschicht** (zusätzliche Regeln, Standard an; DEV-028, Code in `src/lang/de/ltjs/`):
  - 12 das/dass-Regeln: `LTJS_DAS_DAS`, `LTJS_DAS_DASS_VERB`, `LTJS_DAS_DASS_NOMEN`, `LTJS_DAS_DASS_ADJ`, `LTJS_SO_ADJ_DASS`, `LTJS_SODASS`, `LTJS_DASS_SATZANFANG`, `LTJS_DASS_RELATIVPRONOMEN`, `LTJS_DAS_DASS_KOMMA`, `LTJS_OHNE_DASS`, `LTJS_DASS_STATT_DAS`, `LTJS_DAS_DASS_OHNE_KOMMA`.
  - 10 Kommaregeln Deutsch: `LTJS_KOMMA_VORFELD`, `_NEBENSATZ`, `_RELATIVSATZ`, `_INFINITIV`, `_ABER`, `_NEBENSATZ_ENDE`, `_UND_PRAEDIKAT`, `_SUBJEKT_VERB`, `_PRAEPOSITIONALOBJEKT`, `_NACH_UND`.
  - Abschalten: Umgebungsvariable `LTJS_EXTRA_RULES=0`, `check(text, {extraRules: false})`, Server-Parameter `ltjsExtraRules=false`, einzeln über `disabledRules`.
- **Java-Bugs behoben** (15 Einträge DEV-013 bis DEV-027 in `docs/DEVIATIONS.md`), zum Beispiel:
  - DEV-013: `DifferentPunctuationRule` wirft bei Ziel `?` eine `IllegalArgumentException` (Exit 1 bzw. HTTP 500), jetzt ein normaler Treffer.
  - DEV-017: `YMDDateCheckFilter`/`DMYDateCheckFilter` enden immer in einer `NumberFormatException`, jetzt wird das Wochentagswort verglichen.
  - DEV-019/020: fehlender Wert bei `--level`, `--port` usw. gibt eine saubere Fehlermeldung statt `ArrayIndexOutOfBoundsException`.
  - DEV-021: `ruleValues` ohne Wert führt zu 400 mit Hinweis statt 500.
  - DEV-027: `ShortenedYearRangeChecker` mit einem einzelnen Zeichen stürzt nicht mehr ab.
- **Schneller und weniger Speicher** (Tabellen unten).
- **Kleinere Pakete:** 147 ungenutzte Ressourcendateien (8,5 MB) entfernt.

## Erkennung Deutsch

Blinde Testsets, beim Regelbau nie eingesehen (Recall; Precision in der Zeile darunter):

| Fehlerart | Fehler im Set | Java | LT-JS |
|---|---|---|---|
| das/dass (60 Texte) | 176 | 34,7 % | 78,4 % |
| fehlende Kommas (60 Texte) | 241 | 57,3 % | 77,2 % |
| überflüssige Kommas | 83 | 14,5 % | 56,6 % |

Precision: das/dass Java 98,5 %, LT-JS 99,3 %; Kommaregeln beide 100 %. Es gibt keine neuen Fehlalarme. Auf 1,67 Mio. Wörtern fehlerfreier Prosa treffen die das/dass-Regeln 2-mal (beide echte Fehler), die Kommaregeln 50-mal (49 echte Fehler, 1 alte Schreibweise vor 1901).

Entwicklungs-Sets (zum Tuning genutzt, daher optimistisch), Recall Java -> LT-JS:

| Set | das/dass | fehlende Kommas | überflüssige Kommas |
|---|---|---|---|
| dev (60 Texte) | 44,0 % -> 96,0 % | 57,1 % -> 93,9 % | 45,5 % -> 86,4 % |
| held-out (50 Texte) | 38,5 % -> 98,7 % | 69,2 % -> 94,2 % | 30,8 % -> 88,5 % |

Messung: `node tests/eval/run.mjs --engine java|js --lang de-DE --dir <set>`

## Geschwindigkeit

Faktor > 1 bedeutet LT-JS schneller (Quelle: `docs/review/F73-bench.md`, Node 24).

CLI-Einzelprüfung, Kaltstart, 3 Absätze, Median:

| Sprache | Java (ms) | Faktor |
|---|---|---|
| de | 7873 | 1,03x |
| en | 3621 | 1,25x |
| fr | 5169 | 1,03x |
| it | 1547 | 1,36x |
| es | 2644 | 1,51x |
| pl | 2424 | 1,28x |
| ru | 2169 | 1,10x |
| sk | 1958 | 1,18x |
| sl | 1626 | 1,42x |

Server warm (Durchsatz in Zeichen/s):

| Sprache | Java | LT-JS | Faktor | p50 Java -> LT-JS (ms) |
|---|---|---|---|---|
| de | 258 | 1757 | 6,81x | 865 -> 73 |
| en | 8506 | 8748 | 1,03x | 47 -> 44 |
| fr | 460 | 5604 | 12,18x | 1300 -> 85 |
| it | 2821 | 22313 | 7,91x (Messrauschen möglich) | |
| es | 9549 | 12318 | 1,29x | |
| pl | 2375 | 12801 | 5,39x | |
| ru | 2223 | 15716 | 7,07x | |
| sk | 2311 | 5408 | 2,34x | |
| sl | 3524 | 18219 | 5,17x | |

Speicher Server (RSS in MB):

| | Java | LT-JS |
|---|---|---|
| idle | 633 | 174 |
| nach Warm-up | 3154 | 1983 |
| Peak | 3189 | 2033 |

Eval-Lauf mit 60 deutschen Texten: Java ca. 57-67 s, LT-JS ca. 13-15 s.
Benchmark: `npm run bench [-- --paras N --passes N --out datei]` (braucht den Java-Build).

## Paketgrößen

npm-Tarball nach Entfernen ungenutzter Dateien, und entpackt:

| Paket | Tarball | entpackt |
|---|---|---|
| core | 3,0 MB | 11 MB |
| lang-de | 21,9 MB | 50 MB |
| lang-en | 15,5 MB | 26 MB |
| lang-es | 3,6 MB | 8,1 MB |
| lang-fr | 3,0 MB | 14 MB |
| lang-it | 0,8 MB | 1,6 MB |
| lang-pl | 6,6 MB | 12 MB |
| lang-ru | 6,0 MB | 11 MB |
| lang-sk | 2,7 MB | 4,5 MB |
| lang-sl | 0,3 MB | 0,6 MB |
| gesamt Tarballs | 61 MB | |

## Nicht portiert

N-Gramm-/Sprachmodell-Regeln, fastText, neuronale und Remote-Regeln sowie Premium-Funktionen (DEV-001). Das Verhalten entspricht Java ohne diese Konfiguration. Weitere Abweichungen: `docs/DEVIATIONS.md`.

## Tests und Parität

```bash
npm test
npm run lint
npm run parity                              # alle Golden-Fixtures, sehr aufwendig
LTJS_CASE='<regex>' npm run parity -- <ID>  # einzelner Fall
```

`npm run oracle -- <ID>` erzeugt Golden-Fixtures neu und braucht den Java-Build (siehe `CLAUDE.md`, `docs/inventory/BUILD.md`).

## Danksagung

- LanguageTool ([languagetool.org](https://languagetool.org), [GitHub](https://github.com/languagetool-org/languagetool)) ist freie Software unter LGPL 2.1 oder später. Die Grammatik- und Stilregeln, die Sprachlogik und die Wörterbücher stammen aus diesem Projekt und den Beiträgen seiner Community (Regel- und Wörterbuchpflege je Sprache).
- Mitgelieferte Wörterbuch- und Sprachdaten je Sprache (Lizenzen laut den Dateien in `resources/` und `packaging/licenses/`):
  - Deutsch: Part-of-Speech-Wörterbuch CC BY-SA 4.0, ursprünglich auf Basis von Morphy, Entwickler Daniel Naber. Rechtschreibung: Hunspell-Wörterbuch „frami“ (GPL v2 oder v3), basierend auf igerman98 von Björn Jacke, Erweiterung von Franz Michael Baumann; dazu die deutsche Wortliste von Jan Schreiber (gemeinfrei).
  - Englisch: Part-of-Speech-Wörterbuch LGPL 2.1, Entwickler Jaume Ortolà. Part Of Speech Database von Kevin Atkinson (Moby Part-of-Speech II und WordNet), Automatically Generated Inflection Database (AGID) von Kevin Atkinson, 12dicts von Alan Beale (gemeinfrei, mit Bitte um Namensnennung).
  - Französisch: Part-of-Speech-Wörterbuch CC BY-SA 4.0, Entwickler Jaume Ortolà, Daten laut POM-Angabe ursprünglich auf Basis von Morphy. Rechtschreibwörterbuch und Lexique von Olivier R. (Grammalecte), MPL 2.0.
  - Spanisch: LGPL 2.1, `spanish-dict-tools` von Jaume Ortolà.
  - Italienisch: Morph-it!, CC BY-SA 2.0 und LGPL.
  - Polnisch: Morfologik / PoliMorf von Marcin Miłkowski (BSD-Lizenz, 2 Klauseln); Rechtschreibwörterbuch aus sjp.pl (GPL, LGPL, MPL und CC-SA).
  - Russisch: Wörterbuch von AOT (www.aot.ru), LGPL; Konvertierung und Häufigkeitsdaten von Yakov Reztsov.
  - Slowakisch: Daten von Zdenko Podobný auf Basis des Slowakischen Nationalkorpus, LGPL; Rechtschreibprüfung aus dem Projekt sk-spell (GPL 2, LGPL 2.1 oder MPL 1.1 nach Wahl).
  - Slowenisch: Rechtschreibwörterbuch von Amebis d.o.o., Tomaž Erjavec, Aleš Košir und Primož Peterlin (LGPL/GPL). Ein Part-of-Speech-Wörterbuch mit eigener Quellenangabe ist in den Dateien nicht genannt.
- Spracherkennungsprofile (`resources/languages`): überwiegend von Nakatani Shuyo, im Projekt [optimaize/language-detector](https://github.com/optimaize/language-detector) weitergeführt (laut `resources/README.md`).
- LT-JS ist ein unabhängiges Projekt und weder mit der LanguageTool GmbH noch dem LanguageTool-Projekt verbunden oder von ihnen empfohlen.
- Die vollständigen Lizenztexte liegen in `resources/` bzw. im Ordner `licenses/` der Pakete.

## Lizenz

LT-JS steht unter GPL-3.0-or-later (siehe `LICENSE`). Es basiert auf LanguageTool (LGPL-2.1-or-later, Umstellung nach §3 der LGPL-2.1). Die Wörterbuch- und Sprachdaten behalten ihre eigenen Lizenzen (Ordner `licenses/` der Pakete).

## Ressourcen aktualisieren

Das Verzeichnis `resources/` (Regeln, Wörterbücher, Modelle) ist im Repository enthalten. Zum Ausführen von LT-JS wird daher kein Java und kein LanguageTool-Checkout benötigt.

Wenn LanguageTool (Java) verbessert wurde, werden die Daten so übernommen:

```
npm run resources:update -- --java /pfad/zu/languagetool [--build]
```

Ohne `--java` gelten die Umgebungsvariable `LTJS_JAVA_SRC`, dann `oracle/java-src`. Mit `--build` wird vorher per Maven gebaut (JDK 17 und `mvn` nötig). Das Skript erzeugt `resources/` neu, zeigt hinzugefügte, entfernte und geänderte Dateien je Sprache und warnt vor Java-Klassen (z. B. Filter in `grammar.xml`), die in LT-JS nicht portiert sind. Danach `npm test` und `LTJS_CASE=<id> npm run parity` ausführen. Die Golden-Fixtures stammen vom festgelegten Java-Commit, Abweichungen nach einem Update sind erwartet.
