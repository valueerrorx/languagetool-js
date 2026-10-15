// org.languagetool.rules.de.GermanUnpairedQuotesRule
import { GenericUnpairedQuotesRule } from '../../../core/rules/GenericUnpairedQuotesRule.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { getUrl } from '../../../core/Tools.js';

const DE_START_SYMBOLS = ['„', '»', '«', '"', "'", '‚', '›', '‹'];
const DE_END_SYMBOLS = ['“', '«', '»', '"', "'", '‘', '‹', '›'];

// Java: GermanUnpairedQuotesRule
export class GermanUnpairedQuotesRule extends GenericUnpairedQuotesRule {
  static FQCN = 'org.languagetool.rules.de.GermanUnpairedQuotesRule';

  // Java: GermanUnpairedQuotesRule(ResourceBundle,Language)
  constructor(messages) {
    super(messages, DE_START_SYMBOLS, DE_END_SYMBOLS);
    this.setUrl(getUrl('https://languagetool.org/insights/de/beitrag/klammern/'));
    this.addExamplePair(Example.wrong('»Hallo Hans ist das dein <marker>›</marker>neues Auto?«, fragte er.'),
      Example.fixed('»Hallo Hans ist das dein <marker>›</marker>neues‹ Auto?«, fragte er.'));
  }

  // Java: GermanUnpairedQuotesRule#getId()
  getId() {
    return 'DE_UNPAIRED_QUOTES';
  }
}
