// org.languagetool.rules.fr.DMYDateCheckFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { RuntimeException } from '../../../lib/java/errors.js';
import { javaSplit } from '../../../lib/java/strings.js';
import { DateCheckFilter } from './DateCheckFilter.js';

// Java: DMYDateCheckFilter
export class DMYDateCheckFilter extends DateCheckFilter {
  static FQCN = 'org.languagetool.rules.fr.DMYDateCheckFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.fr.DMYDateCheckFilter()' }];

  // Java: DMYDateCheckFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, args, patternTokenPos, patternTokens, tokenPositions) {
    if (args.containsKey('year') || args.containsKey('month') || args.containsKey('day')) {
      throw new RuntimeException("Set only 'weekDay' and 'date' for " + 'DMYDateCheckFilter');
    }
    const dateString = this.getRequired('date', args);
    const parts = javaSplit(dateString, '-');
    if (parts.length !== 3) {
      throw new RuntimeException("Expected date in format 'dd-mm-yyyy': '" + dateString + "'");
    }
    args.put('day', parts[0]);
    args.put('month', parts[1]);
    args.put('year', parts[2]);
    return super.acceptRuleMatch(match, args, patternTokenPos, patternTokens, tokenPositions);
  }
}

registerClass(DMYDateCheckFilter.FQCN, DMYDateCheckFilter);
