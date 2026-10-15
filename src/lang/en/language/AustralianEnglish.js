// Java: org.languagetool.language.AustralianEnglish
import { createComponent, notPortedYet } from '../../../core/language/components.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { English } from './English.js';

// Java: AustralianEnglish
export class AustralianEnglish extends English {
  static FQCN = 'org.languagetool.language.AustralianEnglish';

  // Java: AustralianEnglish#getCountries()
  getCountries() {
    return ['AU'];
  }

  // Java: AustralianEnglish#getName()
  getName() {
    return 'English (Australian)';
  }

  // Java: AustralianEnglish#createDefaultSpellingRule(ResourceBundle)
  createDefaultSpellingRule(messages) {
    return createComponent('org.languagetool.rules.en.MorfologikAustralianSpellerRule', messages, this, null, []);
  }

  // Java: AustralianEnglish#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules() {
    throw notPortedYet('AustralianEnglish#getRelevantRules (F17)');
  }

  // Java: AustralianEnglish#getRelevantLanguageModelCapableRules(ResourceBundle,LanguageModel,GlobalConfig,UserConfig,Language,List)
  getRelevantLanguageModelCapableRules() {
    throw notPortedYet('AustralianEnglish#getRelevantLanguageModelCapableRules (F17)');
  }
}

registerClass(AustralianEnglish.FQCN, AustralianEnglish);
