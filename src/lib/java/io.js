// java.io helpers: BufferedReader#readLine line splitting on decoded text.

// Java: BufferedReader#readLine() loop -> lines without terminators (\n, \r, \r\n; no trailing empty line)
export function readerLines(text) {
  const lines = [];
  let start = 0;
  const n = text.length;
  let i = 0;
  while (i < n) {
    const c = text[i];
    if (c === '\n' || c === '\r') {
      lines.push(text.slice(start, i));
      if (c === '\r' && text[i + 1] === '\n') i++;
      start = i + 1;
    }
    i++;
  }
  if (start < n) lines.push(text.slice(start));
  return lines;
}

// Java: new InputStreamReader(in, UTF_8) decoding (malformed input -> U+FFFD, BOM kept)
export function decodeUtf8(buf) {
  return new TextDecoder('utf-8', { fatal: false, ignoreBOM: true }).decode(buf);
}
