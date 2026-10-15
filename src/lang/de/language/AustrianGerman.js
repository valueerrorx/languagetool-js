// Java: org.languagetool.language.AustrianGerman
import { createComponent, notPortedYet } from '../../../core/language/components.js';
import { getDataBroker } from '../../../core/resources/LtStatics.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { German } from './German.js';

// Java: AustrianGerman
export class AustrianGerman extends German {
  static FQCN = 'org.languagetool.language.AustrianGerman';

  // Java: AustrianGerman#getCountries()
  getCountries() {
    return ['AT'];
  }

  // Java: AustrianGerman#getName()
  getName() {
    return 'German (Austria)';
  }

  // Java: AustrianGerman#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules() {
    throw notPortedYet('AustrianGerman#getRelevantRules (F17)');
  }

  // Java: AustrianGerman#createDefaultSpellingRule(ResourceBundle)
  createDefaultSpellingRule(messages) {
    return createComponent('org.languagetool.rules.de.AustrianGermanSpellerRule', messages, this);
  }

  // Java: AustrianGerman#getRelevantLanguageModelCapableRules(ResourceBundle,LanguageModel,GlobalConfig,UserConfig,Language,List)
  getRelevantLanguageModelCapableRules() {
    throw notPortedYet('AustrianGerman#getRelevantLanguageModelCapableRules (F17)');
  }

  // Java: AustrianGerman#getRuleFileNames()
  getRuleFileNames() {
    const ruleFileNames = [...super.getRuleFileNames()];
    ruleFileNames.push(`${getDataBroker().getRulesDir()}/de/de-DE-AT/grammar.xml`);
    return Object.freeze(ruleFileNames);
  }

  // Java: AustrianGerman#isVariant()
  isVariant() {
    return true;
  }
}

registerClass(AustrianGerman.FQCN, AustrianGerman);
