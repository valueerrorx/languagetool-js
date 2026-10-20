// Java: org.languagetool.language.CanadianEnglish
import { RuntimeException, Throwable } from '../../../lib/java/errors.js';
import { Objects } from '../../../lib/java/Objects.js';
import { Languages } from '../../../core/Languages.js';
import { createComponent } from '../../../core/language/components.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { English } from './English.js';
import { MorfologikCanadianSpellerRule } from '../rules/MorfologikCanadianSpellerRule.js';
import { UnitConversionRuleImperial } from '../rules/UnitConversionRuleImperial.js';

const LANGUAGE_SHORT_CODE = 'en-CA';

let instantiationTrace = null; // Java: CanadianEnglish#instantiationTrace

// Java: CanadianEnglish
export class CanadianEnglish extends English {
  static FQCN = 'org.languagetool.language.CanadianEnglish';

  // Java: CanadianEnglish#CanadianEnglish() / protected CanadianEnglish(boolean) (fake constructor overload for subclasses)
  constructor(fakeValue) {
    super();
    if (fakeValue === undefined) {
      const trace = instantiationTrace;
      if (trace !== null) {
        throw new RuntimeException('Language was already instantiated, see the cause stacktrace below.', trace);
      }
      instantiationTrace = new Throwable();
    }
  }

  // Java: CanadianEnglish#getCountries()
  getCountries() {
    return ['CA'];
  }

  // Java: CanadianEnglish#getName()
  getName() {
    return 'English (Canadian)';
  }

  // Java: CanadianEnglish#createDefaultSpellingRule(ResourceBundle)
  createDefaultSpellingRule(messages) {
    return createComponent('org.languagetool.rules.en.MorfologikCanadianSpellerRule', messages, this, null, []);
  }

  // Java: CanadianEnglish#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules(messages, userConfig, motherTongue, altLanguages) {
    const rules = [...super.getRelevantRules(messages, userConfig, motherTongue, altLanguages)];
    rules.push(new UnitConversionRuleImperial(messages));
    return rules;
  }

  // Java: CanadianEnglish#getRelevantLanguageModelCapableRules(ResourceBundle,LanguageModel,GlobalConfig,UserConfig,Language,List)
  getRelevantLanguageModelCapableRules(messages, lm, globalConfig, userConfig, motherTongue, altLanguages) {
    const rules = [...super.getRelevantLanguageModelCapableRules(messages, lm, globalConfig, userConfig, motherTongue, altLanguages)];
    rules.push(new MorfologikCanadianSpellerRule(messages, this, globalConfig, userConfig, altLanguages, lm, motherTongue));
    return rules;
  }

  // Java: CanadianEnglish#getInstance()
  static getInstance() {
    const language = Objects.requireNonNull(Languages.getLanguageForShortCode(LANGUAGE_SHORT_CODE));
    if (language instanceof English) {
      return language;
    }
    throw new RuntimeException(`CanadianEnglish language expected, got ${language}`);
  }
}

registerClass(CanadianEnglish.FQCN, CanadianEnglish);
