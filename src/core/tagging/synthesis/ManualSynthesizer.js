// Java: org.languagetool.synthesis.ManualSynthesizer (hash-packed storage replaced by a (lemma, tag) map: same lookup results, D-042)
import { IOException, UnsupportedOperationException } from '../../../lib/java/errors.js';
import { decodeUtf8, scannerLines } from '../../../lib/java/io.js';
import { javaReplace, javaTrim } from '../../../lib/java/strings.js';
import { javaSplit } from '../../../lib/java/regex/index.js';
import { isEmpty } from '../../text/StringTools.js';

const SUFFIX_MARKER = '+';
const DEFAULT_SEPARATOR = '\t';

// key of a (lemma, posTag) pair
const key = (lemma, posTag) => `${lemma}\u0000${posTag}`;

// Java: ManualSynthesizer
export class ManualSynthesizer {
  static FQCN = 'org.languagetool.synthesis.ManualSynthesizer';

  // Java: ManualSynthesizer#ManualSynthesizer(InputStream)
  constructor(inputStream) {
    const mapping = ManualSynthesizer.loadMapping(inputStream);
    this.map = new Map();
    for (const [k, entry] of mapping) {
      const encoded = [];
      for (const word of entry.forms) {
        if (word.startsWith(SUFFIX_MARKER)) {
          throw new UnsupportedOperationException(`Words can't start with ${SUFFIX_MARKER}`);
        }
        encoded.push(ManualSynthesizer.encodeForm(entry.lemma, word));
      }
      this.map.set(k, encoded);
    }
    // Java: ObjectOpenHashSet; its iteration order is not reproduced (order-free for the F22 caller synthesizeForPosTags -> GermanTagger)
    this.possibleTags = new Set();
    for (const entry of mapping.values()) this.possibleTags.add(entry.posTag);
  }

  // Java: ManualSynthesizer#encodeForm(String,String)
  static encodeForm(lemma, word) {
    if (word.length > lemma.length && word.startsWith(lemma)) {
      return SUFFIX_MARKER + word.substring(lemma.length);
    }
    if (word.length >= lemma.length && word.startsWith(lemma.substring(0, lemma.length - 1))) {
      return SUFFIX_MARKER + SUFFIX_MARKER + word.substring(lemma.length - 1);
    }
    return word;
  }

  // Java: ManualSynthesizer#decodeForm(String,String)
  static decodeForm(lemma, word) {
    if (word.startsWith(SUFFIX_MARKER)) {
      if (word.startsWith(SUFFIX_MARKER, SUFFIX_MARKER.length)) {
        return lemma.substring(0, lemma.length - 1) + word.substring(SUFFIX_MARKER.length * 2);
      }
      return lemma + word.substring(SUFFIX_MARKER.length);
    }
    return word;
  }

  // Java: ManualSynthesizer#getPossibleTags()
  getPossibleTags() {
    return this.possibleTags;
  }

  // Java: ManualSynthesizer#lookup(String,String)
  lookup(lemma, posTag) {
    if (lemma === null || lemma === undefined || posTag === null || posTag === undefined) {
      return null;
    }
    const words = this.map.get(key(lemma, posTag));
    if (words === undefined) return null;
    return words.map((word) => ManualSynthesizer.decodeForm(lemma, word));
  }

  // Java: ManualSynthesizer#loadMapping(InputStream) (TaggedWord key -> forms in file order)
  static loadMapping(inputStream) {
    const mapping = new Map();
    let separator = DEFAULT_SEPARATOR;
    for (let line of scannerLines(decodeUtf8(inputStream))) {
      line = javaTrim(line);
      if (line.startsWith('#separatorRegExp=')) {
        separator = javaReplace(line, '#separatorRegExp=', '');
      }
      if (isEmpty(line) || line.charAt(0) === '#') {
        continue;
      }
      const hash = line.indexOf('#');
      line = javaTrim(hash < 0 ? line : line.substring(0, hash));
      const parts = javaSplit(line, separator);
      if (parts.length !== 3) {
        throw new IOException(`Unknown line format when loading manual synthesizer dictionary, expected 3 parts separated by '${separator}', found ${parts.length}: '${line}'`);
      }
      const form = parts[0];
      const lemma = parts[1];
      const posTag = parts[2];
      const k = key(lemma, posTag);
      let entry = mapping.get(k);
      if (entry === undefined) {
        entry = { lemma, posTag, forms: [] };
        mapping.set(k, entry);
      }
      entry.forms.push(form);
    }
    return mapping;
  }
}
