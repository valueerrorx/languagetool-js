// org.languagetool.rules.SimpleReplaceDataLoader
import { RuntimeException } from '../../lib/java/errors.js';
import { javaTrim, javaSplit } from '../../lib/java/strings.js';
import { decodeUtf8, scannerLines } from '../../lib/java/io.js';
import { JLanguageTool } from '../JLanguageTool.js';

// Java: SimpleReplaceDataLoader
export class SimpleReplaceDataLoader {
  static FQCN = 'org.languagetool.rules.SimpleReplaceDataLoader';

  // Java: SimpleReplaceDataLoader#loadWords(String)
  loadWords(path) {
    const stream = JLanguageTool.getDataBroker().getFromRulesDirAsStream(path);
    const map = new Map();
    for (const line of scannerLines(decodeUtf8(stream))) {
      if (line.length === 0 || line.charAt(0) === '#') { // # = comment
        continue;
      }
      const parts = javaSplit(line, '=');
      if (parts.length !== 2) {
        throw new RuntimeException('Could not load simple replacement data from: ' + path + '. ' +
          "Error in line '" + line + "', expected format 'word=replacement'");
      }
      if (javaTrim(parts[1]).length === 0) {
        throw new RuntimeException('Could not load simple replacement data from: ' + path + '. ' +
          "Error in line '" + line + "', replacement cannot be empty");
      }
      const wrongForms = javaSplit(parts[0], '\\|');
      const replacements = javaSplit(parts[1], '\\|');
      for (const wrongForm of wrongForms) {
        map.set(wrongForm, replacements);
      }
    }
    return map;
  }
}
