// org.languagetool.rules.de.YMDDateCheckFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { RuntimeException } from '../../../lib/java/errors.js';
import { YMDDateHelper } from '../../../core/rules/YMDDateHelper.js';
import { DateCheckFilter } from './DateCheckFilter.js';

// Java: YMDDateCheckFilter
export class YMDDateCheckFilter extends DateCheckFilter {
  static FQCN = 'org.languagetool.rules.de.YMDDateCheckFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.de.YMDDateCheckFilter()' }];

  ymdDateHelper = new YMDDateHelper();

  // Java: YMDDateCheckFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, args, patternTokenPos, patternTokens, tokenPositions) {
    if (args.containsKey('year') || args.containsKey('month') || args.containsKey('day')) {
      throw new RuntimeException("Set only 'weekDay' and 'date' for " + 'YMDDateCheckFilter');
    }
    // DEV-017: parent expects token indexes; the wrapper's text values are checked as weekday vs. date text
    return this.acceptRuleMatchFromText(match, this.ymdDateHelper.parseDate(args));
  }
}

registerClass(YMDDateCheckFilter.FQCN, YMDDateCheckFilter);
