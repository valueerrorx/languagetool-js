// Java: org.languagetool.rules.ru.RussianWordCoherencyRule
import { AbstractWordCoherencyRule } from '../../../core/rules/AbstractWordCoherencyRule.js';
import { WordCoherencyDataLoader } from '../../../core/rules/WordCoherencyDataLoader.js';
import { Example } from '../../../core/rules/model/Examples.js';

let wordMap = null; // Java: static wordMap = new WordCoherencyDataLoader().loadWords("/ru/coherency.txt")

// Java: RussianWordCoherencyRule
export class RussianWordCoherencyRule extends AbstractWordCoherencyRule {
  static FQCN = 'org.languagetool.rules.ru.RussianWordCoherencyRule';

  // Java: RussianWordCoherencyRule(ResourceBundle)
  constructor(messages) {
    super(messages);
    this.getWordMap(); // Java: static initializer runs at class load
    this.addExamplePair(Example.wrong('Понятие «оффлайн» тоже имеет английские корни и связано со словом «offline», что означает «вне сети». Принтер перешёл в состояние <marker>офлайн</marker>.'),
      Example.fixed('Понятие «оффлайн» тоже имеет английские корни и связано со словом «offline», что означает «вне сети». Принтер перешёл в состояние <marker>оффлайн</marker>.'));
  }

  // Java: RussianWordCoherencyRule#getWordMap()
  getWordMap() {
    if (wordMap === null) wordMap = new WordCoherencyDataLoader().loadWords('/ru/coherency.txt');
    return wordMap;
  }

  // Java: RussianWordCoherencyRule#getMessage(String,String)
  getMessage(word1, word2) {
    return '«' + word1 + '» и «' + word2 + '» не следует использовать одновременно';
  }

  // Java: RussianWordCoherencyRule#getId()
  getId() {
    return 'RU_WORD_COHERENCY';
  }

  // Java: RussianWordCoherencyRule#getDescription()
  getDescription() {
    return 'Единообразное написание слов с более чем одним допустимым написанием';
  }
}
