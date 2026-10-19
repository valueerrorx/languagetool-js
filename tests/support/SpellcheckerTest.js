// Ported from SpellcheckerTest (core test jar; base class of the LanguageSpecificSpellcheckerTest classes of the language modules)
import { Languages } from '../../src/core/Languages.js';
import { CachingWordListLoader } from '../../src/core/rules/spelling/CachingWordListLoader.js';

// Java: SpellcheckerTest#runLanguageSpecificTest(); Languages.get() only knows the languages of the calling module: filtered by shortCode
export function runLanguageSpecificTest(moduleCode) {
  let totalProhibited = 0;
  const languages = Languages.get().filter((l) => l.getShortCode() === moduleCode);
  if (languages.length === 0) {
    throw new Error('Warning: no languages found in classpath - cannot run any spell check tests');
  }
  for (const lang of languages) {
    const loader = new CachingWordListLoader();
    const prohibitedWords = loader.loadWords(`${lang.getShortCode()}/hunspell/prohibit.txt`);
    totalProhibited += prohibitedWords.length;
    const spellingWords = loader.loadWords(`${lang.getShortCode()}/hunspell/spelling.txt`);
    const intersection = [...new Set(prohibitedWords)].filter((w) => spellingWords.includes(w));
    if (intersection.length > 0) {
      throw new Error(`Word(s) appear in both spelling.txt and prohibit.txt - this doesn't make sense: [${intersection.join(', ')}]`);
    }
  }
  if (languages.length > 5 && totalProhibited === 0) {
    throw new Error(`No prohibited words at all for ${languages.length} languages - is there a bug in this test?!`);
  }
}
