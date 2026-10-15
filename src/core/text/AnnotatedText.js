// org.languagetool.markup.AnnotatedText
import { JavaEnum } from '../../lib/java/JavaEnum.js';
import { Objects } from '../../lib/java/Objects.js';
import { IllegalArgumentException, RuntimeException } from '../../lib/java/errors.js';
import { Type } from './TextPart.js';

// Java: AnnotatedText.MetaDataKey
export class MetaDataKey extends JavaEnum {
  static FQCN = 'org.languagetool.markup.AnnotatedText.MetaDataKey';
}
MetaDataKey.DocumentTitle = new MetaDataKey('DocumentTitle', 0);
MetaDataKey.EmailToAddress = new MetaDataKey('EmailToAddress', 1);
MetaDataKey.FullName = new MetaDataKey('FullName', 2);
MetaDataKey.EmailNumberOfAttachments = new MetaDataKey('EmailNumberOfAttachments', 3);

// Java: HashMap<Integer,MappingValue>#toString() for fewer than 5 entries (table size 16, bucket order, then insertion order)
function smallMappingToString(mapping) {
  const entries = [...mapping.entries()];
  const bucket = (k) => (k ^ (k >>> 16)) & 15;
  const sorted = entries.map((e, i) => ({ e, i })).sort((a, b) => bucket(a.e[0]) - bucket(b.e[0]) || a.i - b.i);
  return `{${sorted.map(({ e }) => `${e[0]}=${e[1]}`).join(', ')}}`;
}

export class AnnotatedText {
  static FQCN = 'org.languagetool.markup.AnnotatedText';
  static MetaDataKey = MetaDataKey;

  // Java: AnnotatedText#AnnotatedText(List,Map,Map,Map) (package-private)
  constructor(parts, mapping, metaData, customMetaData) {
    this.parts = Objects.requireNonNull(parts);
    this.mapping = Objects.requireNonNull(mapping); // plain text position (int) -> MappingValue
    this.metaData = Objects.requireNonNull(metaData); // MetaDataKey -> String
    this.customMetaData = Objects.requireNonNull(customMetaData);
  }

  // Java: AnnotatedText#getParts()
  getParts() {
    return this.parts;
  }

  // Java: AnnotatedText#getOriginalText()
  getOriginalText() {
    let sb = '';
    for (const part of this.parts) {
      if (part.getType() === Type.TEXT) sb += part.getPart();
    }
    return sb;
  }

  // Java: AnnotatedText#getPlainText()
  getPlainText() {
    let sb = '';
    for (const part of this.parts) {
      if (part.getType() === Type.TEXT || part.getType() === Type.FAKE_CONTENT) sb += part.getPart();
    }
    return sb;
  }

  // Java: AnnotatedText#getTextWithMarkup()
  getTextWithMarkup() {
    let sb = '';
    for (const part of this.parts) {
      if (part.getType() !== Type.FAKE_CONTENT) sb += part.getPart();
    }
    return sb;
  }

  // Java: AnnotatedText#getOriginalTextPositionFor(int,boolean)
  getOriginalTextPositionFor(plainTextPosition, isToPos) {
    if (plainTextPosition < 0) {
      throw new IllegalArgumentException(`plainTextPosition must be >= 0: ${plainTextPosition}`);
    }
    if (this.mapping.size === 0) {
      return 0;
    }
    let minDiff = 2147483647;
    let bestMatch = null;
    // algorithm: find the closest lower position
    for (const [maybeClosePosition, value] of this.mapping) {
      if (plainTextPosition < maybeClosePosition) {
        const diff = maybeClosePosition - plainTextPosition;
        if (diff > 0 && diff < minDiff) {
          bestMatch = value;
          minDiff = diff;
        }
      }
    }
    if (bestMatch === null) {
      const msg = `mappings: ${this.mapping.size < 5 ? smallMappingToString(this.mapping) : this.mapping.size}`;
      throw new RuntimeException(`Could not map ${plainTextPosition} to original position. isToPos: ${isToPos}, ${msg}`);
    }
    // we remove markup total length if usage of fake markup and need from position
    if (!isToPos && bestMatch.getFakeMarkupLength() > 0) {
      minDiff = bestMatch.getFakeMarkupLength();
    }
    // We assume that when we have found the closest match there's a one-to-one mapping
    // in this region, thus we can subtract 'minDiff' to get the exact position.
    // If the bestMatch is a fakeMarkup, subtract it:
    return bestMatch.getTotalPosition() - minDiff;
  }

  // Java: AnnotatedText#getGlobalMetaData(String,String) / (MetaDataKey,String)
  getGlobalMetaData(key, defaultValue) {
    if (key === undefined) return this.metaData; // Java: getGlobalMetaData()
    const map = key instanceof MetaDataKey ? this.metaData : this.customMetaData;
    return map.has(key) ? map.get(key) : defaultValue;
  }

  // Java: AnnotatedText#getCustomMetaData()
  getCustomMetaData() {
    return this.customMetaData;
  }

  // Java: AnnotatedText#toString()
  toString() {
    return this.parts.map((p) => p.toString()).join('');
  }
}
