// Interim simple case mapping (Character.toUpperCase/toLowerCase on code points); S09 replaces it with Unicode 13 tables.

// TODO: regenerate POST_U13 from JDK 17 dump in S09
// code points whose case mapping was added after Unicode 13 (JDK 17 leaves them unchanged)
const POST_U13 = [[0x2c2f, 0x2c2f], [0x2c5f, 0x2c5f], [0xa7c0, 0xa7c1], [0xa7cb, 0xa7dc], [0x1c89, 0x1c8a], [0x10570, 0x105bc], [0x10d50, 0x10d65]];
const afterU13 = (cp) => POST_U13.some(([a, b]) => cp >= a && cp <= b);

// Java: Character#toUpperCase(int)
export function charToUpperCase(cp) {
  if (cp < 0x80) return cp >= 0x61 && cp <= 0x7a ? cp - 32 : cp;
  if (afterU13(cp) || cp > 0x10ffff) return cp;
  if ((cp >= 0x1f80 && cp <= 0x1f87) || (cp >= 0x1f90 && cp <= 0x1f97) || (cp >= 0x1fa0 && cp <= 0x1fa7)) return cp + 8;
  if (cp === 0x1fb3 || cp === 0x1fc3 || cp === 0x1ff3) return cp + 9;
  if (cp >= 0xd800 && cp <= 0xdfff) return cp;
  const u = String.fromCodePoint(cp).toUpperCase();
  const c = u.codePointAt(0);
  return u.length === (c > 0xffff ? 2 : 1) ? c : cp;
}

// Java: Character#toLowerCase(int)
export function charToLowerCase(cp) {
  if (cp < 0x80) return cp >= 0x41 && cp <= 0x5a ? cp + 32 : cp;
  if (afterU13(cp) || cp > 0x10ffff) return cp;
  if (cp >= 0xd800 && cp <= 0xdfff) return cp;
  if (cp === 0x130) return 0x69; // Java: simple lowercase of U+0130 is 'i'
  const l = String.fromCodePoint(cp).toLowerCase();
  const c = l.codePointAt(0);
  return l.length === (c > 0xffff ? 2 : 1) ? c : cp;
}
