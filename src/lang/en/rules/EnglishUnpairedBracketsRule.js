// org.languagetool.rules.en.EnglishUnpairedBracketsRule
import { GenericUnpairedBracketsRule } from '../../../core/rules/GenericUnpairedBracketsRule.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { getUrl } from '../../../core/Tools.js';

const EN_START_SYMBOLS = ['[', '(', '{'];
const EN_END_SYMBOLS = [']', ')', '}'];

// Java: EnglishUnpairedBracketsRule
export class EnglishUnpairedBracketsRule extends GenericUnpairedBracketsRule {
  static FQCN = 'org.languagetool.rules.en.EnglishUnpairedBracketsRule';

  // Java: EnglishUnpairedBracketsRule(ResourceBundle,Language)
  constructor(messages) {
    super(messages, EN_START_SYMBOLS, EN_END_SYMBOLS);
    this.setUrl(getUrl('https://languagetool.org/insights/post/punctuation-guide/#what-are-parentheses'));
    this.addExamplePair(Example.wrong('He lived in a <marker>(</marker>large house.'),
      Example.fixed('He lived in a <marker>(</marker>large<marker>)</marker> house.'));
  }

  // Java: EnglishUnpairedBracketsRule#getId()
  getId() {
    return 'EN_UNPAIRED_BRACKETS';
  }
}
