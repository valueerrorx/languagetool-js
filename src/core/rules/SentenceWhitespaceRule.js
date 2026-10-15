// org.languagetool.rules.SentenceWhitespaceRule
import { javaTrim, replaceChar } from '../../lib/java/strings.js';
import { isNumeric } from '../../lib/java/StringUtils.js';
import { TextLevelRule } from './model/TextLevelRule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { Categories } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';
import { containsLineBreak } from '../text/StringTools.js';

// Java: SentenceWhitespaceRule#isOnlySpaces(String)
function isOnlySpaces(token) {
  for (let i = 0; i < token.length; i++) {
    if (token.charAt(i) !== ' ') {
      return false;
    }
  }
  return true;
}

// Java: SentenceWhitespaceRule#isSpaceToken(AnalyzedTokenReadings)
function isSpaceToken(token) {
  return isOnlySpaces(token.getToken());
}

// Java: SentenceWhitespaceRule#followsSentenceEnd(AnalyzedTokenReadings[],int)
function followsSentenceEnd(tokens, whitespacePos) {
  for (let i = whitespacePos - 1; i > 0; i--) {
    if (!tokens[i].isWhitespace()) {
      return isSentenceEndToken(tokens[i].getToken());
    }
  }
  return false;
}

// Java: SentenceWhitespaceRule#isSentenceEndToken(String)
function isSentenceEndToken(token) {
  return '.' === token || '!' === token || '?' === token;
}

// Java: SentenceWhitespaceRule#getWhitespaceLength(AnalyzedTokenReadings[],int,int)
function getWhitespaceLength(tokens, from, to) {
  let length = 0;
  for (let i = from; i <= to; i++) {
    length += tokens[i].getToken().length;
  }
  return length;
}

// Java: SentenceWhitespaceRule#getLeadingSpacesLength(AnalyzedTokenReadings[])
function getLeadingSpacesLength(tokens) {
  let length = 0;
  for (let i = 1; i < tokens.length && isSpaceToken(tokens[i]); i++) {
    length += tokens[i].getToken().length;
  }
  return length;
}

// Java: SentenceWhitespaceRule#hasTextAfterLeadingSpaces(AnalyzedTokenReadings[],int)
function hasTextAfterLeadingSpaces(tokens, leadingSpacesLength) {
  const pos = getTokenIndexAfterLeadingSpaces(tokens, leadingSpacesLength);
  return pos < tokens.length && !tokens[pos].isWhitespace() && !isLineBreakToken(tokens[pos]);
}

// Java: SentenceWhitespaceRule#getTokenIndexAfterLeadingSpaces(AnalyzedTokenReadings[],int)
function getTokenIndexAfterLeadingSpaces(tokens, leadingSpacesLength) {
  let pos = 1;
  let spacesLength = 0;
  while (pos < tokens.length && spacesLength < leadingSpacesLength) {
    spacesLength += tokens[pos].getToken().length;
    pos++;
  }
  return pos;
}

// Java: SentenceWhitespaceRule#isFollowedByNonWhitespaceToken(AnalyzedTokenReadings[],int)
function isFollowedByNonWhitespaceToken(tokens, whitespacePos) {
  return whitespacePos + 1 < tokens.length
      && !tokens[whitespacePos + 1].isWhitespace()
      && !isLineBreakToken(tokens[whitespacePos + 1]);
}

// Java: SentenceWhitespaceRule#startsWithLineBreak(AnalyzedTokenReadings[])
function startsWithLineBreak(tokens) {
  return tokens.length > 1 && isLineBreakToken(tokens[1]);
}

// Java: SentenceWhitespaceRule#isLineBreakToken(AnalyzedTokenReadings)
function isLineBreakToken(token) {
  return token.isLinebreak() || containsLineBreak(token.getToken());
}

