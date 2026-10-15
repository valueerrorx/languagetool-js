// org.languagetool.ShortDescriptionProvider (word -> short description from /<code>/word_definitions.txt; data owned by CORE-0279)
import { RuntimeException } from '../lib/java/errors.js';
import { javaSplit, javaTrim } from '../lib/java/strings.js';
import { getDataBroker } from './resources/LtStatics.js';

// Java: static Map<Language, Map<String,String>>; init depends only on the short code, so the code is the key
const descriptions = new Map();

export class ShortDescriptionProvider {
  static FQCN = 'org.languagetool.ShortDescriptionProvider';

  // Java: ShortDescriptionProvider#getShortDescription(String,Language)
  getShortDescription(word, lang) {
    const d = ShortDescriptionProvider.getAllDescriptions(lang).get(word);
    return d === undefined ? null : d;
  }

  // Java: ShortDescriptionProvider#getAllDescriptions(Language)
  static getAllDescriptions(lang) {
    const key = lang.getShortCode();
    let m = descriptions.get(key);
    if (m === undefined) {
      m = ShortDescriptionProvider.init(lang);
      descriptions.set(key, m);
    }
    return m;
  }

  // Java: ShortDescriptionProvider#init(Language)
  static init(lang) {
    const dataBroker = getDataBroker();
    const path = `/${lang.getShortCode()}/word_definitions.txt`;
    if (!dataBroker.resourceExists(path)) {
      return new Map();
    }
    const wordToDef = new Map();
    const lines = dataBroker.getFromResourceDirAsLines(path);
    for (const line of lines) {
      if (line.startsWith('#') || javaTrim(line).length === 0) {
        continue;
      }
      const parts = javaSplit(line, '\t');
      if (parts.length !== 2) {
        throw new RuntimeException(`Format in ${path} not expected, expected 2 tab-separated columns: '${line}'`);
      }
      wordToDef.set(parts[0], parts[1]);
    }
    return wordToDef;
  }
}
