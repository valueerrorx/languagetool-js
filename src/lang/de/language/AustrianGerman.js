// Java: org.languagetool.language.AustrianGerman
import { createComponent } from '../../../core/language/components.js';
import { getDataBroker } from '../../../core/resources/LtStatics.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { GermanCompoundRule } from '../rules/GermanCompoundRule.js';
import { AustrianGermanSpellerRule } from '../rules/AustrianGermanSpellerRule.js';
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
  getRelevantRules(messages, userConfig, motherTongue, altLanguages) {
    const rules = [...super.getRelevantRules(messages, userConfig, motherTongue, altLanguages)];
    rules.push(new GermanCompoundRule(messages, this, userConfig));
    return rules;
  }

  // Java: AustrianGerman#createDefaultSpellingRule(ResourceBundle)
  createDefaultSpellingRule(messages) {
    return createComponent('org.languagetool.rules.de.AustrianGermanSpellerRule', messages, this);
  }

  // Java: AustrianGerman#getRelevantLanguageModelCapableRules(ResourceBundle,LanguageModel,GlobalConfig,UserConfig,Language,List)
  getRelevantLanguageModelCapableRules(messages, languageModel, globalConfig, userConfig, motherTongue, altLanguages) {
    const rules = [...super.getRelevantLanguageModelCapableRules(messages, languageModel, globalConfig, userConfig, motherTongue, altLanguages)];
    rules.push(new AustrianGermanSpellerRule(messages, this, userConfig, languageModel));
    return rules;
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
