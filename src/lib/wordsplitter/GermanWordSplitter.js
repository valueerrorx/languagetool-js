// Java: de.danielnaber.jwordsplitter.GermanWordSplitter (jwordsplitter 4.7)
import { AbstractWordSplitter } from './AbstractWordSplitter.js';
import { getWords } from './EmbeddedGermanDictionary.js';
import { GermanInterfixDisambiguator } from './GermanInterfixDisambiguator.js';
import { loadFileToSet } from './FileTools.js';

const EXCEPTION_DICT = '/de/danielnaber/jwordsplitter/exceptionsGerman.txt'; // dict inside the JAR
const INTERFIXES = [
  's-', // combination of the characters below
  's',
  '-'];

// Java: GermanWordSplitter
export class GermanWordSplitter extends AbstractWordSplitter {
  static FQCN = 'de.danielnaber.jwordsplitter.GermanWordSplitter';

  // Java: GermanWordSplitter#GermanWordSplitter(boolean) / (boolean,InputStream) / (boolean,Set)
  constructor(hideInterfixCharacters, wordsOrStream) {
    super(hideInterfixCharacters, wordsOrStream === undefined ? getWords() : wordsOrStream);
    this.init();
  }

  // Java: GermanWordSplitter#init() (the disambiguator always uses the embedded dictionary)
  init() {
    this.disambiguator = new GermanInterfixDisambiguator(this.getWordList());
    this.setExceptionFile(EXCEPTION_DICT);
  }

  // Java: GermanWordSplitter#getWordList(InputStream) / getWordList()
  getWordList(stream) {
    if (stream !== undefined) return loadFileToSet(stream);
    return getWords();
  }

  // Java: GermanWordSplitter#getDisambiguator()
  getDisambiguator() {
    return this.disambiguator;
  }

  // Java: GermanWordSplitter#getDefaultMinimumWordLength()
  getDefaultMinimumWordLength() {
    return 3;
  }

  // Java: GermanWordSplitter#getInterfixCharacters()
  getInterfixCharacters() {
    return INTERFIXES;
  }
}
