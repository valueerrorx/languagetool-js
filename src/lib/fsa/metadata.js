// morfologik-stemming DictionaryAttribute and DictionaryMetadata (.info parsing).
import { IllegalArgumentException, IOException, RuntimeException } from '../java/errors.js';
import { Locale } from '../java/Locale.js';
import { loadProperties } from '../java/Properties.js';
import { decodeUtf8 } from '../java/io.js';
import { equalsIgnoreCase, javaSplit, javaTrim, toLowerCase, toUpperCase } from '../java/strings.js';
import { isHighSurrogate, isLowSurrogate } from '../java/Character.js';
import { forName, isSupported } from './charsets.js';
import { EncoderType } from './encoders.js';

// Java: DictionaryAttribute#booleanValue(String)
function booleanValue(value) {
  value = toLowerCase(value, Locale.ROOT);
  if (value === 'true' || value === 'yes' || value === 'on') return true;
  if (value === 'false' || value === 'no' || value === 'off') return false;
  throw new IllegalArgumentException(`Not a boolean value: ${value}`);
}

// shared by INPUT_CONVERSION and OUTPUT_CONVERSION (DictionaryAttribute$13/$14#fromString)
function conversionPairs(attr, value) {
  const result = new Map();
  for (const pair of javaSplit(value, ',\\s*')) {
    const aConversion = javaSplit(javaTrim(pair), ' ');
    if (aConversion.length === 2) {
      if (!result.has(aConversion[0])) result.set(aConversion[0], aConversion[1]);
      else throw new IllegalArgumentException(`Input conversion cannot specify different values for the same input string: ${aConversion[0]}`);
    } else {
      throw new IllegalArgumentException(`Attribute ${attr.propertyName} is not in the proper format: ${value}`);
    }
  }
  return result;
}

