// Java: org.languagetool.rules.es.ConfusionPairsDataLoader (package-private)
import { RuntimeException } from '../../../lib/java/errors.js';
import { decodeUtf8, readerLines } from '../../../lib/java/io.js';
import { javaSplit, javaTrim } from '../../../lib/java/strings.js';
import { JLanguageTool } from '../../../core/JLanguageTool.js';
import { AnalyzedToken } from '../../../core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../../core/AnalyzedTokenReadings.js';

// Java: ConfusionPairsDataLoader
export class ConfusionPairsDataLoader {
  static FQCN = 'org.languagetool.rules.es.ConfusionPairsDataLoader';

  // Java: ConfusionPairsDataLoader#loadWords(String)
  loadWords(path) {
    const map = new Map();
    const inputStream = JLanguageTool.getDataBroker().getFromRulesDirAsStream(path);
    for (const rawLine of readerLines(decodeUtf8(inputStream))) {
      const line = javaTrim(rawLine);
      if (line.length === 0 || line.charAt(0) === '#') { // ignore comments
        continue;
      }
      const parts = javaSplit(line, ';');
      if (parts.length !== 3) {
        throw new RuntimeException('Format error in file ' + path + ', line: '
          + line + ', ' + 'expected 3 semicolon-separated parts, got '
          + parts.length);
      }
      const analyzedToken = new AnalyzedToken(parts[1], parts[2], null);
      if (!map.has(parts[0])) {
        map.set(parts[0], new AnalyzedTokenReadings(analyzedToken, 0));
      } else {
        const atrs = map.get(parts[0]);
        atrs.addReading(analyzedToken, '');
        map.set(parts[0], atrs);
      }
    }
    return map;
  }
}
