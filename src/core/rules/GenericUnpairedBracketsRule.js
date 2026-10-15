// org.languagetool.rules.GenericUnpairedBracketsRule
import { Pattern } from '../../lib/java/regex/index.js';
import { javaMatches, javaTrim } from '../../lib/java/strings.js';
import { IllegalArgumentException, NullPointerException } from '../../lib/java/errors.js';
import { MessageFormat } from '../../lib/java/MessageFormat.js';
import { abstractCollectionToString as javaListToString } from '../../lib/java/toString.js';
import { TextLevelRule } from './model/TextLevelRule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { Categories } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';
import { SymbolLocator } from './SymbolLocator.js';
import { UnsyncStack } from './UnsyncStack.js';

const NUMERALS_EN = Pattern.compile("(?i)\\d{1,2}?[a-z']*|M*(D?C{0,3}|C[DM])(L?X{0,3}|X[LC])(V?I{0,3}|I[VX])$");
const PUNCTUATION = Pattern.compile('[\\p{Punct}…–—]');
const PUNCTUATION_NO_DOT = Pattern.compile("[ldmnstLDMNST]'|[–—\\p{Punct}&&[^.]]");
// "[ldmnst]'" allows dealing with apostrophed words in Catalan (i.e. l'«home)

// Java: GenericUnpairedBracketsRule.Symbol
class Symbol {
  static FQCN = 'org.languagetool.rules.GenericUnpairedBracketsRule.Symbol';
  static Type = Object.freeze({ Opening: 'Opening', Closing: 'Closing' });

  // Java: Symbol#Symbol(String,Type)
  constructor(symbol, symbolType) {
    this.symbol = symbol;
    this.symbolType = symbolType;
  }

  // Java: Symbol#toString()
  toString() {
    return this.symbol;
  }
}

