// org.languagetool.rules.EmptyLineRule
import { TextLevelRule } from './model/TextLevelRule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { Categories } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';
import { isParagraphEnd } from '../Tools.js';

// Java: EmptyLineRule
export class EmptyLineRule extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.EmptyLineRule';

  // Java: EmptyLineRule(ResourceBundle,Language[,boolean])
  constructor(messages, lang, defaultActive = false) {
    super(messages);
    this.setCategory(Categories.STYLE.getCategory(messages));
    this.lang = lang;
    if (!defaultActive) {
      this.setDefaultOff();
    }
    this.setOfficeDefaultOn(); // Default for LO/OO is always On
    this.setLocQualityIssueType(ITSIssueType.Style);
  }

  // Java: EmptyLineRule#getId()
  getId() {
    return 'EMPTY_LINE';
  }

  // Java: EmptyLineRule#getDescription()
  getDescription() {
    return this.messages.getString('empty_line_rule_desc');
  }

  // Java: EmptyLineRule#match(List)
  match(sentences) {
    const ruleMatches = [];
    let pos = 0;
    for (let n = 0; n < sentences.length - 1; n++) {
      const sentence = sentences[n];
      if (isParagraphEnd(sentences, n, this.lang)) {
        if (this.isSecondParagraphEndMark(sentence.getText())) {
          const tokens = sentence.getTokensWithoutWhitespace();
          if (tokens.length > 1) {
            const fromPos = pos + tokens[tokens.length - 1].getStartPos();
            const toPos = pos + tokens[tokens.length - 1].getEndPos();
            const ruleMatch = new RuleMatch(this, sentence, fromPos, toPos, this.messages.getString('empty_line_rule_msg'));
            // Can't use SuggestedReplacement because of problems in LO/OO dialog with linebreaks
            ruleMatches.push(ruleMatch);
          }
        }
      }
      pos += sentence.getCorrectedTextLength();
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: EmptyLineRule#isSecondParagraphEndMark(String)
  isSecondParagraphEndMark(sentence) {
    if (this.lang.getSentenceTokenizer().singleLineBreaksMarksPara()) {
      if (sentence.endsWith('\n\n') || sentence.endsWith('\n\r\n\r')) {
        return true;
      }
    } else if (sentence.endsWith('\n\n\n\n') || sentence.endsWith('\n\r\n\r\n\r\n\r') || sentence.endsWith('\r\n\r\n\r\n\r\n')) {
      return true;
    }
    return false;
  }

  // Java: EmptyLineRule#minToCheckParagraph()
  minToCheckParagraph() {
    return 1;
  }
}
