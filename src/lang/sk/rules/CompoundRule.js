// Java: org.languagetool.rules.sk.CompoundRule
import { AbstractCompoundRule } from '../../../core/rules/AbstractCompoundRule.js';
import { CompoundRuleData } from '../../../core/rules/CompoundRuleData.js';

let compoundData = null; // Java: static volatile compoundData

// Java: CompoundRule
export class CompoundRule extends AbstractCompoundRule {
  static FQCN = 'org.languagetool.rules.sk.CompoundRule';

  // Java: CompoundRule(ResourceBundle,Language,UserConfig)
  constructor(messages, lang, userConfig) {
    super(messages, lang, userConfig,
      'Toto slovo sa zvyčajne píše so spojovníkom.',
      'Toto slovo sa obvykle píše bez spojovníka.',
      'Tento výraz sa bežne píše s alebo bez spojovníka.',
      'Problém spájania slov');
  }

  // Java: CompoundRule#getId()
  getId() {
    return 'SK_COMPOUNDS';
  }

  // Java: CompoundRule#getDescription()
  getDescription() {
    return 'Slová so spojovníkom napr. použite „česko-slovenský” namiesto „česko slovenský”';
  }

  // Java: CompoundRule#getCompoundRuleData()
  getCompoundRuleData() {
    if (compoundData === null) {
      compoundData = new CompoundRuleData('/sk/compounds.txt');
    }
    return compoundData;
  }
}
