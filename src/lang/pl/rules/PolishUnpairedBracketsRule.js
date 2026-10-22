// Java: org.languagetool.rules.pl.PolishUnpairedBracketsRule
import { GenericUnpairedBracketsRule } from '../../../core/rules/GenericUnpairedBracketsRule.js';
import { Example } from '../../../core/rules/model/Examples.js';

const PL_START_SYMBOLS = ['[', '(', '{', '„', '»', '"'];
const PL_END_SYMBOLS = [']', ')', '}', '”', '«', '"'];

// Java: PolishUnpairedBracketsRule
export class PolishUnpairedBracketsRule extends GenericUnpairedBracketsRule {
  static FQCN = 'org.languagetool.rules.pl.PolishUnpairedBracketsRule';

  // Java: PolishUnpairedBracketsRule(ResourceBundle,Language)
  constructor(messages) {
    super(messages, PL_START_SYMBOLS, PL_END_SYMBOLS);
    this.addExamplePair(Example.wrong('To jest zdanie z <marker>„</marker>cudzysłowem.'),
      Example.fixed('To jest zdanie z <marker>„</marker>cudzysłowem”.'));
  }

  // Java: PolishUnpairedBracketsRule#getId()
  getId() {
    return 'PL_UNPAIRED_BRACKETS';
  }
}
