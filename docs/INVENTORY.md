# Inventory (parity contract)

Index. Details per area in docs/inventory/*.md. Status: todo | spec | ported | verified | later (deferred per D-005).

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