// Java: morfologik.stemming.DictionaryAttribute (enum order = ordinal; fromString per constant)
const attr = (name, propertyName, fromString) => ({ name, propertyName, fromString, ordinal: 0 });
export const DictionaryAttribute = Object.freeze({
  SEPARATOR: attr('SEPARATOR', 'fsa.dict.separator', function fromString(value) { // Java: DictionaryAttribute$1#fromString(String)
    if (value === null || value.length !== 1) throw new IllegalArgumentException(`Attribute ${this.propertyName} must be a single character.`);
    const chr = value.charCodeAt(0);
    if (isHighSurrogate(chr) || isLowSurrogate(chr)) throw new IllegalArgumentException(`Field separator character cannot be part of a surrogate pair: ${value}`);
    return value;
  }),
  ENCODING: attr('ENCODING', 'fsa.dict.encoding', (value) => forName(value)), // Java: DictionaryAttribute$2#fromString(String)
  FREQUENCY_INCLUDED: attr('FREQUENCY_INCLUDED', 'fsa.dict.frequency-included', booleanValue),
  IGNORE_NUMBERS: attr('IGNORE_NUMBERS', 'fsa.dict.speller.ignore-numbers', booleanValue),
  IGNORE_PUNCTUATION: attr('IGNORE_PUNCTUATION', 'fsa.dict.speller.ignore-punctuation', booleanValue),
  IGNORE_CAMEL_CASE: attr('IGNORE_CAMEL_CASE', 'fsa.dict.speller.ignore-camel-case', booleanValue),
  IGNORE_ALL_UPPERCASE: attr('IGNORE_ALL_UPPERCASE', 'fsa.dict.speller.ignore-all-uppercase', booleanValue),
  IGNORE_DIACRITICS: attr('IGNORE_DIACRITICS', 'fsa.dict.speller.ignore-diacritics', booleanValue),
  CONVERT_CASE: attr('CONVERT_CASE', 'fsa.dict.speller.convert-case', booleanValue),
  RUN_ON_WORDS: attr('RUN_ON_WORDS', 'fsa.dict.speller.runon-words', booleanValue),
  LOCALE: attr('LOCALE', 'fsa.dict.speller.locale', (value) => new Locale(value)), // Java: DictionaryAttribute$11#fromString(String)
  ENCODER: attr('ENCODER', 'fsa.dict.encoder', (value) => { // Java: DictionaryAttribute$12#fromString(String)
    const name = toUpperCase(javaTrim(value), Locale.ROOT);
    const e = EncoderType.values().find((x) => x.name === name);
    if (e === undefined) {
      throw new IllegalArgumentException(`Invalid encoder name '${javaTrim(value)}', only these coders are valid: [${EncoderType.values().map((x) => x.name).join(', ')}]`);
    }
    return e;
  }),
  INPUT_CONVERSION: attr('INPUT_CONVERSION', 'fsa.dict.input-conversion', function fromString(value) { return conversionPairs(this, value); }),
  OUTPUT_CONVERSION: attr('OUTPUT_CONVERSION', 'fsa.dict.output-conversion', function fromString(value) { return conversionPairs(this, value); }),
  REPLACEMENT_PAIRS: attr('REPLACEMENT_PAIRS', 'fsa.dict.speller.replacement-pairs', function fromString(value) { // Java: DictionaryAttribute$15#fromString(String)
    const replacementPairs = new Map();
    for (const stringPair of javaSplit(value, ',\\s*')) {
      const twoStrings = javaSplit(javaTrim(stringPair), ' ');
      if (twoStrings.length === 2) {
        const first = twoStrings[0].replaceAll('_', ' ');
        const second = twoStrings[1].replaceAll('_', ' ');
        if (!replacementPairs.has(first)) replacementPairs.set(first, [second]);
        else replacementPairs.get(first).push(second);
      } else {
        throw new IllegalArgumentException(`Attribute ${this.propertyName} is not in the proper format: ${value}`);
      }
    }
    return replacementPairs;
  }),
  EQUIVALENT_CHARS: attr('EQUIVALENT_CHARS', 'fsa.dict.speller.equivalent-chars', function fromString(value) { // Java: DictionaryAttribute$16#fromString(String)
    const equivalentCharacters = new Map();
    for (const characterPair of javaSplit(value, ',\\s*')) {
      const twoChars = javaSplit(javaTrim(characterPair), ' ');
      if (twoChars.length === 2 && twoChars[0].length === 1 && twoChars[1].length === 1) {
        const fromChar = twoChars[0];
        const toChar = twoChars[1];
        if (!equivalentCharacters.has(fromChar)) equivalentCharacters.set(fromChar, []);
        equivalentCharacters.get(fromChar).push(toChar);
      } else {
        throw new IllegalArgumentException(`Attribute ${this.propertyName} is not in the proper format: ${value}`);
      }
    }
    return equivalentCharacters;
  }),
  LICENSE: attr('LICENSE', 'fsa.dict.license', (value) => value),
  AUTHOR: attr('AUTHOR', 'fsa.dict.author', (value) => value),
  CREATION_DATE: attr('CREATION_DATE', 'fsa.dict.created', (value) => value),
});
const ATTRIBUTES = Object.values(DictionaryAttribute);
ATTRIBUTES.forEach((a, i) => { a.ordinal = i; });
const BY_PROPERTY_NAME = new Map(ATTRIBUTES.map((a) => [a.propertyName, a]));

// Java: DictionaryAttribute#fromPropertyName(String)
function fromPropertyName(propertyName) {
  const attribute = BY_PROPERTY_NAME.get(propertyName);
  if (attribute === undefined) throw new IllegalArgumentException(`No attribute for property: ${propertyName}`);
  return attribute;
}

// Java: DictionaryMetadata#DEFAULT_ATTRIBUTES (built by DictionaryMetadataBuilder)
const DEFAULT_ATTRIBUTES = new Map([
  [DictionaryAttribute.FREQUENCY_INCLUDED, 'false'],
  [DictionaryAttribute.IGNORE_PUNCTUATION, 'true'],
  [DictionaryAttribute.IGNORE_NUMBERS, 'true'],
  [DictionaryAttribute.IGNORE_CAMEL_CASE, 'true'],
  [DictionaryAttribute.IGNORE_ALL_UPPERCASE, 'true'],
  [DictionaryAttribute.IGNORE_DIACRITICS, 'true'],
  [DictionaryAttribute.CONVERT_CASE, 'true'],
  [DictionaryAttribute.RUN_ON_WORDS, 'true'],
]);
const REQUIRED_ATTRIBUTES = [DictionaryAttribute.SEPARATOR, DictionaryAttribute.ENCODING, DictionaryAttribute.ENCODER];

// enum-ordered copy of a Map<DictionaryAttribute,V> (EnumMap iteration order)
function enumMap(entries) {
  return new Map([...entries].sort((a, b) => a[0].ordinal - b[0].ordinal));
}

