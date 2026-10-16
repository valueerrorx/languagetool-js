// Java: com.optimaize.langdetect.ngram.{NgramExtractor,StandardNgramFilter,NgramExtractors}
import { IllegalArgumentException, UnsupportedOperationException } from '../java/errors.js';

// Java: com.optimaize.langdetect.ngram.StandardNgramFilter
export class StandardNgramFilter {
  static INSTANCE = new StandardNgramFilter();

  // Java: StandardNgramFilter#getInstance()
  static getInstance() {
    return StandardNgramFilter.INSTANCE;
  }

  // Java: StandardNgramFilter#use(String)
  use(ngram) {
    switch (ngram.length) {
      case 1:
        return ngram.charCodeAt(0) !== 0x20;
      case 2:
        return true;
      case 3:
        return ngram.charCodeAt(1) !== 0x20; // middle char is a space
      case 4:
        return ngram.charCodeAt(1) !== 0x20 && ngram.charCodeAt(2) !== 0x20; // one of the middle chars is a space
      default:
        throw new UnsupportedOperationException(`Unsupported n-gram length: ${ngram.length}`);
    }
  }
}

// Java: com.optimaize.langdetect.ngram.NgramExtractor
export class NgramExtractor {
  // Java: NgramExtractor#NgramExtractor(List,NgramFilter,Character)
  constructor(gramLengths, filter, textPadding) {
    if (gramLengths.length === 0) throw new IllegalArgumentException();
    this.gramLengths = [...gramLengths];
    this.filter = filter;
    this.textPadding = textPadding;
  }

  // Java: NgramExtractor#gramLengths(Integer...)
  static gramLengths(...gramLength) {
    return new NgramExtractor(gramLength, null, null);
  }

  // Java: NgramExtractor#filter(NgramFilter)
  filterWith(filter) {
    return new NgramExtractor(this.gramLengths, filter, this.textPadding);
  }

  // Java: NgramExtractor#textPadding(char)
  withTextPadding(textPadding) {
    return new NgramExtractor(this.gramLengths, this.filter, textPadding);
  }

  // Java: NgramExtractor#getGramLengths()
  getGramLengths() {
    return this.gramLengths;
  }

  // Java: NgramExtractor#extractGrams(CharSequence)
  extractGrams(text) {
    text = this.applyPadding(text);
    const len = text.length;
    let totalNumGrams = 0;
    for (const gramLength of this.gramLengths) {
      const num = len - (gramLength - 1);
      if (num >= 1) totalNumGrams += num; // yes can be negative
    }
    if (totalNumGrams <= 0) return [];
    const grams = [];
    for (const gramLength of this.gramLengths) {
      const numGrams = len - (gramLength - 1);
      if (numGrams >= 1) {
        for (let pos = 0; pos < numGrams; pos++) {
          const gram = text.substring(pos, pos + gramLength);
          if (this.filter === null || this.filter.use(gram)) grams.push(gram);
        }
      }
    }
    return grams;
  }

  // Java: NgramExtractor#extractCountedGrams(CharSequence) (LinkedHashMap -> insertion-ordered Map)
  extractCountedGrams(text) {
    text = this.applyPadding(text);
    const len = text.length;
    const grams = new Map();
    for (const gramLength of this.gramLengths) this.extractCounted(text, gramLength, len, grams);
    return grams;
  }

  // Java: NgramExtractor#_extractCounted(CharSequence,int,int,Map)
  extractCounted(text, gramLength, len, grams) {
    const endPos = len - (gramLength - 1);
    for (let pos = 0; pos < endPos; pos++) {
      const gram = text.substring(pos, pos + gramLength);
      if (this.filter === null || this.filter.use(gram)) {
        const counter = grams.get(gram);
        grams.set(gram, counter === undefined ? 1 : counter + 1);
      }
    }
  }

  // Java: NgramExtractor#applyPadding(CharSequence)
  applyPadding(text) {
    if (this.textPadding === null) return text;
    if (text.length === 0) return text;
    const pad = this.textPadding;
    if (text[0] === pad && text[text.length - 1] === pad) return text;
    let sb = '';
    if (text[0] !== pad) sb += pad;
    sb += text;
    if (text[text.length - 1] !== pad) sb += pad;
    return sb;
  }
}

// Java: com.optimaize.langdetect.ngram.NgramExtractors
export const NgramExtractors = {
  STANDARD: NgramExtractor.gramLengths(1, 2, 3).filterWith(StandardNgramFilter.getInstance()).withTextPadding(' '),

  // Java: NgramExtractors#standard()
  standard() {
    return NgramExtractors.STANDARD;
  },
};
