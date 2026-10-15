// org.languagetool.rules.CommaWhitespaceRule
import { Pattern } from '../../lib/java/regex/index.js';
import { javaMatches } from '../../lib/java/strings.js';
import { Character } from '../../lib/java/Character.js';
import { Rule } from './model/Rule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { Categories } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';
import { isEmpty, isNonBreakingWhitespace } from '../text/StringTools.js';

const FILE_EXTENSION = Pattern.compile('([a-z]{3,4}|[A-Z]{3,4}|ai|mp[34]|MP[34])(-.+)?');

// Java: CommaWhitespaceRule
export class CommaWhitespaceRule extends Rule {
  static FQCN = 'org.languagetool.rules.CommaWhitespaceRule';

  // Java: CommaWhitespaceRule(ResourceBundle,IncorrectExample,CorrectExample,URL) / (ResourceBundle,IncorrectExample,CorrectExample) / (ResourceBundle,boolean) / (ResourceBundle)
  constructor(messages, incorrectExample = null, correctExample = null, url = null) {
    super(messages);
    let quotesWhitespace = null;
    if (typeof incorrectExample === 'boolean') {
      quotesWhitespace = incorrectExample;
      incorrectExample = null;
    }
    this.setCategory(Categories.TYPOGRAPHY.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Whitespace);
    if (incorrectExample !== null && incorrectExample !== undefined && correctExample !== null && correctExample !== undefined) {
      this.addExamplePair(incorrectExample, correctExample);
    }
    if (url !== null && url !== undefined) {
      this.setUrl(url);
    }
    this.quotesWhitespaceCheck = true;
    if (quotesWhitespace !== null) this.quotesWhitespaceCheck = quotesWhitespace;
  }

  // Java: CommaWhitespaceRule#getId()
  getId() {
    return 'COMMA_PARENTHESIS_WHITESPACE';
  }

  // Java: CommaWhitespaceRule#getDescription()
  getDescription() {
    return this.messages.getString('desc_comma_whitespace');
  }

  // Java: CommaWhitespaceRule#getCommaCharacter()
  getCommaCharacter() {
    return ',';
  }

  // Java: CommaWhitespaceRule#isException(AnalyzedTokenReadings[],int)
  isException() {
    return false;
  }

  // Java: CommaWhitespaceRule#match(AnalyzedSentence)
  match(sentence) {
    const ruleMatches = [];
    const tokens = sentence.getTokens();
    let prevToken = '';
    let prevPrevToken = '';
    let prevWhite = false;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i].getToken();
      const isWhitespace = isWhitespaceToken(tokens[i]);
      let twoSuggestions = false;

      let msg = null;
      let suggestionText = null;
      if (isWhitespace && isLeftBracket(prevToken)) {
        const isException = i + 1 < tokens.length && prevToken === '[' && token === ' ' && tokens[i + 1].getToken() === ']'; // "- [ ]" syntax e.g. on GitHub
        if (!isException) {
          msg = this.messages.getString('no_space_after');
          suggestionText = prevToken;
        }
      } else if (isWhitespace && isQuote(prevToken) && this.quotesWhitespaceCheck && prevPrevToken === ' ') {
        msg = this.messages.getString('no_space_around_quotes');
        suggestionText = prevToken;
        twoSuggestions = true;
      } else if (!isWhitespace && prevToken === this.getCommaCharacter()
          && !isQuote(token)
          && !isHyphenOrComma(token)
          && !containsDigit(prevPrevToken)
          && !containsDigit(token)
          && ',' !== prevPrevToken) {
        msg = this.messages.getString('missing_space_after_comma');
        suggestionText = this.getCommaCharacter() + ' ' + tokens[i].getToken();
      } else if (prevWhite) {
        if (isRightBracket(token)) {
          const isException = token === ']' && prevToken === ' ' && prevPrevToken === '['; // "- [ ]" syntax e.g. on GitHub
          if (!isException) {
            msg = this.messages.getString('no_space_before');
            suggestionText = token;
          }
        } else if (token === this.getCommaCharacter()) {
          msg = this.messages.getString('space_after_comma');
          suggestionText = this.getCommaCharacter();
          // exception for duplicated comma (we already have another rule for that)
          if (i + 1 < tokens.length && this.getCommaCharacter() === tokens[i + 1].getToken()) {
            msg = null;
          }
          if (i + 1 < tokens.length && !tokens[i + 1].isWhitespace()) {
            suggestionText = this.getCommaCharacter() + ' ';
          }
        } else if (token === '.' && !isDomain(tokens, i + 1) && !isFileExtension(tokens, i + 1)
          && !isProperNoun(tokens[i])) {
          msg = this.messages.getString('no_space_before_dot');
          suggestionText = '.';
          // exception case for figures such as ".5" and ellipsis
          if (i + 1 < tokens.length && isDigitOrDot(tokens[i + 1].getToken())) {
            msg = null;
          } else if (i + 2 < tokens.length && tokens[i + 1].getToken() === '/' && javaMatches(tokens[i + 2].getToken(), '[a-zA-Z]+')) {
            // commands like "./validate.sh"
            msg = null;
          }
        }
      }
      if (msg !== null && !this.isException(tokens, i) && !tokens[i].isImmunized()) {
        let fromPos = tokens[i - 1].getStartPos();
        if (twoSuggestions) {
          fromPos = tokens[i - 2].getStartPos();
        }
        const toPos = tokens[i].getEndPos();
        const text = sentence.getText();
        if (toPos < text.length) {
          const marked = text.substring(fromPos, toPos);
          if (marked === suggestionText && !twoSuggestions) {
            prevPrevToken = prevToken;
            prevToken = token;
            prevWhite = isWhitespace && !tokens[i].isFieldCode(); // LO/OO code before comma/dot
            continue;
          }
        }
        const ruleMatch = new RuleMatch(this, sentence, fromPos, toPos, msg);
        if (twoSuggestions) {
          ruleMatch.addSuggestedReplacement(suggestionText + ' ');
          ruleMatch.addSuggestedReplacement(' ' + suggestionText);
        } else {
          ruleMatch.setSuggestedReplacement(suggestionText);
        }
        ruleMatches.push(ruleMatch);
      }
      prevPrevToken = prevToken;
      prevToken = token;
      prevWhite = isWhitespace && !tokens[i].isFieldCode(); // LO/OO code before comma/dot
    }

    return this.toRuleMatchArray(ruleMatches);
  }
}

