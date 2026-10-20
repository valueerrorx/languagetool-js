// org.languagetool.rules.en.OrdinalSuffixFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { listGet } from '../../../lib/java/arrays.js';
import { RuleFilter } from '../../../core/patterns/RuleFilter.js';

// Java: OrdinalSuffixFilter
export class OrdinalSuffixFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.en.OrdinalSuffixFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.en.OrdinalSuffixFilter()' }];
  static PATTERN = Pattern.compile('.*(11|12|13)');
  static NON_DIGITS = Pattern.compile('[^0-9]');

  // Java: OrdinalSuffixFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match) {
    const ordinal = OrdinalSuffixFilter.NON_DIGITS.matcher(listGet(match.getSuggestedReplacements(), 0)).replaceAll('');
    if (OrdinalSuffixFilter.PATTERN.matcher(ordinal).matches()) {
      match.setSuggestedReplacement(ordinal + 'th');
    } else if (ordinal.endsWith('1')) {
      match.setSuggestedReplacement(ordinal + 'st');
    } else if (ordinal.endsWith('2')) {
      match.setSuggestedReplacement(ordinal + 'nd');
    } else if (ordinal.endsWith('3')) {
      match.setSuggestedReplacement(ordinal + 'rd');
    } else {
      match.setSuggestedReplacement(ordinal + 'th');
    }
    return match;
  }
}

registerClass(OrdinalSuffixFilter.FQCN, OrdinalSuffixFilter);
