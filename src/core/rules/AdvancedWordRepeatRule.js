// org.languagetool.rules.AdvancedWordRepeatRule
import { Rule } from './model/Rule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { Categories } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';
import { SENTENCE_END_TAGNAME } from '../JLanguageToolConstants.js';
import { isEmpty } from '../text/StringTools.js';

// Java: AdvancedWordRepeatRule (abstract: getExcludedWordsPattern, getExcludedNonWordsPattern, getExcludedPos, getMessage, getShortMessage)
export class AdvancedWordRepeatRule extends Rule {
  static FQCN = 'org.languagetool.rules.AdvancedWordRepeatRule';

  // Java: AdvancedWordRepeatRule(ResourceBundle); Java does not call super(messages)
  constructor(messages) {
    super();
    this.setCategory(Categories.MISC.getCategory(messages));
    this.setDefaultOff();
    this.setLocQualityIssueType(ITSIssueType.Style);
  }

  // Java: AdvancedWordRepeatRule#match(AnalyzedSentence) (final)
  match(sentence) {
    const ruleMatches = [];
    const tokens = sentence.getTokensWithoutWhitespace();
    let repetition = false;
    const inflectedWords = new Set();
    let prevLemma;
    let curToken = 0;
    // start from real token, 0 = SENT_START
    for (let i = 1; i < tokens.length; i++) {
      const token = tokens[i].getToken();

      // avoid "..." etc. to be matched:
      let isWord = true;
      let hasLemma = true;

      if (token.length < 2) {
        isWord = false;
      }

      for (const analyzedToken of tokens[i].getReadings()) {
        const posTag = analyzedToken.getPOSTag();
        if (posTag !== null) {
          if (isEmpty(posTag)) {
            isWord = false;
            break;
          }
          const lemma = analyzedToken.getLemma();
          if (lemma === null) {
            hasLemma = false;
            break;
          }
          if (this.getExcludedWordsPattern().has(lemma)) {
            isWord = false;
            break;
          }
          const m2 = this.getExcludedPos().matcher(posTag);
          if (m2.matches()) {
            isWord = false;
            break;
          }
        } else {
          hasLemma = false;
        }
      }

      const m1 = this.getExcludedNonWordsPattern().matcher(tokens[i].getToken());
      if (isWord && m1.matches()) {
        isWord = false;
      }

      prevLemma = '';
      if (isWord) {
        let notSentEnd = false;
        for (const analyzedToken of tokens[i].getReadings()) {
          const pos = analyzedToken.getPOSTag();
          if (pos !== null) {
            notSentEnd = notSentEnd || SENTENCE_END_TAGNAME === pos;
          }
          if (hasLemma) {
            const curLemma = analyzedToken.getLemma();
            if (prevLemma !== curLemma && !notSentEnd) {
              if (inflectedWords.has(curLemma) && curToken !== i) {
                repetition = true;
              } else {
                inflectedWords.add(analyzedToken.getLemma());
                curToken = i;
              }
            }
            prevLemma = curLemma;
          } else if (inflectedWords.has(tokens[i].getToken()) && !notSentEnd) {
            repetition = true;
          } else {
            inflectedWords.add(tokens[i].getToken());
          }
        }
      }
      if (repetition) {
        const pos = tokens[i].getStartPos();
        const ruleMatch = new RuleMatch(this, sentence, pos, pos + token.length, this.getMessage(), this.getShortMessage());
        ruleMatches.push(ruleMatch);
        repetition = false;
      }
    }
    return this.toRuleMatchArray(ruleMatches);
  }
}
