// org.languagetool.rules.UppercaseSentenceStartRule
import { Pattern } from '../../lib/java/regex/index.js';
import { javaTrim, replaceChar } from '../../lib/java/strings.js';
import { Character } from '../../lib/java/Character.js';
import { equalsAny } from '../../lib/java/StringUtils.js';
import { TextLevelRule } from './model/TextLevelRule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { Categories } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';
import { WordTokenizer } from '../text/tokenizers/WordTokenizer.js';
import { uppercaseFirstChar, isCamelCase } from '../text/StringTools.js';

const NUMERALS_EN = Pattern.compile('[a-z]|(m{0,4}(c[md]|d?c{0,3})(x[cl]|l?x{0,3})(i[xv]|v?i{0,3}))$');
const CONTAINS_DIGIT = Pattern.compile('.*\\d.*');
const ONLY_LOWERCASE_START = Pattern.compile('[a-z][A-Z].*');
const WHITESPACE_OR_QUOTE = Pattern.compile('[ "\'„«»‘’“”\\n]'); // only ending quote is necessary?
const SENTENCE_END1 = Pattern.compile('[.?!…]|');
const EXCEPTIONS = new Set([
  'n', // n/a
  'w', // w/o
  'x86',
  'ⓒ',
  'ø', // used as bullet point
  'cc', // cc @daniel => "Cc @daniel" is strange
  'pH',
  'heylogin', // trade mark name
]);
const DIGIT_DOT = Pattern.compile('\\d+\\. .*');
const LINEBREAK_DIGIT_DOT = Pattern.compile('.*\n\\d+\\. ');

