// Java: org.languagetool.rules.ru.RussianWordRootRepeatRule
import { AbstractWordCoherencyRule } from '../../../core/rules/AbstractWordCoherencyRule.js';
import { WordCoherencyDataLoader } from '../../../core/rules/WordCoherencyDataLoader.js';
import { Example } from '../../../core/rules/model/Examples.js';

let wordMap = null; // Java: static wordMap = new WordCoherencyDataLoader().loadWords("/ru/wordrootrep.txt")

// Java: RussianWordRootRepeatRule
export class RussianWordRootRepeatRule extends AbstractWordCoherencyRule {
  static FQCN = 'org.languagetool.rules.ru.RussianWordRootRepeatRule';

  // Java: RussianWordRootRepeatRule(ResourceBundle)
  constructor(messages) {
    super(messages);
    this.getWordMap(); // Java: static initializer runs at class load
    this.setDefaultOff();
    this.addExamplePair(Example.wrong('Абрикос рос в саду. У меня на столе стоит <marker>абрикосный</marker> сок.'),
      Example.fixed('Абрикос рос в саду. У меня на столе стоит сок из <marker>абрикосов</marker>.'));
  }

  // Java: RussianWordRootRepeatRule#getWordMap()
  getWordMap() {
    if (wordMap === null) wordMap = new WordCoherencyDataLoader().loadWords('/ru/wordrootrep.txt');
    return wordMap;
  }

  // Java: RussianWordRootRepeatRule#getMessage(String,String)
  getMessage(word1, word2) {
    return '«' + word1 + '» и «' + word2 + '» – однокоренные слова, их не стоит использовать одновременно';
  }

  // Java: RussianWordRootRepeatRule#getId()
  getId() {
    return 'RU_WORD_ROOT_REPEAT';
  }

  // Java: RussianWordRootRepeatRule#getDescription()
  getDescription() {
    return 'Повтор однокоренных слов';
  }
}
