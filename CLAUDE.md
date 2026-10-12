# LT-JS (Java -> JavaScript port)

Faithful port of an existing Java application to JavaScript with 100% feature parity.
Goal: docs/GOAL.md. Parity contract: docs/INVENTORY.md. Semantics rules: docs/SEMANTICS.md.
Architecture: docs/ARCHITECTURE.md, docs/PORT-MAP.md. Progress: docs/PLAN.md.
Decisions: docs/DECISIONS.md. Approved deviations: docs/DEVIATIONS.md. Review notes: docs/REVIEW-NOTES.md.

## Java original (read-only, the specification)
- Path: `/home/valueerror/STUFF/DEV/LanguageTool/languagetool`
- Pinned commit: `9b0be9db8cb4589cd031e85bd929c95c8ce57e49` (2026-10-12, 6.9-SNAPSHOT)
- Working clone for build/run: `oracle/java-src/` (gitignored, never edit sources there)
- JDK: <filled in by java-analyst>
- Build: <filled in by java-analyst>
- Run: <filled in by java-analyst>
- Tests: <filled in by java-analyst>

## Target stack
- JavaScript (ES modules), Node.js <version>
- <Target runtime: CLI / Electron + Vue 3 / library, decided in Phase 0>
- Tests: Vitest. Lint: ESLint.
- Java semantics helpers: `src/lib/java/` (number formatting, integer math, strings, collections order, dates)

## Conventions
- Code comments: one short line. Every ported function carries `// Java: Class#method(signature)`.
- Keep Java structure and naming recognisable for side-by-side review.
- No behaviour changes, no improvements. Java bugs are reproduced unless approved in docs/DEVIATIONS.md.

## Commands
- install: `npm install`
- test: `npm test`
- lint: `npm run lint`
- oracle (regenerate golden fixtures): `npm run oracle -- <ID>`
- parity (golden fixtures against JS): `npm run parity`
- build: `npm run build`

## Directories
- `src/` port, `src/lib/java/` semantics helpers
- `tests/` ported JUnit tests and extra tests
- `tests/golden/` golden fixtures, written only by the oracle from real Java runs
- `oracle/` harness, scripts, `oracle/java-src/` working clone
