// Java: org.languagetool.synthesis.ManualSynthesizer (int2int/String[] storage replaced by hash -> triples map, D-042)
import { IOException, UnsupportedOperationException } from '../../../lib/java/errors.js';
import { decodeUtf8, scannerLines } from '../../../lib/java/io.js';
import { javaReplace, javaTrim } from '../../../lib/java/strings.js';
import { javaSplit } from '../../../lib/java/regex/index.js';
import { JavaHashMap } from '../../../lib/java/collections/JavaHashMap.js';
import { ObjectOpenHashSet } from '../../../lib/java/collections/ObjectOpenHashSet.js';
import { stringHashCode } from '../../../lib/java/Objects.js';
import { TaggedWord } from '../TaggedWord.js';
import { isEmpty } from '../../text/StringTools.js';

const SUFFIX_MARKER = '+';
const DEFAULT_SEPARATOR = '\t';

const OFFSET_SHIFT = 8;
const MAX_LENGTH = (1 << OFFSET_SHIFT) - 1;
const MAX_OFFSET = (1 << (32 - OFFSET_SHIFT)) - 1;

// Java: ManualSynthesizer#hashCode(String,String)
function hashCode(lemma, posTag) {
  return (Math.imul(stringHashCode(lemma), 31) + stringHashCode(posTag)) | 0;
}

// Java: ManualSynthesizer
export class ManualSynthesizer {
  static FQCN = 'org.languagetool.synthesis.ManualSynthesizer';

  // Java: ManualSynthesizer#ManualSynthesizer(InputStream)
  constructor(inputStream) {
    const mapping = ManualSynthesizer.loadMapping(inputStream);
    const byHash = ManualSynthesizer.groupByHash(mapping);
    // Java: int2int map into a String[] triple store; here hash -> triples (same lookup semantics, D-042)
    let valueCount = 0;
    for (const v of mapping.values()) valueCount += v.length;
    if (valueCount > MAX_OFFSET) {
      throw new UnsupportedOperationException(`Too many values (${valueCount}), the storage needs adjusting`);
    }
    for (const value of byHash.values()) {
      if (value.length > MAX_LENGTH) {
        throw new UnsupportedOperationException(
          `Too many lemmas (${value.length} for the same hash [${value.map((t) => `(${t[0]},${t[1]},${t[2]})`).join(', ')}], the storage needs adjusting`);
      }
    }
    this.map = byHash;
    this.possibleTags = ManualSynthesizer.collectTags(mapping);
  }

  // Java: ManualSynthesizer#groupByHash(Map)
  static groupByHash(mapping) {
    const byHash = new Map();
    for (const [tw, forms] of mapping.entrySet()) {
      const lemma = tw.getLemma();
      const hash = hashCode(lemma, tw.getPosTag());
      let list = byHash.get(hash);
      if (list === undefined) {
        list = [];
        byHash.set(hash, list);
      }
      for (const word of forms) {
        if (word.startsWith(SUFFIX_MARKER)) {
          throw new UnsupportedOperationException(`Words can't start with ${SUFFIX_MARKER}`);
        }
        const value = ManualSynthesizer.encodeForm(lemma, word);
        list.push([lemma, tw.getPosTag(), value]);
      }
    }
    return byHash;
  }

  // Java: ManualSynthesizer#collectTags(Map)
  static collectTags(mapping) {
    const tags = new ObjectOpenHashSet();
    for (const tw of mapping.keySet()) {
      tags.add(tw.getPosTag());
    }
    tags.trim();
    return tags;
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
    const group = this.map.get(hashCode(lemma, posTag));
    if (group === undefined) return null;
    const result = [];
    for (const t of group) {
      if (lemma === t[0] && posTag === t[1]) {
        result.push(ManualSynthesizer.decodeForm(lemma, t[2]));
      }
    }
    return result;
  }

  // Java: ManualSynthesizer#loadMapping(InputStream)
  static loadMapping(inputStream) {
    const mapping = new JavaHashMap();
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
      const tw = new TaggedWord(lemma, posTag);
      let forms = mapping.get(tw);
      if (forms === null) {
        forms = [];
        mapping.put(tw, forms);
      }
      forms.push(form);
    }
    return mapping;
  }
}