// Java: CommaWhitespaceRule#isProperNoun(AnalyzedTokenReadings)
function isProperNoun(token) {
  // English proper noun
  if (token.hasPosTag('NNP') || token.hasPosTag('NNPS')) {
    return true;
  }
  // Catalan, Spanish, Portuguese...
  if (token.hasPosTagStartingWith('NP')) {
    return true;
  }
  return false;
}

// Java: CommaWhitespaceRule#isDomain(AnalyzedTokenReadings[],int)
function isDomain(tokens, i) {
  return i < tokens.length && javaMatches(tokens[i].getToken(), '(?i)(com|org|net|int|edu|gov|mil|[a-z]{2})');
}

// Java: CommaWhitespaceRule#isFileExtension(AnalyzedTokenReadings[],int)
function isFileExtension(tokens, i) {
  return i < tokens.length && FILE_EXTENSION.matcher(tokens[i].getToken()).matches();
}

// Java: CommaWhitespaceRule#isWhitespaceToken(AnalyzedTokenReadings)
function isWhitespaceToken(token) {
  return (token.isWhitespace()
      || isNonBreakingWhitespace(token.getToken())
      || token.isFieldCode()) && token.getToken() !== '\u200B';
}

// Java: CommaWhitespaceRule#isQuote(String)
function isQuote(str) {
  if (str.length === 1) {
    const c = str.charAt(0);
    return c === "'" || c === '"' || c === '’' || c === '”' || c === '“' || c === '«' || c === '»';
  }
  return false;
}

// Java: CommaWhitespaceRule#isHyphenOrComma(String)
function isHyphenOrComma(str) {
  if (str.length === 1) {
    const c = str.charAt(0);
    return c === '-' || c === ',';
  }
  return false;
}

// Java: CommaWhitespaceRule#isDigitOrDot(String)
function isDigitOrDot(str) {
  if (isEmpty(str)) {
    return false;
  }
  const c = str.charCodeAt(0);
  return c === 0x2e || Character.isDigit(c);
}

// Java: CommaWhitespaceRule#isLeftBracket(String)
function isLeftBracket(str) {
  if (isEmpty(str)) {
    return false;
  }
  return str.charAt(0) === '(';
}

// Java: CommaWhitespaceRule#isRightBracket(String)
function isRightBracket(str) {
  if (isEmpty(str)) {
    return false;
  }
  return str.charAt(0) === ')';
}

// Java: CommaWhitespaceRule#containsDigit(String)
function containsDigit(str) {
  for (let i = 0; i < str.length; i++) {
    if (Character.isDigit(str.charCodeAt(i))) {
      return true;
    }
  }
  return false;
}
