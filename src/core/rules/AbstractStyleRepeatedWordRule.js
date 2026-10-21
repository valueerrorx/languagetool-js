// org.languagetool.rules.AbstractStyleRepeatedWordRule
import { Pattern } from '../../lib/java/regex/index.js';
import { listGet } from '../../lib/java/arrays.js';
import { TextLevelRule } from './model/TextLevelRule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { RuleOption } from './model/RuleOption.js';
import { Categories } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';

const OPENING_QUOTES = Pattern.compile('["“„»«]');
const ENDING_QUOTES = Pattern.compile('["“”»«]');
const SINGLE_QUOTES = Pattern.compile("['‚‘’'›‹]");
const MAX_TOKEN_TO_CHECK = 5;
const MAX_DISTANCE_OF_SENTENCES = 1;
const EXCLUDE_DIRECT_SPEECH = true;

// Java: AbstractStyleRepeatedWordRule#hasBreakToken(AnalyzedTokenReadings[])
function hasBreakToken(tokens) {
  for (let i = 0; i < tokens.length && i < MAX_TOKEN_TO_CHECK; i++) {
    if (tokens[i].getToken() === '-' || tokens[i].getToken() === '—' || tokens[i].getToken() === '–') {
      return true;
    }
  }
  return false;
}

// Java: AbstractStyleRepeatedWordRule#isQuestionResponse(int,int,List)
function isQuestionResponse(nAct, nTest, tokenList) {
  const dist = nAct - nTest;
  if (dist !== 1 && dist !== -1) {
    return false;
  }
  const actTokens = tokenList[nAct];
  const testTokens = tokenList[nTest];
  if (actTokens.length < 2 || testTokens.length < 2) {
    return false;
  }
  let actToken;
  if (ENDING_QUOTES.matcher(actTokens[actTokens.length - 1].getToken()).matches()) {
    actToken = actTokens[actTokens.length - 2].getToken();
  } else {
    actToken = actTokens[actTokens.length - 1].getToken();
  }
  let testToken;
  if (ENDING_QUOTES.matcher(testTokens[testTokens.length - 1].getToken()).matches()) {
    testToken = testTokens[testTokens.length - 2].getToken();
  } else {
    testToken = testTokens[testTokens.length - 1].getToken();
  }
  return ((actToken === '?' && testToken !== '?') || (testToken === '?' && actToken !== '?'));
}

