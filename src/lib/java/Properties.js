// java.util.Properties#load semantics (escapes, continuation lines, separators) on decoded text.
import { IllegalArgumentException } from './errors.js';
import { JavaConcurrentHashMap } from './collections/JavaConcurrentHashMap.js';

const isWs = (c) => c === ' ' || c === '\t' || c === '\f';

// Java: Properties#load(Reader) -> Map key->value (insertion order of first definition, last value wins)
export function loadProperties(text) {
  const map = new Map();
  const n = text.length;
  let pos = 0;
  // Java: Properties.LineReader#readLine() (returns the logical line without terminators, or null at EOF)
  const readLine = () => {
    let skipWhiteSpace = true;
    let isCommentLine = false;
    let isNewLine = true;
    let appendedLineBegin = false;
    let precedingBackslash = false;
    let skipLF = false;
    let out = '';
    while (true) {
      if (pos >= n) {
        if (out.length === 0 || isCommentLine) return null;
        if (precedingBackslash) out = out.slice(0, -1);
        return out;
      }
      const c = text[pos++];
      if (skipLF) {
        skipLF = false;
        if (c === '\n') continue;
      }
      if (skipWhiteSpace) {
        if (isWs(c)) continue;
        if (!appendedLineBegin && (c === '\r' || c === '\n')) continue;
        skipWhiteSpace = false;
        appendedLineBegin = false;
      }
      if (isNewLine) {
        isNewLine = false;
        if (c === '#' || c === '!') {
          isCommentLine = true;
          continue;
        }
      }
      if (c !== '\n' && c !== '\r') {
        out += c;
        precedingBackslash = c === '\\' ? !precedingBackslash : false;
      } else {
        if (isCommentLine || out.length === 0) {
          isCommentLine = false;
          isNewLine = true;
          skipWhiteSpace = true;
          out = '';
          continue;
        }
        if (pos >= n) {
          if (precedingBackslash) out = out.slice(0, -1);
          return out;
        }
        if (precedingBackslash) {
          out = out.slice(0, -1);
          skipWhiteSpace = true;
          appendedLineBegin = true;
          precedingBackslash = false;
          if (c === '\r') skipLF = true;
        } else {
          return out;
        }
      }
    }
  };
  for (let line = readLine(); line !== null; line = readLine()) {
    const limit = line.length;
    let keyLen = 0;
    let valueStart = limit;
    let hasSep = false;
    let precedingBackslash = false;
    while (keyLen < limit) {
      const c = line[keyLen];
      if ((c === '=' || c === ':') && !precedingBackslash) {
        valueStart = keyLen + 1;
        hasSep = true;
        break;
      } else if (isWs(c) && !precedingBackslash) {
        valueStart = keyLen + 1;
        break;
      }
      precedingBackslash = c === '\\' ? !precedingBackslash : false;
      keyLen++;
    }
    while (valueStart < limit) {
      const c = line[valueStart];
      if (!isWs(c)) {
        if (!hasSep && (c === '=' || c === ':')) hasSep = true;
        else break;
      }
      valueStart++;
    }
    map.set(loadConvert(line, 0, keyLen), loadConvert(line, valueStart, limit - valueStart));
  }
  return map;
}

// Java: Properties#loadConvert(char[],int,int,StringBuilder)
function loadConvert(s, off, len) {
  let out = '';
  const end = off + len;
  let i = off;
  while (i < end) {
    let aChar = s[i++];
    if (aChar === '\\') {
      aChar = s[i++];
      if (aChar === 'u') {
        if (end - i < 4) throw new IllegalArgumentException('Malformed \\uxxxx encoding.');
        let value = 0;
        for (let k = 0; k < 4; k++) {
          const d = s.charCodeAt(i++);
          if (d >= 48 && d <= 57) value = (value << 4) + d - 48;
          else if (d >= 97 && d <= 102) value = (value << 4) + 10 + d - 97;
          else if (d >= 65 && d <= 70) value = (value << 4) + 10 + d - 65;
          else throw new IllegalArgumentException('Malformed \\uxxxx encoding.');
        }
        out += String.fromCharCode(value);
      } else {
        if (aChar === 't') aChar = '\t';
        else if (aChar === 'r') aChar = '\r';
        else if (aChar === 'n') aChar = '\n';
        else if (aChar === 'f') aChar = '\f';
        out += aChar;
      }
    } else {
      out += aChar;
    }
  }
  return out;
}

// Java: PropertyResourceBundle#PropertyResourceBundle(InputStream) charset handling (UTF-8, ISO-8859-1 fallback on malformed input)
export function decodeBundleBytes(buf) {
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buf);
  } catch {
    return buf.toString('latin1');
  }
}

// Java: Properties#load(InputStream) (ISO-8859-1)
export function decodeLatin1(buf) {
  return buf.toString('latin1');
}

// Java: Properties#keySet() iteration order (backed by ConcurrentHashMap(8), String hash buckets) of a map from loadProperties
export function propertiesKeyOrder(map) {
  const chm = new JavaConcurrentHashMap();
  for (const [k, v] of map) chm.put(k, v);
  return chm.keySet();
}
