# Inventory (parity contract)

Index. Details per area in docs/inventory/*.md. Status: todo | spec | ported | verified | later (deferred per D-005) | n/a (not observable, not ported per D-010; excluded from totals).

## ID scheme
- `CORE-nnnn` core engine (languagetool-core) -> docs/inventory/core.md
- `CLI-nnnn` languagetool-commandline -> docs/inventory/cli.md
- `SRV-nnnn` languagetool-server -> docs/inventory/server.md
- `<LANG>-nnnn` language module (DE, EN, FR, IT, ES, SL, RU, SK, PL) -> docs/inventory/lang-<lang>.md

## Row format (all files)
`| ID | behaviour (one line) | Java source (path#member) | Java tests | fixtures | status |`

## Files
- core.md, cli.md, server.md
- lang-de.md, lang-en.md, lang-fr.md, lang-it.md, lang-es.md, lang-sl.md, lang-ru.md, lang-sk.md, lang-pl.md

## Totals
(maintained by java-analyst after each change)

| file | IDs | todo | spec | ported | verified | later | n/a |
|---|---|---|---|---|---|---|---|
| core.md | 305 | 292 | 0 | 0 | 0 | 13 | 18 |
| cli.md | 72 | 69 | 0 | 0 | 0 | 3 | 1 |
| server.md | 160 | 135 | 0 | 0 | 0 | 25 | 13 |

Oracle build/run/test commands and the JUnit baseline: docs/inventory/BUILD.md.

| lang file | IDs | todo | later | wave |
|---|---|---|---|---|
| lang-de.md | 146 | 138 | 8 | 1 |
| lang-en.md | 130 | 120 | 10 | 1 |
| lang-fr.md | 60 | 54 | 6 | 1 |
| lang-it.md | 37 | 34 | 3 | 2 |
| lang-es.md | 78 | 74 | 4 | 2 |
| lang-sl.md | 21 | 21 | 0 | 2 |
| lang-ru.md | 66 | 63 | 3 | 2 |
| lang-sk.md | 28 | 28 | 0 | 2 |
| lang-pl.md | 47 | 47 | 0 | 2 |

Wave 1 (D-031): core+cli+server+de+en+fr = 873 IDs (808 todo, 65 later). Verified: 0.
