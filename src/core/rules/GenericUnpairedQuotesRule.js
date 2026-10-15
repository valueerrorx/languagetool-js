// org.languagetool.rules.GenericUnpairedQuotesRule
import { Pattern } from '../../lib/java/regex/index.js';
import { IllegalArgumentException } from '../../lib/java/errors.js';
import { MessageFormat } from '../../lib/java/MessageFormat.js';
import { abstractCollectionToString as javaListToString } from '../../lib/java/toString.js';
import { TextLevelRule } from './model/TextLevelRule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { Categories } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';

const POSSIBLE_APOSTROPHE = Pattern.compile("[‘’']");
const INCH_PATTERN = Pattern.compile('.*\\d".*', Pattern.DOTALL);
const PUNCTUATION = Pattern.compile('[\\p{Punct}…–—&&[^"\'_]]');
const PUNCT_MARKS = Pattern.compile('[\\?\\.!,]');

// Java: GenericUnpairedQuotesRule.SymbolLocator
class SymbolLocator {
  static FQCN = 'org.languagetool.rules.GenericUnpairedQuotesRule.SymbolLocator';

  // Java: SymbolLocator#SymbolLocator(String,int,AnalyzedSentence)
  constructor(symbol, startPos, sentence) {
    this.symbol = symbol;
    this.startPos = startPos;
    this.sentence = sentence;
  }

  // Java: SymbolLocator#getSymbol()
  getSymbol() {
    return this.symbol;
  }

  // Java: SymbolLocator#getStartPos()
  getStartPos() {
    return this.startPos;
  }

  // Java: SymbolLocator#getSentence()
  getSentence() {
    return this.sentence;
  }
}

