// org.languagetool.rules.CheckPostagsInSuggestionFilter
import { IOException } from '../../lib/java/errors.js';
import { javaSplit } from '../../lib/java/strings.js';
import { listGet } from '../../lib/java/arrays.js';
import { RuleFilter } from '../patterns/RuleFilter.js';
import { castToPatternRule } from './filterCasts.js';

// Java: CheckPostagsInSuggestionFilter
export class CheckPostagsInSuggestionFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.CheckPostagsInSuggestionFilter';

  // Java: CheckPostagsInSuggestionFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, arguments_) {
    const ruleMatch = match;
    const language = castToPatternRule(match.getRule()).getLanguage();
    const tagger = language.getTagger();
    if (tagger === null || tagger === undefined) {
      throw new IOException('Language tagger not available in rule ' + match.getRule().getFullId());
    }
    const replacements = match.getSuggestedReplacements();
    const newReplacements = [];
    const postagsListStr = this.getRequired('PostagsList', arguments_);
    const postagsList = javaSplit(postagsListStr, ',');
    for (const replacement of replacements) {
      const tokensInSuggestion = javaSplit(replacement, '\\s+');
      if (tokensInSuggestion.length !== postagsList.length || postagsList.length === 0) {
        throw new IOException('Mismatch between number of tokens and number of tags in rule ' + match.getRule().getFullId()
          + ' [' + tokensInSuggestion.join(', ') + '] [' + postagsList.join(', ') + ']'); // List.of(array).toString()
      }
      let postagsMatch = true;
      const atrs = tagger.tag([...tokensInSuggestion]);
      for (let i = 0; i < postagsList.length; i++) {
        postagsMatch = (postagsMatch & listGet(atrs, i).matchesPosTagRegex(postagsList[i])) === 1; // non-short-circuit &
        if (!postagsMatch) {
          break;
        }
      }
      if (postagsMatch) {
        newReplacements.push(replacement);
      }
    }
    if (newReplacements.length === 0) {
      return null;
    }
    ruleMatch.setSuggestedReplacements(newReplacements);
    return ruleMatch;
  }
}
