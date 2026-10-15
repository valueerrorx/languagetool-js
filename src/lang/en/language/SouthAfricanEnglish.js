// Java: org.languagetool.language.SouthAfricanEnglish
import { createComponent, notPortedYet } from '../../../core/language/components.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { English } from './English.js';

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
  getRelevantRules() {
    throw notPortedYet('SouthAfricanEnglish#getRelevantRules (F17)');
  }

  // Java: SouthAfricanEnglish#getRelevantLanguageModelCapableRules(ResourceBundle,LanguageModel,GlobalConfig,UserConfig,Language,List)
  getRelevantLanguageModelCapableRules() {
    throw notPortedYet('SouthAfricanEnglish#getRelevantLanguageModelCapableRules (F17)');
  }
}

registerClass(SouthAfricanEnglish.FQCN, SouthAfricanEnglish);
