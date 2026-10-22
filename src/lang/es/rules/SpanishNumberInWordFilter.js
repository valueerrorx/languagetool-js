// Java: org.languagetool.rules.es.SpanishNumberInWordFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { Locale } from '../../../lib/java/Locale.js';
import { MESSAGE_BUNDLE } from '../../../core/JLanguageToolConstants.js';
import { getDataBroker } from '../../../core/resources/LtStatics.js';
import { AbstractNumberInWordFilter } from '../../../core/rules/AbstractNumberInWordFilter.js';
import { Spanish } from '../language/Spanish.js';
import { MorfologikSpanishSpellerRule } from './MorfologikSpanishSpellerRule.js';

let spanishSpellerRule = null; // Java: SpanishNumberInWordFilter#spanishSpellerRule (static)

// Java: SpanishNumberInWordFilter
export class SpanishNumberInWordFilter extends AbstractNumberInWordFilter {
  static FQCN = 'org.languagetool.rules.es.SpanishNumberInWordFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.es.SpanishNumberInWordFilter() throws java.io.IOException' }];

  // Java: SpanishNumberInWordFilter#SpanishNumberInWordFilter()
  constructor() {
    super(Spanish.getInstance());
    const messages = getDataBroker().getResourceBundle(MESSAGE_BUNDLE, new Locale(this.language.getShortCode()));
    if (spanishSpellerRule === null) {
      spanishSpellerRule = new MorfologikSpanishSpellerRule(messages, Spanish.getInstance(), null, []);
    }
  }

  // Java: SpanishNumberInWordFilter#isMisspelled(String)
  isMisspelled(word) {
    return spanishSpellerRule.isMisspelled(word);
  }

  // Java: SpanishNumberInWordFilter#getSuggestions(String)
  getSuggestions(word) {
    return spanishSpellerRule.getSpellingSuggestions(word);
  }
}

registerClass(SpanishNumberInWordFilter.FQCN, SpanishNumberInWordFilter);
