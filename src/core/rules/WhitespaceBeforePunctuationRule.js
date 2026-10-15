// org.languagetool.rules.WhitespaceBeforePunctuationRule
import { Character } from '../../lib/java/Character.js';
import { StringIndexOutOfBoundsException } from '../../lib/java/errors.js';
import { Rule } from './model/Rule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { Categories } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';
import { isNonBreakingWhitespace } from '../text/StringTools.js';

// Java: WhitespaceBeforePunctuationRule
export class WhitespaceBeforePunctuationRule extends Rule {
  static FQCN = 'org.languagetool.rules.WhitespaceBeforePunctuationRule';

  // Java: WhitespaceBeforePunctuationRule(ResourceBundle)
  constructor(messages) {
    super(messages);
    this.setCategory(Categories.TYPOGRAPHY.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Whitespace);
  }

  // Java: WhitespaceBeforePunctuationRule#getId()
  getId() {
    return 'WHITESPACE_PUNCTUATION';
  }

  // Java: WhitespaceBeforePunctuationRule#getDescription()
  getDescription() {
    return this.messages.getString('desc_whitespace_before_punctuation');
  }

  // Java: WhitespaceBeforePunctuationRule#match(AnalyzedSentence)
  match(sentence) {
    const ruleMatches = [];
    const tokens = sentence.getTokens();
    let prevWhite = false;
    let prevLen = 0;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i].getToken();
      const isWhitespace = tokens[i].isWhitespace() || isNonBreakingWhitespace(token)
          || tokens[i].isFieldCode();
      let msg = null;
      let suggestionText = null;
      if (prevWhite) {
        if (token === ':') {
          msg = this.messages.getString('no_space_before_colon');
          suggestionText = ':';
          // exception case for figures such as " : 0"
          if (i + 2 < tokens.length
              && tokens[i + 1].isWhitespace()
              && Character.isDigit(charAt0(tokens[i + 2].getToken()))) {
            msg = null;
          }
        } else if (token === ';') {
          msg = this.messages.getString('no_space_before_semicolon');
          suggestionText = ';';
        } else if (i > 1 && token === '%') {
          const prevPrevToken = tokens[i - 2].getToken();
          if (prevPrevToken.length > 0 && Character.isDigit(prevPrevToken.charCodeAt(0))) {
            msg = this.messages.getString('no_space_before_percentage');
            suggestionText = '%';
          }
        }
      }
      if (msg !== null) {
        const fromPos = tokens[i - 1].getStartPos();
        const toPos = tokens[i - 1].getStartPos() + 1 + prevLen;
        const ruleMatch = new RuleMatch(this, sentence, fromPos, toPos, msg);
        ruleMatch.setSuggestedReplacement(suggestionText);
        ruleMatches.push(ruleMatch);
      }
      prevWhite = isWhitespace && !tokens[i].isFieldCode(); // OOo code before comma/dot
      prevLen = tokens[i].getToken().length;
    }

    return this.toRuleMatchArray(ruleMatches);
  }
}

// Java: String#charAt(0)
function charAt0(s) {
  if (s.length === 0) throw new StringIndexOutOfBoundsException('Index 0 out of bounds for length 0');
  return s.charCodeAt(0);
}
