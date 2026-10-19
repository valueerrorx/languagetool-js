// org.languagetool.rules.AbstractStatisticStyleRule
import { Pattern } from '../../lib/java/regex/index.js';
import { castToIntAt } from '../../lib/java/casts.js';
import { TextLevelRule } from './model/TextLevelRule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { RuleOption } from './model/RuleOption.js';
import { Category, CategoryId, Location } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';

const OPENING_QUOTES = Pattern.compile('["“„»«]');
const ENDING_QUOTES = Pattern.compile('["“”»«]');
const DEFAULT_ACTIVATION = false;

// Java: AbstractStatisticStyleRule (abstract: conditionFulfilled, sentenceConditionFulfilled, excludeDirectSpeech(), getLimitMessage, getSentenceMessage,
// getConfigurePercentText, getConfigureWithoutDirectSpeachText); the boolean field excludeDirectSpeech is excludeDirectSpeechFlag here (JS has one namespace)
export class AbstractStatisticStyleRule extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.AbstractStatisticStyleRule';

  // Java: AbstractStatisticStyleRule(ResourceBundle,Language,UserConfig,int[,boolean])
  constructor(messages, lang, userConfig, minPercent, defaultActive = DEFAULT_ACTIVATION) {
    super(messages);
    this.wordCount = 0;
    this.numMatches = 0;
    this.withoutDirectSpeech = false;
    this.setCategory(new Category(new CategoryId('CREATIVE_WRITING'), messages.getString('category_creative_writing'), Location.INTERNAL, false));
    if (!defaultActive) {
      this.setDefaultOff();
    }
    this.defaultMinPercent = minPercent;
    this.minPercent = this.getMinPercent(userConfig, minPercent);
    this.excludeDirectSpeechFlag = this.getExcludeDirectSpeech(userConfig);
    this.setLocQualityIssueType(ITSIssueType.Style);
  }

  // Java: AbstractStatisticStyleRule#getMinPercent(UserConfig,int)
  getMinPercent(userConfig, minPercentDefault) {
    if (userConfig !== null && userConfig !== undefined) {
      const cf = userConfig.getConfigValueByID(this.getId());
      if (cf !== null && cf.length > 0 && cf[0] !== null && cf[0] !== undefined && typeof cf[0] === 'number') {
        return castToIntAt(cf, 0);
      }
    }
    return minPercentDefault;
  }

  // Java: AbstractStatisticStyleRule#getExcludeDirectSpeech(UserConfig)
  getExcludeDirectSpeech(userConfig) {
    if (userConfig !== null && userConfig !== undefined) {
      const cf = userConfig.getConfigValueByID(this.getId());
      if (cf !== null && cf.length > 1 && cf[1] !== null && cf[1] !== undefined && typeof cf[1] === 'boolean') {
        return cf[1];
      }
    }
    return this.excludeDirectSpeech();
  }

  // Java: AbstractStatisticStyleRule#denominator()
  denominator() {
    return 100.0;
  }

  // Java: AbstractStatisticStyleRule#getRuleOptions()
  getRuleOptions() {
    return [
      new RuleOption(this.defaultMinPercent, this.getConfigurePercentText(), 0, 100),
      new RuleOption(this.excludeDirectSpeechFlag, this.getConfigureWithoutDirectSpeachText()),
    ];
  }

  // Java: AbstractStatisticStyleRule#getWordCount()
  getWordCount() {
    return this.wordCount;
  }

  // Java: AbstractStatisticStyleRule#getNumberOfMatches()
  getNumberOfMatches() {
    return this.numMatches;
  }

  // Java: AbstractStatisticStyleRule#setWithoutDirectSpeech(boolean)
  setWithoutDirectSpeech(withoutDirectSpeech) {
    this.withoutDirectSpeech = withoutDirectSpeech;
  }

  // Java: AbstractStatisticStyleRule#match(List)
  match(sentences) {
    const ruleMatches = [];
    const startPos = [];
    const endPos = [];
    const relevantSentences = [];
    let percent;
    let pos = 0;
    this.wordCount = 0;
    let isDirectSpeech = false;
    for (const sentence of sentences) {
      const tokens = sentence.getTokensWithoutWhitespace();
      for (let n = 1; n < tokens.length; n++) {
        const token = tokens[n];
        const sToken = token.getToken();
        if (this.excludeDirectSpeechFlag && !isDirectSpeech && OPENING_QUOTES.matcher(sToken).matches() && n < tokens.length - 1 && !tokens[n + 1].isWhitespaceBefore()) {
          isDirectSpeech = true;
        } else if (this.excludeDirectSpeechFlag && isDirectSpeech && ENDING_QUOTES.matcher(sToken).matches() && n > 1 && !tokens[n].isWhitespaceBefore()) {
          isDirectSpeech = false;
        } else if ((!isDirectSpeech || (this.minPercent === 0 && !this.withoutDirectSpeech)) && !token.isWhitespace() && !token.isNonWord()) {
          this.wordCount++;
          const nEnd = this.conditionFulfilled(tokens, n);
          if (nEnd >= n) {
            if (this.sentenceConditionFulfilled(tokens, n)) {
              const ruleMatch = new RuleMatch(this, sentence, token.getStartPos() + pos, token.getEndPos() + pos,
                this.getSentenceMessage());
              ruleMatches.push(ruleMatch);
            } else {
              startPos.push(token.getStartPos() + pos);
              endPos.push(tokens[nEnd].getEndPos() + pos);
              relevantSentences.push(sentence);
            }
          }
        }
      }
      pos += sentence.getCorrectedTextLength();
    }
    this.numMatches = startPos.length + ruleMatches.length;
    if (this.wordCount > 0) {
      percent = (this.numMatches * this.denominator()) / this.wordCount;
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

  // Java: AbstractStatisticStyleRule#minToCheckParagraph()
  minToCheckParagraph() {
    return -1;
  }
}
