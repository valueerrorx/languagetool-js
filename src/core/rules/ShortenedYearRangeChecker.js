// org.languagetool.rules.ShortenedYearRangeChecker
import { IllegalArgumentException } from '../../lib/java/errors.js';
import { Integer } from '../../lib/java/int.js';
import { substring } from '../../lib/java/strings.js';
import { RuleFilter } from '../patterns/RuleFilter.js';

// Java: ShortenedYearRangeChecker
export class ShortenedYearRangeChecker extends RuleFilter {
  static FQCN = 'org.languagetool.rules.ShortenedYearRangeChecker';

  // Java: ShortenedYearRangeChecker#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, args) {
    try {
      const x = Integer.parseInt(args.get('x'));
      const centuryPrefix = substring(args.get('x'), 0, 2);
      const y = Integer.parseInt(centuryPrefix + args.get('y'));
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
