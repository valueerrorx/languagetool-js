// org.languagetool.rules.WordCoherencyDataLoader
import { IOException, RuntimeException } from '../../lib/java/errors.js';
import { decodeUtf8, readerLines } from '../../lib/java/io.js';
import { javaSplit } from '../../lib/java/strings.js';
import { JLanguageTool } from '../JLanguageTool.js';

// Java: WordCoherencyDataLoader
export class WordCoherencyDataLoader {
  static FQCN = 'org.languagetool.rules.WordCoherencyDataLoader';

  // Java: WordCoherencyDataLoader#loadWords(String)
  loadWords(path) {
    const stream = JLanguageTool.getDataBroker().getFromRulesDirAsStream(path);
    const map = new Map();
    try {
      for (const line of readerLines(decodeUtf8(stream))) {
        if (line.length === 0 || line.charAt(0) === '#') { // ignore comments
          continue;
        }
        const parts = javaSplit(line, ';');
        if (parts.length !== 2) {
          throw new IOException('Format error in file ' + path + ', line: ' + line);
        }
        if (map.has(parts[0])) {
          map.get(parts[0]).add(parts[1]);
        } else {
          map.set(parts[0], new Set([parts[1]]));
        }
        if (map.has(parts[1])) {
          map.get(parts[1]).add(parts[0]);
        } else {
          map.set(parts[1], new Set([parts[0]]));
        }
      }
    } catch (e) {
      if (e instanceof IOException) throw new RuntimeException('Could not load coherency data from ' + path, e);
      throw e;
    }
    return map;
  }
}
