// org.languagetool.rules.de.ValidWordFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { NullPointerException } from '../../../lib/java/errors.js';
import { toLowerCase } from '../../../lib/java/strings.js';
import { RuleFilter } from '../../../core/patterns/RuleFilter.js';
import { GermanyGerman } from '../language/GermanyGerman.js';

// Java: ValidWordFilter
export class ValidWordFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.de.ValidWordFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.de.ValidWordFilter()' }];

  // Java: ValidWordFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, arguments_) {
    const word1Arg = arguments_.get('word1');
    const word2Arg = arguments_.get('word2');
    const word1 = word1Arg + word2Arg;
    if (word2Arg === null || word2Arg === undefined) throw new NullPointerException();
    const word2 = word1Arg + toLowerCase(word2Arg);
    const speller = GermanyGerman.getInstance().getDefaultSpellingRule();
    if (!speller.isMisspelled(word1) || !speller.isMisspelled(word2)) {
      // e.g. "(Promotions)Studierende" -> "Promotionsstudierende" is ok, so no match
      return null;
    }
    // all other cases, e.g.: "Das ist (vielleicht)der bessere Ansatz".
    return match;
  }
}

registerClass(ValidWordFilter.FQCN, ValidWordFilter);
