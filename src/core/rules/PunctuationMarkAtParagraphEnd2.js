// org.languagetool.rules.PunctuationMarkAtParagraphEnd2
import { javaMatches } from '../../lib/java/regex/index.js';
import { NullPointerException } from '../../lib/java/errors.js';
import { TextLevelRule } from './model/TextLevelRule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { Categories } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';
import { isParagraphEnd } from '../Tools.js';

// more than this many word tokens needed for a "real" paragraph that requires a period (etc) at the end:
const TOKEN_THRESHOLD = 10;

// Java: PunctuationMarkAtParagraphEnd2
export class PunctuationMarkAtParagraphEnd2 extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.PunctuationMarkAtParagraphEnd2';

  // Java: PunctuationMarkAtParagraphEnd2(ResourceBundle,Language)
  constructor(messages, lang) {
    super(messages);
    if (lang === null || lang === undefined) throw new NullPointerException();
    this.lang = lang;
    this.setCategory(Categories.PUNCTUATION.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Grammar);
    this.setDefaultOff();
  }

  // Java: PunctuationMarkAtParagraphEnd2#getId()
  getId() {
    return 'PUNCTUATION_PARAGRAPH_END2';
  }

  // Java: PunctuationMarkAtParagraphEnd2#getDescription()
  getDescription() {
    return this.messages.getString('punctuation_mark_paragraph_end_desc');
  }

  // Java: PunctuationMarkAtParagraphEnd2#match(List)
  match(sentences) {
    const ruleMatches = [];
    let pos = 0;
    let sentPos = 0;
    let tokenCount = 0;
    for (const sentence of sentences) {
      const tokens = sentence.getTokens();
      for (const token of tokens) {
        if (!token.isNonWord() && !token.isWhitespace()) {
          tokenCount++;
        }
      }
      const lastNonSpaceToken = this.getLastNonSpaceToken(tokens);
      const isParaEnd = isParagraphEnd(sentences, sentPos, this.lang);
      if (isParaEnd && tokenCount > TOKEN_THRESHOLD
        && lastNonSpaceToken !== null && !javaMatches(lastNonSpaceToken.getToken(), '[:.?!…]') && !lastNonSpaceToken.isNonWord()) {
        const ruleMatch = new RuleMatch(this, sentence, pos + lastNonSpaceToken.getStartPos(), pos + lastNonSpaceToken.getEndPos(),
          this.messages.getString('punctuation_mark_paragraph_end_msg'));
        ruleMatch.setSuggestedReplacement(lastNonSpaceToken.getToken() + '.');
        ruleMatches.push(ruleMatch);
      }
      if (isParaEnd) {
        tokenCount = 0;
      }
      sentPos++;
      pos += sentence.getCorrectedTextLength();
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: PunctuationMarkAtParagraphEnd2#getLastNonSpaceToken(AnalyzedTokenReadings[])
  getLastNonSpaceToken(tokens) {
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (!tokens[i].isWhitespace()) {
        return tokens[i];
      }
    }
    return null;
  }

  // Java: PunctuationMarkAtParagraphEnd2#minToCheckParagraph()
  minToCheckParagraph() {
    return 0;
  }
}
