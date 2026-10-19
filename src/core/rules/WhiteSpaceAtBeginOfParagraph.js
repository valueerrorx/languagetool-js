// org.languagetool.rules.WhiteSpaceAtBeginOfParagraph
import { Rule } from './model/Rule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { Categories } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';

// Java: WhiteSpaceAtBeginOfParagraph
export class WhiteSpaceAtBeginOfParagraph extends Rule {
  static FQCN = 'org.languagetool.rules.WhiteSpaceAtBeginOfParagraph';

  // Java: WhiteSpaceAtBeginOfParagraph(ResourceBundle[,boolean])
  constructor(messages, defaultActive = false) {
    super(messages);
    this.setCategory(Categories.STYLE.getCategory(messages));
    if (!defaultActive) {
      this.setDefaultOff();
    }
    this.setOfficeDefaultOn();
    this.setLocQualityIssueType(ITSIssueType.Style);
  }

  // Java: WhiteSpaceAtBeginOfParagraph#getId()
  getId() {
    return 'WHITESPACE_PARAGRAPH_BEGIN';
  }

  // Java: WhiteSpaceAtBeginOfParagraph#getDescription()
  getDescription() {
    return this.messages.getString('whitespace_at_begin_parapgraph_desc');
  }

  // Java: WhiteSpaceAtBeginOfParagraph#isWhitespaceDel(AnalyzedTokenReadings)
  isWhitespaceDel(token) {
    // returns only whitespaces that may be deleted
    // "​" is excluded to prevent function (e.g. page number, page count) in LO/OO
    return token.isWhitespace() && token.getToken() !== '​' && !token.isLinebreak();
  }

  // Java: WhiteSpaceAtBeginOfParagraph#match(AnalyzedSentence)
  match(sentence) {
    const ruleMatches = [];
    const tokens = sentence.getTokens();
    let i;
    for (i = 1; i < tokens.length && this.isWhitespaceDel(tokens[i]); i++);
    if (i > 1 && i < tokens.length && !tokens[i].isLinebreak()) {
      const ruleMatch = new RuleMatch(this, sentence, tokens[1].getStartPos(),
        tokens[i].getEndPos(), this.messages.getString('whitespace_at_begin_parapgraph_msg'));
      ruleMatch.setSuggestedReplacement(tokens[i].getToken());
      ruleMatches.push(ruleMatch);
    }
    return this.toRuleMatchArray(ruleMatches);
  }
}
