// org.languagetool.rules.LongParagraphRule
import { MessageFormat } from '../../lib/java/MessageFormat.js';
import { javaReplaceFirst } from '../../lib/java/regex/index.js';
import { castToIntAt } from '../../lib/java/casts.js';
import { TextLevelRule } from './model/TextLevelRule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { RuleOption } from './model/RuleOption.js';
import { Categories } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';
import { Tag } from './model/Tag.js';
import { isParagraphEnd } from '../Tools.js';

const DEFAULT_MAX_WORDS = 220;
const LIMIT_MAX_WORDS = 300;

// Java: LongParagraphRule
export class LongParagraphRule extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.LongParagraphRule';
  static RULE_ID = 'TOO_LONG_PARAGRAPH';

  // Java: LongParagraphRule(ResourceBundle,Language,UserConfig[,int[,boolean]]); defaultActive is unused in Java (always setDefaultOff)
  constructor(messages, lang, userConfig, defaultWords = -1) {
    super(messages);
    this.setCategory(Categories.STYLE.getCategory(messages));
    this.lang = lang;
    this.maxWords = DEFAULT_MAX_WORDS;
    this.setDefaultOff();
    this.setOfficeDefaultOn(); // Default for LO/OO is always On
    if (defaultWords > 0) {
      this.maxWords = defaultWords;
    }
    if (userConfig !== null && userConfig !== undefined) {
      const cf = userConfig.getConfigValueByID(this.getId());
      if (cf !== null) {
        this.maxWords = castToIntAt(cf, 0);
      }
    }
    this.setLocQualityIssueType(ITSIssueType.Style);
    this.setTags([Tag.picky]);
  }

  // Java: LongParagraphRule#getDescription()
  getDescription() {
    return MessageFormat.format(this.messages.getString('long_paragraph_rule_desc'), this.maxWords);
  }

  // Java: LongParagraphRule#getId()
  getId() {
    return LongParagraphRule.RULE_ID;
  }

  // Java: LongParagraphRule#getRuleOptions()
  getRuleOptions() {
    return [new RuleOption(this.maxWords, MessageFormat.format(this.messages.getString('guiLongParagraphsText'), LIMIT_MAX_WORDS), 5, LIMIT_MAX_WORDS)];
  }

  // Java: LongParagraphRule#getMessage()
  getMessage() {
    return MessageFormat.format(this.messages.getString('long_paragraph_rule_msg'), this.maxWords);
  }

  // Java: LongParagraphRule#match(List)
  match(sentences) {
    const ruleMatches = [];
    let pos = 0;
    let startPos = 0;
    let endPos = 0;
    let wordCount = 0;
    let paraHasLinebreaks = false;
    for (let n = 0; n < sentences.length; n++) {
      const sentence = sentences[n];
      const paragraphEnd = isParagraphEnd(sentences, n, this.lang);
      if (!paragraphEnd && javaReplaceFirst(sentence.getText(), '^\n+', '').includes('\n')) {
        // e.g. text with manually added line breaks (e.g. issues on github with "- [ ]" syntax)
        paraHasLinebreaks = true;
      }
      const tokens = sentence.getTokensWithoutWhitespace();
      for (const token of tokens) {
        if (!token.isWhitespace() && !token.isSentenceStart() && !token.isNonWord()) {
          wordCount++;
          if (wordCount === this.maxWords) {
            endPos = token.getEndPos() + pos;
          } else if (wordCount === ((this.maxWords - 1) | 0)) {
            startPos = token.getStartPos() + pos;
          }
        }
      }
      if (paragraphEnd) {
        if (wordCount > ((this.maxWords + 5) | 0) && !paraHasLinebreaks) { // + 5: don't show match almost at end of paragraph
          const ruleMatch = new RuleMatch(this, sentence, startPos, endPos, this.getMessage());
          ruleMatches.push(ruleMatch);
        }
        wordCount = 0;
        paraHasLinebreaks = false;
      }
      pos += sentence.getCorrectedTextLength();
    }
    if (wordCount > this.maxWords) {
      const ruleMatch = new RuleMatch(this, startPos, endPos, this.getMessage());
      ruleMatches.push(ruleMatch);
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: LongParagraphRule#minToCheckParagraph()
  minToCheckParagraph() {
    return 0;
  }
}
