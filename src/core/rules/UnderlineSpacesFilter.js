// org.languagetool.rules.UnderlineSpacesFilter
import { substring } from '../../lib/java/strings.js';
import { isWhitespace } from '../text/StringTools.js';
import { RuleFilter } from '../patterns/RuleFilter.js';

// Java: UnderlineSpacesFilter
export class UnderlineSpacesFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.UnderlineSpacesFilter';

  // Java: UnderlineSpacesFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List) (underline the whitespaces before and/or after the marker)
  acceptRuleMatch(match, arguments_) {
    const underlineSpaces = this.getRequired('underlineSpaces', arguments_); // before/after/both
    const sentence = match.getSentence().getText();
    if (underlineSpaces === 'before' || underlineSpaces === 'both') {
      if (match.getFromPos() - 1 >= 0
        && isWhitespace(substring(sentence, match.getFromPos() - 1, match.getFromPos()))) {
        match.setOffsetPosition(match.getFromPos() - 1, match.getToPos());
      }
    }
    if (underlineSpaces === 'after' || underlineSpaces === 'both') {
      if (match.getToPos() + 1 < sentence.length
        && isWhitespace(substring(sentence, match.getToPos(), match.getToPos() + 1))) {
        match.setOffsetPosition(match.getFromPos(), match.getToPos() + 1);
      }
    }
    return match;
  }
}
