// org.languagetool.rules.AbstractStyleTooOftenUsedWordRule
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
const MIN_WORD_COUNT = 100;

// Java: AbstractStyleTooOftenUsedWordRule (abstract: isToCountedWord, isException, toAddedLemma, getLimitMessage, getConfigureText)
export class AbstractStyleTooOftenUsedWordRule extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.AbstractStyleTooOftenUsedWordRule';

  // Java: AbstractStyleTooOftenUsedWordRule(ResourceBundle,Language,UserConfig,int[,boolean])
  constructor(messages, lang, userConfig, minPercent, defaultActive = DEFAULT_ACTIVATION) {
    super(messages);
    this.wordMap = new Map();
    this.withoutDirectSpeech = false;
    this.setCategory(new Category(new CategoryId('CREATIVE_WRITING'), messages.getString('category_creative_writing'), Location.INTERNAL, false));
    if (!defaultActive) {
      this.setDefaultOff();
    }
    this.defaultMinPercent = minPercent;
    this.minPercent = this.getMinPercent(userConfig, minPercent);
    this.setLocQualityIssueType(ITSIssueType.Style);
  }

  // Java: AbstractStyleTooOftenUsedWordRule#getMinPercent(UserConfig,int)
  getMinPercent(userConfig, minPercentDefault) {
    if (userConfig !== null && userConfig !== undefined) {
      const cf = userConfig.getConfigValueByID(this.getId());
      if (cf !== null) {
        return castToIntAt(cf, 0);
      }
    }
    return minPercentDefault;
  }

  // Java: AbstractStyleTooOftenUsedWordRule#getRuleOptions()
  getRuleOptions() {
    return [new RuleOption(this.defaultMinPercent, this.getConfigureText(), 1, 100)];
  }

  // Java: AbstractStyleTooOftenUsedWordRule#getWordMap()
  getWordMap() {
    return this.wordMap;
  }

  // Java: AbstractStyleTooOftenUsedWordRule#setWithoutDirectSpeech(boolean)
  setWithoutDirectSpeech(withoutDirectSpeech) {
    this.withoutDirectSpeech = withoutDirectSpeech;
  }

  // Java: AbstractStyleTooOftenUsedWordRule#FillWordMap(List)
  FillWordMap(sentences) {
    this.wordMap.clear();
    const excludeDirectSpeech = this.withoutDirectSpeech;
    let isDirectSpeech = false;
    for (const sentence of sentences) {
      const tokens = sentence.getTokensWithoutWhitespace();
      for (let n = 1; n < tokens.length; n++) {
        const token = tokens[n];
        const sToken = token.getToken();
        if (excludeDirectSpeech && !isDirectSpeech && OPENING_QUOTES.matcher(sToken).matches() && n < tokens.length - 1 && !tokens[n + 1].isWhitespaceBefore()) {
          isDirectSpeech = true;
        } else if (excludeDirectSpeech && isDirectSpeech && ENDING_QUOTES.matcher(sToken).matches() && n > 1 && !tokens[n].isWhitespaceBefore()) {
          isDirectSpeech = false;
        } else if (!isDirectSpeech && !token.isWhitespace() && !token.isNonWord()
          && this.isToCountedWord(token) && !this.isException(tokens, n)) {
          const lemma = this.toAddedLemma(token);
          if (lemma !== null) {
            if (this.wordMap.has(lemma)) {
              const num = this.wordMap.get(lemma) + 1;
              this.wordMap.set(lemma, num);
            } else {
              this.wordMap.set(lemma, 1);
            }
          }
        }
      }
    }
  }

  // Java: AbstractStyleTooOftenUsedWordRule#getTooOftenUsedWords()
  getTooOftenUsedWords() {
    const words = [];
    let numWords = 0;
    for (const word of this.wordMap.keys()) {
      numWords += this.wordMap.get(word);
    }
    if (numWords < MIN_WORD_COUNT) {
      return words;
    }
    for (const word of this.wordMap.keys()) {
      const percent = Math.trunc((this.wordMap.get(word) * 100.0) / numWords);
      if (percent >= this.minPercent) {
        words.push(word);
      }
    }
    return words;
  }

  // Java: AbstractStyleTooOftenUsedWordRule#match(List)
  match(sentences) {
    const ruleMatches = [];
    this.FillWordMap(sentences);
    const tooOftenUsedWords = this.getTooOftenUsedWords();
    if (tooOftenUsedWords.length < 1) {
      return this.toRuleMatchArray(ruleMatches);
    }
    let pos = 0;
    const excludeDirectSpeech = this.withoutDirectSpeech;
    let isDirectSpeech = false;
    for (const sentence of sentences) {
      const tokens = sentence.getTokensWithoutWhitespace();
      for (let n = 1; n < tokens.length; n++) {
        const token = tokens[n];
        const sToken = token.getToken();
        if (excludeDirectSpeech && !isDirectSpeech && OPENING_QUOTES.matcher(sToken).matches() && n < tokens.length - 1 && !tokens[n + 1].isWhitespaceBefore()) {
          isDirectSpeech = true;
        } else if (excludeDirectSpeech && isDirectSpeech && ENDING_QUOTES.matcher(sToken).matches() && n > 1 && !tokens[n].isWhitespaceBefore()) {
          isDirectSpeech = false;
        } else if (!isDirectSpeech && !token.isWhitespace() && !token.isNonWord()
          && this.isToCountedWord(token) && !this.isException(tokens, n)) {
          const lemma = this.toAddedLemma(token);
          if (lemma !== null) {
            for (const word of tooOftenUsedWords) {
              if (lemma === word) {
                const ruleMatch = new RuleMatch(this, sentence, token.getStartPos() + pos, token.getEndPos() + pos,
                  this.getLimitMessage(this.minPercent));
                ruleMatches.push(ruleMatch);
                break;
              }
            }
          }
        }
      }
      pos += sentence.getCorrectedTextLength();
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: AbstractStyleTooOftenUsedWordRule#minToCheckParagraph()
  minToCheckParagraph() {
    return -1;
  }

  // Java: AbstractStyleTooOftenUsedWordRule#getLemmaForPosTagStartsWith(String,AnalyzedTokenReadings)
  getLemmaForPosTagStartsWith(startPos, token) {
    const readings = token.getReadings();
    for (const reading of readings) {
      const posTag = reading.getPOSTag();
      if (posTag !== null && posTag.startsWith(startPos)) {
        return reading.getLemma();
      }
    }
    return null;
  }
}
