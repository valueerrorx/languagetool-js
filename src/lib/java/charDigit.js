// Character.digit/forDigit/getNumericValue for UTF-16 code units (numbers are char codes).

const ND = /^\p{Nd}$/u;

// Java: Character#digit(char,int)
export function digit(c, radix) {
  if (radix < 2 || radix > 36) return -1;
  let v = -1;
  if (c >= 0x30 && c <= 0x39) v = c - 0x30;
  else if (c >= 0x61 && c <= 0x7a) v = c - 0x61 + 10;
  else if (c >= 0x41 && c <= 0x5a) v = c - 0x41 + 10;
  else if (c >= 0xff21 && c <= 0xff3a) v = c - 0xff21 + 10;
  else if (c >= 0xff41 && c <= 0xff5a) v = c - 0xff41 + 10;
  else if (c >= 0x80 && !(c >= 0xd800 && c <= 0xdfff) && ND.test(String.fromCharCode(c))) {
    let start = c;
    while (start > 0 && ND.test(String.fromCharCode(start - 1))) start--;
    v = (c - start) % 10;
  }
  return v < radix ? v : -1;
}

// Java: Character#forDigit(int,int)
export function forDigit(d, radix) {
  if (d >= radix || d < 0) return 0;
  if (radix < 2 || radix > 36) return 0;
  if (d < 10) return 0x30 + d;
  return 0x61 - 10 + d;
}

// Java: Character#getNumericValue(char) (letters, decimal digits, Roman numerals, circled numbers, vulgar fractions)
export function getNumericValue(c) {
  if (c >= 0x61 && c <= 0x7a) return c - 0x61 + 10;
  if (c >= 0x41 && c <= 0x5a) return c - 0x41 + 10;
  if (c >= 0xff21 && c <= 0xff3a) return c - 0xff21 + 10;
  if (c >= 0xff41 && c <= 0xff5a) return c - 0xff41 + 10;
  const d = digit(c, 10);
  if (d >= 0) return d;
  if (c === 0xb2) return 2;
  if (c === 0xb3) return 3;
  if (c === 0xb9) return 1;
  if (c === 0xbc || c === 0xbd || c === 0xbe) return -2;
  for (const base of [0x2160, 0x2170]) {
    if (c >= base && c <= base + 11) return c - base + 1;
    if (c === base + 12) return 50;
    if (c === base + 13) return 100;
    if (c === base + 14) return 500;
    if (c === base + 15) return 1000;
  }
  if (c >= 0x2460 && c <= 0x2473) return c - 0x2460 + 1;
  return -1;
}
