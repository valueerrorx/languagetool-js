# Changelog

## 0.3.0

Browser build: the same packages run in a browser, Web Worker or WKWebView (iPad) without Node (docs/EMBEDDING.md, `examples/browser-minimal`).

- `@valueerror/ltjs-core` exports `src/browser-entry.js` for non-Node environments (also `@valueerror/ltjs-core/browser`); Node keeps the full API
- platform layer `#platform` (Node: fs/zlib/crypto, browser: fflate, SHA-256 in JS) and `#unicode-tables`; new dependencies `buffer`, `fflate`
- `preloadResources({ entries, hunspellWasm })` loads the resources into memory (manifest from `scripts/browser-manifest.mjs`); hunspell WASM is loaded lazily
- language packages are imported explicitly in the browser (no discovery); Node behaviour unchanged

German LTJS layer:

- `LTJS_FIELEN_VIELEN`: word confusion ('mit fielen Fehlern' -> vielen; Java finds it only with ngram data)

## 0.2.0

German LTJS layer (D-061): new rules beyond Java LanguageTool. All on by default; off with `extraRules: false`, `LTJS_EXTRA_RULES=0` or one by one via `disabledRules`.

- `LTJS_RELATIVPRONOMEN`: relative pronoun agrees with its antecedent ('Das Protokoll, den …' -> das)
- `LTJS_SUBJEKT_VERB`: subject-verb number agreement ('Die Ergebnisse ist …' -> sind)
- `LTJS_PRAEP_DATIV`, `LTJS_PRAEP_WECHSEL`: dative after prepositions ('nach die Matura', 'warten unter einen Baum')
- `LTJS_PERFEKT_SEIN`: perfect auxiliary sein/haben
- `LTJS_MEHR_WIE`, `LTJS_SO_ALS`, `LTJS_DESTO_JE`, `LTJS_W_DASS`, `LTJS_SEIT_SEID`: comparisons and expressions
- `LTJS_FIEL_VIEL`, `LTJS_WEN_WENN`: word confusions
- das/dass and comma: 'so wie' ends a dass clause, comma before a 'so wie' clause
- fewer false alarms of the LTJS rules on correct text (checked on 20,000 corpus sentences: 55 -> 6)

Tests: error suite `tests/eval/suite` (annotated German/English texts, blind German set, baseline regression check).

## 0.1.1

- Hotfix: case collision of `Strings.js` on macOS/Windows (D-067)

## 0.1.0

- First npm release: `@valueerror/ltjs-core` and `@valueerror/ltjs-lang-<code>`
