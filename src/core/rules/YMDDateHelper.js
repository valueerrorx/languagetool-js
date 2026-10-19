// org.languagetool.rules.YMDDateHelper
import { IllegalArgumentException, RuntimeException } from '../../lib/java/errors.js';
import { Integer } from '../../lib/java/int.js';
import { javaReplace, javaSplit } from '../../lib/java/strings.js';
import { RuleMatch } from './model/RuleMatch.js';

// Java: YMDDateHelper
export class YMDDateHelper {
  static FQCN = 'org.languagetool.rules.YMDDateHelper';

  // Java: YMDDateHelper#parseDate(Map)
  parseDate(args) {
    const dateString = args.get('date');
    if (dateString === null || dateString === undefined) {
      throw new IllegalArgumentException("Missing key 'date'");
    }
    const parts = javaSplit(dateString, '-');
    if (parts.length !== 3) {
      throw new RuntimeException("Expected date in format 'yyyy-mm-dd': '" + dateString + "'");
    }
    args.put('year', parts[0]);
    args.put('month', parts[1]);
    args.put('day', parts[2]);
    return args;
  }

  // Java: YMDDateHelper#correctDate(RuleMatch,Map)
  correctDate(match, args) {
    const year = args.get('year');
    const month = args.get('month');
    const day = args.get('day');
    const correctYear = (Integer.parseInt(year) + 1) | 0;
    const correctDate = `${correctYear}-${month}-${day}`; // String.format("%d-%s-%s", ...)
    const message = javaReplace(match.getMessage(), '{realDate}', correctDate);
    const ruleMatch = new RuleMatch(match.getRule(), match.getSentence(), match.getFromPos(), match.getToPos(), message, match.getShortMessage());
    ruleMatch.setType(match.getType());
    return ruleMatch;
  }
}
