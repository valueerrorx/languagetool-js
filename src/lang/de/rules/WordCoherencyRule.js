// org.languagetool.rules.de.WordCoherencyRule
import { AbstractWordCoherencyRule } from '../../../core/rules/AbstractWordCoherencyRule.js';
import { WordCoherencyDataLoader } from '../../../core/rules/WordCoherencyDataLoader.js';
import { Example } from '../../../core/rules/model/Examples.js';

let wordMap = null; // Java: static wordMap = new WordCoherencyDataLoader().loadWords("/de/coherency.txt")

// Java: WordCoherencyRule (de)
export class WordCoherencyRule extends AbstractWordCoherencyRule {
  static FQCN = 'org.languagetool.rules.de.WordCoherencyRule';

  // Java: WordCoherencyRule(ResourceBundle)
  constructor(messages) {
    super(messages);
    this.getWordMap(); // Java: static initializer runs at class load
    this.addExamplePair(Example.wrong('Die Delfine gehören zu den Zahnwalen. <marker>Delphine</marker> sind in allen Meeren verbreitet.'),
      Example.fixed('Die Delfine gehören zu den Zahnwalen. <marker>Delfine</marker> sind in allen Meeren verbreitet.'));
  }

  // Java: WordCoherencyRule#getWordMap()
  getWordMap() {
    if (wordMap === null) wordMap = new WordCoherencyDataLoader().loadWords('/de/coherency.txt');
    return wordMap;
  }

  // Java: WordCoherencyRule#getMessage(String,String)
  getMessage(word1, word2) {
    return "'" + word1 + "' und '" + word2 + "' sollten nicht gleichzeitig benutzt werden.";
  }

  // Java: WordCoherencyRule#getId()
  getId() {
    return 'DE_WORD_COHERENCY';
  }

  // Java: WordCoherencyRule#getDescription()
  getDescription() {
    return 'Einheitliche Schreibweise für Wörter mit mehr als einer korrekten Schreibweise';
  }
}
