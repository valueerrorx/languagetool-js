// org.languagetool.rules.DoublePunctuationRule
import { Rule } from './model/Rule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { Categories } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';

// Java: DoublePunctuationRule
export class DoublePunctuationRule extends Rule {
  static FQCN = 'org.languagetool.rules.DoublePunctuationRule';

  // Java: DoublePunctuationRule(ResourceBundle) / DoublePunctuationRule(ResourceBundle,URL)
  constructor(messages, url = null) {
    super(messages);
    this.setCategory(Categories.PUNCTUATION.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Typographical);
    if (url !== null && url !== undefined) {
      this.setUrl(url);
    }
  }

  // Java: DoublePunctuationRule#getId()
  getId() {
    return 'DOUBLE_PUNCTUATION';
  }

  // Java: DoublePunctuationRule#getDescription()
  getDescription() {
    return this.messages.getString('desc_double_punct');
  }

  // Java: DoublePunctuationRule#getCommaCharacter()
  getCommaCharacter() {
    return ',';
  }

  // Java: DoublePunctuationRule#match(AnalyzedSentence)
  match(sentence) {
    const ruleMatches = [];
    const tokens = sentence.getTokensWithoutWhitespace();
    let startPos = 0;
    let dotCount = 0;
    let commaCount = 0;
    for (let i = 1; i < tokens.length; i++) {
      const token = tokens[i].getToken();
      let nextToken = null;
      let prevPrevToken = null;
      if (i < tokens.length - 1) {
        nextToken = tokens[i + 1].getToken();
      }
      if (i > 1) {
        prevPrevToken = tokens[i - 2].getToken();
      }
      if ('.' === token) {
        dotCount++;
        commaCount = 0;
        startPos = tokens[i].getStartPos();
      } else if (this.getCommaCharacter() === token) {
        commaCount++;
        dotCount = 0;
        startPos = tokens[i].getStartPos();
      }

      if (dotCount === 2 && '.' !== nextToken && '…' !== nextToken
          && '/' !== token && '/' !== nextToken /* Unix path */
          && '\\' !== token && '\\' !== nextToken /* Windows path */
          && '?' !== prevPrevToken && '!' !== prevPrevToken
          && '…' !== prevPrevToken && '.' !== prevPrevToken) {
        const fromPos = Math.max(0, startPos - 1);
        const ruleMatch = new RuleMatch(this, sentence, fromPos, startPos + 1,
          this.getDotMessage(), this.messages.getString('double_dots_short'));
        ruleMatch.addSuggestedReplacement('.');
        ruleMatch.addSuggestedReplacement('…');
        ruleMatches.push(ruleMatch);
        dotCount = 0;
      } else if (commaCount === 2 && this.getCommaCharacter() !== nextToken) {
        const fromPos = Math.max(0, startPos - 1);
        const ruleMatch = new RuleMatch(this, sentence, fromPos, startPos + 1,
          this.getCommaMessage(), this.messages.getString('double_commas_short'));
        ruleMatch.setSuggestedReplacement(this.getCommaCharacter());
        ruleMatches.push(ruleMatch);
        commaCount = 0;
      }
      if ('.' !== token && this.getCommaCharacter() !== token) {
        dotCount = 0;
        commaCount = 0;
      }
    }

    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: DoublePunctuationRule#getDotMessage()
  getDotMessage() {
    return this.messages.getString('two_dots');
  }

  // Java: DoublePunctuationRule#getCommaMessage()
  getCommaMessage() {
    return this.messages.getString('two_commas');
  }
}
