// Java: org.languagetool.rules.ru.INNNumberFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { getNumericValue } from '../../../lib/java/Character.js';
import { IllegalArgumentException } from '../../../lib/java/errors.js';
import { RuleFilter } from '../../../core/patterns/RuleFilter.js';

const DIGIT_SYMBOL_PATTERN = Pattern.compile('(\\d*)');

// Java: INNNumberFilter
export class INNNumberFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.ru.INNNumberFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.ru.INNNumberFilter()' }];

  // Java: INNNumberFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, args) {
    const INNNumberString = this.getRequired('inn', args);
    const matcherdigitsymbol = DIGIT_SYMBOL_PATTERN.matcher(INNNumberString);
    try {
      if (matcherdigitsymbol.matches()) {
        const intTab = [];
        for (let i = 0; i < INNNumberString.length; i++) intTab.push(getNumericValue(INNNumberString.charCodeAt(i)));
        let kz1 = 0;
        let kz2 = 0;
        switch (intTab.length) {
          case 10:
            kz1 = (intTab[0] * 2 + intTab[1] * 4 + intTab[2] * 10 + intTab[3] * 3 + intTab[4] * 5 + intTab[5] * 9 + intTab[6] * 4 + intTab[7] * 6 + intTab[8] * 8) % 11;
            if (kz1 > 9) { kz1 = kz1 - 10; }
            if (intTab[9] === kz1) {
              return null;
            }
            return match;
          case 12:
            kz1 = (intTab[0] * 7 + intTab[1] * 2 + intTab[2] * 4 + intTab[3] * 10 + intTab[4] * 3 + intTab[5] * 5 + intTab[6] * 9 + intTab[7] * 4 + intTab[8] * 6 + intTab[9] * 8) % 11;
            kz2 = (intTab[0] * 3 + intTab[1] * 7 + intTab[2] * 2 + intTab[3] * 4 + intTab[4] * 10 + intTab[5] * 3 + intTab[6] * 5 + intTab[7] * 9 + intTab[8] * 4 + intTab[9] * 6 + intTab[10] * 8) % 11;
            if (kz1 > 9) { kz1 = kz1 - 10; }
            if (kz2 > 9) { kz2 = kz2 - 10; }
            if (intTab[10] === kz1 && intTab[11] === kz2) {
              return null;
            }
            return match;
          default:
            return null;
        }
      }
      return null;
    } catch (ignore) {
      // happens with 'inn' like '7676gj8778' - those should be caught by a different rule
      if (ignore instanceof IllegalArgumentException) return null;
      throw ignore;
    }
  }
}

registerClass(INNNumberFilter.FQCN, INNNumberFilter);
