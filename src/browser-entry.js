// Browser/Web Worker entry (WKWebView): the check path on the memory resource backend, without the server surface.
// Preload the language resources with preloadResources() before the first check(); registerLanguage() adds custom
// languages. Contains no node: imports and no require('fs'); Node built-ins come from #platform (browser side).
import './browser-polyfills.js'; // Buffer + process globals, before any core module evaluates
import './lang/register.js'; // registers the core classes and every installed language package (top-level await)
import { check, listLanguages, registerLanguage, setMemoryLimits } from './core/check.js';
import { preloadResources as preloadResourceStore } from './core/resources/ResourceDataBroker.js';
import { initHunspellWasm } from './lib/hunspell/HunspellWasm.js';
import { VERSION } from './core/LtBuildInfo.js';

/**
 * Loads the resources into memory (see ResourceDataBroker#preloadResources: fetchImpl, entries, stripPrefix,
 * directories, concurrency) and the Hunspell WASM module (the speller of German and other languages needs it).
 * hunspellWasm: bytes of hunspell.wasm, true (default) = fetch hunspell.wasm next to the bundle, false = skip.
 */
export async function preloadResources({ hunspellWasm = true, ...options } = {}) {
  await preloadResourceStore(options);
  if (hunspellWasm) await initHunspellWasm(hunspellWasm === true ? undefined : hunspellWasm);
}

export { VERSION, check, initHunspellWasm, listLanguages, registerLanguage, setMemoryLimits };
