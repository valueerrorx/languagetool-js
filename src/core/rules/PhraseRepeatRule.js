// org.languagetool.rules.PhraseRepeatRule
import { Character } from '../../lib/java/Character.js';
import { charAt, equalsIgnoreCase } from '../../lib/java/strings.js';
import { isNumericSpace } from '../../lib/java/StringUtils.js';
import { Rule } from './model/Rule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { Categories } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';
import { isEmoji } from '../text/StringTools.js';

// longest phrase length checked first, so a 3-word repetition isn't reported twice as a shorter 2-word repetition
const MAX_PHRASE_LENGTH = 3;
const MIN_PHRASE_LENGTH = 2;

// Java: PhraseRepeatRule
export class PhraseRepeatRule extends Rule {
  static FQCN = 'org.languagetool.rules.PhraseRepeatRule';

  // Java: PhraseRepeatRule(ResourceBundle,Language)
  constructor(messages) {
    super(messages);
    this.setCategory(Categories.MISC.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Duplication);
  }

  // Java: PhraseRepeatRule#ignore(AnalyzedTokenReadings[],int,int)
  ignore() {
    return false;
  }

  // Java: PhraseRepeatRule#getId()
  getId() {
    return 'PHRASE_REPEAT_RULE';
  }

  // Java: PhraseRepeatRule#getDescription()
  getDescription() {
    return this.messages.getString('desc_repetition');
  }

  // Java: PhraseRepeatRule#estimateContextForSureMatch()
  estimateContextForSureMatch() {
    return 1;
  }

  // Java: PhraseRepeatRule#match(AnalyzedSentence)
  match(sentence) {
    const ruleMatches = [];
    const tokens = this.getSentenceWithImmunization(sentence).getTokensWithoutWhitespace();
    // we start from token 1, token no. 0 is guaranteed to be SENT_START
    let i = 1;
    while (i < tokens.length) {
      let matchedLength = 0;
      // check longer phrases first so we don't report a 3-word repetition as a 2-word one
      for (let phraseLength = MAX_PHRASE_LENGTH; phraseLength >= MIN_PHRASE_LENGTH; phraseLength--) {
        if (i + 2 * phraseLength <= tokens.length && this.phraseRepeatedAt(tokens, i, phraseLength) && !this.ignore(tokens, i, phraseLength)) {
          matchedLength = phraseLength;
          break;
        }
      }
      if (matchedLength > 0) {
        const firstStart = tokens[i].getStartPos();
        const secondEnd = tokens[i + 2 * matchedLength - 1].getEndPos();
        const phrase = this.phraseToString(tokens, i, matchedLength);
        const msg = this.messages.getString('desc_repetition'); // TODO update message
        const ruleMatch = this.createRuleMatch(phrase, firstStart, secondEnd, msg, sentence);
        ruleMatches.push(ruleMatch);
        // skip past the whole repeated span to avoid overlapping matches
        i += 2 * matchedLength;
      } else {
        i++;
      }
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: PhraseRepeatRule#createRuleMatch(String,int,int,String,AnalyzedSentence)
  createRuleMatch(phrase, fromPos, toPos, msg, sentence) {
    const ruleMatch = new RuleMatch(this, sentence, fromPos, toPos, msg, this.messages.getString('desc_repetition_short'));
    ruleMatch.setSuggestedReplacement(phrase);
    return ruleMatch;
  }

  // Java: PhraseRepeatRule#phraseRepeatedAt(AnalyzedTokenReadings[],int,int)
  phraseRepeatedAt(tokens, position, phraseLength) {
    let sawWord = false;
    for (let j = 0; j < phraseLength; j++) {
      const first = tokens[position + j];
      const second = tokens[position + phraseLength + j];
      if (first.isImmunized() || second.isImmunized()) {
        return false;
      }
      const firstToken = first.getToken();
      const secondToken = second.getToken();
      if (!equalsIgnoreCase(firstToken, secondToken)) {
        return false;
      }
      if (this.isWord(firstToken)) {
        sawWord = true;
      }
    }
    // require at least one actual word in the phrase, so e.g. ", , , ," isn't flagged
    return sawWord;
  }

  // Java: PhraseRepeatRule#phraseToString(AnalyzedTokenReadings[],int,int)
  phraseToString(tokens, position, phraseLength) {
    let sb = '';
    for (let j = 0; j < phraseLength; j++) {
      if (j > 0 && tokens[position + j].isWhitespaceBefore()) {
        sb += ' ';
      }
      sb += tokens[position + j].getToken();
    }
    return sb;
  }

  // Java: PhraseRepeatRule#isWord(String); avoid "..." etc. to be matched
  isWord(token) {
    if (isEmoji(token)) {
      return false;
    }
    if (isNumericSpace(token)) {
      return false;
    } else if (token.length === 1) {
      const c = charAt(token, 0);
      if (!Character.isLetter(c)) {
        return false;
      }
    }
    return true;
  }
}
