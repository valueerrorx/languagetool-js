// org.languagetool.rules.AbstractSpecificCaseRule
import { Rule } from './model/Rule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { Categories } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';
import { CachingWordListLoader } from './spelling/CachingWordListLoader.js';
import { javaSplit, javaTrim, toLowerCase } from '../../lib/java/strings.js';
import { isAllUppercase, startsWithUppercase } from '../text/StringTools.js';

// Java: AbstractSpecificCaseRule#lcToProperSpelling (keyed by the rule class)
const lcToProperSpelling = new Map();
// Java: AbstractSpecificCaseRule#maxLen (static, shared by all subclasses)
let maxLen = 0;

// Java: AbstractSpecificCaseRule (abstract: getPhrasesPath)
export class AbstractSpecificCaseRule extends Rule {
  static FQCN = 'org.languagetool.rules.AbstractSpecificCaseRule';

  // Java: AbstractSpecificCaseRule(ResourceBundle)
  constructor(messages) {
    super(messages);
    // used to speed up the server as the phrases are loaded in every initialization:
    this.phrasesListLoader = new CachingWordListLoader();
    super.setCategory(Categories.CASING.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Misspelling);
    this.loadPhrases();
  }

  // Java: AbstractSpecificCaseRule#getInitialCapitalMessage()
  getInitialCapitalMessage() {
    return 'The initials of the particular phrase must be capitals.';
  }

  // Java: AbstractSpecificCaseRule#getOtherCapitalizationMessage()
  getOtherCapitalizationMessage() {
    return 'The particular expression should follow the suggested capitalization.';
  }

  // Java: AbstractSpecificCaseRule#getShortMessage()
  getShortMessage() {
    return 'Special capitalization';
  }

  // Java: AbstractSpecificCaseRule#loadPhrases()
  loadPhrases() {
    if (!lcToProperSpelling.has(this.constructor)) {
      const properSpelling = new Map();
      const lines = this.phrasesListLoader.loadWords(this.getPhrasesPath());
      for (const line of lines) {
        const parts = javaSplit(line, ' ').length;
        maxLen = Math.max(parts, maxLen);
        const phrase = javaTrim(line);
        properSpelling.set(toLowerCase(phrase), phrase);
      }
      lcToProperSpelling.set(this.constructor, properSpelling);
    }
  }

  // Java: AbstractSpecificCaseRule#getId()
  getId() {
    return 'SPECIFIC_CASE';
  }

  // Java: AbstractSpecificCaseRule#getDescription()
  getDescription() {
    return 'Checks upper/lower case expressions.';
  }

  // Java: AbstractSpecificCaseRule#match(AnalyzedSentence)
  match(sentence) {
    const matches = [];
    const tokens = sentence.getTokensWithoutWhitespace();
    const properSpellingMap = lcToProperSpelling.get(this.constructor);
    for (let i = 0; i < tokens.length; i++) {
      const l = [];
      let j = 0;
      while (l.length < maxLen && i + j < tokens.length) {
        l.push(tokens[i + j].getToken());
        j++;
        const phrase = l.join(' ');
        const lcPhrase = toLowerCase(phrase);
        const properSpelling = properSpellingMap.get(lcPhrase);
        if (properSpelling !== undefined && !isAllUppercase(phrase) && phrase !== properSpelling) {
          if (i > 0 && tokens[i - 1].isSentenceStart() && !startsWithUppercase(properSpelling)) {
            // avoid suggesting e.g. "vitamin C" at sentence start:
            continue;
          }
          let msg;
          if (this.allWordsUppercase(properSpelling)) {
            msg = this.getInitialCapitalMessage();
          } else {
            msg = this.getOtherCapitalizationMessage();
          }
          const match = new RuleMatch(this, sentence, tokens[i].getStartPos(),
            tokens[i + j - 1].getEndPos(), msg, this.getShortMessage());
          match.setSuggestedReplacement(properSpelling);
          matches.push(match);
        }
      }
    }
    return this.toRuleMatchArray(matches);
  }

  // Java: AbstractSpecificCaseRule#allWordsUppercase(String)
  allWordsUppercase(s) {
    return javaSplit(s, ' ').every((w) => startsWithUppercase(w));
  }
}
