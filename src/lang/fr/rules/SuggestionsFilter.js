// org.languagetool.rules.fr.SuggestionsFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { RuleFilter } from '../../../core/patterns/RuleFilter.js';

// Java: SuggestionsFilter
export class SuggestionsFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.fr.SuggestionsFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.fr.SuggestionsFilter()' }];

  // Java: SuggestionsFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, arguments_) {
    const removeSuggestionsRegexp = this.getRequired('RemoveSuggestionsRegexp', arguments_);
    const ruleMatch = match;
    const replacements = match.getSuggestedReplacements();
    const newReplacements = [];
    const p = Pattern.compile(removeSuggestionsRegexp, Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    for (const r of replacements) {
      if (!p.matcher(r).matches()) {
        newReplacements.push(r);
      }
    }
    ruleMatch.setSuggestedReplacements(newReplacements);
    return ruleMatch;
  }
}

registerClass(SuggestionsFilter.FQCN, SuggestionsFilter);
