// org.languagetool.rules.DateRangeChecker
import { IllegalArgumentException } from '../../lib/java/errors.js';
import { Integer } from '../../lib/java/int.js';
import { RuleFilter } from '../patterns/RuleFilter.js';

// Java: DateRangeChecker
export class DateRangeChecker extends RuleFilter {
  static FQCN = 'org.languagetool.rules.DateRangeChecker';

  // Java: DateRangeChecker#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, args) {
    try {
      const x = Integer.parseInt(args.get('x'));
      const y = Integer.parseInt(args.get('y'));
      if (x >= y) {
        return match;
      }
    } catch (ignore) {
      if (!(ignore instanceof IllegalArgumentException)) throw ignore;
      // if something's fishy with the number - ignore it silently, it's not a date range
      return null;
    }
    return null;
  }
}
