// Java: de.danielnaber.jwordsplitter.EmbeddedGermanDictionary (jwordsplitter 4.7)
import { decodeUtf8, readerLines } from '../java/io.js';
import { NullPointerException } from '../java/errors.js';
import { javaTrim, toLowerCase } from '../java/strings.js';
import { getResourceAsStream } from '../../core/resources/ResourceDataBroker.js';

const DICT = '/de/danielnaber/jwordsplitter/wordsGerman.txt'; // dict inside the JAR

let words = null;

// Java: EmbeddedGermanDictionary#getWords()
export function getWords() {
  if (words === null) {
    words = new Set();
    const is = getResourceAsStream(DICT);
    if (is === null) throw new NullPointerException(); // Java: new BufferedInputStream(null) fails on first read
    for (const line of readerLines(decodeUtf8(is))) {
      if (!line.startsWith('#')) {
        words.add(toLowerCase(javaTrim(line)));
      }
    }
  }
  return words;
}

export const EmbeddedGermanDictionary = { getWords };
