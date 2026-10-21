// org.languagetool.rules.de.RecentYearFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { Calendar } from '../../../lib/java/Calendar.js';
import { Integer } from '../../../lib/java/int.js';
import { RuleFilter } from '../../../core/patterns/RuleFilter.js';

// Java: RecentYearFilter
export class RecentYearFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.de.RecentYearFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.de.RecentYearFilter()' }];

  // Java: RecentYearFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, arguments_) {
    const thisYear = Calendar.getInstance().get(Calendar.YEAR);
    const maxYear = thisYear - Integer.parseInt(arguments_.get('maxYearsBack'));
    const year = Integer.parseInt(arguments_.get('year'));
    if (year < thisYear && year >= maxYear) {
      return match;
    }
    return null;
  }
}

registerClass(RecentYearFilter.FQCN, RecentYearFilter);
