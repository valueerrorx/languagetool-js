// Java: org.languagetool.rules.pl.PolishWordRepeatRule
import { Pattern } from '../../../lib/java/regex/index.js';
import { AdvancedWordRepeatRule } from '../../../core/rules/AdvancedWordRepeatRule.js';
import { Example } from '../../../core/rules/model/Examples.js';

// Excluded dictionary words.
const EXC_WORDS = new Set([
  'nie', 'tuż', 'aż', 'to', 'siebie', 'być', 'ani', 'ni', 'albo', 'lub', 'czy', 'bądź', 'jako', 'zł', 'np', 'coraz',
  'bardzo', 'bardziej', 'proc', 'ten', 'jak', 'mln', 'tys', 'swój', 'mój', 'twój', 'nasz', 'wasz', 'i', 'zbyt', 'się',
]);

// Excluded part of speech classes.
const EXC_POS = Pattern.compile('prep:.*|ppron.*');

// Excluded non-words (special symbols, Roman numerals etc.)
const EXC_NONWORDS = Pattern.compile('&quot|&gt|&lt|&amp|[0-9].*|'
  + 'M*(D?C{0,3}|C[DM])(L?X{0,3}|X[LC])(V?I{0,3}|I[VX])$');

// Java: PolishWordRepeatRule
export class PolishWordRepeatRule extends AdvancedWordRepeatRule {
  static FQCN = 'org.languagetool.rules.pl.PolishWordRepeatRule';

  // Java: PolishWordRepeatRule(ResourceBundle)
  constructor(messages) {
    super(messages);
    this.addExamplePair(Example.wrong('Mówiła długo, bo lubiła robić wszystko <marker>długo</marker>.'),
      Example.fixed('Mówiła długo, bo lubiła robić wszystko <marker>powoli</marker>.'));
  }

  // Java: PolishWordRepeatRule#getDescription()
  getDescription() {
    return 'Powtórzenia wyrazów w zdaniu (monotonia stylistyczna)';
  }

  // Java: PolishWordRepeatRule#getExcludedNonWordsPattern()
  getExcludedNonWordsPattern() {
    return EXC_NONWORDS;
  }

  // Java: PolishWordRepeatRule#getExcludedPos()
  getExcludedPos() {
    return EXC_POS;
  }

  // Java: PolishWordRepeatRule#getExcludedWordsPattern()
  getExcludedWordsPattern() {
    return EXC_WORDS;
  }

  // Java: PolishWordRepeatRule#getId()
  getId() {
    return 'PL_WORD_REPEAT';
  }

  // Java: PolishWordRepeatRule#getMessage()
  getMessage() {
    return 'Powtórzony wyraz w zdaniu';
  }

  // Java: PolishWordRepeatRule#getShortMessage()
  getShortMessage() {
    return 'Powtórzenie wyrazu';
  }
}
