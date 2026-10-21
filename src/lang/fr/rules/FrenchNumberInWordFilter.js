// org.languagetool.rules.fr.FrenchNumberInWordFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { AbstractNumberInWordFilter } from '../../../core/rules/AbstractNumberInWordFilter.js';
import { French } from './FrenchLazy.js';

// Java: FrenchNumberInWordFilter
export class FrenchNumberInWordFilter extends AbstractNumberInWordFilter {
  static FQCN = 'org.languagetool.rules.fr.FrenchNumberInWordFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.fr.FrenchNumberInWordFilter() throws java.io.IOException' }];

  // Java: FrenchNumberInWordFilter#FrenchNumberInWordFilter()
  constructor() {
    super(French.getInstance());
    this.frenchSpellerRule = French.getInstance().getDefaultSpellingRule();
  }

  // Java: FrenchNumberInWordFilter#isMisspelled(String)
  isMisspelled(word) {
    return this.frenchSpellerRule.isMisspelled(word);
  }

  // Java: FrenchNumberInWordFilter#getSuggestions(String)
  getSuggestions(word) {
    return this.frenchSpellerRule.getSpellingSuggestions(word);
  }
}

registerClass(FrenchNumberInWordFilter.FQCN, FrenchNumberInWordFilter);
