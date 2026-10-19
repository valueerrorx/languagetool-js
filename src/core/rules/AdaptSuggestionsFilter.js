// org.languagetool.rules.AdaptSuggestionsFilter
import { RuleFilter } from '../patterns/RuleFilter.js';
import { AbstractPatternRule } from '../patterns/AbstractPatternRule.js';

// Java: AdaptSuggestionsFilter
export class AdaptSuggestionsFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.AdaptSuggestionsFilter';

  // Java: AdaptSuggestionsFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match) {
    const rule = match.getRule();
    if (rule instanceof AbstractPatternRule) {
      const adjustedSuggestions = [];
      const lang = rule.getLanguage();
      for (const replacement of match.getSuggestedReplacements()) {
        match.setOriginalErrorStr();
        adjustedSuggestions.push(lang.adaptSuggestion(replacement, match.getOriginalErrorStr()));
      }
      match.setSuggestedReplacements(adjustedSuggestions);
      return match;
    }
    return match;
  }
}
