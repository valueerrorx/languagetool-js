// Java: org.languagetool.rules.ru.RussianWordRepeatRule
import { Pattern } from '../../../lib/java/regex/index.js';
import { AdvancedWordRepeatRule } from '../../../core/rules/AdvancedWordRepeatRule.js';
import { Example } from '../../../core/rules/model/Examples.js';

// Excluded dictionary words.
const EXC_WORDS = new Set(['не', 'ни', 'а', 'их', 'на', 'в', 'по', 'минута', 'друг', 'час', 'секунда', 'ПАО', 'ООО', 'табл', 'рис']);

// Excluded part of speech classes.
const EXC_POS = Pattern.compile('INTERJECTION|PRDC|PREP|CONJ|PARTICLE|ABR|NumC:.*|Num:.*');

// Excluded non-words (special symbols, Roman numerals etc.) (remove from exclude PNN:.*)
const EXC_NONWORDS = Pattern.compile('&quot|&gt|&lt|&amp|[0-9].*|'
  + 'M*(D?C{0,3}|C[DM])(L?X{0,3}|X[LC])(V?I{0,3}|I[VX])$');

// Java: RussianWordRepeatRule
export class RussianWordRepeatRule extends AdvancedWordRepeatRule {
  static FQCN = 'org.languagetool.rules.ru.RussianWordRepeatRule';

  // Java: RussianWordRepeatRule(ResourceBundle)
  constructor(messages) {
    super(messages);
    this.addExamplePair(Example.wrong('Всё смешалось в <marker>доме доме</marker> Облонских.'),
      Example.fixed('Всё смешалось в <marker>доме</marker> Облонских.'));
  }

  // Java: RussianWordRepeatRule#getId()
  getId() {
    return 'RU_WORD_REPEAT';
  }

  // Java: RussianWordRepeatRule#getDescription()
  getDescription() {
    return 'Повтор слов в предложении';
  }

  // Java: RussianWordRepeatRule#getExcludedWordsPattern()
  getExcludedWordsPattern() {
    return EXC_WORDS;
  }

  // Java: RussianWordRepeatRule#getExcludedNonWordsPattern()
  getExcludedNonWordsPattern() {
    return EXC_NONWORDS;
  }

  // Java: RussianWordRepeatRule#getExcludedPos()
  getExcludedPos() {
    return EXC_POS;
  }

  // Java: RussianWordRepeatRule#getMessage()
  getMessage() {
    return 'Повтор слов в предложении';
  }

  // Java: RussianWordRepeatRule#getShortMessage()
  getShortMessage() {
    return 'Повтор слов в предложении';
  }
}
