// org.languagetool.rules.spelling.symspell.implementation.EditDistance (Damerau-Levenshtein, pulled forward from F42 for AbstractFindSuggestionsFilter)
import { IllegalArgumentException } from '../../../../../lib/java/errors.js';

// Java: EditDistance.DistanceAlgorithm
const DistanceAlgorithm = Object.freeze({ Damerau: 'Damerau' });

// Java: EditDistance
export class EditDistance {
  static FQCN = 'org.languagetool.rules.spelling.symspell.implementation.EditDistance';
  static DistanceAlgorithm = DistanceAlgorithm;

  // Java: EditDistance#EditDistance(String,DistanceAlgorithm)
  constructor(baseString, algorithm) {
    this.baseString = baseString;
    this.algorithm = algorithm;
    if (this.baseString.length === 0) {
      this.baseString = null;
      return;
    }
    if (algorithm === DistanceAlgorithm.Damerau) {
      this.v0 = new Int32Array(baseString.length);
      this.v2 = new Int32Array(baseString.length); // stores one level further back (offset by +1 position)
    }
  }

  // Java: EditDistance#compare(String,int)
  compare(string2, maxDistance) {
    if (this.algorithm === DistanceAlgorithm.Damerau) return this.DamerauLevenshteinDistance(string2, maxDistance);
    throw new IllegalArgumentException('unknown DistanceAlgorithm');
  }

  // Java: EditDistance#DamerauLevenshteinDistance(String,int)
  DamerauLevenshteinDistance(string2, maxDistance) {
    if (this.baseString === null) return string2 === null ? 0 : string2.length;
    if (string2 === null || string2.length === 0) return this.baseString.length;
    if (maxDistance === 0) return this.baseString === string2 ? 0 : -1;

    // if strings of different lengths, ensure shorter string is in string1
    let string1;
    if (this.baseString.length > string2.length) {
      string1 = string2;
      string2 = this.baseString;
    } else {
      string1 = this.baseString;
    }
    let sLen = string1.length; // this is also the minimum length of the two strings
    let tLen = string2.length;

    // suffix common to both strings can be ignored
    while ((sLen > 0) && (string1.charCodeAt(sLen - 1) === string2.charCodeAt(tLen - 1))) { sLen--; tLen--; }

    let start = 0;
    if ((string1.charCodeAt(0) === string2.charCodeAt(0)) || (sLen === 0)) { // if there's a shared prefix, or all string1 matches string2's suffix
      // prefix common to both strings can be ignored
      while ((start < sLen) && (string1.charCodeAt(start) === string2.charCodeAt(start))) start++;
      sLen -= start; // length of the part excluding common prefix and suffix
      tLen -= start;

      // if all of shorter string matches prefix and/or suffix of longer string, then edit distance is just the delete of additional characters
      if (sLen === 0) return tLen;

      string2 = string2.substring(start, start + tLen);
    }
    const lenDiff = tLen - sLen;
    if ((maxDistance < 0) || (maxDistance > tLen)) {
      maxDistance = tLen;
    } else if (lenDiff > maxDistance) return -1;

    if (tLen > this.v0.length) {
      this.v0 = new Int32Array(tLen);
      this.v2 = new Int32Array(tLen);
    } else {
      for (let i = 0; i < tLen; i++) this.v2[i] = 0; // Substituting Array.clear(v2, 0, tLen)
    }
    const v0 = this.v0;
    const v2 = this.v2;
    let j;
    for (j = 0; j < maxDistance; j++) v0[j] = j + 1;
    for (; j < tLen; j++) v0[j] = maxDistance + 1;

    const jStartOffset = maxDistance - (tLen - sLen);
    const haveMax = maxDistance < tLen;
    let jStart = 0;
    let jEnd = maxDistance;
    let sChar = string1.charCodeAt(0);
    let current = 0;
    for (let i = 0; i < sLen; i++) {
      const prevsChar = sChar;
      sChar = string1.charCodeAt(start + i);
      let tChar = string2.charCodeAt(0);
      let left = i;
      current = left + 1;
      let nextTransCost = 0;
      // no need to look beyond window of lower right diagonal - maxDistance cells and the upper left diagonal + maxDistance cells
      jStart += (i > jStartOffset) ? 1 : 0;
      jEnd += (jEnd < tLen) ? 1 : 0;
      for (j = jStart; j < jEnd; j++) {
        const above = current;
        let thisTransCost = nextTransCost;
        nextTransCost = v2[j];
        v2[j] = current = left; // cost of diagonal (substitution)
        left = v0[j]; // left now equals current cost (which will be diagonal at next iteration)
        const prevtChar = tChar;
        tChar = string2.charCodeAt(j);
        if (sChar !== tChar) {
          if (left < current) current = left; // insertion
          if (above < current) current = above; // deletion
          current++;
          if ((i !== 0) && (j !== 0) && (sChar === prevtChar) && (prevsChar === tChar)) {
            thisTransCost++;
            if (thisTransCost < current) current = thisTransCost; // transposition
          }
        }
        v0[j] = current;
      }
      if (haveMax && (v0[i + lenDiff] > maxDistance)) return -1;
    }
    return (current <= maxDistance) ? current : -1;
  }
}
