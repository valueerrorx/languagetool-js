// org.languagetool.rules.en.WordCoherencyRule
import { AbstractWordCoherencyRule } from '../../../core/rules/AbstractWordCoherencyRule.js';
import { WordCoherencyDataLoader } from '../../../core/rules/WordCoherencyDataLoader.js';
import { Example } from '../../../core/rules/model/Examples.js';

let wordMap = null; // Java: static wordMap = new WordCoherencyDataLoader().loadWords("/en/coherency.txt")

// Java: WordCoherencyRule (en)
export class WordCoherencyRule extends AbstractWordCoherencyRule {
  static FQCN = 'org.languagetool.rules.en.WordCoherencyRule';

  // Java: WordCoherencyRule(ResourceBundle)
  constructor(messages) {
    super(messages);
    this.getWordMap(); // Java: static initializer runs at class load
    this.addExamplePair(Example.wrong('He likes archaeology. Really? She likes <marker>archeology</marker>, too.'),
      Example.fixed('He likes archaeology. Really? She likes <marker>archaeology</marker>, too.'));
  }

  // Java: WordCoherencyRule#getWordMap()
  getWordMap() {
    if (wordMap === null) wordMap = new WordCoherencyDataLoader().loadWords('/en/coherency.txt');
    return wordMap;
  }

  // Java: WordCoherencyRule#getMessage(String,String)
  getMessage(word1, word2) {
    return "Do not mix variants of the same word ('" + word1 + "' and '" + word2 + "') within a single text.";
  }

  // Java: WordCoherencyRule#getId()
  getId() {
    return 'EN_WORD_COHERENCY';
  }

  // Java: WordCoherencyRule#getDescription()
  getDescription() {
    return 'Coherent spelling of words with two admitted variants.';
  }
}
