// java.util.StringTokenizer (JDK 17) including its per-char / code point delimiter handling.
import { NullPointerException, NoSuchElementException } from './errors.js';
import { isHighSurrogate, isLowSurrogate, charCount, toCodePoint } from './strings.js';

// code point at index like String#codePointAt(int)
function cpAt(s, i) {
  const c = s.charCodeAt(i);
  if (isHighSurrogate(c) && i + 1 < s.length && isLowSurrogate(s.charCodeAt(i + 1))) return toCodePoint(c, s.charCodeAt(i + 1));
  return c;
}

// Java: java.util.StringTokenizer
export class StringTokenizer {
  // Java: StringTokenizer#StringTokenizer(String,String,boolean)
  constructor(str, delim = ' \t\n\r\f', returnDelims = false) {
    this.currentPosition = 0;
    this.newPosition = -1;
    this.delimsChanged = false;
    if (str === null || str === undefined) throw new NullPointerException('Cannot invoke "String.length()" because "str" is null');
    this.str = str;
    this.maxPosition = str.length;
    this.delimiters = delim;
    this.retDelims = returnDelims;
    this.hasSurrogates = false;
    this.maxDelimCodePoint = 0;
    this.delimiterCodePoints = null;
    this.setMaxDelimCodePoint();
  }

  // Java: StringTokenizer#setMaxDelimCodePoint()
  setMaxDelimCodePoint() {
    if (this.delimiters === null) {
      this.maxDelimCodePoint = 0;
      return;
    }
    const d = this.delimiters;
    let m = 0;
    let c;
    let count = 0;
    for (let i = 0; i < d.length; i += charCount(c)) {
      c = d.charCodeAt(i);
      if (c >= 0xd800 && c <= 0xdfff) {
        c = cpAt(d, i);
        this.hasSurrogates = true;
      }
      if (m < c) m = c;
      count++;
    }
    this.maxDelimCodePoint = m;
    if (this.hasSurrogates) {
      this.delimiterCodePoints = new Array(count);
      for (let i = 0, j = 0; i < count; i++, j += charCount(c)) {
        c = cpAt(d, j);
        this.delimiterCodePoints[i] = c;
      }
    }
  }

  // Java: StringTokenizer#skipDelimiters(int)
  skipDelimiters(startPos) {
    if (this.delimiters === null) throw new NullPointerException();
    let position = startPos;
    while (!this.retDelims && position < this.maxPosition) {
      if (!this.hasSurrogates) {
        const c = this.str.charCodeAt(position);
        if (c > this.maxDelimCodePoint || this.delimiters.indexOf(String.fromCharCode(c)) < 0) break;
        position++;
      } else {
        const c = cpAt(this.str, position);
        if (c > this.maxDelimCodePoint || !this.isDelimiter(c)) break;
        position += charCount(c);
      }
    }
    return position;
  }

  // Java: StringTokenizer#scanToken(int)
  scanToken(startPos) {
    let position = startPos;
    while (position < this.maxPosition) {
      if (!this.hasSurrogates) {
        const c = this.str.charCodeAt(position);
        if (c <= this.maxDelimCodePoint && this.delimiters.indexOf(String.fromCharCode(c)) >= 0) break;
        position++;
      } else {
        const c = cpAt(this.str, position);
        if (c <= this.maxDelimCodePoint && this.isDelimiter(c)) break;
        position += charCount(c);
      }
    }
    if (this.retDelims && startPos === position) {
      if (!this.hasSurrogates) {
        const c = this.str.charCodeAt(position);
        if (c <= this.maxDelimCodePoint && this.delimiters.indexOf(String.fromCharCode(c)) >= 0) position++;
      } else {
        const c = cpAt(this.str, position);
        if (c <= this.maxDelimCodePoint && this.isDelimiter(c)) position += charCount(c);
      }
    }
    return position;
  }

  // Java: StringTokenizer#isDelimiter(int)
  isDelimiter(codePoint) {
    for (let i = 0; i < this.delimiterCodePoints.length; i++) {
      if (this.delimiterCodePoints[i] === codePoint) return true;
    }
    return false;
  }

  // Java: StringTokenizer#hasMoreTokens()
  hasMoreTokens() {
    this.newPosition = this.skipDelimiters(this.currentPosition);
    return this.newPosition < this.maxPosition;
  }

  // Java: StringTokenizer#nextToken() / nextToken(String)
  nextToken(delim) {
    if (delim !== undefined) {
      this.delimiters = delim;
      this.delimsChanged = true;
      this.setMaxDelimCodePoint();
    }
    this.currentPosition = this.newPosition >= 0 && !this.delimsChanged ? this.newPosition : this.skipDelimiters(this.currentPosition);
    this.delimsChanged = false;
    this.newPosition = -1;
    if (this.currentPosition >= this.maxPosition) throw new NoSuchElementException();
    const start = this.currentPosition;
    this.currentPosition = this.scanToken(this.currentPosition);
    return this.str.substring(start, this.currentPosition);
  }

  // Java: StringTokenizer#hasMoreElements()
  hasMoreElements() {
    return this.hasMoreTokens();
  }

  // Java: StringTokenizer#nextElement()
  nextElement() {
    return this.nextToken();
  }

  // Java: StringTokenizer#countTokens()
  countTokens() {
    let count = 0;
    let currpos = this.currentPosition;
    while (currpos < this.maxPosition) {
      currpos = this.skipDelimiters(currpos);
      if (currpos >= this.maxPosition) break;
      currpos = this.scanToken(currpos);
      count++;
    }
    return count;
  }
}
