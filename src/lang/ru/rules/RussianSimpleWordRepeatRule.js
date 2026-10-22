// Java: org.languagetool.rules.ru.RussianSimpleWordRepeatRule
import { Pattern } from '../../../lib/java/regex/index.js';
import { WordRepeatRule } from '../../../core/rules/WordRepeatRule.js';

const PATTERN = Pattern.compile('[a-zA-Zа-яёА-ЯЁ]');

// Java: RussianSimpleWordRepeatRule
export class RussianSimpleWordRepeatRule extends WordRepeatRule {
  static FQCN = 'org.languagetool.rules.ru.RussianSimpleWordRepeatRule';

  // Java: RussianSimpleWordRepeatRule#ignore(AnalyzedTokenReadings[],int)
  ignore(tokens, position) {
    if (this.wordRepetitionOf('-', tokens, position)) {
      return true;
    }
    if (this.wordRepetitionOf('и', tokens, position)) {
      return true;
    }
    if (this.wordRepetitionOf('по', tokens, position)) {
      return true;
    }
    if (tokens[position - 1].getToken() === 'ПО' && tokens[position].getToken() === 'по') {
      return true; // "ПО по"
    }
    if (tokens[position - 1].getToken() === 'по' && tokens[position].getToken() === 'ПО') {
      return true; // "по ПО"
    }
    if (this.wordRepetitionOf('что', tokens, position)) {
      return true;
    }
    if (PATTERN.matcher(tokens[position].getToken()).matches()
        && position > 1
        && PATTERN.matcher(tokens[position - 1].getToken()).matches()) {
      // spelling with spaces in between: "L L"
      return true;
    }
    return super.ignore(tokens, position);
  }
}
