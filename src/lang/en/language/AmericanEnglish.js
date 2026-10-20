// Java: org.languagetool.language.AmericanEnglish
import { RuntimeException, Throwable } from '../../../lib/java/errors.js';
import { Objects } from '../../../lib/java/Objects.js';
import { Languages } from '../../../core/Languages.js';
import { createComponent } from '../../../core/language/components.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { English } from './English.js';
import { MorfologikAmericanSpellerRule } from '../rules/MorfologikAmericanSpellerRule.js';
import { AmericanReplaceRule } from '../rules/AmericanReplaceRule.js';
import { UnitConversionRuleUS } from '../rules/UnitConversionRuleUS.js';

const LANGUAGE_SHORT_CODE = 'en-US';

let instantiationTrace = null; // Java: AmericanEnglish#instantiationTrace

// Java: AmericanEnglish
export class AmericanEnglish extends English {
  static FQCN = 'org.languagetool.language.AmericanEnglish';

  // Java: AmericanEnglish#AmericanEnglish() / protected AmericanEnglish(boolean) (fake constructor overload for subclasses)
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

  // Java: AmericanEnglish#getCountries()
  getCountries() {
    return ['US'];
  }

  // Java: AmericanEnglish#getName()
  getName() {
    return 'English (US)';
  }

  // Java: AmericanEnglish#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules(messages, userConfig, motherTongue, altLanguages) {
    const rules = [...super.getRelevantRules(messages, userConfig, motherTongue, altLanguages)];
    rules.push(new AmericanReplaceRule(messages, '/en/en-US/replace.txt'));
    rules.push(new UnitConversionRuleUS(messages));
    return rules;
  }

  // Java: AmericanEnglish#createDefaultSpellingRule(ResourceBundle)
  createDefaultSpellingRule(messages) {
    return createComponent('org.languagetool.rules.en.MorfologikAmericanSpellerRule', messages, this, null, []);
  }

  // Java: AmericanEnglish#getRelevantLanguageModelCapableRules(ResourceBundle,LanguageModel,GlobalConfig,UserConfig,Language,List)
  getRelevantLanguageModelCapableRules(messages, lm, globalConfig, userConfig, motherTongue, altLanguages) {
    const rules = [...super.getRelevantLanguageModelCapableRules(messages, lm, globalConfig, userConfig, motherTongue, altLanguages)];
    // SuggestionsChanges.isRunningExperiment(SymSpell) is never true (experiments are not configured)
    rules.push(new MorfologikAmericanSpellerRule(messages, this, globalConfig, userConfig, altLanguages, lm, motherTongue));
    return rules;
  }

  // Java: AmericanEnglish#getInstance()
  static getInstance() {
    const language = Objects.requireNonNull(Languages.getLanguageForShortCode(LANGUAGE_SHORT_CODE));
    if (language instanceof English) {
      return language;
    }
    throw new RuntimeException(`AmericanEnglish language expected, got ${language}`);
  }
}

registerClass(AmericanEnglish.FQCN, AmericanEnglish);
