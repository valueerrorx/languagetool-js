// org.languagetool.rules.de.GermanUnpairedBracketsRule
import { GenericUnpairedBracketsRule } from '../../../core/rules/GenericUnpairedBracketsRule.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { getUrl } from '../../../core/Tools.js';

const DE_START_SYMBOLS = ['[', '(', '{'];
const DE_END_SYMBOLS = [']', ')', '}'];

// Java: GermanUnpairedBracketsRule
export class GermanUnpairedBracketsRule extends GenericUnpairedBracketsRule {
  static FQCN = 'org.languagetool.rules.de.GermanUnpairedBracketsRule';

  // Java: GermanUnpairedBracketsRule(ResourceBundle,Language)
  constructor(messages) {
    super(messages, DE_START_SYMBOLS, DE_END_SYMBOLS);
    this.setUrl(getUrl('https://languagetool.org/insights/de/beitrag/klammern/'));
    this.addExamplePair(Example.wrong('Dem Präsidenten des Deutschen Bauernverbands <marker>(</marker>DBV zufolge habe die Dürre einen Schaden von 1,4 Millionen verursacht.'),
      Example.fixed('Dem Präsidenten des Deutschen Bauernverbands <marker>(</marker>DBV) zufolge habe die Dürre einen Schaden von 1,4 Millionen verursacht.'));
  }

  // Java: GermanUnpairedBracketsRule#getId()
  getId() {
    return 'UNPAIRED_BRACKETS'; // no "DE_" to be compatible with old versions
  }
}