// Java: GenericUnpairedQuotesRule
export class GenericUnpairedQuotesRule extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.GenericUnpairedQuotesRule';
  static SymbolLocator = SymbolLocator;

  // Java: GenericUnpairedQuotesRule(String,ResourceBundle,List,List) / (ResourceBundle,List,List) / (ResourceBundle)
  constructor(...a) {
    let ruleId = null;
    let messages;
    let startSymbols;
    let endSymbols;
    if (a[0] === null || typeof a[0] === 'string') {
      [ruleId, messages, startSymbols, endSymbols] = a;
    } else if (a.length === 1) {
      [messages] = a;
      startSymbols = ['“', '"', '‘', "'"];
      endSymbols = ['”', '"', '’', "'"];
    } else {
      [messages, startSymbols, endSymbols] = a;
    }
    super(messages);
    this.ruleId = ruleId !== null ? ruleId : 'UNPAIRED_QUOTES';
    this.setCategory(Categories.PUNCTUATION.getCategory(messages));
    if (startSymbols.length !== endSymbols.length) {
      throw new IllegalArgumentException(`Different number of start and end symbols: ${javaListToString(startSymbols)} vs. ${javaListToString(endSymbols)}`);
    }
    this.startSymbols = startSymbols;
    this.endSymbols = endSymbols;
    this.setLocQualityIssueType(ITSIssueType.Typographical);
  }

  // Java: GenericUnpairedQuotesRule#getId()
  getId() {
    return this.ruleId;
  }

  // Java: GenericUnpairedQuotesRule#getDescription()
  getDescription() {
    return this.messages.getString('desc_unpaired_quotes');
  }

  // Java: GenericUnpairedQuotesRule#match(List)
  match(sentences) {
    const openingQuotes = [];
    const ruleMatches = [];
    let lastApostropheSymbol = null;
    let wasInch = false;
    let startPosBase = 0;
    for (const sentence of sentences) {
      const tokens = sentence.getTokensWithoutWhitespace();
      for (let i = 1; i < tokens.length; i++) {
        if (this.isOpeningQuote(tokens, i)) {
          const symbol = tokens[i].getToken();
          if (!this.isNotBeginningApostrophe(tokens, i)) {
            lastApostropheSymbol = symbol;
            continue;
          }
          if ('"' === symbol) {
            wasInch = false;
          }
          if (lastApostropheSymbol !== null && lastApostropheSymbol === symbol) {
            lastApostropheSymbol = null;
          }
          const index = this.indexOfOpeningQuote(openingQuotes, symbol);
          if (index >= 0) {
            this.removeAllOpenInnerQuotes(index - 1, openingQuotes, ruleMatches);
          }
          openingQuotes.push(new SymbolLocator(symbol, tokens[i].getStartPos() + startPosBase, sentence));
        } else if (this.isClosingQuote(tokens, i, openingQuotes)) {
          const symbol = tokens[i].getToken();
          if (!this.isNotBeginningApostrophe(tokens, i)) {
            lastApostropheSymbol = symbol;
            continue;
          }
          const isInchSymb = '"' === symbol;
          const isInch = isInchSymb ? this.isInchQuote(sentence.getText()) : false;
          const startSymbol = this.findCorrespondingSymbol(symbol);
          const index = this.indexOfOpeningQuote(openingQuotes, startSymbol);
          if (index >= 0) {
            this.removeAllOpenInnerQuotes(index, openingQuotes, ruleMatches);
            openingQuotes.splice(index, 1);
            if (lastApostropheSymbol !== null && lastApostropheSymbol === startSymbol) {
              lastApostropheSymbol = null;
            }
            if (isInch) {
              wasInch = true;
            }
          } else if (this.isNotEndingApostrophe(tokens, i)) {
            if (!isInch && (!isInchSymb || !wasInch)) {
              if (lastApostropheSymbol === null || lastApostropheSymbol !== symbol) {
                this.addMatch(new SymbolLocator(symbol, tokens[i].getStartPos() + startPosBase, sentence), ruleMatches);
              } else {
                lastApostropheSymbol = null;
              }
            } else {
              wasInch = false;
            }
          }
        }
      }
      startPosBase += sentence.getCorrectedTextLength();
    }
    this.removeAllOpenInnerQuotes(-1, openingQuotes, ruleMatches);
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: GenericUnpairedQuotesRule#isStartSymbolbefore(AnalyzedTokenReadings[],int)
  isStartSymbolbefore(tokens, i) {
    for (let j = i - 1; j > 0; j--) {
      if (tokens[i].getToken() !== tokens[j].getToken() && this.startSymbols.includes(tokens[j].getToken())) {
        if (tokens[j - 1].isSentenceStart() || tokens[j].isWhitespaceBefore()) {
          return true;
        }
      } else {
        return false;
      }
    }
    return true;
  }

  // Java: GenericUnpairedQuotesRule#isNotOpenSymbol(int,List)
  isNotOpenSymbol(j, openingQuotes) {
    if (this.endSymbols[j] === this.startSymbols[j]) {
      for (const openingQuote of openingQuotes) {
        if (this.endSymbols[j] === openingQuote.getSymbol()) {
          return false;
        }
      }
    }
    return true;
  }

  // Java: GenericUnpairedQuotesRule#isNotQuote(AnalyzedTokenReadings[],int,int)
  isNotQuote(tokens, i, j) {
    if ((tokens[i - 1].isSentenceStart() || tokens[i].isWhitespaceBefore())
        && (i >= tokens.length - 1 || tokens[i + 1].isWhitespaceBefore())) {
      return true;
    }
    if (this.endSymbols[j] === this.startSymbols[j]) {
      if (i < tokens.length - 1
          && !tokens[i].isWhitespaceBefore()
          && !tokens[i + 1].isWhitespaceBefore()
          && PUNCTUATION.matcher(tokens[i - 1].getToken()).matches()
          && '.' !== tokens[i + 1].getToken()
          && PUNCTUATION.matcher(tokens[i + 1].getToken()).matches()) {
        return true;
      }
    }
    return false;
  }

  // Java: GenericUnpairedQuotesRule#isOpeningQuote(AnalyzedTokenReadings[],int)
  isOpeningQuote(tokens, i) {
    for (let j = 0; j < this.startSymbols.length; j++) {
      if (this.startSymbols[j] === tokens[i].getToken()) {
        if (this.isNotQuote(tokens, i, j)) {
          return false;
        }
        if (this.endSymbols.includes(this.startSymbols[j])) {
          return (tokens[i - 1].isSentenceStart()
              || tokens[i].isWhitespaceBefore()
              || (i < tokens.length - 1 && !tokens[i + 1].isWhitespaceBefore()
                  && ((!PUNCT_MARKS.matcher(tokens[i + 1].getToken()).matches()
                      && PUNCTUATION.matcher(tokens[i - 1].getToken()).matches())
                      || (tokens[i - 1].getToken().endsWith('-'))))
              || this.isStartSymbolbefore(tokens, i));
        }
        return true;
      }
    }
    return false;
  }

  // Java: GenericUnpairedQuotesRule#isClosingQuote(AnalyzedTokenReadings[],int,List)
  isClosingQuote(tokens, i, openingQuotes) {
    for (let j = 0; j < this.endSymbols.length; j++) {
      if (this.endSymbols[j] === tokens[i].getToken()) {
        if (this.isNotQuote(tokens, i, j) && this.isNotOpenSymbol(j, openingQuotes)) {
          return false;
        }
        return true;
      }
    }
    return false;
  }

  // Java: GenericUnpairedQuotesRule#isInchQuote(String)
  isInchQuote(text) {
    return INCH_PATTERN.matcher(text).matches();
  }

  // Java: GenericUnpairedQuotesRule#isNotBeginningApostrophe(AnalyzedTokenReadings[],int)
  isNotBeginningApostrophe(tokens, i) {
    return !POSSIBLE_APOSTROPHE.matcher(tokens[i].getToken()).matches()
        || i >= tokens.length - 1 || tokens[i + 1].isNonWord() || tokens[i + 1].isWhitespaceBefore();
  }

  // Java: GenericUnpairedQuotesRule#isNotEndingApostrophe(AnalyzedTokenReadings[],int)
  isNotEndingApostrophe(tokens, i) {
    return !POSSIBLE_APOSTROPHE.matcher(tokens[i].getToken()).matches()
        || tokens[i].isWhitespaceBefore()
        || tokens[i - 1].isNonWord();
  }

  // Java: GenericUnpairedQuotesRule#indexOfOpeningQuote(List,String)
  indexOfOpeningQuote(openingQuotes, symbol) {
    for (let i = 0; i < openingQuotes.length; i++) {
      if (symbol === openingQuotes[i].getSymbol()) {
        return i;
      }
    }
    return -1;
  }

  // Java: GenericUnpairedQuotesRule#addMatch(SymbolLocator,List)
  addMatch(openingQuote, ruleMatches) {
    const message = MessageFormat.format(this.messages.getString('unpaired_brackets'), this.findCorrespondingSymbol(openingQuote.getSymbol()));
    const match = new RuleMatch(this, openingQuote.getSentence(), openingQuote.getStartPos(),
      openingQuote.getStartPos() + openingQuote.getSymbol().length, message);
    ruleMatches.push(match);
  }

  // Java: GenericUnpairedQuotesRule#removeAllOpenInnerQuotes(int,List,List)
  removeAllOpenInnerQuotes(index, openingQuotes, ruleMatches) {
    for (let i = openingQuotes.length - 1; i > index; i--) {
      this.addMatch(openingQuotes[i], ruleMatches);
      openingQuotes.splice(i, 1);
    }
  }

  // Java: GenericUnpairedQuotesRule#findCorrespondingSymbol(String)
  findCorrespondingSymbol(symbol) {
    const idx1 = this.startSymbols.indexOf(symbol);
    if (idx1 >= 0) {
      return this.endSymbols[idx1];
    }
    const idx2 = this.endSymbols.indexOf(symbol);
    return this.startSymbols[idx2];
  }

  // Java: GenericUnpairedQuotesRule#minToCheckParagraph()
  minToCheckParagraph() {
    return -1;
  }
}
