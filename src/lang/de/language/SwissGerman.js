// Java: org.languagetool.language.SwissGerman
import { createComponent, notPortedYet } from '../../../core/language/components.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { German } from './German.js';

// Java: SwissGerman
export class SwissGerman extends German {
  static FQCN = 'org.languagetool.language.SwissGerman';

  // Java: SwissGerman#createDefaultTagger()
  createDefaultTagger() {
    return createComponent('org.languagetool.tagging.de.SwissGermanTagger');
  }

  // Java: SwissGerman#getCountries()
  getCountries() {
    return ['CH'];
  }

  // Java: SwissGerman#getName()
  getName() {
    return 'German (Swiss)';
  }

  // Java: SwissGerman#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules() {
    throw notPortedYet('SwissGerman#getRelevantRules (F17)');
  }

  // Java: SwissGerman#createDefaultSpellingRule(ResourceBundle)
  createDefaultSpellingRule(messages) {
    return createComponent('org.languagetool.rules.de.SwissGermanSpellerRule', messages, this);
  }

  // Java: SwissGerman#getRelevantLanguageModelCapableRules(ResourceBundle,LanguageModel,GlobalConfig,UserConfig,Language,List)
  getRelevantLanguageModelCapableRules() {
    throw notPortedYet('SwissGerman#getRelevantLanguageModelCapableRules (F17)');
  }

  // Java: SwissGerman#isVariant()
  isVariant() {
    return true;
  }

  // Java: SwissGerman#filterRuleMatches(List,AnnotatedText,Set); body in F17 (DE-0012)
  filterRuleMatches(ruleMatches, text, enabledRules) {
    const filtered = super.filterRuleMatches(ruleMatches, text, enabledRules);
    if (filtered.length === 0) return [];
    throw notPortedYet('SwissGerman#filterRuleMatches (F17, DE-0012)');
  }

  // Java: SwissGerman#getOpeningDoubleQuote()
  getOpeningDoubleQuote() {
    return '«';
  }

  // Java: SwissGerman#getClosingDoubleQuote()
  getClosingDoubleQuote() {
    return '»';
  }
}

registerClass(SwissGerman.FQCN, SwissGerman);