// Java: GenericUnpairedBracketsRule
export class GenericUnpairedBracketsRule extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.GenericUnpairedBracketsRule';
  static Symbol = Symbol;

  // Java: GenericUnpairedBracketsRule(String,ResourceBundle,List,List[,Pattern]) / (ResourceBundle,List,List[,Pattern]) / (ResourceBundle)
  constructor(...a) {
    let ruleId = null;
    let messages;
    let startSymbols;
    let endSymbols;
    let numerals = NUMERALS_EN;
    if (a[0] === null || typeof a[0] === 'string') {
      [ruleId, messages, startSymbols, endSymbols] = a;
      if (a.length > 4) numerals = a[4];
    } else if (a.length === 1) {
      [messages] = a;
      startSymbols = ['[', '(', '{', '"', "'"];
      endSymbols = [']', ')', '}', '"', "'"];
    } else {
      [messages, startSymbols, endSymbols] = a;
      if (a.length > 3) numerals = a[3];
    }
    super(messages);
    this.ruleId = ruleId !== null ? ruleId : 'UNPAIRED_BRACKETS';
    this.setCategory(Categories.PUNCTUATION.getCategory(messages));
    if (startSymbols.length !== endSymbols.length) {
      throw new IllegalArgumentException(`Different number of start and end symbols: ${javaListToString(startSymbols)} vs. ${javaListToString(endSymbols)}`);
    }
    this.startSymbols = startSymbols;
    this.endSymbols = endSymbols;
    if (numerals === null || numerals === undefined) throw new NullPointerException();
    this.numerals = numerals;
    this.uniqueMap = this.uniqueMapInit();
    this.setLocQualityIssueType(ITSIssueType.Typographical);
  }

  // Java: GenericUnpairedBracketsRule#getId()
  getId() {
    return this.ruleId;
  }

  // Java: GenericUnpairedBracketsRule#getDescription()
  getDescription() {
    return this.messages.getString('desc_unpaired_brackets');
  }

  // Java: GenericUnpairedBracketsRule#isNoException(String,AnalyzedTokenReadings[],int,int,boolean,boolean,UnsyncStack)
  isNoException(token, tokens, i, j, precSpace, follSpace, symbolStack) {
    const tokenStr = tokens[i].getToken();
    if (i > 0 && javaMatches(tokens[i - 1].getToken(), 'https?://.+') && tokens[i - 1].getToken().includes('(')) {
      return false;
    }

    if (i >= 2) {
      const prevPrevToken = tokens[i - 2].getToken();
      const prevToken = tokens[i - 1].getToken();
      // Smiley ":-)" and ":-("
      if (prevPrevToken === ':' && prevToken === '-' && (tokenStr === ')' || tokenStr === '(')) {
        return false;
      }
      // Smiley ";-)" and ";-("
      if (prevPrevToken === ';' && prevToken === '-' && (tokenStr === ')' || tokenStr === '(')) {
        return false;
      }
    }
    if (i >= 1) {
      const prevToken = tokens[i - 1].getToken();
      // Smiley ":)" and  ":("
      if (prevToken === ':' && !tokens[i].isWhitespaceBefore() && (tokenStr === ')' || tokenStr === '(')) {
        return false;
      }
      // Smiley ";)" and  ";("
      if (prevToken === ';' && !tokens[i].isWhitespaceBefore() && (tokenStr === ')' || tokenStr === '(')) {
        return false;
      }
    }
    return true;
  }

  // Java: GenericUnpairedBracketsRule#match(List)
  match(sentences) {
    const symbolStack = new UnsyncStack(); // the stack for pairing symbols
    const ruleMatchStack = new UnsyncStack();
    const ruleMatches = [];
    let startPosBase = 0;
    let sentenceIdx = 0;
    for (const sentence of sentences) {
      const tokens = sentence.getTokensWithoutWhitespace();
      for (let i = 1; i < tokens.length; i++) {
        for (let j = 0; j < this.startSymbols.length; j++) {
          if (this.fillSymbolStack(startPosBase, tokens, i, j, symbolStack, sentence, sentenceIdx)) {
            break;
          }
        }
      }
      startPosBase += sentence.getCorrectedTextLength();
      sentenceIdx++;
    }
    let isSymmetric = false;
    // if the stack is odd and symmetric match only the symbol in the middle, e. g. ({"})
    const ssSize = symbolStack.size();
    if (ssSize > 2 && ssSize % 2 === 1) {
      isSymmetric = true;
      for (let i = 0; i < Math.trunc(ssSize / 2); i++) {
        if (this.startSymbols.indexOf(symbolStack.get(i).getSymbol().symbol)
            !== this.endSymbols.indexOf(symbolStack.get(ssSize - 1).getSymbol().symbol)) {
          isSymmetric = false;
          break;
        }
      }
    }
    let memo = null;
    const lazyFullText = () => {
      if (memo === null) {
        let fullText = '';
        for (const aSentence of sentences) {
          fullText += aSentence.getText();
        }
        memo = fullText;
      }
      return memo;
    };
    if (isSymmetric) {
      const loc = symbolStack.get(Math.trunc(ssSize / 2));
      const sentenceIndex = loc.getSentenceIndex();
      const rMatch = this.createMatch(ruleMatches, ruleMatchStack, loc.getStartPos(),
        loc.getSymbol(), loc.getSentence(), sentenceIndex, lazyFullText);
      if (rMatch !== null) {
        ruleMatches.push(rMatch);
      }
    } else {
      for (const sLoc of symbolStack) {
        const rMatch = this.createMatch(ruleMatches, ruleMatchStack, sLoc.getStartPos(), sLoc.getSymbol(),
          sLoc.getSentence(), sLoc.getSentenceIndex(), lazyFullText);
        if (rMatch !== null && (sLoc.getSymbol().symbolType === Symbol.Type.Closing
            || this.endsLikeRealSentence(sLoc.getSentence().getText()) || sentences.length - 1 > sLoc.getSentenceIndex())) {
          ruleMatches.push(rMatch);
        }
      }
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: GenericUnpairedBracketsRule#endsLikeRealSentence(String)
  endsLikeRealSentence(r) {
    const s = javaTrim(r);
    return s.endsWith('.') || s.endsWith('?') || s.endsWith('!');
  }

  // Java: GenericUnpairedBracketsRule#uniqueMapInit()
  uniqueMapInit() {
    const uniqueMap = new Map();
    for (const endSymbol of this.endSymbols) {
      let found = 0;
      for (const endSymbol1 of this.endSymbols) {
        if (endSymbol1 === endSymbol) {
          found++;
        }
      }
      uniqueMap.set(endSymbol, found === 1);
    }
    return uniqueMap;
  }

  // Java: GenericUnpairedBracketsRule#fillSymbolStack(int,AnalyzedTokenReadings[],int,int,UnsyncStack,AnalyzedSentence,int)
  fillSymbolStack(startPosBase, tokens, i, j, symbolStack, sentence, sentenceIdx) {
    const { startSymbols, endSymbols } = this;
    const token = tokens[i].getToken();
    const startPos = startPosBase + tokens[i].getStartPos();
    if (token === startSymbols[j] || token === endSymbols[j]) {
      const precededByWhitespace = this.getPrecededByWhitespace(tokens, i, j);
      const isSpecialCase = this.getSpecialCase(tokens, i, j);
      const noException = this.isNoException(token, tokens, i, j,
        precededByWhitespace, isSpecialCase, symbolStack);

      if (noException && precededByWhitespace && token === startSymbols[j]) {
        symbolStack.push(new SymbolLocator(new Symbol(startSymbols[j], Symbol.Type.Opening), i, startPos, sentence, sentenceIdx));
        return true;
      } else if (noException && (isSpecialCase || tokens[i].isSentenceEnd())
          && token === endSymbols[j]) {
        if ((i > 2 && endSymbols[j] === ')'
                && (tokens[i - 3].hasPosTag('SENT_START') || tokens[i - 2].isWhitespaceBefore())
                && tokens[i - 1].getToken() === '.'
                && (this.numerals.matcher(tokens[i - 2].getToken()).matches()
                && !(!symbolStack.empty()
                && '(' === symbolStack.peek().getSymbol().symbol)))
            || (i > 1 && endSymbols[j] === ')'
                && (this.numerals.matcher(tokens[i - 1].getToken()).matches()
                && !(!symbolStack.empty()
                && '(' === symbolStack.peek().getSymbol().symbol)))) {
          // list item or numeral: nothing to do
        } else if (symbolStack.empty()) {
          symbolStack.push(new SymbolLocator(new Symbol(endSymbols[j], Symbol.Type.Closing), i, startPos, sentence, sentenceIdx));
          return true;
        } else if (symbolStack.peek().getSymbol().symbol === startSymbols[j]) {
          symbolStack.pop();
          return true;
        } else if (this.isEndSymbolUnique(endSymbols[j])) {
          symbolStack.push(new SymbolLocator(new Symbol(endSymbols[j], Symbol.Type.Closing), i, startPos, sentence, sentenceIdx));
          return true;
        } else if (j === endSymbols.length - 1) {
          symbolStack.push(new SymbolLocator(new Symbol(endSymbols[j], Symbol.Type.Closing), i, startPos, sentence, sentenceIdx));
          return true;
        }
      }
    }
    return false;
  }

  // Java: GenericUnpairedBracketsRule#getPrecededByWhitespace(AnalyzedTokenReadings[],int,int)
  getPrecededByWhitespace(tokens, i, j) {
    let precededByWhitespace = true;
    if (this.startSymbols[j] === this.endSymbols[j]) {
      precededByWhitespace = tokens[i - 1].isSentenceStart()
          || tokens[i].isWhitespaceBefore()
          || PUNCTUATION_NO_DOT.matcher(tokens[i - 1].getToken()).matches()
          || this.startSymbols.includes(tokens[i - 1].getToken());
    }
    return precededByWhitespace;
  }

  // Java: GenericUnpairedBracketsRule#getSpecialCase(AnalyzedTokenReadings[],int,int)
  getSpecialCase(tokens, i, j) {
    let isException = true;
    if (i < tokens.length - 1 && this.startSymbols[j] === this.endSymbols[j]) {
      isException = tokens[i + 1].isWhitespaceBefore()
              || PUNCTUATION.matcher(tokens[i + 1].getToken()).matches()
              || this.endSymbols.includes(tokens[i + 1].getToken())
              || (i >= 1 && tokens[i - 1].getToken().endsWith('-')) // e.g. >>xxx-"yyy yyy"-zzz<<
              || tokens[i + 1].getToken().startsWith('-') // e.g. >>"Go"-button<<
              || 's' === tokens[i + 1].getToken(); // e.g. >>"I"s<< has and needs no space
    }
    return isException;
  }

  // Java: GenericUnpairedBracketsRule#isEndSymbolUnique(String)
  isEndSymbolUnique(str) {
    return this.uniqueMap.get(str);
  }

  // Java: GenericUnpairedBracketsRule#createMatch(List,UnsyncStack,int,Symbol,AnalyzedSentence,int,Supplier)
  createMatch(ruleMatches, ruleMatchStack, startPos, symbol, sentence, sentenceIdx, lazyFullText) {
    if (!ruleMatchStack.empty()) {
      const index = this.endSymbols.indexOf(symbol.symbol);
      if (index >= 0) {
        const rLoc = ruleMatchStack.peek();
        if (rLoc.getSymbol().symbol === this.startSymbols[index]) {
          if (ruleMatches.length > rLoc.getIndex()) {
            ruleMatches.splice(rLoc.getIndex(), 1);
            ruleMatchStack.pop();
            return null;
          }
        }
      }
    }
    ruleMatchStack.push(new SymbolLocator(symbol, ruleMatches.length, startPos, sentence, sentenceIdx));
    const otherSymbol = this.findCorrespondingSymbol(symbol);
    let message = this.getMessage();
    if (message === null) {
      message = MessageFormat.format(this.messages.getString('unpaired_brackets'), otherSymbol);
    }
    const fullText = lazyFullText();
    if (startPos + symbol.symbol.length < fullText.length) {
      if (startPos >= 2 && startPos + symbol.symbol.length < fullText.length) {
        const context = fullText.substring(startPos - 2, startPos + symbol.symbol.length);
        if (javaMatches(context, '\n[a-zA-Z]\\)')) { // prevent error for "b) foo item"
          return null;
        }
      } else if (startPos >= 1) {
        const context = fullText.substring(startPos - 1, startPos + symbol.symbol.length);
        if (javaMatches(context, '[a-zA-Z]\\)')) { // prevent error for "a) foo item" at text start
          return null;
        }
      }
    }
    if (this.preventMatch(sentence)) {
      return null;
    }
    const match = new RuleMatch(this, sentence, startPos, startPos + symbol.symbol.length, message);
    const repl = this.getSuggestions(lazyFullText, startPos, startPos + symbol.symbol.length, symbol, otherSymbol);
    if (repl !== null) {
      match.setSuggestedReplacements(repl);
    }
    return match;
  }

  // Java: GenericUnpairedBracketsRule#preventMatch(AnalyzedSentence)
  preventMatch() {
    return false;
  }

  // Java: GenericUnpairedBracketsRule#getSuggestions(Supplier,int,int,Symbol,String)
  getSuggestions() {
    return null;
  }

  // Java: GenericUnpairedBracketsRule#getMessage()
  getMessage() {
    return null;
  }

  // Java: GenericUnpairedBracketsRule#findCorrespondingSymbol(Symbol)
  findCorrespondingSymbol(symbol) {
    const idx1 = this.startSymbols.indexOf(symbol.symbol);
    if (idx1 >= 0) {
      return this.endSymbols[idx1];
    }
    const idx2 = this.endSymbols.indexOf(symbol.symbol);
    return this.startSymbols[idx2];
  }

  // Java: GenericUnpairedBracketsRule#minToCheckParagraph()
  minToCheckParagraph() {
    return -1;
  }
}
