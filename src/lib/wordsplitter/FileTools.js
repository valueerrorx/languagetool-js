// Java: de.danielnaber.jwordsplitter.tools.FileTools (jwordsplitter 4.7)
import { decodeUtf8, readerLines } from '../java/io.js';
import { javaTrim, toLowerCase } from '../java/strings.js';

// Java: FileTools#loadFileToSet(InputStream,String) (charset is always UTF-8 at the call sites)
export function loadFileToSet(is) {
  const words = new Set();
  for (const line of readerLines(decodeUtf8(is))) {
    words.add(toLowerCase(javaTrim(line)));
  }
  return words;
}

// Java: FileTools#loadFile(InputStream,String) (charset is always UTF-8 at the call sites)
export function loadFile(inputStream) {
  let sb = '';
  for (const line of readerLines(decodeUtf8(inputStream))) {
    sb += line;
    sb += '\n';
  }
  return sb;
}
