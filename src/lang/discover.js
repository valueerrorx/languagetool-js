// Discovery of installed @valueerror/ltjs-lang-<code> packages (embedding); a package registers its classes and resource root when imported.
export const KNOWN_LANGUAGE_CODES = ['de', 'en', 'es', 'fr', 'it', 'pl', 'ru', 'sk', 'sl'];

// imports every installed language package, skips the missing ones, rethrows any other failure; returns the installed codes
export async function discoverLanguagePackages() {
  const installed = [];
  for (const code of KNOWN_LANGUAGE_CODES) {
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
