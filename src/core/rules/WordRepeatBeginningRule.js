// org.languagetool.rules.WordRepeatBeginningRule
import { Character } from '../../lib/java/Character.js';
import { javaMatches } from '../../lib/java/regex/index.js';
import { charAt, javaTrim } from '../../lib/java/strings.js';
import { TextLevelRule } from './model/TextLevelRule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { Categories } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';

// Java: WordRepeatBeginningRule
export class WordRepeatBeginningRule extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.WordRepeatBeginningRule';

  // Java: WordRepeatBeginningRule(ResourceBundle,Language)
  constructor(messages) {
    super(messages);
    this.setCategory(Categories.REPETITIONS_STYLE.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Style);
  }

  // Java: WordRepeatBeginningRule#getId()
  getId() {
    return 'WORD_REPEAT_BEGINNING_RULE';
  }

  // Java: WordRepeatBeginningRule#getDescription()
  getDescription() {
    return this.messages.getString('desc_repetition_beginning');
  }

  // Java: WordRepeatBeginningRule#isAdverb(AnalyzedTokenReadings)
  isAdverb() {
    return false;
  }

  // Java: WordRepeatBeginningRule#isException(String)
  isException(token) {
    // avoid warning when having lists like "2007: ..." or the like
    return token === ':' || token === '–' || token === '-' || token === '✔️' || token === '➡️'
      || token === '—' || token === '⭐️' || token === '⚠️';
  }

  // Java: WordRepeatBeginningRule#isSentenceException(AnalyzedSentence)
  isSentenceException() {
    return false;
  }

  // Java: WordRepeatBeginningRule#match(List)
  match(sentences) {
    let lastToken = '';
    let beforeLastToken = '';
    const ruleMatches = [];
    let pos = 0;
    let prevSentence = null;
    for (const sentence of sentences) {
      if (this.isSentenceException(sentence)) {
        prevSentence = null;
        continue;
      }
      const tokens = sentence.getTokensWithoutWhitespace();
      let token = '';
      if (tokens.length > 1) {
        const analyzedToken = tokens[1];
        token = analyzedToken.getToken();
        if (tokens.length > 3) {
          // avoid "..." etc. to be matched:
          let isWord = true;
          if (token.length === 1) {
            if (!Character.isLetter(charAt(token, 0))) {
              isWord = false;
            }
          }
          if (isWord && lastToken === token && !this.isException(token) && !this.isException(tokens[2].getToken())
            && !this.isException(tokens[3].getToken()) && prevSentence !== null
            && javaMatches(javaTrim(prevSentence.getText()), '.+[.?!]$')) { // no matches for e.g. table cells
            let shortMsg;
            if (this.isAdverb(analyzedToken)) {
              shortMsg = this.messages.getString('desc_repetition_beginning_adv');
            } else if (beforeLastToken === token) {
              shortMsg = this.messages.getString('desc_repetition_beginning_word');
            } else {
              shortMsg = '';
            }
            if (shortMsg.length > 0) {
              const msg = shortMsg + ' ' + this.messages.getString('desc_repetition_beginning_thesaurus');
              const startPos = analyzedToken.getStartPos();
              const endPos = startPos + token.length;
              const ruleMatch = new RuleMatch(this, sentence, pos + startPos, pos + endPos, msg, shortMsg);
              const suggestions = this.getSuggestions(analyzedToken);
              if (suggestions.length > 0) {
                ruleMatch.setSuggestedReplacements(suggestions);
              }
              ruleMatches.push(ruleMatch);
            }
          }
        }
      }
      beforeLastToken = lastToken;
      lastToken = token;
      pos += sentence.getCorrectedTextLength();
      prevSentence = sentence;
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: WordRepeatBeginningRule#getSuggestions(AnalyzedTokenReadings)
  getSuggestions() {
    return [];
  }

  // Java: WordRepeatBeginningRule#minToCheckParagraph()
  minToCheckParagraph() {
    return 2;
  }
}
