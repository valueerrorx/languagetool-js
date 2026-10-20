// org.languagetool.rules.en.YMDDateCheckFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { RuntimeException } from '../../../lib/java/errors.js';
import { YMDDateHelper } from '../../../core/rules/YMDDateHelper.js';
import { DateCheckFilter } from './DateCheckFilter.js';

// Java: YMDDateCheckFilter
export class YMDDateCheckFilter extends DateCheckFilter {
  static FQCN = 'org.languagetool.rules.en.YMDDateCheckFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.en.YMDDateCheckFilter()' }];

  ymdDateHelper = new YMDDateHelper();

  // Java: YMDDateCheckFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, args, patternTokenPos, patternTokens, tokenPositions) {
    if (args.containsKey('year') || args.containsKey('month') || args.containsKey('day')) {
      throw new RuntimeException("Set only 'weekDay' and 'date' for " + 'YMDDateCheckFilter');
    }
    return super.acceptRuleMatch(match, this.ymdDateHelper.parseDate(args), patternTokenPos, patternTokens, tokenPositions);
  }
}

registerClass(YMDDateCheckFilter.FQCN, YMDDateCheckFilter);
