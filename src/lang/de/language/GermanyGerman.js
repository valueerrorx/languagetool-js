// Java: org.languagetool.language.GermanyGerman
import { RuntimeException } from '../../../lib/java/errors.js';
import { Objects } from '../../../lib/java/Objects.js';
import { Languages } from '../../../core/Languages.js';
import { notPortedYet } from '../../../core/language/components.js';
import { getDataBroker } from '../../../core/resources/LtStatics.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { German } from './German.js';

const GERMANY_GERMAN_SHORT_CODE = 'de-DE';

// Java: GermanyGerman
export class GermanyGerman extends German {
  static FQCN = 'org.languagetool.language.GermanyGerman';

  // Java: GermanyGerman#getCountries()
  getCountries() {
    return ['DE'];
  }

  // Java: GermanyGerman#getName()
  getName() {
    return 'German (Germany)';
  }

  // Java: GermanyGerman#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules() {
    throw notPortedYet('GermanyGerman#getRelevantRules (F17)');
  }

  // Java: GermanyGerman#getRelevantLanguageModelCapableRules(ResourceBundle,LanguageModel,GlobalConfig,UserConfig,Language,List)
  getRelevantLanguageModelCapableRules() {
    throw notPortedYet('GermanyGerman#getRelevantLanguageModelCapableRules (F17)');
  }

  // Java: GermanyGerman#getRuleFileNames()
  getRuleFileNames() {
    const ruleFileNames = [...super.getRuleFileNames()];
    ruleFileNames.push(`${getDataBroker().getRulesDir()}/de/de-DE-AT/grammar.xml`);
    return Object.freeze(ruleFileNames);
  }

  // Java: GermanyGerman#isVariant()
  isVariant() {
    return true;
  }

  // Java: GermanyGerman#getInstance()
  static getInstance() {
    const language = Objects.requireNonNull(Languages.getLanguageForShortCode(GERMANY_GERMAN_SHORT_CODE));
    if (language instanceof German) { // cannot use GermanyGerman here as in premium GERMANY_GERMAN_SHORT_CODE returns GermanyGermanPremium
      return language;
    }
    throw new RuntimeException(`GermanyGerman(Premium) language expected, got ${language}`);
  }
}

registerClass(GermanyGerman.FQCN, GermanyGerman);
