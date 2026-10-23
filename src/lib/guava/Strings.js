// Guava com.google.common.base.Strings (used methods only)

// Java: Strings#validSurrogatePairAt(CharSequence,int) (private)
function validSurrogatePairAt(s, index) {
  if (index < 0 || index > s.length - 2) return false;
  const hi = s.charCodeAt(index);
  const lo = s.charCodeAt(index + 1);
  return hi >= 0xd800 && hi <= 0xdbff && lo >= 0xdc00 && lo <= 0xdfff;
}

// Java: Strings#commonPrefix(CharSequence,CharSequence)
export function commonPrefix(a, b) {
  const maxPrefixLength = Math.min(a.length, b.length);
  let p = 0;
  while (p < maxPrefixLength && a.charCodeAt(p) === b.charCodeAt(p)) p++;
  if (validSurrogatePairAt(a, p - 1) || validSurrogatePairAt(b, p - 1)) p--;
  return a.substring(0, p);
}
