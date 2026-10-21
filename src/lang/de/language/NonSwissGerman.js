// Java: org.languagetool.language.NonSwissGerman (abstract, not registered)
import { getDataBroker } from '../../../core/resources/LtStatics.js';
import { GermanCompoundRule } from '../rules/GermanCompoundRule.js';
import { German } from './German.js';

// Java: NonSwissGerman
export class NonSwissGerman extends German {
  static FQCN = 'org.languagetool.language.NonSwissGerman';

  // Java: NonSwissGerman#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules(messages, userConfig, motherTongue, altLanguages) {
    const rules = [...super.getRelevantRules(messages, userConfig, motherTongue, altLanguages)];
    rules.push(new GermanCompoundRule(messages, this, userConfig));
    return rules;
  }

  // Java: NonSwissGerman#getRuleFileNames()
  getRuleFileNames() {
    const ruleFileNames = super.getRuleFileNames();
    ruleFileNames.push(`${getDataBroker().getRulesDir()}/de/de-DE-AT/grammar.xml`); // rules relevant for de-DE and de-AT but not de-CH
    return ruleFileNames;
  }
}
