// org.languagetool.rules.de.SpellingData (old to new spelling data loaded from CSV)
import { AhoCorasickDoubleArrayTrie } from '../../../lib/ahocorasick.js';
import { RuntimeException } from '../../../lib/java/errors.js';
import { javaSplit, javaReplace } from '../../../lib/java/strings.js';
import { JLanguageTool } from '../../../core/JLanguageTool.js';
import { GermanSynthesizer } from '../synthesis/GermanSynthesizer.js';
import { startsWithLowercase, uppercaseFirstChar } from '../../../core/text/StringTools.js';

// Java: SpellingData
export class SpellingData {
  static FQCN = 'org.languagetool.rules.de.SpellingData';

  // Java: SpellingData(String)
  constructor(filePath) {
    this.trie = new AhoCorasickDoubleArrayTrie();
    this.sentenceStartTrie = new AhoCorasickDoubleArrayTrie();
    this.trie.build(SpellingData.getCoherencyMap(filePath, false));
    this.sentenceStartTrie.build(SpellingData.getCoherencyMap(filePath, true));
  }

  // Java: SpellingData#getCoherencyMap(String,boolean)
  static getCoherencyMap(filePath, sentStartMode) {
    const lines = JLanguageTool.getDataBroker().getFromResourceDirAsLines(filePath);
    const coherencyMap = new Map(); // LinkedHashMap
    for (const line of lines) {
      if (line.startsWith('#')) {
        continue;
      }
      const parts = javaSplit(line, ';');
      if (parts.length < 2) {
        throw new RuntimeException('Unexpected format in file ' + filePath + ': ' + line);
      }
      const oldSpelling = parts[0];
      const newSpelling = parts[1];
      SpellingData.sanityChecks(filePath, line, oldSpelling, newSpelling, coherencyMap);
      if (sentStartMode && startsWithLowercase(oldSpelling) && startsWithLowercase(newSpelling)) {
        // lowercase words can be uppercase at sentence start:
        coherencyMap.set(uppercaseFirstChar(oldSpelling), uppercaseFirstChar(newSpelling));
      } else {
        coherencyMap.set(oldSpelling, newSpelling);
      }
      if (oldSpelling.includes('ß') && javaReplace(oldSpelling, 'ß', 'ss') === newSpelling) {
        const forms = GermanSynthesizer.INSTANCE.synthesizeForPosTags(oldSpelling, () => true);
        for (const form of forms) {
          if (!form.includes('ss')) { // avoid e.g. "Schlüsse" as form of "Schluß", as that's the new spelling
            coherencyMap.set(form, javaReplace(form, 'ß', 'ss'));
          }
        }
      }
    }
    return coherencyMap;
  }

  // Java: SpellingData#sanityChecks(String,String,String,String,Map)
  static sanityChecks(filePath, line, oldSpelling, newSpelling, coherencyMap) {
    if (oldSpelling === newSpelling) {
      throw new RuntimeException('Old and new spelling are the same in ' + filePath + ': ' + line);
    }
    const lookup = coherencyMap.has(newSpelling) ? coherencyMap.get(newSpelling) : null;
    if (lookup !== null && lookup === oldSpelling) {
      throw new RuntimeException('Contradictory entry in ' + filePath + ": '" + oldSpelling + "' suggests '" + lookup + "' and vice versa");
    }
    if (coherencyMap.has(oldSpelling) && coherencyMap.get(oldSpelling) !== newSpelling) {
      throw new RuntimeException('Duplicate key in ' + filePath + ': ' + oldSpelling + ', val: ' + coherencyMap.get(oldSpelling) + ' vs. ' + newSpelling);
    }
  }

  // Java: SpellingData#getTrie()
  getTrie() {
    return this.trie;
  }

  // Java: SpellingData#getSentenceStartTrie()
  getSentenceStartTrie() {
    return this.sentenceStartTrie;
  }
}
