// org.languagetool.rules.ParagraphRepeatBeginningRule
import { Pattern } from '../../lib/java/regex/index.js';
import { Character } from '../../lib/java/Character.js';
import { charAt } from '../../lib/java/strings.js';
import { TextLevelRule } from './model/TextLevelRule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { Categories } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';
import { isParagraphEnd } from '../Tools.js';

const QUOTES_REGEX = Pattern.compile('[’\'"„“”»«‚‘›‹()\\[\\]]');

// Java: ParagraphRepeatBeginningRule
export class ParagraphRepeatBeginningRule extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.ParagraphRepeatBeginningRule';

  // Java: ParagraphRepeatBeginningRule(ResourceBundle,Language)
  constructor(messages, lang) {
    super(messages);
    this.setCategory(Categories.STYLE.getCategory(messages));
    this.lang = lang;
    this.setLocQualityIssueType(ITSIssueType.Style);
    this.setDefaultOff();
  }

  // Java: ParagraphRepeatBeginningRule#getId()
  getId() {
    return 'PARAGRAPH_REPEAT_BEGINNING_RULE';
  }

  // Java: ParagraphRepeatBeginningRule#getDescription()
  getDescription() {
    return this.messages.getString('repetition_paragraph_beginning_desc');
  }

  // Java: ParagraphRepeatBeginningRule#isArticle(AnalyzedTokenReadings)
  isArticle(token) {
    return token.hasPosTagStartingWith('DT');
  }

  // Java: ParagraphRepeatBeginningRule#numCharEqualBeginning(AnalyzedTokenReadings[],AnalyzedTokenReadings[])
  numCharEqualBeginning(lastTokens, nextTokens) {
    if (lastTokens.length < 2 || nextTokens.length < 2
      || lastTokens[1].isWhitespace() || nextTokens[1].isWhitespace()) {
      return 0;
    }
    let nToken = 1;
    let lastToken = lastTokens[nToken].getToken();
    let nextToken = nextTokens[nToken].getToken();
    if (QUOTES_REGEX.matcher(lastToken).matches() && lastToken === nextToken) {
      if (lastTokens.length <= nToken + 1 || nextTokens.length <= nToken + 1) {
        return 0;
      }
      nToken++;
      lastToken = lastTokens[nToken].getToken();
      nextToken = nextTokens[nToken].getToken();
    }
    if (!Character.isLetter(charAt(lastToken, 0))) {
      return 0;
    }
    if (lastTokens.length > nToken + 1 && this.isArticle(lastTokens[nToken]) && lastToken === nextToken) {
      if (nextTokens.length <= nToken + 1) {
        return 0;
      }
      nToken++;
      lastToken = lastTokens[nToken].getToken();
      nextToken = nextTokens[nToken].getToken();
    }
    if (!Character.isLetter(charAt(lastToken, 0))) {
      return 0;
    }
    if (lastToken === nextToken) {
      return lastTokens[nToken].getEndPos();
    }
    return 0;
  }

  // Java: ParagraphRepeatBeginningRule#match(List)
  match(sentences) {
    const ruleMatches = [];
    if (sentences.length < 1) {
      return this.toRuleMatchArray(ruleMatches);
    }
    let nextPos = 0;
    let lastPos = 0;
    let endPos;
    let lastSentence = sentences[0];
    let lastTokens = lastSentence.getTokensWithoutWhitespace();
    let nextSentence;
    let nextTokens;

    for (let n = 0; n < sentences.length - 1; n++) {
      nextPos += sentences[n].getText().length;
      if (isParagraphEnd(sentences, n, this.lang)) {
        nextSentence = sentences[n + 1];
        nextTokens = nextSentence.getTokensWithoutWhitespace();
        endPos = this.numCharEqualBeginning(lastTokens, nextTokens);
        if (endPos > 0) {
          let startPos = lastPos + lastTokens[1].getStartPos();
          if (startPos < lastPos + endPos) {
            let msg = this.messages.getString('repetition_paragraph_beginning_last_msg');
            let ruleMatch = new RuleMatch(this, lastSentence, startPos, lastPos + endPos, msg);
            ruleMatches.push(ruleMatch);

            startPos = nextPos + nextTokens[1].getStartPos();
            msg = this.messages.getString('repetition_paragraph_beginning_last_msg');
            ruleMatch = new RuleMatch(this, nextSentence, startPos, nextPos + endPos, msg);
            ruleMatches.push(ruleMatch);
          }
        }
        lastSentence = nextSentence;
        lastTokens = nextTokens;
        lastPos = nextPos;
      }
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: ParagraphRepeatBeginningRule#minToCheckParagraph()
  minToCheckParagraph() {
    return 1;
  }
}
