// org.languagetool.rules.de.GermanWordRepeatRule (ANTI_PATTERNS need PatternToken/DisambiguationPatternRule: ported with the pattern rules)
import { Pattern } from '../../../lib/java/regex/index.js';
import { WordRepeatRule } from '../../../core/rules/WordRepeatRule.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { notPortedYet } from '../../../core/language/components.js';

const SINGLE_CHAR = Pattern.compile('(?i)^[a-z]$');

// Java: GermanWordRepeatRule
export class GermanWordRepeatRule extends WordRepeatRule {
  static FQCN = 'org.languagetool.rules.de.GermanWordRepeatRule';

  // Java: GermanWordRepeatRule(ResourceBundle,Language)
  constructor(messages, language) {
    super(messages, language);
    this.setCategory(Categories.REDUNDANCY.getCategory(messages));
    this.addExamplePair(Example.wrong('In diesem Satz <marker>ist ist</marker> ein Wort doppelt.'),
      Example.fixed('In diesem Satz <marker>ist</marker> ein Wort doppelt.'));
    // Java: antiPatterns = cacheAntiPatterns(language, ANTI_PATTERNS) (lazy; ANTI_PATTERNS use PatternToken, F25/F34)
    this.antiPatterns = () => {
      throw notPortedYet('GermanWordRepeatRule.ANTI_PATTERNS (PatternToken, DisambiguationPatternRule)');
    };
  }

  // Java: GermanWordRepeatRule#getId()
  getId() {
    return 'GERMAN_WORD_REPEAT_RULE';
  }

  // Java: GermanWordRepeatRule#ignore(AnalyzedTokenReadings[],int)
  ignore(tokens, position) {
    // "Warum fragen Sie sie nicht selbst?"
    if ((position !== 2 && tokens[position - 1].getToken() === 'Sie' && tokens[position].getToken() === 'sie')
        || (tokens[position - 1].getToken() === 'sie' && tokens[position].getToken() === 'Sie')) {
      return true;
    }
    // "Ihre verbotenen Waren waren bisher nicht aufgeflogen"
    if ((position !== 2 && tokens[position - 1].getToken() === 'Waren' && tokens[position].getToken() === 'waren')
        || (tokens[position - 1].getToken() === 'waren' && tokens[position].getToken() === 'Waren')) {
      return true;
    }
    if (position > 2 && tokens[position - 1].getToken() === 'sie' && tokens[position].getToken() === 'sie') {
      if (tokens[position - 2].hasPosTag('KON:UNT')) {
        // "Sie tut das, damit sie sie nicht fortschickt"
        return true;
      }
      if (tokens.length - 1 > position
        && ((tokens[position - 2].hasPosTagStartingWith('VER:3:') && tokens[position + 1].hasPosTag('ZUS')) // "Dann warfen sie sie weg."
            || (tokens[position - 2].hasPosTagStartingWith('VER:MOD:3') && tokens[position + 1].hasPosTag('VER:INF:NON')))) { // "Dann konnte sie sie sehen."
        return true;
      }
    }
    if (SINGLE_CHAR.matcher(tokens[position].getToken()).matches()
          && position > 1
          && SINGLE_CHAR.matcher(tokens[position - 2].getToken()).matches()
          && (position + 1 < tokens.length)
          && SINGLE_CHAR.matcher(tokens[position + 1].getToken()).matches()) {
      // spelling with spaces in between: "A B B A"
      return true;
    }
    return super.ignore(tokens, position);
  }

  // Java: GermanWordRepeatRule#getAntiPatterns()
  getAntiPatterns() {
    return this.antiPatterns();
  }
}
