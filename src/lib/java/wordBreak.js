// Approximate model of BreakIterator.getWordInstance(locale) boundaries (JDK 17 sun.text word rules), used by final-sigma casing only.
import { getType } from './Character.js';

// one class letter per code point: l letter, d digit, b mid-word+mid-num+pre-num (" ' .), w mid-word, n mid-num, p pre-num, q post-num, s space, k kanji, t katakana, h hiragana, x other, i ignorable (Mn Me Cf)
function classOf(cp) {
  const t = getType(cp);
  if (t === 6 || t === 7 || t === 16) return cp === 0xad ? 'w' : 'i';
  if (cp === 0x22 || cp === 0x27 || cp === 0x2e) return 'b';
  if (cp === 0x2c || cp === 0x66b) return 'n';
  if (t === 20 || cp === 0x2027) return 'w';
  if (cp === 0x3005 || (cp >= 0x4e00 && cp <= 0x9fa5) || (cp >= 0xf900 && cp <= 0xfa2d)) return 'k';
  if (cp >= 0x30a1 && cp <= 0x30fa) return 't';
  if (cp >= 0x3041 && cp <= 0x3094) return 'h';
  if ((t >= 1 && t <= 5) || t === 8) return 'l';
  if (t >= 9 && t <= 11) return 'd';
  if ((t === 26 && cp !== 0xa2) || cp === 0x23) return 'p';
  if (cp === 0x25 || cp === 0x26 || cp === 0xa2 || cp === 0x66a || cp === 0x2030 || cp === 0x2031) return 'q';
  if (t === 12 || cp === 9) return 's';
  return 'x';
}

const WORD = 'l+(?:[wb]l+)*';
const NUMBER = 'd+(?:[nb]d+)*';
const RUN = `[bp]?(?:${WORD}|${NUMBER})+q?`;
const TOKEN = new RegExp(`${RUN}|s+|k+|t+|h+|[^i]`, 'y');

// Java: RuleBasedBreakIterator#isBoundary(int) for all offsets (set of boundary offsets of s)
export function wordBoundaries(s) {
  let cs = '';
  const pos = [];
  for (let i = 0; i < s.length; i++) {
    const cp = s.codePointAt(i);
    const c = classOf(cp);
    if (c !== 'i' || cs === '') {
      cs += c === 'i' ? 'x' : c;
      pos.push(i);
    }
    if (cp > 0xffff) i++;
  }
  const bounds = new Set([0, s.length]);
  let k = 0;
  while (k < cs.length) {
    TOKEN.lastIndex = k;
    const m = TOKEN.exec(cs);
    k += m ? m[0].length : 1;
    bounds.add(k < cs.length ? pos[k] : s.length);
  }
  return bounds;
}
