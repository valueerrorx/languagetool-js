// Java: org.languagetool.language.NewZealandEnglish
import { createComponent, notPortedYet } from '../../../core/language/components.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { English } from './English.js';

// Java: NewZealandEnglish
export class NewZealandEnglish extends English {
  static FQCN = 'org.languagetool.language.NewZealandEnglish';

  // Java: NewZealandEnglish#getCountries()
  getCountries() {
    return ['NZ'];
  }

  // Java: NewZealandEnglish#getName()
  getName() {
    return 'English (New Zealand)';
  }

  // Java: NewZealandEnglish#createDefaultSpellingRule(ResourceBundle)
  createDefaultSpellingRule(messages) {
    return createComponent('org.languagetool.rules.en.MorfologikNewZealandSpellerRule', messages, this, null, []);
  }

  // Java: NewZealandEnglish#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules() {
    throw notPortedYet('NewZealandEnglish#getRelevantRules (F17)');
  }

  // Java: NewZealandEnglish#getRelevantLanguageModelCapableRules(ResourceBundle,LanguageModel,GlobalConfig,UserConfig,Language,List)
  getRelevantLanguageModelCapableRules() {
    throw notPortedYet('NewZealandEnglish#getRelevantLanguageModelCapableRules (F17)');
  }
}

registerClass(NewZealandEnglish.FQCN, NewZealandEnglish);
