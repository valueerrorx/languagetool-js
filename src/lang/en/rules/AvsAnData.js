// org.languagetool.rules.en.AvsAnData
import { getDataBroker } from '../../../core/resources/LtStatics.js';
import { decodeUtf8, scannerLines } from '../../../lib/java/io.js';
import { javaTrim, toLowerCase } from '../../../lib/java/strings.js';

let requiresA = null;
let requiresAn = null;

// Java: AvsAnData#getWordsRequiringA() (static final field, initialised on first use)
export function getWordsRequiringA() {
  if (requiresA === null) requiresA = loadWords('/en/det_a.txt');
  return requiresA;
}

// Java: AvsAnData#getWordsRequiringAn() (static final field, initialised on first use)
export function getWordsRequiringAn() {
  if (requiresAn === null) requiresAn = loadWords('/en/det_an.txt');
  return requiresAn;
}

// Java: AvsAnData#loadWords(String) (ObjectOpenHashSet used for lookup only)
function loadWords(path) {
  const set = new Set();
  const stream = getDataBroker().getFromRulesDirAsStream(path);
  for (const raw of scannerLines(decodeUtf8(stream))) {
    const line = javaTrim(raw);
    if (line.length === 0 || line.charAt(0) === '#') {
      continue;
    }
    if (line.charAt(0) === '*') {
      set.add(line.substring(1));
    } else {
      set.add(toLowerCase(line));
    }
  }
  return set;
}
