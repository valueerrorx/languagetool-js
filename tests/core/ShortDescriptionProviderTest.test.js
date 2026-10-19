// Ported from ShortDescriptionProviderTest (languagetool-standalone)
import { describe, it, expect } from 'vitest';
import '../../src/lang/register.js';
import { Languages } from '../../src/core/Languages.js';
import { ShortDescriptionProvider } from '../../src/core/ShortDescriptionProvider.js';

describe('ShortDescriptionProviderTest', () => {
  // Java: ShortDescriptionProviderTest#testGetShortDescription
  it('testGetShortDescription', () => {
    const de = Languages.getLanguageForShortCode('de-DE');
    const providerDE = new ShortDescriptionProvider();
    expect(providerDE.getShortDescription('fielen', de)).not.toBeNull();
    expect(providerDE.getShortDescription('fake-word-doesnt-exist', de)).toBeNull();
    const en = Languages.getLanguageForShortCode('en-US');
    const providerEN = new ShortDescriptionProvider();
    expect(providerEN.getShortDescription('adopting', en)).not.toBeNull();
    expect(providerEN.getShortDescription('fake-word-doesnt-exist', en)).toBeNull();
  });

  // Java: ShortDescriptionProviderTest#testDescriptionLength
  it('testDescriptionLength', () => {
    const limit = 45;
    let count = 0;
    const langs = Languages.get();
    for (const lang of langs) {
      if (lang.getShortCode() === 'en' && lang.getShortCodeWithCountryAndVariant() !== 'en-US') {
        continue; // avoid running several times for same data
      }
      if (lang.getShortCode() === 'de' && lang.getShortCodeWithCountryAndVariant() !== 'de-DE') {
        continue;
      }
      const map = ShortDescriptionProvider.getAllDescriptions(lang);
      for (const [key, desc] of map) {
        const len = desc.length;
        if (len > limit) {
          process.stderr.write(`WARNING: [${lang.getShortCode()}] description for ${key} is ${len} chars, should be <= ${limit}: ${desc}\n`);
        }
        count++;
      }
    }
    if (count === 0) {
      throw new Error(`No word descriptions found at all for ${langs.length} languages`);
    }
  });
});
