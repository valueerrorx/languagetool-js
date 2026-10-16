// org.languagetool.rules.patterns.Substrings (required substrings of a regexp, used to skip regex matching)
import { toUpperCase as chToUpper, toLowerCase as chToLower } from '../../lib/java/Character.js';
import { regionMatches, indexOf as jIndexOf, charAt } from '../../lib/java/strings.js';

// Java: Substrings
export class Substrings {
  // Java: Substrings(boolean,boolean,String[]) / private Substrings(boolean,boolean,String[],int)
  constructor(mustStart, mustEnd, substrings, minLength = substrings.reduce((a, s) => (a + s.length) | 0, 0)) {
    this.substrings = substrings;
    this.mustStart = mustStart;
    this.mustEnd = mustEnd;
    this.minLength = minLength;
  }

  // Java: Substrings#checkCanReplaceRegex(String)
  checkCanReplaceRegex(regexp) {
    if (this.mustStart || this.mustEnd) {
      const prefix = this.mustStart ? this.substrings[0] : '';
      const suffix = this.mustEnd ? this.substrings[this.substrings.length - 1] : '';
      if (regexp.startsWith(prefix)
          && regexp.endsWith(suffix)
          && regexp.length === prefix.length + suffix.length + 2
          && regexp.charAt(prefix.length) === '.') {
        switch (regexp.charAt(prefix.length + 1)) {
          case '*': return this;
          case '+': return new Substrings(this.mustStart, this.mustEnd, this.substrings, this.minLength + 1);
          default: break;
        }
      }
    }
    if (regexp === (this.mustStart ? '' : '.*') + this.substrings.join('.*') + (this.mustEnd ? '' : '.*')) {
      return this;
    }
    return null;
  }

  // Java: Substrings#toString()
  toString() {
    return (this.mustStart ? '[' : '(') + this.substrings.join(', ') + (this.mustEnd ? ']' : ')');
  }

  // Java: Substrings#concat(Substrings)
  concat(another) {
    let substrings;
    if (another.substrings.length === 0) {
      substrings = this.substrings;
    } else if (this.substrings.length === 0) {
      substrings = another.substrings;
    } else if (this.mustEnd && another.mustStart) {
      substrings = this.substrings.slice(0, this.substrings.length - 1);
      substrings.push(this.substrings[this.substrings.length - 1] + another.substrings[0]);
      for (let i = 0; i < another.substrings.length - 1; i++) substrings.push(another.substrings[i]);
    } else {
      substrings = this.substrings.concat(another.substrings);
    }
    return new Substrings(this.mustStart, another.mustEnd, substrings);
  }

  // Java: Substrings#find(String,boolean)
  find(text, caseSensitive) {
    if (text.length < this.minLength) {
      return -1;
    }
    const start = indexOfSub(text, this.substrings[0], caseSensitive, 0);
    if (start < 0) {
      return -1;
    }
    if (this.substrings.length > 1 && !this.containsSubstrings(text, caseSensitive, start + this.substrings[0].length, 1)) {
      return -1;
    }
    return start;
  }

  // Java: Substrings#matches(String,boolean)
  matches(text, caseSensitive) {
    if (text.length < this.minLength) {
      return false;
    }
    if (this.mustStart && !regionMatches(text, !caseSensitive, 0, this.substrings[0], 0, this.substrings[0].length)) {
      return false;
    }
    if (this.mustEnd) {
      const last = this.substrings[this.substrings.length - 1];
      if (!regionMatches(text, !caseSensitive, text.length - last.length, last, 0, last.length)) {
        return false;
      }
    }
    if (this.substrings.length === 1 && (this.mustStart || this.mustEnd)) {
      return true;
    }
    return this.containsSubstrings(text, caseSensitive, this.mustStart ? this.substrings[0].length : 0, this.mustStart ? 1 : 0);
  }

  // Java: Substrings#containsSubstrings(String,boolean,int,int)
  containsSubstrings(text, caseSensitive, textPos, firstSubstringIndex) {
    for (let i = firstSubstringIndex; i < this.substrings.length; i++) {
      textPos = indexOfSub(text, this.substrings[i], caseSensitive, textPos);
      if (textPos < 0) {
        return false;
      }
      textPos += this.substrings[i].length;
    }
    return true;
  }
}

// Java: Substrings#indexOf(String,String,boolean,int)
function indexOfSub(text, substring, caseSensitive, from) {
  return caseSensitive ? jIndexOf(text, substring, from) : indexOfIgnoreCase(text, substring, from);
}

// Java: Substrings#indexOfIgnoreCase(String,String,int)
function indexOfIgnoreCase(text, substring, from) {
  const first = charAt(substring, 0);
  const up = chToUpper(first);
  const low = chToLower(first);
  const cased = up !== first || low !== first;
  while (true) {
    from = cased ? findNext(text, from, up, low) : jIndexOf(text, String.fromCharCode(first), from);
    if (from < 0) {
      return -1;
    }
    if (regionMatches(text, true, from, substring, 0, substring.length)) {
      return from;
    }
    from++;
  }
}

// Java: Substrings#findNext(String,int,char,char)
function findNext(text, from, up, low) {
  for (let i = from; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === up || c === low || chToUpper(c) === up || chToLower(c) === low) {
      return i;
    }
  }
  return -1;
}
