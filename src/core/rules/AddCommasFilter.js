// org.languagetool.rules.AddCommasFilter
import { Pattern } from '../../lib/java/regex/index.js';
import { equalsIgnoreCase, substring } from '../../lib/java/strings.js';
import { arrayGet } from '../../lib/java/arrays.js';
import { isCapitalizedWord, isPunctuationOrSymbol } from '../text/StringTools.js';
import { RuleFilter } from '../patterns/RuleFilter.js';
import { RuleMatch } from './model/RuleMatch.js';

const OPENING_QUOTES = Pattern.compile('[«“"‘\'„¿¡]', Pattern.DOTALL);

// Java: AddCommasFilter
export class AddCommasFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.AddCommasFilter';

  // Java: AddCommasFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, arguments_) {
    // for patterns ", aun así" suggest "; aun así," and ", aun así,"
    const suggestSemicolon = this.getOptional('suggestSemicolon', arguments_);
    let bSuggestSemicolon = false;
    if (suggestSemicolon !== null && equalsIgnoreCase(suggestSemicolon, 'true')) {
      bSuggestSemicolon = true;
    }
    const tokens = match.getSentence().getTokensWithoutWhitespace();
    let postagFrom = 1;
    while (postagFrom < tokens.length && tokens[postagFrom].getStartPos() < match.getFromPos()) {
      postagFrom++;
    }
    let postagTo = postagFrom;
    while (postagTo < tokens.length && tokens[postagTo].getEndPos() < match.getToPos()) {
      postagTo++;
    }
    const beforeOK = (postagFrom === 1) || isPunctuationOrSymbol(arrayGet(tokens, postagFrom - 1).getToken())
      || isCapitalizedWord(arrayGet(tokens, postagFrom).getToken());
    const afterOK = !(postagTo + 1 > tokens.length - 1)
      && isPunctuationOrSymbol(arrayGet(tokens, postagTo + 1).getToken())
      && !(arrayGet(tokens, postagTo + 1).isWhitespaceBefore() && OPENING_QUOTES.matcher(arrayGet(tokens, postagTo + 1).getToken()).matches());
    if (beforeOK && afterOK) {
      return null;
    }
    let newMatch = null;
    if (bSuggestSemicolon && arrayGet(tokens, postagFrom - 1).getToken() === ',' && !afterOK) {
      newMatch = new RuleMatch(match.getRule(), match.getSentence(), arrayGet(tokens, postagFrom - 1).getStartPos(),
        arrayGet(tokens, postagTo).getEndPos(), match.getMessage(), match.getShortMessage());
      newMatch.addSuggestedReplacement(
        '; ' + substring(match.getSentence().getText(), match.getFromPos(), match.getToPos()) + ',');
      newMatch.addSuggestedReplacement(
        ', ' + substring(match.getSentence().getText(), match.getFromPos(), match.getToPos()) + ',');
    } else if (beforeOK && !afterOK) {
      newMatch = new RuleMatch(match.getRule(), match.getSentence(), arrayGet(tokens, postagTo).getStartPos(), match.getToPos(),
        match.getMessage(), match.getShortMessage());
      newMatch.setSuggestedReplacement(arrayGet(tokens, postagTo).getToken() + ',');
    } else if (!beforeOK && afterOK) {
      let startPos = arrayGet(tokens, postagFrom).getStartPos();
      if (arrayGet(tokens, postagFrom).isWhitespaceBefore()) {
        startPos--;
      }
      newMatch = new RuleMatch(match.getRule(), match.getSentence(), startPos, arrayGet(tokens, postagFrom).getEndPos(),
        match.getMessage(), match.getShortMessage());
      newMatch.setSuggestedReplacement(', ' + arrayGet(tokens, postagFrom).getToken());
    } else if (!beforeOK && !afterOK) {
      let startPos = arrayGet(tokens, postagFrom).getStartPos();
      if (arrayGet(tokens, postagFrom).isWhitespaceBefore()) {
        startPos--;
      }
      newMatch = new RuleMatch(match.getRule(), match.getSentence(), startPos, arrayGet(tokens, postagTo).getEndPos(),
        match.getMessage(), match.getShortMessage());
      newMatch.setSuggestedReplacement(
        ', ' + substring(match.getSentence().getText(), match.getFromPos(), match.getToPos()) + ',');
    }
    return newMatch;
  }
}
