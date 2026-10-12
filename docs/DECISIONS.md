# Decisions

Format: D-nnn | date | decision

- D-001 | 2026-10-12 | Java original: `/home/valueerror/STUFF/DEV/LanguageTool/languagetool`, pinned commit 9b0be9db8cb4589cd031e85bd929c95c8ce57e49 (6.9-SNAPSHOT).
- D-002 | 2026-10-12 | Modules in scope: languagetool-core, languagetool-commandline, languagetool-server (HTTP API). Out of scope: standalone GUI, gui-commons, office-extension, wikipedia, dev, tools, http-client, client-example, rpm-package.
- D-003 | 2026-10-12 | Languages in scope: de (incl. all variants, esp. de-AT), en (all variants), fr, it, es, sl, ru, sk, pl. Other language modules are out of scope.
- D-004 | 2026-10-12 | Target runtime: Express server (Node.js, ESM). Core and CLI are internal layers; the CLI keeps parity with languagetool-commandline.
- D-005 | 2026-10-12 | Heavy optional components (ngram/Lucene, fastText, word2vec/ONNX/neural models, remote rules, premium/cloud hooks) are deferred: tracked in INVENTORY with status `later`, listed in DEVIATIONS.md once the user approves them.
- D-006 | 2026-10-12 | HTTP API parity is byte-exact: endpoints, parameters, status codes, error texts, JSON bodies byte-identical incl. key order and number format.
- D-007 | 2026-10-12 | Bug policy: obvious Java bugs may be fixed, but every fix is an individual DEVIATIONS.md entry requiring explicit user approval before it is implemented. Everything else is bug-compatible.
- D-008 | 2026-10-12 | Oracle reference JDK: OpenJDK 17 (`/usr/lib/jvm/java-17-openjdk`), set per command via JAVA_HOME; the system default stays JDK 27.
