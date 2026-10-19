// org.languagetool.rules.de.SimpleReplaceRule
import { AbstractSimpleReplaceRule2 } from '../../../core/rules/AbstractSimpleReplaceRule2.js';
import { Locale } from '../../../lib/java/Locale.js';

const DE_LOCALE = new Locale('DE');

// Java: SimpleReplaceRule (de)
export class SimpleReplaceRule extends AbstractSimpleReplaceRule2 {
  static FQCN = 'org.languagetool.rules.de.SimpleReplaceRule';

  // Java: SimpleReplaceRule(ResourceBundle,Language)
  constructor(messages, language) {
    super(messages, language);
    this.useSubRuleSpecificIds();
  }

  // Java: SimpleReplaceRule#getFileNames()
  getFileNames() {
    return ['/de/replace.txt', '/de/replace_custom.txt'];
  }

  // Java: SimpleReplaceRule#getId()
  getId() {
    return 'DE_SIMPLE_REPLACE';
  }

  // Java: SimpleReplaceRule#getDescription()
  getDescription() {
    return 'Prüft auf bestimmte falsche Wörter/Phrasen: $match';
  }

  // Java: SimpleReplaceRule#getShort()
  getShort() {
    return 'Falsches Wort';
  }

  // Java: SimpleReplaceRule#getMessage()
  getMessage() {
    return 'Meinten Sie vielleicht $suggestions?';
  }

  // Java: SimpleReplaceRule#getLocale()
  getLocale() {
    return DE_LOCALE;
  }
}
