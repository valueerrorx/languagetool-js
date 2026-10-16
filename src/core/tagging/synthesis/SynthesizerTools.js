// Java: org.languagetool.synthesis.SynthesizerTools
import { decodeUtf8, scannerLines } from '../../../lib/java/io.js';
import { javaTrim } from '../../../lib/java/strings.js';

// Java: SynthesizerTools#loadWords(InputStream)
export function loadWords(stream) {
  const result = [];
  for (const raw of scannerLines(decodeUtf8(stream))) {
    const line = javaTrim(raw);
    if (line.length === 0 || line.charAt(0) === '#') { // ignore empty lines and comments
      continue;
    }
    result.push(line);
  }
  return result;
}