// Java: SentenceWhitespaceRule
export class SentenceWhitespaceRule extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.SentenceWhitespaceRule';

  // Java: SentenceWhitespaceRule(ResourceBundle) / SentenceWhitespaceRule(ResourceBundle,int)
  constructor(messages, maxSpacesBetweenSentences = 1) {
    super(messages);
    this.maxSpacesBetweenSentences = maxSpacesBetweenSentences;
    this.setCategory(Categories.TYPOGRAPHY.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Whitespace);
  }

  // Java: SentenceWhitespaceRule#getId()
  getId() {
    return 'SENTENCE_WHITESPACE';
  }

  // Java: SentenceWhitespaceRule#getDescription()
  getDescription() {
    return this.messages.getString('missing_space_between_sentences');
  }

  // Java: SentenceWhitespaceRule#getMessage(boolean)
  getMessage() {
    return this.messages.getString('addSpaceBetweenSentences');
  }

  // Java: SentenceWhitespaceRule#match(List)
  match(sentences) {
    let isFirstSentence = true;
    let prevSentenceEndingWhitespace = '';
    let prevSentenceEndsWithLineBreak = false;
    let prevSentenceEndsWithNumber = false;
    const ruleMatches = [];
    let pos = 0;
    for (const sentence of sentences) {
      const tokens = sentence.getTokens();
      this.addRepeatedWhitespaceMatches(sentence, tokens, pos, ruleMatches);
      if (isFirstSentence) {
        isFirstSentence = false;
      } else if (!prevSentenceEndsWithLineBreak && !startsWithLineBreak(tokens)) {
        const leadingSpacesLength = getLeadingSpacesLength(tokens);
        if (isOnlySpaces(prevSentenceEndingWhitespace)
            && prevSentenceEndingWhitespace.length + leadingSpacesLength > this.maxSpacesBetweenSentences
            && (prevSentenceEndingWhitespace.length > 0 || leadingSpacesLength > 0)
            && hasTextAfterLeadingSpaces(tokens, leadingSpacesLength)) {
          const ruleMatch = new RuleMatch(this, sentence, pos - prevSentenceEndingWhitespace.length,
            pos + leadingSpacesLength,
            this.messages.getString('whitespace_repetition'));
          ruleMatch.setSuggestedReplacement(' ');
          ruleMatches.push(ruleMatch);
        } else if (prevSentenceEndingWhitespace.length === 0 && tokens.length > 1) {
          const firstToken = tokens[1].getToken();
          const ruleMatch = new RuleMatch(this, sentence, pos, pos + firstToken.length, this.getMessage(prevSentenceEndsWithNumber));
          ruleMatch.setSuggestedReplacement(' ' + firstToken);
          ruleMatches.push(ruleMatch);
        }
      }
      if (tokens.length > 0) {
        const lastTokenReadings = tokens[tokens.length - 1];
        const lastToken = lastTokenReadings.getToken();
        prevSentenceEndingWhitespace = javaTrim(replaceChar(lastToken, 0xa0, 0x20)).length === 0 ? lastToken : '';
        prevSentenceEndsWithLineBreak = isLineBreakToken(lastTokenReadings);
      }
      if (tokens.length > 1) {
        const prevLastToken = tokens[tokens.length - 2].getToken();
        prevSentenceEndsWithNumber = isNumeric(prevLastToken);
      }
      pos += sentence.getCorrectedTextLength();
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: SentenceWhitespaceRule#addRepeatedWhitespaceMatches(AnalyzedSentence,AnalyzedTokenReadings[],int,List)
  // Some tokenizers keep "Sentence.  Next" as one analyzed sentence, so repeated
  // spaces after sentence-ending punctuation need to be detected inside the token stream.
  addRepeatedWhitespaceMatches(sentence, tokens, pos, ruleMatches) {
    for (let i = 1; i < tokens.length; i++) {
      if (isSpaceToken(tokens[i]) && followsSentenceEnd(tokens, i)) {
        const firstWhitespace = i;
        let lastWhitespace = i;
        for (i++; i < tokens.length && isSpaceToken(tokens[i]); i++) {
          lastWhitespace = i;
        }
        i--;
        if (getWhitespaceLength(tokens, firstWhitespace, lastWhitespace) > this.maxSpacesBetweenSentences
            && isFollowedByNonWhitespaceToken(tokens, lastWhitespace)) {
          const ruleMatch = new RuleMatch(this, sentence, pos + tokens[firstWhitespace].getStartPos(),
            pos + tokens[lastWhitespace].getEndPos(), this.messages.getString('whitespace_repetition'));
          ruleMatch.setSuggestedReplacement(' ');
          ruleMatches.push(ruleMatch);
        }
      }
    }
  }

  // Java: SentenceWhitespaceRule#minToCheckParagraph()
  minToCheckParagraph() {
    return 0;
  }
}
