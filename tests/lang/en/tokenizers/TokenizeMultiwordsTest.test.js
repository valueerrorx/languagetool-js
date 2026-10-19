// Ported from TokenizeMultiwordsTest (languagetool-language-modules/en); the Java test only prints warnings
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { getDataBroker } from '../../../../src/core/resources/LtStatics.js';
import { EnglishWordTokenizer } from '../../../../src/lang/en/tokenizers/EnglishWordTokenizer.js';
import { readerLines, decodeUtf8 } from '../../../../src/lib/java/io.js';
import { javaTrim, javaReplaceFirst, javaSplit } from '../../../../src/lib/java/strings.js';

const MULTIWORDS_FILE = '/en/multiwords.txt';
const filesToTest = ['/en/added.txt', '/en/removed.txt',
  '/en/hunspell/ignore.txt', '/en/hunspell/prohibit.txt', '/en/hunspell/prohibit_custom.txt',
  '/en/hunspell/spelling.txt', '/en/hunspell/spelling_custom.txt', '/en/hunspell/spelling_en-AU.txt',
  '/en/hunspell/spelling_en-CA.txt', '/en/hunspell/spelling_en-GB.txt', '/en/hunspell/spelling_en-NZ.txt',
  '/en/hunspell/spelling_en-US.txt', '/en/hunspell/spelling_en-ZA.txt', '/en/hunspell/spelling_merged.txt'];

// Java: TokenizeMultiwordsTest#loadWords(InputStream)
function loadWords(stream) {
  const lines = [];
  for (let line of readerLines(decodeUtf8(stream))) {
    line = javaTrim(line);
    line = javaTrim(javaReplaceFirst(line, '#.*', ''));
    if (line.length === 0 || line.charAt(0) === '#') continue;
    lines.push(javaSplit(line, '\t')[0]);
  }
  return lines;
}

describe('TokenizeMultiwordsTest', () => {
  // Java: TokenizeMultiwordsTest#testTokenize() (warnings are collected instead of printed)
  it('testTokenize', () => {
    const wordTokenizer = new EnglishWordTokenizer();
    const multiwords = loadWords(getDataBroker().getFromResourceDirAsStream(MULTIWORDS_FILE));
    const warnings = [];
    for (const fileName of filesToTest) {
      const wordList = loadWords(getDataBroker().getFromResourceDirAsStream(fileName));
      for (const word of wordList) {
        if (!multiwords.includes(word.replaceAll('’', "'"))) {
          const tokens = wordTokenizer.tokenize(word);
          const tokensBySpace = javaSplit(word, ' ');
          if (tokens.length > 1 && tokens.filter((k) => k !== ' ').join('\u0000') !== tokensBySpace.join('\u0000')) {
            warnings.push(`'${word}' in '${fileName}'`);
          }
        }
      }
    }
    expect(multiwords.length).toBeGreaterThan(0);
  });
});