// Java: AbstractStyleRepeatedWordRule (abstract: messageSameSentence, messageSentenceBefore, messageSentenceAfter, isTokenToCheck, isTokenPair)
export class AbstractStyleRepeatedWordRule extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.AbstractStyleRepeatedWordRule';

  // Java: AbstractStyleRepeatedWordRule(ResourceBundle,Language,UserConfig)
  constructor(messages, lang, userConfig) {
    super(messages);
    this.maxDistanceOfSentences = MAX_DISTANCE_OF_SENTENCES;
    this.excludeDirectSpeech = EXCLUDE_DIRECT_SPEECH;
    this.setCategory(Categories.STYLE.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Style);
    this.setDefaultOff();
    this.setOfficeDefaultOn(); // Default for LO/OO is always On
    this.lang = lang;
    if (userConfig !== null && userConfig !== undefined) {
      this.linguServices = userConfig.getLinguServices();
      if (this.linguServices !== null) {
        this.linguServices.setThesaurusRelevantRule(this);
      }
      const cf = userConfig.getConfigValueByID(this.getId());
      if (cf !== null) {
        if (cf.length > 0 && cf[0] !== null && cf[0] !== undefined && typeof cf[0] === 'number') {
          this.maxDistanceOfSentences = cf[0];
        }
        if (cf.length > 1 && cf[1] !== null && cf[1] !== undefined && typeof cf[1] === 'boolean') {
          this.excludeDirectSpeech = cf[1];
        }
      }
    } else {
      this.linguServices = null;
    }
  }

  // Java: AbstractStyleRepeatedWordRule#getId()
  getId() {
    return 'STYLE_REPEATED_WORD_RULE';
  }

  // Java: AbstractStyleRepeatedWordRule#getDescription()
  getDescription() {
    return 'Repeated words in consecutive sentences';
  }

  // Java: AbstractStyleRepeatedWordRule#getRuleOptions()
  getRuleOptions() {
    return [
      new RuleOption(MAX_DISTANCE_OF_SENTENCES, this.messages.getString('guiStyleRepeatedWordText'), 0, 5),
      new RuleOption(EXCLUDE_DIRECT_SPEECH, this.messages.getString('guiStyleExcludeDirectSpeechText'), 0, 5),
    ];
  }

  // Java: AbstractStyleRepeatedWordRule#isPartOfWord(String,String)
  isPartOfWord() {
    return false;
  }

  // Java: AbstractStyleRepeatedWordRule#isExceptionPair(AnalyzedTokenReadings,AnalyzedTokenReadings)
  isExceptionPair() {
    return false;
  }

  // Java: AbstractStyleRepeatedWordRule#setURL(AnalyzedTokenReadings)
  setURL() {
    return null;
  }

  // Java: AbstractStyleRepeatedWordRule#isTokenInSentence(AnalyzedTokenReadings,AnalyzedTokenReadings[],boolean) / (…,int,boolean)
  isTokenInSentence(testToken, tokens, notCheck, isDirectSpeech) {
    if (typeof notCheck === 'boolean') {
      isDirectSpeech = notCheck;
      notCheck = -1;
    }
    if (testToken === null || tokens === null) {
      return false;
    }
    const readings = testToken.getReadings();
    const lemmas = [];
    for (const reading of readings) {
      if (reading.getLemma() !== null) {
        lemmas.push(reading.getLemma());
      }
    }
    for (let i = 0; i < tokens.length; i++) {
      if (this.excludeDirectSpeech && !isDirectSpeech && OPENING_QUOTES.matcher(tokens[i].getToken()).matches()
        && i < tokens.length - 1 && !tokens[i + 1].isWhitespaceBefore()) {
        isDirectSpeech = true;
      } else if (this.excludeDirectSpeech && isDirectSpeech && ENDING_QUOTES.matcher(tokens[i].getToken()).matches()
        && i > 1 && !tokens[i].isWhitespaceBefore()) {
        isDirectSpeech = false;
      } else if (i !== notCheck && !isDirectSpeech && !this.isInQuotes(tokens, i) && this.isTokenToCheck(tokens, i)) {
        if ((lemmas.length > 0 && tokens[i].hasAnyLemma(...lemmas) && !this.isExceptionPair(testToken, tokens[i]))
          || this.isPartOfWord(testToken.getToken(), tokens[i].getToken())) {
          if (notCheck >= 0) {
            if (notCheck === i - 2) {
              return !this.isTokenPair(tokens, i, true);
            } else if (notCheck === i + 2) {
              return !this.isTokenPair(tokens, i, false);
            } else if ((notCheck === i + 1 || notCheck === i - 1)
              && testToken.getToken() === tokens[i].getToken()) {
              return false;
            }
          }
          return true;
        }
      }
    }
    return false;
  }

  // Java: AbstractStyleRepeatedWordRule#isInQuotes(AnalyzedTokenReadings[],int)
  isInQuotes(tokens, i) {
    return (i > 0
      && (OPENING_QUOTES.matcher(tokens[i - 1].getToken()).matches()
        || SINGLE_QUOTES.matcher(tokens[i - 1].getToken()).matches())
      && i < tokens.length - 1
      && (ENDING_QUOTES.matcher(tokens[i + 1].getToken()).matches()
        || SINGLE_QUOTES.matcher(tokens[i + 1].getToken()).matches()));
  }

  // Java: AbstractStyleRepeatedWordRule#getStartsWithDirectSpeech(int,List,boolean)
  getStartsWithDirectSpeech(n, sentences, isDirectSpeech) {
    if (!this.excludeDirectSpeech || n <= 0) {
      return false;
    }
    const sentence = listGet(sentences, n - 1).getTokensWithoutWhitespace();
    for (let i = 0; i < sentence.length; i++) {
      const token = sentence[i];
      if (!isDirectSpeech && OPENING_QUOTES.matcher(token.getToken()).matches()
        && i < sentence.length - 1 && !sentence[i + 1].isWhitespaceBefore()) {
        isDirectSpeech = true;
      } else if (isDirectSpeech && ENDING_QUOTES.matcher(token.getToken()).matches()
        && i > 1 && !sentence[i].isWhitespaceBefore()) {
        isDirectSpeech = false;
      }
    }
    return isDirectSpeech;
  }

  // Java: AbstractStyleRepeatedWordRule#match(List)
  match(sentences) {
    const ruleMatches = [];
    const tokenList = [];
    const isDSList = [];
    let pos = 0;
    let startsWithDirectSpeech = false;
    for (let n = 0; n < this.maxDistanceOfSentences && n < sentences.length; n++) {
      tokenList.push(listGet(sentences, n).getTokensWithoutWhitespace());
      startsWithDirectSpeech = this.getStartsWithDirectSpeech(n, sentences, startsWithDirectSpeech);
      isDSList.push(startsWithDirectSpeech);
    }
    let isDirectSpeech = false;
    for (let n = 0; n < sentences.length; n++) {
      if (n + this.maxDistanceOfSentences < sentences.length) {
        tokenList.push(listGet(sentences, n + this.maxDistanceOfSentences).getTokensWithoutWhitespace()); // Java: List#get throws on a negative index
        startsWithDirectSpeech = this.getStartsWithDirectSpeech(n + this.maxDistanceOfSentences, sentences, startsWithDirectSpeech);
        isDSList.push(startsWithDirectSpeech);
      }
      if (tokenList.length > 2 * this.maxDistanceOfSentences + 1) {
        tokenList.shift();
        isDSList.shift();
      }
      let nTok = this.maxDistanceOfSentences;
      if (n < this.maxDistanceOfSentences) {
        nTok = n;
      } else if (n >= sentences.length - this.maxDistanceOfSentences) {
        nTok = tokenList.length - (sentences.length - n);
      }
      if (!hasBreakToken(listGet(tokenList, nTok))) { // Java: tokenList.get(nTok) throws IndexOutOfBoundsException
        for (let i = 0; i < tokenList[nTok].length; i++) {
          const token = tokenList[nTok][i];
          if (this.excludeDirectSpeech && !isDirectSpeech && OPENING_QUOTES.matcher(token.getToken()).matches()
            && i < tokenList[nTok].length - 1 && !tokenList[nTok][i + 1].isWhitespaceBefore()) {
            isDirectSpeech = true;
          } else if (this.excludeDirectSpeech && isDirectSpeech && ENDING_QUOTES.matcher(token.getToken()).matches()
            && i > 1 && !tokenList[nTok][i].isWhitespaceBefore()) {
            isDirectSpeech = false;
          } else if (!isDirectSpeech && !this.isInQuotes(tokenList[nTok], i) && this.isTokenToCheck(tokenList[nTok], i)) {
            let isRepeated = 0;
            if (this.isTokenInSentence(token, tokenList[nTok], i, isDSList[nTok])) {
              isRepeated = 1;
            }
            for (let j = nTok - 1; isRepeated === 0 && j >= 0 && j >= nTok - this.maxDistanceOfSentences; j--) {
              if (!isQuestionResponse(nTok, j, tokenList) && this.isTokenInSentence(token, tokenList[j], isDSList[j])) {
                isRepeated = 2;
              }
            }
            for (let j = nTok + 1; isRepeated === 0 && j < tokenList.length && j <= nTok + this.maxDistanceOfSentences; j++) {
              if (!isQuestionResponse(nTok, j, tokenList) && this.isTokenInSentence(token, tokenList[j], isDSList[j])) {
                isRepeated = 3;
              }
            }
            if (isRepeated !== 0) {
              let msg;
              if (isRepeated === 1) {
                msg = this.messageSameSentence();
              } else if (isRepeated === 2) {
                msg = this.messageSentenceBefore();
              } else {
                msg = this.messageSentenceAfter();
              }
              const startPos = pos + token.getStartPos();
              const endPos = pos + token.getEndPos();
              const ruleMatch = new RuleMatch(this, null, startPos, endPos, msg);
              const url = this.setURL(token);
              if (url !== null) {
                ruleMatch.setUrl(url);
              }
              ruleMatches.push(ruleMatch);
            }
          }
        }
      }
      pos += sentences[n].getCorrectedTextLength();
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: AbstractStyleRepeatedWordRule#minToCheckParagraph()
  minToCheckParagraph() {
    return this.excludeDirectSpeech ? -1 : this.maxDistanceOfSentences;
  }
}
