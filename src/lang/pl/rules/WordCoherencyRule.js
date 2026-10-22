// Java: org.languagetool.rules.pl.WordCoherencyRule
import { AbstractWordCoherencyRule } from '../../../core/rules/AbstractWordCoherencyRule.js';
import { WordCoherencyDataLoader } from '../../../core/rules/WordCoherencyDataLoader.js';
import { Example } from '../../../core/rules/model/Examples.js';

let wordMap = null; // Java: static wordMap = new WordCoherencyDataLoader().loadWords("/pl/coherency.txt")

// Java: WordCoherencyRule (pl)
export class WordCoherencyRule extends AbstractWordCoherencyRule {
  static FQCN = 'org.languagetool.rules.pl.WordCoherencyRule';

  // Java: WordCoherencyRule(ResourceBundle)
  constructor(messages) {
    super(messages);
    this.getWordMap(); // Java: static initializer runs at class load
    this.addExamplePair(Example.wrong('Grapefruity są zdrowe. <marker>Grejpfrut</marker> smakuje najlepiej smażony.'),
      Example.fixed('Grapefruity są zdrowe. <marker>Grapefruit</marker> smakuje najlepiej smażony.'));
  }

  // Java: WordCoherencyRule#getWordMap()
  getWordMap() {
    if (wordMap === null) wordMap = new WordCoherencyDataLoader().loadWords('/pl/coherency.txt');
    return wordMap;
  }

  // Java: WordCoherencyRule#getMessage(String,String)
  getMessage(word1, word2) {
    return 'Formy „' + word1 + '” i „' + word2 + '” zwykle nie powinny być używane jednocześnie.';
  }

  // Java: WordCoherencyRule#getId()
  getId() {
    return 'PL_WORD_COHERENCY';
  }

  // Java: WordCoherencyRule#getDescription()
  getDescription() {
    return 'Jednolita pisownia wyrazów o obocznej dopuszczalnej pisowni';
  }
}
