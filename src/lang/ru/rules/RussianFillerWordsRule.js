// Java: org.languagetool.rules.ru.RussianFillerWordsRule
import { AbstractFillerWordsRule } from '../../../core/rules/AbstractFillerWordsRule.js';

const fillerWords = new Set(['ах', 'аа', 'ааа', 'аааа', 'ау',
  'бу', 'вау', 'ох', 'однако', 'эээ', 'э', 'эй', 'эх', 'ух-ты', 'ух']);

// Java: RussianFillerWordsRule
export class RussianFillerWordsRule extends AbstractFillerWordsRule {
  static FQCN = 'org.languagetool.rules.ru.RussianFillerWordsRule';

  // Java: RussianFillerWordsRule#getId()
  getId() {
    return AbstractFillerWordsRule.RULE_ID + '_RU';
  }

  // Java: RussianFillerWordsRule#isFillerWord(String)
  isFillerWord(token) {
    return fillerWords.has(token);
  }

  // Java: RussianFillerWordsRule#isException(AnalyzedTokenReadings[],int)
  isException() {
    return false;
  }
}
