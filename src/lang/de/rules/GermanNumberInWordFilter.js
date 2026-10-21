// org.languagetool.rules.de.GermanNumberInWordFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { AbstractNumberInWordFilter } from '../../../core/rules/AbstractNumberInWordFilter.js';
import { GermanyGerman } from '../language/GermanyGerman.js';

// Java: GermanNumberInWordFilter
export class GermanNumberInWordFilter extends AbstractNumberInWordFilter {
  static FQCN = 'org.languagetool.rules.de.GermanNumberInWordFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.de.GermanNumberInWordFilter()' }];

  // Java: GermanNumberInWordFilter#GermanNumberInWordFilter()
  constructor() {
    super(GermanyGerman.getInstance());
  }

  // Java: GermanNumberInWordFilter#isMisspelled(String)
  isMisspelled(word) {
    return GermanyGerman.getInstance().getDefaultSpellingRule().isMisspelled(word);
  }

  // Java: GermanNumberInWordFilter#getSuggestions(String)
  getSuggestions(word) {
    return GermanyGerman.getInstance().getDefaultSpellingRule().getSuggestions(word);
  }
}

registerClass(GermanNumberInWordFilter.FQCN, GermanNumberInWordFilter);
