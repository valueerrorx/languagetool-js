// Java: org.languagetool.rules.ru.RussianCompoundRule
import { AbstractCompoundRule } from '../../../core/rules/AbstractCompoundRule.js';
import { CompoundRuleData } from '../../../core/rules/CompoundRuleData.js';
import { Example } from '../../../core/rules/model/Examples.js';

let compoundData = null; // Java: static volatile compoundData

// Java: RussianCompoundRule
export class RussianCompoundRule extends AbstractCompoundRule {
  static FQCN = 'org.languagetool.rules.ru.RussianCompoundRule';

  // Java: RussianCompoundRule(ResourceBundle,Language,UserConfig)
  constructor(messages, lang, userConfig) {
    super(messages, lang, userConfig,
      'Эти слова должны быть написаны через дефис.',
      'Эти слова должны быть написаны слитно.',
      'Эти слова могут быть написаны через дефис или слитно.');
    this.addExamplePair(Example.wrong('Собрание состоится в <marker>конференц зале</marker>.'),
      Example.fixed('Собрание состоится в <marker>конференц-зале</marker>.'));
    this.sentenceStartsWithUpperCase = true;
  }

  // Java: RussianCompoundRule#getId()
  getId() {
    return 'RU_COMPOUNDS';
  }

  // Java: RussianCompoundRule#getDescription()
  getDescription() {
    return 'Правописание через дефис';
  }

  // Java: RussianCompoundRule#getCompoundRuleData()
  getCompoundRuleData() {
    if (compoundData === null) {
      compoundData = new CompoundRuleData('/ru/compounds.txt');
    }
    return compoundData;
  }
}
