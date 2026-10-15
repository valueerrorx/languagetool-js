// org.languagetool.rules.WordRepeatRule
import { Character } from '../../lib/java/Character.js';
import { equalsIgnoreCase } from '../../lib/java/strings.js';
import { isNumericSpace } from '../../lib/java/StringUtils.js';
import { Rule } from './model/Rule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { Categories } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';
import { isEmoji } from '../text/StringTools.js';

// Java: WordRepeatRule
export class WordRepeatRule extends Rule {
  static FQCN = 'org.languagetool.rules.WordRepeatRule';

  // Java: WordRepeatRule(ResourceBundle,Language)
  constructor(messages) {
    super(messages);
    this.setCategory(Categories.MISC.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Duplication);
  }

  // Java: WordRepeatRule#ignore(AnalyzedTokenReadings[],int)
  ignore(tokens, position) {
    if (this.wordRepetitionOf('Phi', tokens, position)) {
      return true; // "Phi Phi Islands"
    } else if (this.wordRepetitionOf('Li', tokens, position)) {
      return true; // "Li Li", Chinese name
    } else if (this.wordRepetitionOf('Xiao', tokens, position)) {
      return true; // "Xiao Xiao", name
    } else if (this.wordRepetitionOf('Duran', tokens, position)) {
      return true; // "Duran Duran"
    } else if (this.wordRepetitionOf('Wagga', tokens, position)) {
      return true; // "Wagga Wagga"
    } else if (this.wordRepetitionOf('Abdullah', tokens, position)) {
      return true; // https://en.wikipedia.org/wiki/Abdullah_Abdullah
    } else if (this.wordRepetitionOf('Nwe', tokens, position)) {
      return true; // e.g. https://en.wikipedia.org/wiki/Nwe_Nwe_Aung
    } else if (this.wordRepetitionOf('Pago', tokens, position)) {
      return true; // "Pago Pago"
    } else if (this.wordRepetitionOf('Cao', tokens, position)) {
      return true; // https://en.wikipedia.org/wiki/Cao_Cao
    }
    return false;
  }

  // Java: WordRepeatRule#getId()
  getId() {
    return 'WORD_REPEAT_RULE';
  }

  // Java: WordRepeatRule#getDescription()
  getDescription() {
    return this.messages.getString('desc_repetition');
  }

  // Java: WordRepeatRule#estimateContextForSureMatch()
  estimateContextForSureMatch() {
    return 1;
  }

  // Java: WordRepeatRule#match(AnalyzedSentence)
  match(sentence) {
    const ruleMatches = [];
    const tokens = this.getSentenceWithImmunization(sentence).getTokensWithoutWhitespace();
    let prevToken = '';
    // we start from token 1, token no. 0 is guaranteed to be SENT_START
    for (let i = 1; i < tokens.length; i++) {
      const token = tokens[i].getToken();
      if (tokens[i].isImmunized()) {
        prevToken = '';
        continue;
      }
      if (this.isWord(token) && equalsIgnoreCase(prevToken, token) && !this.ignore(tokens, i)) {
        const msg = this.messages.getString('repetition');
        const prevPos = tokens[i - 1].getStartPos();
        const pos = tokens[i].getStartPos();
        const ruleMatch = this.createRuleMatch(prevToken, token, prevPos, pos, msg, sentence);
        ruleMatches.push(ruleMatch);
      }
      prevToken = token;
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: WordRepeatRule#createRuleMatch(String,String,int,int,String,AnalyzedSentence)
  createRuleMatch(prevToken, token, prevPos, pos, msg, sentence) {
    const ruleMatch = new RuleMatch(this, sentence, prevPos, pos + prevToken.length, msg, this.messages.getString('desc_repetition_short'));
    ruleMatch.setSuggestedReplacement(prevToken);
    return ruleMatch;
  }

  // Java: WordRepeatRule#wordRepetitionOf(String,AnalyzedTokenReadings[],int)
  wordRepetitionOf(word, tokens, position) {
    return position > 0 && tokens[position - 1].getToken() === word && tokens[position].getToken() === word;
  }

  // Java: WordRepeatRule#isWord(String); avoid "..." etc. to be matched
  isWord(token) {
    if (isEmoji(token)) {
      return false;
    }
    if (isNumericSpace(token)) {
      return false;
    } else if (token.length === 1) {
      const c = token.charCodeAt(0);
      if (!Character.isLetter(c)) {
        return false;
      }
    }
    return true;
  }
}
