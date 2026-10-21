// java.util.Base64 basic decoder (strict: no whitespace, JDK 17 error texts); input and output are byte arrays
import { IllegalArgumentException } from './errors.js';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const FROM_BASE64 = new Int8Array(256).fill(-1);
for (let i = 0; i < ALPHABET.length; i++) FROM_BASE64[ALPHABET.charCodeAt(i)] = i;
FROM_BASE64[0x3d] = -2; // '='

// Java: Integer#toString(int,16) of a signed byte
const hexOfByte = (b) => {
  const v = b > 127 ? b - 256 : b;
  return v.toString(16);
};

// Java: Base64.Decoder#decodedOutLength(byte[],int,int)
function decodedOutLength(src, sp, sl) {
  let paddings = 0;
  const len = sl - sp;
  if (len === 0) return 0;
  if (len < 2) throw new IllegalArgumentException('Input byte[] should at least have 2 bytes for base64 bytes');
  if (src[sl - 1] === 0x3d) {
    paddings++;
    if (src[sl - 2] === 0x3d) paddings++;
  }
  if (paddings === 0 && (len & 0x3) !== 0) paddings = 4 - (len & 0x3);
  return 3 * Math.floor((len + 3) / 4) - paddings;
}

// Java: Base64.Decoder#decode0(byte[],int,int,byte[])
function decode0(src, sp, sl) {
  const dst = [];
  let bits = 0;
  let shiftto = 18; // pos of first byte of 4-byte atom
  while (sp < sl) {
    let b = src[sp++] & 0xff;
    b = FROM_BASE64[b];
    if (b < 0) {
      if (b === -2) { // padding byte '='
        if ((shiftto === 6 && (sp === sl || src[sp++] !== 0x3d)) || shiftto === 18) {
          throw new IllegalArgumentException('Input byte array has wrong 4-byte ending unit');
        }
        break;
      }
      throw new IllegalArgumentException(`Illegal base64 character ${hexOfByte(src[sp - 1])}`);
    }
    bits |= (b << shiftto);
    shiftto -= 6;
    if (shiftto < 0) {
      dst.push((bits >> 16) & 0xff, (bits >> 8) & 0xff, bits & 0xff);
      shiftto = 18;
      bits = 0;
    }
  }
  // reached end of byte array or hit padding '=' characters.
  if (shiftto === 6) {
    dst.push((bits >> 16) & 0xff);
  } else if (shiftto === 0) {
    dst.push((bits >> 16) & 0xff, (bits >> 8) & 0xff);
  } else if (shiftto === 12) {
    throw new IllegalArgumentException('Last unit does not have enough valid bits');
  }
  // anything left is invalid
  if (sp < sl) throw new IllegalArgumentException(`Input byte array has incorrect ending byte at ${sp}`);
  return dst;
}

export const Base64 = {
  // Java: Base64#getDecoder().decode(byte[])
  decode(src) {
    decodedOutLength(src, 0, src.length);
    return Uint8Array.from(decode0(src, 0, src.length));
  },
};
