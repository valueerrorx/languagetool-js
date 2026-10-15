// org.languagetool.rules.SymbolLocator
// Java: SymbolLocator
export class SymbolLocator {
  static FQCN = 'org.languagetool.rules.SymbolLocator';

  // Java: SymbolLocator#SymbolLocator(Symbol,int,int,AnalyzedSentence,int)
  constructor(symbol, index, startPos, sentence, sentenceIndex) {
    this.symbol = symbol;
    this.index = index;
    this.startPos = startPos;
    this.sentence = sentence;
    this.sentenceIndex = sentenceIndex;
  }

  // Java: SymbolLocator#getSymbol()
  getSymbol() {
    return this.symbol;
  }

  // Java: SymbolLocator#getIndex()
  getIndex() {
    return this.index;
  }

  // Java: SymbolLocator#getStartPos()
  getStartPos() {
    return this.startPos;
  }

  // Java: SymbolLocator#getSentence()
  getSentence() {
    return this.sentence;
  }

  // Java: SymbolLocator#getSentenceIndex()
  getSentenceIndex() {
    return this.sentenceIndex;
  }

  // Java: SymbolLocator#toString()
  toString() {
    return `${this.symbol}/${this.index}`;
  }
}