// Java: UppercaseSentenceStartRule
export class UppercaseSentenceStartRule extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.UppercaseSentenceStartRule';

  // Java: UppercaseSentenceStartRule(ResourceBundle,Language,IncorrectExample,CorrectExample[,URL]) / (ResourceBundle,Language)
  constructor(messages, language, incorrectExample = null, correctExample = null, url = null) {
    super(messages);
    this.setCategory(Categories.CASING.getCategory(messages));
    this.language = language;
    this.setLocQualityIssueType(ITSIssueType.Typographical);
    if (incorrectExample !== null && incorrectExample !== undefined && correctExample !== null && correctExample !== undefined) {
      this.addExamplePair(incorrectExample, correctExample);
    }
    if (url !== null && url !== undefined) {
      this.setUrl(url);
    }
  }

  // Java: UppercaseSentenceStartRule#getId()
  getId() {
    return 'UPPERCASE_SENTENCE_START';
  }

  // Java: UppercaseSentenceStartRule#getDescription()
  getDescription() {
    return this.messages.getString('desc_uppercase_sentence');
  }

  // Java: UppercaseSentenceStartRule#isException(AnalyzedTokenReadings[],int)
  isException() {
    return false;
  }

  // Java: UppercaseSentenceStartRule#match(List)
  match(sentences) {
    let lastParagraphString = '';
    const ruleMatches = [];
    if (sentences.length === 1 && sentences[0].getTokens().length === 2) {
      // Special case for a single "sentence" with a single word - it's not useful
      // to complain about this (and might hide a typo error):
      return this.toRuleMatchArray(ruleMatches);
    }
    let pos = 0;
    let isPrevSentenceNumberedList = false;
    for (const sentence of sentences) {
      const tokens = this.getSentenceWithImmunization(sentence).getTokensWithoutWhitespace();
      if (tokens.length < 2) {
        return this.toRuleMatchArray(ruleMatches);
      }
      let matchTokenPos = 1; // 0 = SENT_START
      const firstTokenObj = tokens[matchTokenPos];
      const firstToken = firstTokenObj.getToken();
      let secondToken = null;
      let thirdToken = null;
      // ignore quote characters:
      if (tokens.length >= 3 && this.isQuoteStart(firstToken)) {
        matchTokenPos = 2;
        secondToken = tokens[matchTokenPos].getToken();
      }
      const firstDutchToken = this.dutchSpecialCase(firstToken, secondToken, tokens);
      if (firstDutchToken !== null) {
        thirdToken = firstDutchToken;
        matchTokenPos = 3;
      }

      if (this.isException(tokens, matchTokenPos)) {
        return this.toRuleMatchArray(ruleMatches);
      }

      let checkToken = firstToken;
      if (thirdToken !== null) {
        checkToken = thirdToken;
      } else if (secondToken !== null) {
        checkToken = secondToken;
      }

      let lastToken = tokens[tokens.length - 1].getToken();
      if (WHITESPACE_OR_QUOTE.matcher(lastToken).matches()) {
        // ignore trailing whitespace or quote
        lastToken = tokens[tokens.length - 2].getToken();
      }

      let preventError = false;
      if (lastParagraphString === ',' || lastParagraphString === ';') {
        preventError = true;
      }
      if (CONTAINS_DIGIT.matcher(tokens[matchTokenPos].getToken()).matches()) {
        preventError = true;
      }
      if (!SENTENCE_END1.matcher(lastParagraphString).matches() && !this.isSentenceEnd(lastToken)) {
        preventError = true;
      }

      if (javaTrim(replaceChar(sentence.getText(), 0xa0, 0x20)).length !== 0) {
        lastParagraphString = lastToken;
      }

      // allows enumeration with lowercase letters: a), iv., etc.
      if (matchTokenPos + 1 < tokens.length
          && NUMERALS_EN.matcher(tokens[matchTokenPos].getToken()).matches()
          && (tokens[matchTokenPos + 1].getToken() === '.'
          || tokens[matchTokenPos + 1].getToken() === ')')) {
        preventError = true;
      }

      if (isPrevSentenceNumberedList || this.isUrl(checkToken) || this.isEMail(checkToken) || firstTokenObj.isImmunized()
          || tokens[matchTokenPos].hasPosTag('_IS_URL')) {
        preventError = true;
      }

      if (checkToken.length > 0) {
        const firstChar = checkToken.charCodeAt(0);
        const capitalized = uppercaseFirstChar(checkToken);
        if (capitalized !== checkToken
            && !preventError && Character.isLowerCase(firstChar)
            && !ONLY_LOWERCASE_START.matcher(checkToken).matches()
            && !EXCEPTIONS.has(checkToken) && !isCamelCase(checkToken)) {
          const ruleMatch = new RuleMatch(this, sentence,
            pos + tokens[matchTokenPos].getStartPos(),
            pos + tokens[matchTokenPos].getEndPos(),
            this.messages.getString('incorrect_case'));
          ruleMatch.setSuggestedReplacement(capitalized);
          ruleMatches.push(ruleMatch);
          ruleMatch.setShortMessage(this.messages.getString('category_case'));
        }
      }
      pos += sentence.getCorrectedTextLength();
      // Plain text lists like this are not properly split into sentences, we
      // work around that here so the items don't create an error when starting lowercase:
      // 1. item one
      // 2. item two
      isPrevSentenceNumberedList = DIGIT_DOT.matcher(sentence.getText()).matches() || LINEBREAK_DIGIT_DOT.matcher(sentence.getText()).matches();
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: UppercaseSentenceStartRule#dutchSpecialCase(String,String,AnalyzedTokenReadings[])
  dutchSpecialCase(firstToken, secondToken, tokens) {
    if (this.language.getShortCode() !== 'nl') {
      return null;
    }
    if (tokens.length > 3 && firstToken === "'"
        && this.isDutchSpecialCase(secondToken)) {
      return tokens[3].getToken();
    }
    return null;
  }

  // Java: UppercaseSentenceStartRule#isUrl(String)
  isUrl(token) {
    return WordTokenizer.isUrl(token);
  }

  // Java: UppercaseSentenceStartRule#isEMail(String)
  isEMail(token) {
    return WordTokenizer.isEMail(token);
  }

  // Java: UppercaseSentenceStartRule#isDutchSpecialCase(String)
  isDutchSpecialCase(word) {
    return equalsAny(word, 'k', 'm', 'n', 'r', 's', 't');
  }

  // Java: UppercaseSentenceStartRule#isSentenceEnd(String)
  isSentenceEnd(word) {
    return equalsAny(word, '.', '?', '!', '…');
  }

  // Java: UppercaseSentenceStartRule#isQuoteStart(String)
  isQuoteStart(word) {
    const baseQuoteStrings = ['"', "'", '„', '»', '«', '“', '‘', '¡', '¿'];
    // pt-BR uses dashes to introduce dialogue >:(
    // will keep it separate as other locales may expect line-initial m-dashes
    // in enumerations not to introduce capital letters
    let searchStrings;
    if (this.language.getShortCode() === 'pt') {
      searchStrings = [...baseQuoteStrings, '-', '–', '—'];
    } else {
      searchStrings = baseQuoteStrings;
    }
    return equalsAny(word, ...searchStrings);
  }

  // Java: UppercaseSentenceStartRule#minToCheckParagraph()
  minToCheckParagraph() {
    return 0;
  }
}
