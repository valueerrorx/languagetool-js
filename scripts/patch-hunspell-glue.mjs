// Patches the emscripten glue (-sENVIRONMENT=node) of build-hunspell-wasm.sh so it also loads in browsers/workers:
// no static import of 'module'; Node is detected at runtime, elsewhere the wasm comes from Module.wasmBinary or a fetch.
// Usage: node scripts/patch-hunspell-glue.mjs <outdir>/hunspell.js (idempotent)
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) throw new Error('usage: patch-hunspell-glue.mjs <hunspell.js>');
let src = readFileSync(file, 'utf8');
const MARK = '// LTJS: patched by scripts/patch-hunspell-glue.mjs';
if (!src.startsWith(MARK)) {
  const head = /^\s*import \{ createRequire \} from 'module';\r?\nconst require = createRequire\(import\.meta\.url\);\r?\n/;
  if (!head.test(src)) throw new Error('unexpected glue header');
  src = src.replace(head, `${MARK}\n// Node: require via process.getBuiltinModule (no import, bundlers see nothing); browsers/workers: no require (wasm via Module.wasmBinary or fetch)\n` +
    "const require = globalThis.process?.getBuiltinModule?.('module')?.createRequire(import.meta.url) ?? null;\n");
  const env = 'var ENVIRONMENT_IS_NODE=true;';
  if (!src.includes(env)) throw new Error('ENVIRONMENT_IS_NODE not found');
  src = src.replace(env, 'var ENVIRONMENT_IS_NODE=require!==null;');
  writeFileSync(file, src);
}
