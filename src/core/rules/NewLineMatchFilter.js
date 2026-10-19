// org.languagetool.rules.NewLineMatchFilter
import { substring } from '../../lib/java/strings.js';

const INVISIBLE_SEPARATOR = '⁣';

// Java: NewLineMatchFilter (implements RuleMatchFilter)
export class NewLineMatchFilter {
  static FQCN = 'org.languagetool.rules.NewLineMatchFilter';

  // Java: NewLineMatchFilter#filter(List,AnnotatedText)
  filter(ruleMatches, text) {
    return ruleMatches.filter((ruleMatch) => {
      let from = ruleMatch.getFromPos();
      let to = ruleMatch.getToPos();

      // without some old tests failing with ArrayOutOfBoundExceptions. Should be safe to just keep the matches.
      if (text.getOriginalText().length < from || text.getOriginalText().length < to) {
        return true;
      }

      let matchText = substring(text.getOriginalText(), from, to);

      // remove tailing and leading \n and ⁣ from the matchText and update the from and to positions of the match
      while (matchText.endsWith('\n') || matchText.endsWith(INVISIBLE_SEPARATOR)) {
        matchText = substring(matchText, 0, matchText.length - 1);
        to--;
        if (to < from) {
          // only new line match can be removed
          return false;
        }
      }
      while (matchText.startsWith('\n') || matchText.startsWith(INVISIBLE_SEPARATOR)) {
        matchText = substring(matchText, 1);
        from++;
      }
      const newSuggestionReplacements = [];
      ruleMatch.getSuggestedReplacements().forEach((replacement) => {
        let newReplacement = replacement;
        while (newReplacement.endsWith('\n') || newReplacement.endsWith(INVISIBLE_SEPARATOR)) {
          newReplacement = substring(newReplacement, 0, newReplacement.length - 1);
        }
        while (newReplacement.startsWith('\n') || newReplacement.startsWith(INVISIBLE_SEPARATOR)) {
          newReplacement = substring(newReplacement, 1);
        }
        newSuggestionReplacements.push(newReplacement);
      });
      if (newSuggestionReplacements.length === 1 && newSuggestionReplacements[0] === matchText) {
        return false;
      }
      ruleMatch.setOffsetPosition(from, to);
      ruleMatch.setSuggestedReplacements(newSuggestionReplacements);
      return true;
    });
  }
}
