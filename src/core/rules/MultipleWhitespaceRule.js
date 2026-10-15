// org.languagetool.rules.MultipleWhitespaceRule
import { TextLevelRule } from './model/TextLevelRule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { Categories } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';
import { isNonBreakingWhitespace } from '../text/StringTools.js';

// Java: MultipleWhitespaceRule#isFirstWhite(AnalyzedTokenReadings); first white space is not a linebreak, function or footnote
function isFirstWhite(token) {
  return (token.isWhitespace() || isNonBreakingWhitespace(token.getToken()))
      && !token.isLinebreak()
      && !token.getToken().includes('\u200B') && !token.getToken().includes('\uFEFF') && !token.getToken().includes('\u2060');
}

// Java: MultipleWhitespaceRule#isRemovableWhite(AnalyzedTokenReadings); removable white space are not linebreaks, tabs, functions or footnotes
function isRemovableWhite(token) {
  return (token.isWhitespace() || isNonBreakingWhitespace(token.getToken()))
      && !token.isLinebreak() && token.getToken() !== '\t'
      // exclude invisible spaces:
      && !token.getToken().includes('\u200B') && !token.getToken().includes('\uFEFF') && !token.getToken().includes('\u2060');
}

// Java: MultipleWhitespaceRule
export class MultipleWhitespaceRule extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.MultipleWhitespaceRule';

  // Java: MultipleWhitespaceRule(ResourceBundle,Language)
  constructor(messages) {
    super(messages);
    this.setCategory(Categories.TYPOGRAPHY.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Whitespace);
  }

  // Java: MultipleWhitespaceRule#getId()
  getId() {
    return 'WHITESPACE_RULE';
  }

  // Java: MultipleWhitespaceRule#getDescription()
  getDescription() {
    return this.messages.getString('desc_whitespacerepetition');
  }

  // Java: MultipleWhitespaceRule#match(List)
  match(sentences) {
    const ruleMatches = [];
    let pos = 0;
    for (const sentence of sentences) {
      const tokens = sentence.getTokens();
      // note: we start from token 1
      // token no. 0 is guaranteed to be SENT_START
      for (let i = 1; i < tokens.length; i++) {
        if (isFirstWhite(tokens[i])) {
          const nFirst = i;
          for (i++; i < tokens.length && isRemovableWhite(tokens[i]); i++);
          i--;
          if (i > nFirst) {
            const message = this.messages.getString('whitespace_repetition');
            const ruleMatch = new RuleMatch(this, sentence, pos + tokens[nFirst].getStartPos(),
              pos + tokens[i].getEndPos(), message);
            ruleMatch.setSuggestedReplacement(tokens[nFirst].getToken());
            ruleMatches.push(ruleMatch);
          }
        } else if (tokens[i].isLinebreak()) {
          for (i++; i < tokens.length && isRemovableWhite(tokens[i]); i++);
        }
      }
      pos += sentence.getCorrectedTextLength();
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: MultipleWhitespaceRule#minToCheckParagraph()
  minToCheckParagraph() {
    return 0;
  }
}
