// org.languagetool.AnalyzedSentence
import { ArrayIndexOutOfBoundsException } from '../lib/java/errors.js';
import { Objects } from '../lib/java/Objects.js';
import { AnalyzedToken } from './AnalyzedToken.js';
import { AnalyzedTokenReadings } from './AnalyzedTokenReadings.js';
import { SENTENCE_END_TAGNAME, PARAGRAPH_END_TAGNAME } from './JLanguageTool.js';

export class AnalyzedSentence {
  static FQCN = 'org.languagetool.AnalyzedSentence';

  // Java: AnalyzedSentence(AnalyzedTokenReadings[]) / (tokens,preDisambigTokens) / (tokens,preDisambigTokens,previous,readingsUnchanged)
  constructor(tokens, preDisambigTokens = tokens, previous = null, readingsUnchanged = false) {
    this.text = null;
    this.tokens = tokens;
    this.preDisambigTokens = preDisambigTokens;
    const whCounter = 0;
    const nonWhCounter = 0;
    const mapping = new Array(tokens.length + 1).fill(0);
    this.whPositions = mapping;
    this.nonBlankTokens = AnalyzedSentence.getNonBlankReadings(tokens, whCounter, nonWhCounter, mapping);
    this.nonBlankPreDisambigTokens = AnalyzedSentence.getNonBlankReadings(preDisambigTokens, whCounter, nonWhCounter, mapping);
    const sameTokens = previous !== null && AnalyzedSentence.haveSameTokenStrings(previous.nonBlankTokens, this.nonBlankTokens);
    this.tokenOffsets = sameTokens ? previous.tokenOffsets : AnalyzedSentence.indexTokens(this.nonBlankTokens);
    if (sameTokens && readingsUnchanged) {
      this.lemmaOffsets = previous.lemmaOffsets;
      this.posTagSet = previous.posTagSet;
    } else {
      this.lemmaOffsets = AnalyzedSentence.indexLemmas(this.nonBlankTokens);
      this.posTagSet = AnalyzedSentence.indexPosTags(this.nonBlankTokens);
    }
  }

