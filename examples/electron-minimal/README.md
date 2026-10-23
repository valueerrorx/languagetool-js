# electron-minimal

LanguageTool (LT-JS) in einem Electron-Utility-Process, ueberwacht vom Main-Prozess.

- `checker-process.js`: laedt `@valueerror/ltjs-core`, waermt pro Sprache mit einer Dummy-Pruefung auf (`LTJS_WARMUP`), meldet dann `ready`; beantwortet `check` und `ping`.
- `lt-client.js`: `createLtClient({ languages, timeoutMs, maxOldSpaceMb, restartDelayMs, maxRestarts })` mit `start()`, `check()`, `ping()`, `restart()`, `stop()`, `status()` und Events `ready`, `exit`, `restart`, `error`.
- `main.js`: Start, Pruefung, `restart()`, Pruefung, Stop.

## In eine App kopieren

1. `lt-client.js` und `checker-process.js` in die App kopieren, `@valueerror/ltjs-core` und die Sprachpakete installieren (siehe `docs/EMBEDDING.md`).
2. Im Main-Prozess `createLtClient({ checkerPath, languages: ['de-DE'] })` aufrufen, `await lt.start()` beim App-Start, danach `lt.check(text, { language })`.
3. Pakete muessen ausserhalb von `app.asar` liegen, z. B. electron-builder: `"asarUnpack": ["node_modules/@valueerror/**", "checker-process.js"]` (die Ressourcen werden mit `fs` gelesen, der Utility-Process wird aus einer echten Datei gestartet).

## Restart und Neuinitialisierung

- Haengt eine Pruefung laenger als `timeoutMs`, wird sie mit `Error('timeout')` abgelehnt und der Prozess neu gestartet.
- `restart()` beendet den Prozess und startet einen frischen (Daten und Regeln werden neu geladen, z. B. nach `resources:update`); offene Anfragen werden mit `Error('restarted')` abgelehnt.
- Stuerzt der Prozess ab (z. B. Speichermangel), startet der Client ihn nach `restartDelayMs` neu; offene Anfragen werden abgelehnt. Nach `maxRestarts` Abstuerzen innerhalb von 60 s wird aufgegeben und `error` gemeldet.
- `stop()` beendet den Prozess ohne Neustart.
