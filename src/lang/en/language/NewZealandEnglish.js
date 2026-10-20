// Java: org.languagetool.language.NewZealandEnglish
import { createComponent } from '../../../core/language/components.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { English } from './English.js';
import { MorfologikNewZealandSpellerRule } from '../rules/MorfologikNewZealandSpellerRule.js';
import { NewZealandReplaceRule } from '../rules/NewZealandReplaceRule.js';
import { UnitConversionRuleImperial } from '../rules/UnitConversionRuleImperial.js';

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
  getRelevantRules(messages, userConfig, motherTongue, altLanguages) {
    const rules = [...super.getRelevantRules(messages, userConfig, motherTongue, altLanguages)];
    rules.push(new NewZealandReplaceRule(messages, '/en/en-NZ/replace.txt'));
    rules.push(new UnitConversionRuleImperial(messages));
    return rules;
  }

  // Java: NewZealandEnglish#getRelevantLanguageModelCapableRules(ResourceBundle,LanguageModel,GlobalConfig,UserConfig,Language,List)
  getRelevantLanguageModelCapableRules(messages, lm, globalConfig, userConfig, motherTongue, altLanguages) {
    const rules = [...super.getRelevantLanguageModelCapableRules(messages, lm, globalConfig, userConfig, motherTongue, altLanguages)];
    rules.push(new MorfologikNewZealandSpellerRule(messages, this, globalConfig, userConfig, altLanguages, lm, motherTongue));
    return rules;
  }
}

registerClass(NewZealandEnglish.FQCN, NewZealandEnglish);
