# LT-JS in the browser (no Node at runtime)

A web page with a Web Worker that checks German text (de-AT, de-DE) with the browser build of LT-JS. Node is only used to
build the example and as a local static web server; the check itself runs entirely in the browser (also Safari/WKWebView on iPad).

```sh
npm run build                             # repo root: dist/packages (resources of core, lang-de, lang-de-at)
node examples/browser-minimal/build.mjs   # dist/worker.js (esbuild bundle), hunspell.wasm, manifest.json
node examples/browser-minimal/serve.mjs   # http://localhost:8090/
```

How it works:

- `worker.js` imports `src/browser-entry.js` (in an app: `import { check, preloadResources } from '@valueerror/ltjs-core'` plus
  `import '@valueerror/ltjs-lang-de'`; bundlers pick the browser entry via the `browser`/`default` export condition).
- The core reads its resources synchronously, so `preloadResources()` fetches every file of `manifest.json` into memory first
  (`scripts/browser-manifest.mjs` writes the manifest: fetch cannot list directories). German: ~20 MB, ~180 files; cache them
  (HTTP cache or a service worker) for offline use.
- `hunspell.wasm` is the spell checker engine (the Austrian/Swiss German dictionaries need it).
- The first check of a language builds the rule set (several seconds), later checks take milliseconds; keep the worker alive.
