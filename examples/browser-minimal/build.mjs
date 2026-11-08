// Builds the example: bundles worker.js (browser build of LT-JS) to dist/worker.js, copies hunspell.wasm and writes manifest.json
// for the German resources of dist/packages (run `npm run build` in the repo root first). Node is only the build tool here.
import { copyFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const PKGS = path.join(ROOT, 'dist/packages');

mkdirSync(path.join(HERE, 'dist'), { recursive: true });
await build({
  entryPoints: [path.join(HERE, 'worker.js')],
  outfile: path.join(HERE, 'dist/worker.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  logLevel: 'warning',
});
copyFileSync(path.join(ROOT, 'src/lib/hunspell/wasm/hunspell.wasm'), path.join(HERE, 'hunspell.wasm'));
// served by serve.mjs: /res/core -> dist/packages/core/resources, res/de -> lang-de, res/de-at -> lang-de-at
execFileSync(process.execPath, [path.join(ROOT, 'scripts/browser-manifest.mjs'), path.join(HERE, 'manifest.json'),
  `${PKGS}/core/resources=/res/core/`, `${PKGS}/lang-de/resources=/res/de/`, `${PKGS}/lang-de-at/resources=/res/de-at/`], { stdio: 'inherit' });
console.log('ok: node examples/browser-minimal/serve.mjs, then http://localhost:8090/');
