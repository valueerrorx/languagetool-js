// org.languagetool.rules.en.SimpleReplaceRule
import { AbstractSimpleReplaceRule2 } from '../../../core/rules/AbstractSimpleReplaceRule2.js';
import { Locale } from '../../../lib/java/Locale.js';

const EN_LOCALE = new Locale('EN');

// Java: SimpleReplaceRule (en)
export class SimpleReplaceRule extends AbstractSimpleReplaceRule2 {
  static FQCN = 'org.languagetool.rules.en.SimpleReplaceRule';

  // Java: SimpleReplaceRule(ResourceBundle,Language)
  constructor(messages, language) {
    super(messages, language);
    this.useSubRuleSpecificIds();
  }

  // Java: SimpleReplaceRule#getFileNames()
  getFileNames() {
    return ['/en/replace.txt', '/en/replace_custom.txt'];
  }

  // Java: SimpleReplaceRule#getId()
  getId() {
    return 'EN_SIMPLE_REPLACE';
  }

  // Java: SimpleReplaceRule#getDescription()
  getDescription() {
    return 'Check for wrong words/phrases: $match';
  }

  // Java: SimpleReplaceRule#getShort()
  getShort() {
    return 'Wrong word';
  }

  // Java: SimpleReplaceRule#getMessage()
  getMessage() {
    return 'Did you mean $suggestions?';
  }

  // Java: SimpleReplaceRule#getLocale()
  getLocale() {
    return EN_LOCALE;
  }
}
