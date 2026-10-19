// org.languagetool.rules.ConfusionSetLoader
import { RuntimeException } from '../../lib/java/errors.js';
import { Objects } from '../../lib/java/Objects.js';
import { Long } from '../../lib/java/long.js';
import { arrayGet, listGet } from '../../lib/java/arrays.js';
import { decodeUtf8, readerLines } from '../../lib/java/io.js';
import { javaCompare, javaReplaceFirst, javaSplit, javaTrim } from '../../lib/java/strings.js';
import { ShortDescriptionProvider } from '../ShortDescriptionProvider.js';
import { ConfusionPair } from './ConfusionPair.js';
import { ConfusionString } from './ConfusionString.js';

// Java: ConfusionSetLoader
export class ConfusionSetLoader {
  static FQCN = 'org.languagetool.rules.ConfusionSetLoader';

  // Java: ConfusionSetLoader(Language)
  constructor(lang) {
    this.wordDefs = new ShortDescriptionProvider();
    this.lang = Objects.requireNonNull(lang);
  }

  // Java: ConfusionSetLoader#loadConfusionPairs(InputStream); stream = bytes
  loadConfusionPairs(stream) {
    const map = new Map();
    for (const line of readerLines(decodeUtf8(stream))) {
      if (line.startsWith('#') || javaTrim(line).length === 0) {
        continue;
      }
      const parts = javaSplit(javaReplaceFirst(line, '\\s*#.*', ''), '\\s*(;|->)\\s*');
      if (parts.length !== 3) {
        throw new RuntimeException("Unexpected format: '" + line + "' - expected three semicolon-separated values: word1; word2; factor");
      }
      const bidirectional = !javaReplaceFirst(line, '#.*', '').includes(' -> ');
      const confusionStrings = [];
      const loadedForSet = new Set();
      let prevWord = null;
      for (const part of parts.slice(0, parts.length - 1)) {
        const subParts = javaSplit(part, '\\|');
        const word = arrayGet(subParts, 0);
        if (bidirectional && prevWord !== null && javaCompare(word, prevWord) < 0) {
          throw new RuntimeException('Order words alphabetically per line in the confusion set file: ' + line + ': found ' + word + ' after ' + prevWord);
        }
        prevWord = word;
        let description = subParts.length === 2 ? subParts[1] : null;
        if (loadedForSet.has(word)) {
          throw new RuntimeException("Word appears twice in same confusion set: '" + word + "'");
        }
        if (description === null) {
          description = this.wordDefs.getShortDescription(word, this.lang);
        }
        confusionStrings.push(new ConfusionString(word, description));
        loadedForSet.add(word);
      }
      const factor = Long.parseLong(parts[parts.length - 1]);
      if (bidirectional) {
        const confusionSet1 = new ConfusionPair(listGet(confusionStrings, 0), listGet(confusionStrings, 1), factor, false);
        this.addToMap(map, confusionStrings, confusionSet1);
        const confusionSet2 = new ConfusionPair(listGet(confusionStrings, 1), listGet(confusionStrings, 0), factor, false);
        this.addToMap(map, confusionStrings, confusionSet2);
      } else {
        const confusionSet = new ConfusionPair(listGet(confusionStrings, 0), listGet(confusionStrings, 1), factor, false);
        this.addToMap(map, confusionStrings, confusionSet);
      }
    }
    return map;
  }

  // Java: ConfusionSetLoader#addToMap(Map,List,ConfusionPair)
  addToMap(map, confusionStrings, confusionSet) {
    for (const confusionString of confusionStrings) {
      const key = confusionString.getString();
      const existingEntry = map.get(key);
      if (existingEntry !== undefined) {
        existingEntry.push(confusionSet);
      } else {
        map.set(key, [confusionSet]);
      }
    }
  }
}
