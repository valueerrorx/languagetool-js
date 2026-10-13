// JS twin of harness op "unicode-dump" (UnicodeDump.java): the same dumps computed from src/lib/java Character/strings/Normalizer.
import * as C from '../../src/lib/java/Character.js';
import { toLowerCase, toUpperCase, equalsIgnoreCase } from '../../src/lib/java/strings.js';
import { normalize, Form } from '../../src/lib/java/Normalizer.js';
import { IllegalArgumentException } from '../../src/lib/java/errors.js';

const MAX = 0x10ffff;
const JAVA_VERSION = '17.0.20.1'; // JDK 17 of the pinned oracle environment (docs/ORACLE.md)

// Java: UnicodeDump#rle(IntFn): flat triples [start, len, value, ...]
function rle(f) {
  const out = [];
  let start = 0;
  let val = f(0);
  for (let cp = 1; cp <= MAX; cp++) {
    const v = f(cp);
    if (v !== val) { out.push(start, cp - start, val); start = cp; val = v; }
  }
  out.push(start, MAX + 1 - start, val);
  return out;
}

// Java: UnicodeDump#named(IntFunction)
function named(f) {
  const names = [];
  const idx = new Map();
  const runs = rle((cp) => {
    const n = f(cp);
    if (n === null) return -1;
    if (!idx.has(n)) { names.push(n); idx.set(n, names.length - 1); }
    return idx.get(n);
  });
  return { runs, names };
}

const FLAG_NAMES = ['isLetter', 'isDigit', 'isLetterOrDigit', 'isWhitespace', 'isSpaceChar', 'isUpperCase', 'isLowerCase', 'isTitleCase',
  'isAlphabetic', 'isIdeographic', 'isJavaIdentifierStart', 'isJavaIdentifierPart', 'isMirrored', 'isDefined', 'isISOControl',
  'isIdentifierIgnorable', 'isUnicodeIdentifierStart', 'isUnicodeIdentifierPart', 'isSurrogate'];

// Java: UnicodeDump#flags(int)
function flags(cp) {
  let r = 0;
  for (let i = 0; i < FLAG_NAMES.length - 1; i++) if (C[FLAG_NAMES[i]](cp)) r |= 1 << i;
  if (cp >= 0xd800 && cp <= 0xdfff) r |= 1 << (FLAG_NAMES.length - 1);
  return r;
}

// Java: UnicodeDump#loc(String): language of new Locale(s) (lower-cased), ROOT = ""
const loc = (s) => (s === 'ROOT' ? '' : s.toLowerCase());

// Java: UnicodeDump#run(JsonNode)
export function run(a) {
  const part = a.part;
  const m = { javaVersion: JAVA_VERSION, unicodeNote: 'Character data of JDK 17 (Unicode 13.0)' };
  switch (part) {
    case 'props':
      m.flagNames = FLAG_NAMES;
      m.note = 'runs are flat [start,len,value,...]; flags is a bitmask in flagNames order; type = Character.getType; numeric = getNumericValue; named = {runs:index into names, -1 = null}';
      m.type = rle(C.getType);
      m.flags = rle(flags);
      m.numericValue = rle(C.getNumericValue);
      m.digit10 = rle((cp) => C.digit(cp, 10));
      m.digit16 = rle((cp) => C.digit(cp, 16));
      m.digit36 = rle((cp) => C.digit(cp, 36));
      m.directionality = rle(C.getDirectionality);
      m.script = named((cp) => C.UnicodeScript.of(cp).name());
      m.block = named((cp) => { const b = C.UnicodeBlock.of(cp); return b === null ? null : b.toString(); });
      break;
    case 'case':
      m.note = '[cp, mapped] only where Character.toXxx(int) differs from cp';
      for (const k of ['toUpperCase', 'toLowerCase', 'toTitleCase']) {
        const l = [];
        for (let cp = 0; cp <= MAX; cp++) {
          const r = C[k](cp);
          if (r !== cp) l.push(cp, r);
        }
        m[k] = l;
      }
      break;
    case 'strcase': {
      const locs = ['ROOT', 'en', 'tr', 'az', 'lt', 'de', 'fr', 'el'];
      m.note = 'ROOT: [cp, upper, lower] where either differs from the 1-char string; other locales: [cp, upper, lower] only where differing from ROOT result. Strings ASCII-escaped.';
      const root = [];
      const others = {};
      for (let i = 1; i < locs.length; i++) others[locs[i]] = [];
      for (let cp = 0; cp <= MAX; cp++) {
        const s = C.toChars(cp);
        const ru = toUpperCase(s, '');
        const rl = toLowerCase(s, '');
        if (ru !== s || rl !== s) root.push([cp, ru, rl]);
        for (let i = 1; i < locs.length; i++) {
          const l = loc(locs[i]);
          const u = toUpperCase(s, l);
          const lo = toLowerCase(s, l);
          if (u !== ru || lo !== rl) others[locs[i]].push([cp, u, lo]);
        }
      }
      m.ROOT = root;
      m.others = others;
      break;
    }
    case 'strctx': {
      const locs = a.locales;
      m.results = a.strings.map((s) => {
        const up = {};
        const lo = {};
        for (const ls of locs) { up[ls] = toUpperCase(s, loc(ls)); lo[ls] = toLowerCase(s, loc(ls)); }
        return { input: s, upper: up, lower: lo, equalsIgnoreCaseSelfLower: equalsIgnoreCase(s, toLowerCase(s, '')) };
      });
      break;
    }
    case 'normalizer': {
      m.note = '[cp, NFC, NFD, NFKC, NFKD] only where any form differs from the 1-char string';
      const l = [];
      for (let cp = 0; cp <= MAX; cp++) {
        const s = C.toChars(cp);
        const c = normalize(s, Form.NFC);
        const d = normalize(s, Form.NFD);
        const kc = normalize(s, Form.NFKC);
        const kd = normalize(s, Form.NFKD);
        if (c !== s || d !== s || kc !== s || kd !== s) l.push([cp, c, d, kc, kd]);
      }
      m.entries = l;
      m.sequences = (a.strings ?? []).map((s) => [s, normalize(s, Form.NFC), normalize(s, Form.NFD), normalize(s, Form.NFKC), normalize(s, Form.NFKD)]);
      break;
    }
    case 'pattern':
      throw Object.assign(new Error('NOT PORTED: Pattern classes (S15-S18)'), { notPorted: true });
    default:
      throw new IllegalArgumentException(`unknown unicode-dump part: ${part}`);
  }
  return m;
}