  // Java: AnalyzedSentence#haveSameTokenStrings(AnalyzedTokenReadings[],AnalyzedTokenReadings[])
  static haveSameTokenStrings(a, b) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (a[i].getToken() !== b[i].getToken()) {
        return false;
      }
    }
    return true;
  }

  // Java: AnalyzedSentence#getNonBlankReadings(AnalyzedTokenReadings[],int,int,int[])
  static getNonBlankReadings(tokens, whCounter, nonWhCounter, mapping) {
    const l = [];
    for (const token of tokens) {
      if (!token.isWhitespace() || token.isSentenceStart() || token.isSentenceEnd() || token.isParagraphEnd()) {
        l.push(token);
        mapping[nonWhCounter] = whCounter;
        nonWhCounter++;
      }
      whCounter++;
    }
    return l;
  }

  // Java: AnalyzedSentence#AnalyzedSentence(AnalyzedTokenReadings[],AnalyzedSentence) (private)
  static fromSource(tokens, source) {
    const s = Object.create(AnalyzedSentence.prototype);
    s.text = null;
    s.tokens = tokens;
    s.preDisambigTokens = tokens;
    s.whPositions = source.whPositions;
    // same non-blank tokens as the source, so the (unmodifiable) indexes would be identical: share them
    s.nonBlankTokens = source.nonBlankTokens.slice();
    s.nonBlankPreDisambigTokens = source.nonBlankPreDisambigTokens.slice();
    s.tokenOffsets = source.tokenOffsets;
    s.lemmaOffsets = source.lemmaOffsets;
    s.posTagSet = source.posTagSet;
    return s;
  }

  // Java: AnalyzedSentence#indexTokens(AnalyzedTokenReadings[])
  static indexTokens(tokens) {
    const result = new Map();
    for (let i = 0; i < tokens.length; i++) {
      const key = tokens[i].getTokenLowerCase();
      if (!result.has(key)) result.set(key, []);
      result.get(key).push(i);
    }
    return AnalyzedSentence.makeUnmodifiable(result);
  }

  // Java: AnalyzedSentence#indexLemmas(AnalyzedTokenReadings[])
  static indexLemmas(tokens) {
    const result = new Map();
    for (let i = 0; i < tokens.length; i++) {
      const tr = tokens[i];
      const readingsLength = tr.getReadingsLength();
      for (let j = 0; j < readingsLength; j++) {
        const token = tr.getAnalyzedToken(j);
        const key = token.getLemmaOrTokenLowerCase();
        if (!result.has(key)) result.set(key, []);
        const list = result.get(key);
        if (list.length === 0 || list[list.length - 1] !== i) {
          list.push(i);
        }
      }
    }
    return AnalyzedSentence.makeUnmodifiable(result);
  }

  // Java: AnalyzedSentence#indexPosTags(AnalyzedTokenReadings[])
  static indexPosTags(tokens) {
    const result = new Set();
    for (const tokenReadings of tokens) {
      for (const token of tokenReadings) {
        const posTag = token.getPOSTag();
        if (posTag !== null) {
          result.add(posTag);
        }
      }
    }
    return result;
  }

  // Java: AnalyzedSentence#makeUnmodifiable(Map)
  static makeUnmodifiable(result) {
    for (const [key, value] of result) {
      result.set(key, Object.freeze(value));
    }
    return result;
  }

  // Java: AnalyzedSentence#copy(AnalyzedSentence)
  copy(sentence) {
    const copyTokens = new Array(sentence.getTokens().length);
    for (let i = 0; i < copyTokens.length; i++) {
      const analyzedTokens = sentence.getTokens()[i];
      copyTokens[i] = new AnalyzedTokenReadings(analyzedTokens, analyzedTokens.getReadings(), '');
    }
    return AnalyzedSentence.fromSource(copyTokens, sentence);
  }

  // Java: AnalyzedSentence#copyReadings(AnalyzedTokenReadings[])
  static copyReadings(tokens) {
    const copy = new Array(tokens.length);
    for (let i = 0; i < tokens.length; i++) {
      const analyzedTokens = tokens[i];
      // copy the readings themselves, not just the AnalyzedTokenReadings wrapper
      const readings = [];
      for (let j = 0; j < analyzedTokens.getReadingsLength(); j++) {
        const t = analyzedTokens.getAnalyzedToken(j);
        const c = new AnalyzedToken(t.getToken(), t.getPOSTag(), t.getLemma());
        c.setWhitespaceBefore(t.isWhitespaceBefore());
        readings.push(c);
      }
      copy[i] = new AnalyzedTokenReadings(analyzedTokens, readings, '');
    }
    return copy;
  }

  // Java: AnalyzedSentence#getTokens()
  getTokens() {
    return this.tokens;
  }

  // Java: AnalyzedSentence#getPreDisambigTokens()
  getPreDisambigTokens() {
    return this.preDisambigTokens;
  }

  // Java: AnalyzedSentence#getTokensWithoutWhitespace()
  getTokensWithoutWhitespace() {
    return this.nonBlankTokens.slice();
  }

  // Java: AnalyzedSentence#getNonWhitespaceTokenCount()
  getNonWhitespaceTokenCount() {
    return this.nonBlankTokens.length;
  }

  // Java: AnalyzedSentence#getPreDisambigTokensWithoutWhitespace()
  getPreDisambigTokensWithoutWhitespace() {
    return this.nonBlankPreDisambigTokens.slice();
  }

  // Java: AnalyzedSentence#getOriginalPosition(int)
  getOriginalPosition(nonWhPosition) {
    if (nonWhPosition < 0 || nonWhPosition >= this.whPositions.length) {
      throw new ArrayIndexOutOfBoundsException(`Index ${nonWhPosition} out of bounds for length ${this.whPositions.length}`);
    }
    return this.whPositions[nonWhPosition];
  }

  // Java: AnalyzedSentence#toString() / toString(String)
  toString(readingDelimiter = ',') {
    return this.toStringImpl(readingDelimiter, true);
  }

  // Java: AnalyzedSentence#toShortString(String)
  toShortString(readingDelimiter) {
    return this.toStringImpl(readingDelimiter, false);
  }

  // Java: AnalyzedSentence#getText()
  getText() {
    let result = this.text;
    if (result === null) {
      this.text = result = this.calcText();
    }
    return result;
  }

  // Java: AnalyzedSentence#calcText()
  calcText() {
    let sb = '';
    for (const element of this.tokens) {
      sb += element.getToken();
    }
    return sb;
  }

  // Java: AnalyzedSentence#getCorrectedTextLength()
  getCorrectedTextLength() {
    let len = 0;
    for (let i = 0; i < this.tokens.length; i++) {
      const element = this.tokens[i];
      len = (len + element.getCleanToken().length) | 0;
      if (i === this.tokens.length - 1) { // only apply at end, so the position fix at every token doesn't add up
        len = (len + element.getPosFix()) | 0;
      }
    }
    return len;
  }

  // Java: AnalyzedSentence#toTextString()
  toTextString() {
    return this.getText();
  }

  // Java: AnalyzedSentence#toString(String,boolean) (private)
  toStringImpl(readingDelimiter, includeChunks) {
    if (readingDelimiter === null || readingDelimiter === undefined) readingDelimiter = 'null';
    let sb = '';
    for (const element of this.tokens) {
      if (!element.isWhitespace()) {
        sb += element.getToken();
        sb += '[';
      }
      const iterator = element.iterator();
      while (iterator.hasNext()) {
        const token = iterator.next();
        const posTag = token.getPOSTag();
        if (element.isSentenceStart()) {
          sb += '<S>';
        } else if (SENTENCE_END_TAGNAME === posTag) {
          sb += '</S>';
        } else if (PARAGRAPH_END_TAGNAME === posTag) {
          sb += '<P/>';
        } else if (posTag === null && !includeChunks) {
          sb += token.getToken();
        } else {
          if (!element.isWhitespace()) {
            sb += token.toString();
            if (iterator.hasNext()) {
              sb += readingDelimiter;
            }
          }
        }
      }
      if (!element.isWhitespace()) {
        if (includeChunks && element.getChunkTags().length !== 0) {
          sb += ',';
          sb += element.getChunkTags().map((c) => (c === null || c === undefined ? '' : c.toString())).join('|');
        }
        if (element.isImmunized()) {
          sb += '{!}';
        }
        sb += ']';
      } else {
        sb += ' ';
      }
    }
    return sb;
  }

  // Java: AnalyzedSentence#getAnnotations()
  getAnnotations() {
    let sb = '';
    sb += 'Disambiguator log: \n';
    for (const element of this.tokens) {
      if (!element.isWhitespace() &&
              '' !== element.getHistoricalAnnotations()) {
        sb += element.getHistoricalAnnotations();
        sb += '\n';
      }
    }
    return sb;
  }

  // Java: AnalyzedSentence#getTokenSet()
  getTokenSet() {
    return new Set(this.tokenOffsets.keys());
  }

  // Java: AnalyzedSentence#getLemmaSet()
  getLemmaSet() {
    return new Set(this.lemmaOffsets.keys());
  }

  // Java: AnalyzedSentence#getPosTagSet()
  getPosTagSet() {
    return this.posTagSet;
  }

  // Java: AnalyzedSentence#getTokenOffsets(String)
  getTokenOffsets(token) {
    return this.tokenOffsets.get(token) ?? null;
  }

  // Java: AnalyzedSentence#getLemmaOffsets(String)
  getLemmaOffsets(token) {
    return this.lemmaOffsets.get(token) ?? null;
  }

  // Java: AnalyzedSentence#equals(Object); hashCode is identity-based in Java (Objects.hash over arrays), so none here
  equals(o) {
    if (this === o) {
      return true;
    }
    if (o === null || o === undefined || o.constructor !== this.constructor) {
      return false;
    }
    const arrEq = (a, b) => a.length === b.length && a.every((x, i) => Objects.equals(x, b[i]));
    // tokenSet and lemmaSet are a subset of tokens and don't need to be included
    return arrEq(this.nonBlankTokens, o.nonBlankTokens)
        && arrEq(this.tokens, o.tokens)
        && arrEq(this.whPositions, o.whPositions);
  }
}
