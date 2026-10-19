// org.languagetool.rules.WhiteSpaceBeforeParagraphEnd
import { TextLevelRule } from './model/TextLevelRule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { Categories } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';
import { isParagraphEnd } from '../Tools.js';

// Java: WhiteSpaceBeforeParagraphEnd
export class WhiteSpaceBeforeParagraphEnd extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.WhiteSpaceBeforeParagraphEnd';

  // Java: WhiteSpaceBeforeParagraphEnd(ResourceBundle,Language[,boolean])
  constructor(messages, lang, defaultActive = false) {
    super(messages);
    this.setCategory(Categories.STYLE.getCategory(messages));
    this.lang = lang;
    if (!defaultActive) {
      this.setDefaultOff();
    }
    this.setOfficeDefaultOn();
    this.setLocQualityIssueType(ITSIssueType.Style);
  }

  // Java: WhiteSpaceBeforeParagraphEnd#getId()
  getId() {
    return 'WHITESPACE_PARAGRAPH';
  }

  // Java: WhiteSpaceBeforeParagraphEnd#getDescription()
  getDescription() {
    return this.messages.getString('whitespace_before_parapgraph_end_desc');
  }

  // Java: WhiteSpaceBeforeParagraphEnd#match(List)
  match(sentences) {
    const ruleMatches = [];
    let pos = 0;
    for (let n = 0; n < sentences.length; n++) {
      const sentence = sentences[n];
      if (isParagraphEnd(sentences, n, this.lang)) {
        const tokens = sentence.getTokens();
        let lb;
        let lw;
        for (lb = tokens.length - 1; lb > 0 && tokens[lb].isLinebreak(); lb--);
        for (lw = lb; lw > 0 && tokens[lw].isWhitespace() && tokens[lw].getToken() !== '​'; lw--);
        if (lw < lb) {
          const fromPos = tokens[lw].isWhitespace() ? pos + tokens[lw + 1].getStartPos() : pos + tokens[lw].getStartPos();
          const toPos = pos + tokens[lb].getEndPos();
          const ruleMatch = new RuleMatch(this, sentence, fromPos, toPos, this.messages.getString('whitespace_before_parapgraph_end_msg'));
          if (lw > 0 && !tokens[lw].isWhitespace()) {
            ruleMatch.setSuggestedReplacement(tokens[lw].getToken());
          } else {
            ruleMatch.setSuggestedReplacement('');
          }
          ruleMatches.push(ruleMatch);
        }
      }
      pos += sentence.getCorrectedTextLength();
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: WhiteSpaceBeforeParagraphEnd#minToCheckParagraph()
  minToCheckParagraph() {
    return 0;
  }
}
