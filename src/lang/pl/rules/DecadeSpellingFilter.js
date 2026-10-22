// Java: org.languagetool.rules.pl.DecadeSpellingFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { IllegalArgumentException, NullPointerException } from '../../../lib/java/errors.js';
import { Integer } from '../../../lib/java/int.js';
import { javaReplace, substring } from '../../../lib/java/strings.js';
import { RuleFilter } from '../../../core/patterns/RuleFilter.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';

const numbers = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
const letters = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];

// Java: DecadeSpellingFilter
export class DecadeSpellingFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.pl.DecadeSpellingFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.pl.DecadeSpellingFilter()' }];

  // Java: DecadeSpellingFilter#getRomanNumber(int)
  getRomanNumber(num) {
    let roman = '';
    let n = num; // n represents the part of num that still has to be converted to Roman numeral representation
    for (let i = 0; i < numbers.length; i++) {
      while (n >= numbers[i]) {
        roman += letters[i];
        n -= numbers[i];
      }
    }
    return roman;
  }

  // Java: DecadeSpellingFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, args) {
    try {
      const lata = args.get('lata');
      if (lata === null || lata === undefined) {
        throw new NullPointerException('Cannot invoke "String.substring(int)" because the return value of "java.util.Map.get(Object)" is null');
      }
      const decade = substring(lata, 2);
      const century = substring(lata, 0, 2);
      const cent = Integer.parseInt(century);
      const message = javaReplace(javaReplace(match.getMessage(), '{dekada}', decade), '{wiek}', this.getRomanNumber(cent + 1));
      const ruleMatch = new RuleMatch(match.getRule(), match.getSentence(), match.getFromPos(), match.getToPos(), match.getPatternFromPos(), match.getPatternToPos(),
        message, match.getShortMessage(), match.getFromPos() === 0, null);
      ruleMatch.setType(match.getType());
      return ruleMatch;
    } catch (e) {
      if (e instanceof IllegalArgumentException) {
        // ignore it silently
        return null;
      }
      throw e;
    }
  }
}

registerClass(DecadeSpellingFilter.FQCN, DecadeSpellingFilter);
