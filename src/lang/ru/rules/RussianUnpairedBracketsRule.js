// Java: org.languagetool.rules.ru.RussianUnpairedBracketsRule
import { Pattern } from '../../../lib/java/regex/index.js';
import { GenericUnpairedBracketsRule } from '../../../core/rules/GenericUnpairedBracketsRule.js';
import { Example } from '../../../core/rules/model/Examples.js';

const RU_START_SYMBOLS = ['(', '{', '„', '"', "'", '“'];
const RU_END_SYMBOLS = [')', '}', '“', '"', "'", '”'];
const NUMERALS_RU = Pattern.compile("(?i)\\d{1,2}?[а-я]*|[а-я]|[А-Я]|[а-я][а-я]|[А-Я][А-Я]|(?i)\\d{1,2}?[a-z']*|M*(D?C{0,3}|C[DM])(L?X{0,3}|X[LC])(V?I{0,3}|I[VX])$");

// Java: RussianUnpairedBracketsRule
export class RussianUnpairedBracketsRule extends GenericUnpairedBracketsRule {
  static FQCN = 'org.languagetool.rules.ru.RussianUnpairedBracketsRule';

  // Java: RussianUnpairedBracketsRule(ResourceBundle,Language)
  constructor(messages) {
    super(messages, RU_START_SYMBOLS, RU_END_SYMBOLS, NUMERALS_RU);
    this.addExamplePair(Example.wrong('Самоотверженный поступок Оленина <marker>(</marker>подарок Лукашке коня вызывает лишь удивление и усиливает недоверие к нему станичников.'),
      Example.fixed('Самоотверженный поступок Оленина <marker>(</marker>подарок Лукашке коня) вызывает лишь удивление и усиливает недоверие к нему станичников.'));
  }

  // Java: RussianUnpairedBracketsRule#getId()
  getId() {
    return 'RU_UNPAIRED_BRACKETS';
  }
}
