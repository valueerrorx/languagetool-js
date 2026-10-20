// Java: org.languagetool.language.AustralianEnglish
import { createComponent } from '../../../core/language/components.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { English } from './English.js';
import { MorfologikAustralianSpellerRule } from '../rules/MorfologikAustralianSpellerRule.js';
import { UnitConversionRuleImperial } from '../rules/UnitConversionRuleImperial.js';

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
  getRelevantRules(messages, userConfig, motherTongue, altLanguages) {
    const rules = [...super.getRelevantRules(messages, userConfig, motherTongue, altLanguages)];
    rules.push(new UnitConversionRuleImperial(messages));
    return rules;
  }

  // Java: AustralianEnglish#getRelevantLanguageModelCapableRules(ResourceBundle,LanguageModel,GlobalConfig,UserConfig,Language,List)
  getRelevantLanguageModelCapableRules(messages, lm, globalConfig, userConfig, motherTongue, altLanguages) {
    const rules = [...super.getRelevantLanguageModelCapableRules(messages, lm, globalConfig, userConfig, motherTongue, altLanguages)];
    rules.push(new MorfologikAustralianSpellerRule(messages, this, globalConfig, userConfig, altLanguages, lm, motherTongue));
    return rules;
  }
}

registerClass(AustralianEnglish.FQCN, AustralianEnglish);