// Java: morfologik.stemming.DictionaryMetadata
export class DictionaryMetadata {
  // Java: DictionaryMetadata#DictionaryMetadata(Map)
  constructor(attrs) {
    this.locale = Locale.getDefault();
    this.replacementPairs = new Map();
    this.inputConversion = new Map();
    this.outputConversion = new Map();
    this.equivalentChars = new Map();
    this.boolAttributes = new Map();
    this.attributes = enumMap(attrs);
    this.encoderType = undefined;
    this.separatorChar = undefined;
    this.encoding = undefined;
    this.charset = undefined;
    const allAttributes = enumMap([...DEFAULT_ATTRIBUTES, ...attrs]);
    const required = new Set(REQUIRED_ATTRIBUTES);
    for (const [key, rawValue] of allAttributes) {
      required.delete(key);
      const value = key.fromString(rawValue);
      switch (key) {
        case DictionaryAttribute.ENCODING:
          this.encoding = rawValue;
          if (!isSupported(this.encoding)) throw new IllegalArgumentException(`Encoding not supported on this JVM: ${this.encoding}`);
          this.charset = value;
          break;
        case DictionaryAttribute.SEPARATOR:
          this.separatorChar = value;
          break;
        case DictionaryAttribute.LOCALE:
          this.locale = value;
          break;
        case DictionaryAttribute.ENCODER:
          this.encoderType = value;
          break;
        case DictionaryAttribute.INPUT_CONVERSION:
          this.inputConversion = value;
          break;
        case DictionaryAttribute.OUTPUT_CONVERSION:
          this.outputConversion = value;
          break;
        case DictionaryAttribute.REPLACEMENT_PAIRS:
          this.replacementPairs = value;
          break;
        case DictionaryAttribute.EQUIVALENT_CHARS:
          this.equivalentChars = value;
          break;
        case DictionaryAttribute.IGNORE_PUNCTUATION:
        case DictionaryAttribute.IGNORE_NUMBERS:
        case DictionaryAttribute.IGNORE_CAMEL_CASE:
        case DictionaryAttribute.IGNORE_ALL_UPPERCASE:
        case DictionaryAttribute.IGNORE_DIACRITICS:
        case DictionaryAttribute.CONVERT_CASE:
        case DictionaryAttribute.RUN_ON_WORDS:
        case DictionaryAttribute.FREQUENCY_INCLUDED:
          this.boolAttributes.set(key, value);
          break;
        case DictionaryAttribute.AUTHOR:
        case DictionaryAttribute.LICENSE:
        case DictionaryAttribute.CREATION_DATE:
          break;
        default:
          throw new RuntimeException(`Unexpected code path (attribute should be handled but is not): ${key.name}`);
      }
    }
    if (required.size > 0) {
      const names = REQUIRED_ATTRIBUTES.filter((a) => required.has(a)).sort((a, b) => a.ordinal - b.ordinal).map((a) => a.name);
      throw new IllegalArgumentException(`At least one the required attributes was not provided: [${names.join(', ')}]`);
    }
    // the separator must encode to exactly one byte
    const buf = new Uint8Array(8);
    let n;
    try {
      n = this.charset.encodeInto(this.separatorChar, buf);
    } catch (e) {
      if (e.javaClass !== 'java.nio.charset.MalformedInputException' && e.javaClass !== 'java.nio.charset.UnmappableCharacterException') throw e;
      throw new IllegalArgumentException(`Separator character cannot be converted to a byte in ${this.encoding}: ${this.separatorChar}`, e);
    }
    if (n > 1) throw new IllegalArgumentException(`Separator character is not a single byte in encoding ${this.encoding}: ${this.separatorChar}`);
    this.separator = buf[0];
  }

  // Java: DictionaryMetadata#getAttributes()
  getAttributes() {
    return this.attributes;
  }

  // Java: DictionaryMetadata#getEncoding()
  getEncoding() {
    return this.encoding;
  }

  // Java: DictionaryMetadata#getSeparator() (unsigned byte value)
  getSeparator() {
    return this.separator;
  }

  // Java: DictionaryMetadata#getLocale()
  getLocale() {
    return this.locale;
  }

  // Java: DictionaryMetadata#getInputConversionPairs()
  getInputConversionPairs() {
    return this.inputConversion;
  }

