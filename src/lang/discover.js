// Discovery of installed @valueerror/ltjs-lang-<code> packages (embedding); a package registers its classes and resource root when imported.
import { IS_NODE } from '#platform';

export const KNOWN_LANGUAGE_CODES = ['de', 'de-at', 'de-ch', 'en', 'es', 'fr', 'it', 'pl', 'ru', 'sk', 'sl'];

// German variant packages (variant data of lang-de, listed after it)
const VARIANT_PACKAGES = new Set(['de-at', 'de-ch']);

// imports every installed language package, skips the missing ones, rethrows any other failure; returns the installed codes.
// Browser: bundlers cannot follow these computed imports, so the app imports its language packages itself
// (import '@valueerror/ltjs-lang-de'); a package registers itself on import, discovery is skipped.
export async function discoverLanguagePackages() {
  if (!IS_NODE) return [];
  const installed = [];
  for (const code of KNOWN_LANGUAGE_CODES) {
    if (VARIANT_PACKAGES.has(code) && !installed.includes('de')) continue; // a variant needs its base language package (D-066)
    const name = `@valueerror/ltjs-lang-${code}`;
    try {
      await import(name);
      installed.push(code);
    } catch (e) {
      const missing = e?.code === 'ERR_MODULE_NOT_FOUND' && String(e.message).includes(`'${name}'`);
      if (!missing) throw e;
    }
  }
  return installed;
}
