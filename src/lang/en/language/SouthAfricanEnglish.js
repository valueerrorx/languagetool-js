// Java: org.languagetool.language.SouthAfricanEnglish
import { createComponent } from '../../../core/language/components.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { English } from './English.js';
import { MorfologikSouthAfricanSpellerRule } from '../rules/MorfologikSouthAfricanSpellerRule.js';

// Java: SouthAfricanEnglish
export class SouthAfricanEnglish extends English {
  static FQCN = 'org.languagetool.language.SouthAfricanEnglish';

  // Java: SouthAfricanEnglish#getCountries()
  getCountries() {
    return ['ZA'];
  }

  // Java: SouthAfricanEnglish#getName()
  getName() {
    return 'English (South African)';
  }

  // Java: SouthAfricanEnglish#createDefaultSpellingRule(ResourceBundle)
  createDefaultSpellingRule(messages) {
    return createComponent('org.languagetool.rules.en.MorfologikSouthAfricanSpellerRule', messages, this, null, []);
  }

  // Java: SouthAfricanEnglish#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules(messages, userConfig, motherTongue, altLanguages) {
    const rules = [...super.getRelevantRules(messages, userConfig, motherTongue, altLanguages)];
    return rules;
  }

  // Java: SouthAfricanEnglish#getRelevantLanguageModelCapableRules(ResourceBundle,LanguageModel,GlobalConfig,UserConfig,Language,List)
  getRelevantLanguageModelCapableRules(messages, lm, globalConfig, userConfig, motherTongue, altLanguages) {
    const rules = [...super.getRelevantLanguageModelCapableRules(messages, lm, globalConfig, userConfig, motherTongue, altLanguages)];
    rules.push(new MorfologikSouthAfricanSpellerRule(messages, this, globalConfig, userConfig, altLanguages, lm, motherTongue));
    return rules;
  }
}

registerClass(SouthAfricanEnglish.FQCN, SouthAfricanEnglish);
