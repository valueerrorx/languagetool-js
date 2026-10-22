// Java: org.languagetool.rules.es.SpanishUnpairedBracketsRule
import { GenericUnpairedBracketsRule } from '../../../core/rules/GenericUnpairedBracketsRule.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { equalsIgnoreCase } from '../../../lib/java/strings.js';

const ES_START_SYMBOLS = ['[', '(', '{', '“', '«', '"', "'", '‘'];
const ES_END_SYMBOLS = [']', ')', '}', '”', '»', '"', "'", '’'];

const VALID_BEFORE_CLOSING_PARENTHESIS = Pattern.compile('\\d+|[a-zA-Z]', Pattern.UNICODE_CASE);
const NUMBER = Pattern.compile('\\d[\\d., ]+\\d|\\d{1,2}', Pattern.UNICODE_CASE);

// Java: SpanishUnpairedBracketsRule
export class SpanishUnpairedBracketsRule extends GenericUnpairedBracketsRule {
  static FQCN = 'org.languagetool.rules.es.SpanishUnpairedBracketsRule';

  // Java: SpanishUnpairedBracketsRule(ResourceBundle)
  constructor(messages) {
    super(messages, ES_START_SYMBOLS, ES_END_SYMBOLS);
  }

  // Java: SpanishUnpairedBracketsRule#getId()
  getId() {
    return 'ES_UNPAIRED_BRACKETS';
  }

  // Java: SpanishUnpairedBracketsRule#isNoException(String,AnalyzedTokenReadings[],int,int,boolean,boolean,UnsyncStack)
  isNoException(tokenStr, tokens, i, j, precSpace, follSpace, symbolStack) {
    if (i < 1) {
      return true;
    }

    const superException = !super.isNoException(tokenStr, tokens, i, j, precSpace, follSpace, symbolStack);
    if (superException) {
      return false;
    }

    if ((tokenStr === '’' || tokenStr === "'")
        && (tokens[i].hasPosTagStartingWith('N') || tokens[i].hasPosTagStartingWith('A')
        || tokens[i].hasPosTag('_allow_apostrophe'))) {
      return false;
    }

    // Exception for English plural Saxon genitive
    if (i + 1 < tokens.length && this.isQuote(tokenStr) && equalsIgnoreCase('s', tokens[i + 1].getToken())) {
      return false;
    }

    // degrees, minutes, seconds...
    if ((tokenStr === '"' || tokenStr === "'")
        && NUMBER.matcher(tokens[i - 1].getToken()).matches()
        && !tokens[i].isWhitespaceBefore()
        && ((i > 2 && (tokens[i - 2].getToken().includes('º') || tokens[i - 2].getToken().includes('°')))
        || (i > 4 && (tokens[i - 4].getToken().includes('º') || tokens[i - 4].getToken().includes('°'))))) {
      return false;
    }

    if (i === 1 && tokenStr === '»') {
      return false;
    }

    if (i > 1 && tokenStr === ')') {
      let isThereOpeningParenthesis = false;
      let k = 1;
      while (i - k > 0) {
        if (tokens[i - k].getToken() === ')') {
          break;
        }
        if (tokens[i - k].getToken() === '(') {
          isThereOpeningParenthesis = true;
          break;
        }
        k++;
      }
      if (!isThereOpeningParenthesis) {
        const mValidBeforeClosingParenthesis = VALID_BEFORE_CLOSING_PARENTHESIS
          .matcher(tokens[i - 1].getToken());
        if (mValidBeforeClosingParenthesis.matches()) {
          return false;
        }
      }
    }

    return true;
  }

  // Java: SpanishUnpairedBracketsRule#isQuote(String)
  isQuote(tokenStr) {
    return tokenStr === "'" || tokenStr === '’';
  }

  // Java: SpanishUnpairedBracketsRule#getSuggestions(Supplier,int,int,Symbol,String)
  getSuggestions(text, startPos, endPos, symbol, otherSymbol) {
    const replacements = [];
    // add the other symbol together with the original symbol, needs to be moved by the user
    if (symbol.symbolType === GenericUnpairedBracketsRule.Symbol.Type.Closing) {
      replacements.push(otherSymbol + symbol.toString());
    } else {
      replacements.push(symbol.toString() + otherSymbol);
    }
    // add the option to remove the original symbol
    replacements.push('');
    return replacements;
  }
}
