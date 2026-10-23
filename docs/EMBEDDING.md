# Embedding LT-JS (npm packages, Electron)

Decision D-060. Packages are built from the dev repo; nothing is published, the tarballs are installed from disk.

## Packages

| Package | Content |
|---|---|
| `@ltjs/core` | core, server, CLI, public API, shared resources (segment.srx, message bundles, language detection data) |
| `@ltjs/lang-<code>` | `de en es fr it pl ru sk sl`: language code and resources (dictionaries, rules), LICENSE, NOTICE, `licenses/` |

All packages are ES modules and need Node >= 24 (in Electron: a release that bundles Node 24 or newer).
Language packages have `@ltjs/core` as peer dependency, core lists them as optional peer dependencies.

## Build and install

```
# resources/ is committed; npm run resources:update -- --java <LanguageTool checkout> refreshes it
npm run build         # dist/packages/<name>/ and dist/tarballs/ltjs-<name>-0.1.0.tgz
npm run smoke:packages
```

Install into an application (core plus the languages you need):

```
npm install ./ltjs-core-0.1.0.tgz ./ltjs-lang-de-0.1.0.tgz ./ltjs-lang-en-0.1.0.tgz
```

Language discovery: when `@ltjs/core` is loaded, `src/lang/register.js` tries `import('@ltjs/lang-<code>')` for the nine
known codes. An installed package registers its language classes and adds its own `resources/` directory as an additional
resource root (resolved with `import.meta.url`); a missing package is skipped. Only installed languages exist: they appear in
`listLanguages()`, in `GET /v2/languages` and are accepted as `language`. Other import errors are not swallowed.
Without any language package nothing can be checked.

## Library API

```js
import { check, startServer, listLanguages } from '@ltjs/core';

const result = await check('Das ist ein Fehlr.', {
  language: 'de-DE',        // required: 'de', 'de-DE', 'en-US', ... or 'auto'
  motherTongue: 'en',       // optional (false friends)
  enabledRules: [],         // arrays or comma separated strings
  disabledRules: ['WHITESPACE_RULE'],
  enabledCategories: [],
  disabledCategories: [],
  enabledOnly: false,       // only the enabled rules/categories
  level: 'default',         // or 'picky'
  extraRules: true,         // LTJS rule layer (rules beyond Java, ids LTJS_*), default true; env LTJS_EXTRA_RULES=0 removes it
});
result.matches;             // LanguageTool /v2/check JSON: offset, length, message, replacements, rule, ...

listLanguages();            // [{name, code, longCode}] of the installed languages

const server = await startServer({ port: 8081, host: 'localhost', config: { maxTextLength: 50000 } });
// ... POST http://localhost:8081/v2/check
await server.close();
```

- `check` returns the same JSON object the server sends for `/v2/check` (software, warnings, language, matches, ...).
  It keeps up to 8 configured `JLanguageTool` instances (per language, mother tongue and rule selection) so repeated calls are fast.
- `startServer({port, host, config, args})`: `config` takes the keys of the LanguageTool server properties file
  (`maxTextLength`, `cacheSize`, ...), `args` additional command line options. `host: null` binds all interfaces without the IP allow list.
  Returns `{port, host, server, close()}`. The server prints its start-up lines to stdout.
- The first `check` of a language loads the rules and dictionaries: several seconds for the first call (de, en are the largest), then milliseconds.

## Command line

`npx ltjs -l de-DE file.txt` (same options as the Java command line tool) and `npx ltjs-server --port 8081`.
`ltjs` without `-l` uses English and therefore needs `@ltjs/lang-en`.

## Electron

Loading the packages and the first check cost seconds of CPU time and several hundred MB of heap for large languages, and a check
blocks the thread it runs on. Do not run it in the main process or in a renderer. Use

- `utilityProcess.fork()` (recommended, an own Node process; see `examples/electron-minimal/`), or
- a `worker_threads` Worker in a Node-capable process (same code: `import { check } from '@ltjs/core'` in the worker, `parentPort` for messages), or
- `startServer()` inside a utility process and plain HTTP from the renderer or main process.

Start the process at app start-up (or lazily on first use) and warm it with a dummy `check()` per language you need, so the user's first
real check is fast. Keep one long-lived process; do not fork per check. Make the packages available outside `app.asar`
(`asarUnpack: ["node_modules/@ltjs/**"]` for electron-builder), because the resources are read with `fs`.

`examples/electron-minimal/main.js` forks `checker-process.js`, waits for its `ready` message and sends one check
(`npm install` and `npm start` in that directory after `npm run build`; not part of CI).
