// Java: org.languagetool.language.AmericanEnglish
import { RuntimeException, Throwable } from '../../../lib/java/errors.js';
import { Objects } from '../../../lib/java/Objects.js';
import { Languages } from '../../../core/Languages.js';
import { createComponent, notPortedYet } from '../../../core/language/components.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { English } from './English.js';

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
  getRelevantRules() {
    throw notPortedYet('AmericanEnglish#getRelevantRules (F17)');
  }

  // Java: AmericanEnglish#createDefaultSpellingRule(ResourceBundle)
  createDefaultSpellingRule(messages) {
    return createComponent('org.languagetool.rules.en.MorfologikAmericanSpellerRule', messages, this, null, []);
  }

  // Java: AmericanEnglish#getRelevantLanguageModelCapableRules(ResourceBundle,LanguageModel,GlobalConfig,UserConfig,Language,List)
  getRelevantLanguageModelCapableRules() {
    throw notPortedYet('AmericanEnglish#getRelevantLanguageModelCapableRules (F17)');
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