  // Java: DictionaryMetadata#getOutputConversionPairs()
  getOutputConversionPairs() {
    return this.outputConversion;
  }

  // Java: DictionaryMetadata#getReplacementPairs()
  getReplacementPairs() {
    return this.replacementPairs;
  }

  // Java: DictionaryMetadata#getEquivalentChars()
  getEquivalentChars() {
    return this.equivalentChars;
  }

  // Java: DictionaryMetadata#isFrequencyIncluded()
  isFrequencyIncluded() {
    return this.boolAttributes.get(DictionaryAttribute.FREQUENCY_INCLUDED);
  }

  // Java: DictionaryMetadata#isIgnoringPunctuation()
  isIgnoringPunctuation() {
    return this.boolAttributes.get(DictionaryAttribute.IGNORE_PUNCTUATION);
  }

  // Java: DictionaryMetadata#isIgnoringNumbers()
  isIgnoringNumbers() {
    return this.boolAttributes.get(DictionaryAttribute.IGNORE_NUMBERS);
  }

  // Java: DictionaryMetadata#isIgnoringCamelCase()
  isIgnoringCamelCase() {
    return this.boolAttributes.get(DictionaryAttribute.IGNORE_CAMEL_CASE);
  }

  // Java: DictionaryMetadata#isIgnoringAllUppercase()
  isIgnoringAllUppercase() {
    return this.boolAttributes.get(DictionaryAttribute.IGNORE_ALL_UPPERCASE);
  }

  // Java: DictionaryMetadata#isIgnoringDiacritics()
  isIgnoringDiacritics() {
    return this.boolAttributes.get(DictionaryAttribute.IGNORE_DIACRITICS);
  }

  // Java: DictionaryMetadata#isConvertingCase()
  isConvertingCase() {
    return this.boolAttributes.get(DictionaryAttribute.CONVERT_CASE);
  }

  // Java: DictionaryMetadata#isSupportingRunOnWords()
  isSupportingRunOnWords() {
    return this.boolAttributes.get(DictionaryAttribute.RUN_ON_WORDS);
  }

  // Java: DictionaryMetadata#getSequenceEncoderType()
  getSequenceEncoderType() {
    return this.encoderType;
  }

  // Java: DictionaryMetadata#getSeparatorAsChar()
  getSeparatorAsChar() {
    return this.separatorChar;
  }

  // Java: DictionaryMetadata#getExpectedMetadataFileName(String)
  static getExpectedMetadataFileName(name) {
    const dotIndex = name.lastIndexOf('.');
    if (dotIndex >= 0) return `${name.substring(0, dotIndex)}.info`;
    return `${name}.info`;
  }

  // Java: DictionaryMetadata#read(InputStream) over the whole .info image
  static read(buf) {
    const map = new Map();
    const properties = loadProperties(decodeUtf8(buf));
    if (!properties.has(DictionaryAttribute.ENCODER.propertyName)) {
      const hasDeprecatedEncoderProperties = properties.has('fsa.dict.uses-suffixes') || properties.has('fsa.dict.uses-infixes') || properties.has('fsa.dict.uses-prefixes');
      const prop = (k, d) => (properties.has(k) ? properties.get(k) : d);
      const isTrue = (s) => equalsIgnoreCase(s, 'true'); // Boolean.valueOf(String)
      const usesSuffixes = isTrue(prop('fsa.dict.uses-suffixes', 'true'));
      const usesPrefixes = isTrue(prop('fsa.dict.uses-prefixes', 'false'));
      const usesInfixes = isTrue(prop('fsa.dict.uses-infixes', 'false'));
      let encoder;
      if (usesInfixes) encoder = EncoderType.INFIX;
      else if (usesPrefixes) encoder = EncoderType.PREFIX;
      else if (usesSuffixes) encoder = EncoderType.SUFFIX;
      else encoder = EncoderType.NONE;
      if (!hasDeprecatedEncoderProperties) {
        throw new IOException(`Use an explicit ${DictionaryAttribute.ENCODER.propertyName}=${encoder.name} metadata key: `);
      }
      throw new IOException(`Deprecated encoder keys in metadata. Use ${DictionaryAttribute.ENCODER.propertyName}=${encoder.name}`);
    }
    for (const [name, value] of properties) map.set(fromPropertyName(name), value);
    return new DictionaryMetadata(map);
  }
}
