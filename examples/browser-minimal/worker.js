// Web Worker: LT-JS without Node. Loads the resources listed in manifest.json into memory, then answers check requests.
// Messages in: { id, text, language }; out: { ready, ms } once, then { id, matches } or { id, error }.
import { check, preloadResources } from '../../src/browser-entry.js';

const t0 = performance.now();
const manifest = await (await fetch('/manifest.json')).json();
const hunspellWasm = new Uint8Array(await (await fetch('/hunspell.wasm')).arrayBuffer());
await preloadResources({ entries: manifest.entries, hunspellWasm });
postMessage({ ready: true, ms: Math.round(performance.now() - t0) });

onmessage = async ({ data }) => {
  try {
    const res = await check(data.text, { language: data.language });
    postMessage({ id: data.id, matches: res.matches });
  } catch (e) {
    postMessage({ id: data.id, error: String(e?.message ?? e) });
  }
};
