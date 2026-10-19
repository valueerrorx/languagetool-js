// Java UTF-8 decoding with REPLACE semantics (sun.nio.cs.UTF_8.Decoder / String(byte[],UTF_8)): malformed-input lengths as in the JDK.
const REPL = 0xfffd;
const isNotContinuation = (b) => (b & 0xc0) !== 0x80;
const isMalformed3 = (b1, b2, b3) => (b1 === 0xe0 && (b2 & 0xe0) === 0x80) || (b2 & 0xc0) !== 0x80 || (b3 & 0xc0) !== 0x80;
const isMalformed3_2 = (b1, b2) => (b1 === 0xe0 && (b2 & 0xe0) === 0x80) || (b2 & 0xc0) !== 0x80;
const isMalformed4 = (b2, b3, b4) => (b2 & 0xc0) !== 0x80 || (b3 & 0xc0) !== 0x80 || (b4 & 0xc0) !== 0x80;
const isMalformed4_2 = (b1, b2) => (b1 === 0xf0 && (b2 < 0x90 || b2 > 0xbf)) || (b1 === 0xf4 && (b2 & 0xf0) !== 0x80) || (b2 & 0xc0) !== 0x80;
const isMalformed4_3 = (b3) => (b3 & 0xc0) !== 0x80;

// Java: UTF_8.Decoder#malformedN(ByteBuffer,int) for nb = 3 and 4 (bytes are 0..255)
function malformedN(a, sp, nb) {
  if (nb === 3) {
    const b1 = a[sp];
    const b2 = a[sp + 1];
    return ((b1 === 0xe0 && (b2 & 0xe0) === 0x80) || isNotContinuation(b2)) ? 1 : 2;
  }
  const b1 = a[sp];
  const b2 = a[sp + 1];
  if (b1 > 0xf4 || (b1 === 0xf0 && (b2 < 0x90 || b2 > 0xbf)) || (b1 === 0xf4 && (b2 & 0xf0) !== 0x80) || isNotContinuation(b2)) return 1;
  if (isNotContinuation(a[sp + 2])) return 2;
  return 3;
}

// Java: new String(bytes, UTF_8) / InputStreamReader(UTF_8) over the whole input (malformed -> U+FFFD, BOM kept)
export function decodeUtf8Java(bytes) {
  const a = bytes;
  const sl = a.length;
  const out = [];
  let sp = 0;
  while (sp < sl) {
    const b1 = a[sp];
    if (b1 < 0x80) {
      out.push(b1);
      sp++;
    } else if ((b1 >> 5) === 0x6 && (b1 & 0x1e) !== 0) { // 2 bytes
      if (sl - sp < 2) { out.push(REPL); break; }
      const b2 = a[sp + 1];
      if (isNotContinuation(b2)) { out.push(REPL); sp += 1; continue; }
      out.push(((b1 & 0x1f) << 6) | (b2 & 0x3f));
      sp += 2;
    } else if ((b1 >> 4) === 0xe) { // 3 bytes
      const rem = sl - sp;
      if (rem < 3) {
        if (rem > 1 && isMalformed3_2(b1, a[sp + 1])) { out.push(REPL); sp += 1; continue; }
        out.push(REPL);
        break;
      }
      const b2 = a[sp + 1];
      const b3 = a[sp + 2];
      if (isMalformed3(b1, b2, b3)) { out.push(REPL); sp += malformedN(a, sp, 3); continue; }
      const c = ((b1 & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
      out.push(c >= 0xd800 && c <= 0xdfff ? REPL : c);
      sp += 3;
    } else if ((b1 >> 3) === 0x1e) { // 4 bytes
      const rem = sl - sp;
      if (rem < 4) {
        if (b1 > 0xf4 || (rem > 1 && isMalformed4_2(b1, a[sp + 1]))) { out.push(REPL); sp += 1; continue; }
        if (rem > 2 && isMalformed4_3(a[sp + 2])) { out.push(REPL); sp += 2; continue; }
        out.push(REPL);
        break;
      }
      const b2 = a[sp + 1];
      const b3 = a[sp + 2];
      const b4 = a[sp + 3];
      const uc = ((b1 & 0x07) << 18) | ((b2 & 0x3f) << 12) | ((b3 & 0x3f) << 6) | (b4 & 0x3f);
      if (isMalformed4(b2, b3, b4) || uc < 0x10000 || uc > 0x10ffff) { out.push(REPL); sp += malformedN(a, sp, 4); continue; }
      out.push(0xd800 + ((uc - 0x10000) >> 10), 0xdc00 + ((uc - 0x10000) & 0x3ff));
      sp += 4;
    } else {
      out.push(REPL);
      sp++;
    }
  }
  let s = '';
  for (let i = 0; i < out.length; i += 8192) s += String.fromCharCode(...out.slice(i, i + 8192));
  return s;
}

// Java: String#getBytes(StandardCharsets.UTF_8) (unpaired surrogates -> '?')
export function getBytesUtf8(s) {
  const out = [];
  const n = s.length;
  for (let i = 0; i < n; i++) {
    let c = s.charCodeAt(i);
    if (c < 0x80) {
      out.push(c);
    } else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c >= 0xd800 && c <= 0xdfff) {
      const d = i + 1 < n ? s.charCodeAt(i + 1) : 0;
      if (c <= 0xdbff && d >= 0xdc00 && d <= 0xdfff) {
        c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00);
        i++;
        out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
      } else {
        out.push(0x3f);
      }
    } else {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return Uint8Array.from(out);
}
