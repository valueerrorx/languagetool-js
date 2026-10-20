// org.languagetool.rules.en.YMDNewYearDateFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { RuntimeException } from '../../../lib/java/errors.js';
import { YMDDateHelper } from '../../../core/rules/YMDDateHelper.js';
import { NewYearDateFilter } from './NewYearDateFilter.js';

// Java: YMDNewYearDateFilter
export class YMDNewYearDateFilter extends NewYearDateFilter {
  static FQCN = 'org.languagetool.rules.en.YMDNewYearDateFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.en.YMDNewYearDateFilter()' }];

  ymdDateHelper = new YMDDateHelper();

  // Java: YMDNewYearDateFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, args, patternTokenPos, patternTokens, tokenPositions) {
    if (args.containsKey('year') || args.containsKey('month') || args.containsKey('day')) {
      throw new RuntimeException("Set only 'weekDay' and 'date' for " + 'YMDDateCheckFilter');
    }
    args = this.ymdDateHelper.parseDate(args);
    return super.acceptRuleMatch(this.ymdDateHelper.correctDate(match, args), args, patternTokenPos, patternTokens, tokenPositions);
  }
}

registerClass(YMDNewYearDateFilter.FQCN, YMDNewYearDateFilter);
