// org.languagetool.rules.AbstractStatisticSentenceStyleRule
import { Pattern } from '../../lib/java/regex/index.js';
import { castToIntAt } from '../../lib/java/casts.js';
import { TextLevelRule } from './model/TextLevelRule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { RuleOption } from './model/RuleOption.js';
import { Category, CategoryId, Location } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';

const OPENING_QUOTES = Pattern.compile('["“„»«]');
const ENDING_QUOTES = Pattern.compile('["“”»«]');
const MARKS_REGEX = Pattern.compile('[,;.:?•!-–—]');
const DEFAULT_ACTIVATION = false;

// Java: AbstractStatisticSentenceStyleRule (abstract: conditionFulfilled(List), excludeDirectSpeech(), getLimitMessage, getConfigureText)
export class AbstractStatisticSentenceStyleRule extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.AbstractStatisticSentenceStyleRule';

  // Java: AbstractStatisticSentenceStyleRule(ResourceBundle,Language,UserConfig,int[,boolean])
  constructor(messages, lang, userConfig, minPercent, defaultActive = DEFAULT_ACTIVATION) {
    super(messages);
    this.sentenceCount = 0;
    this.numMatches = 0;
    this.withoutDirectSpeech = false;
    this.setCategory(new Category(new CategoryId('CREATIVE_WRITING'), messages.getString('category_creative_writing'), Location.INTERNAL, false));
    if (!defaultActive) {
      this.setDefaultOff();
    }
    this.defaultMinPercent = minPercent;
    this.minPercent = this.getMinPercent(userConfig, minPercent);
    this.setLocQualityIssueType(ITSIssueType.Style);
  }

  // Java: AbstractStatisticSentenceStyleRule#getMinPercent(UserConfig,int)
  getMinPercent(userConfig, minPercentDefault) {
    if (userConfig !== null && userConfig !== undefined) {
      const cf = userConfig.getConfigValueByID(this.getId());
      if (cf !== null) {
        return castToIntAt(cf, 0);
      }
    }
    return minPercentDefault;
  }

  // Java: AbstractStatisticSentenceStyleRule#isMark(AnalyzedTokenReadings)
  isMark(token) {
    return MARKS_REGEX.matcher(token.getToken()).matches();
  }

  // Java: AbstractStatisticSentenceStyleRule#isOpeningQuote(AnalyzedTokenReadings)
  isOpeningQuote(token) {
    return OPENING_QUOTES.matcher(token.getToken()).matches();
  }

  // Java: AbstractStatisticSentenceStyleRule#denominator()
  denominator() {
    return 100.0;
  }

  // Java: AbstractStatisticSentenceStyleRule#getRuleOptions()
  getRuleOptions() {
    return [new RuleOption(this.defaultMinPercent, this.getConfigureText(), 0, 100)];
  }

  // Java: AbstractStatisticSentenceStyleRule#getSentenceCount()
  getSentenceCount() {
    return this.sentenceCount;
  }

  // Java: AbstractStatisticSentenceStyleRule#getNumberOfMatches()
  getNumberOfMatches() {
    return this.numMatches;
  }

  // Java: AbstractStatisticSentenceStyleRule#setWithoutDirectSpeech(boolean)
  setWithoutDirectSpeech(withoutDirectSpeech) {
    this.withoutDirectSpeech = withoutDirectSpeech;
  }

  // Java: AbstractStatisticSentenceStyleRule#match(List)
  match(sentences) {
    const ruleMatches = [];
    const startPos = [];
    const endPos = [];
    const relevantSentences = [];
    let percent;
    let pos = 0;
    this.sentenceCount = 0;
    const excludeDirectSpeech = this.excludeDirectSpeech();
    let isDirectSpeech = false;
    for (const sentence of sentences) {
      const tokens = sentence.getTokensWithoutWhitespace();
      let relevantSentencePart = [];
      let isSentenceCount = false;
      let foundToken = null;
      for (let n = 1; n < tokens.length; n++) {
        const token = tokens[n];
        const sToken = token.getToken();
        if (excludeDirectSpeech && !isDirectSpeech && OPENING_QUOTES.matcher(sToken).matches() && n < tokens.length - 1 && !tokens[n + 1].isWhitespaceBefore()) {
          isDirectSpeech = true;
          if (relevantSentencePart.length > 0) {
            isSentenceCount = true;
            foundToken = this.conditionFulfilled(relevantSentencePart);
            if (foundToken !== null) {
              break;
            }
          }
        } else if (excludeDirectSpeech && isDirectSpeech && ENDING_QUOTES.matcher(sToken).matches() && n > 1 && !tokens[n].isWhitespaceBefore()) {
          isDirectSpeech = false;
          relevantSentencePart = [];
        } else if ((!isDirectSpeech || (this.minPercent === 0 && !this.withoutDirectSpeech)) && !token.isWhitespace()) {
          relevantSentencePart.push(token);
        }
        if (n === tokens.length - 1 && relevantSentencePart.length > 0) {
          isSentenceCount = true;
          foundToken = this.conditionFulfilled(relevantSentencePart);
        }
      }
      if (isSentenceCount) {
        this.sentenceCount++;
      }
      if (foundToken !== null) {
        startPos.push(foundToken.getStartPos() + pos);
        endPos.push(foundToken.getEndPos() + pos);
        relevantSentences.push(sentence);
      }
      pos += sentence.getCorrectedTextLength();
    }
    this.numMatches = startPos.length;
    if (this.sentenceCount > 0) {
      percent = (this.numMatches * this.denominator()) / this.sentenceCount;
    } else {
      percent = 0;
    }
    if (percent > this.minPercent) {
      for (let i = 0; i < startPos.length; i++) {
        const ruleMatch = new RuleMatch(this, relevantSentences[i], startPos[i], endPos[i],
          this.getLimitMessage(this.minPercent, percent));
        ruleMatches.push(ruleMatch);
      }
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: AbstractStatisticSentenceStyleRule#minToCheckParagraph()
  minToCheckParagraph() {
    return -1;
  }
}
