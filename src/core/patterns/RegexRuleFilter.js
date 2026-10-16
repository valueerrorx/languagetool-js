// org.languagetool.rules.patterns.RegexRuleFilter (filter for RegexPatternRule matches)
import { AbstractMethodError } from '../../lib/java/errors.js';

// Java: RegexRuleFilter
export class RegexRuleFilter {
  static FQCN = 'org.languagetool.rules.patterns.RegexRuleFilter';

  // Java: RegexRuleFilter#acceptRuleMatch(RuleMatch,Map,AnalyzedSentence,Matcher) (abstract)
  acceptRuleMatch() {
    throw new AbstractMethodError('org.languagetool.rules.patterns.RegexRuleFilter.acceptRuleMatch');
  }
}
