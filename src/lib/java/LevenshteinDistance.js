// org.apache.commons.text.similarity.LevenshteinDistance (default instance: no threshold, edit distance over UTF-16 code units)
import { IllegalArgumentException } from './errors.js';

// Java: LevenshteinDistance#apply(CharSequence,CharSequence) of LevenshteinDistance.getDefaultInstance()
export function levenshteinDistance(left, right) {
  if (left === null || left === undefined || right === null || right === undefined) {
    throw new IllegalArgumentException('CharSequences must not be null');
  }
  let n = left.length;
  let m = right.length;
  if (n === 0) return m;
  if (m === 0) return n;
  if (n > m) {
    // swap the input strings to consume less memory
    const tmp = left;
    left = right;
    right = tmp;
    n = m;
    m = right.length;
  }
  let p = new Array(n + 1);
  let d = new Array(n + 1);
  for (let i = 0; i <= n; i++) p[i] = i;
  for (let j = 1; j <= m; j++) {
    const rightJ = right.charCodeAt(j - 1);
    d[0] = j;
    for (let i = 1; i <= n; i++) {
      const cost = left.charCodeAt(i - 1) === rightJ ? 0 : 1;
      d[i] = Math.min(Math.min(d[i - 1] + 1, p[i] + 1), p[i - 1] + cost);
    }
    const tmp = p;
    p = d;
    d = tmp;
  }
  return p[n];
}
