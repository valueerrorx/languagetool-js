// Java: com.optimaize.langdetect.profiles.* and frma.LangProfileReader (profile loading)
import { IllegalArgumentException, IOException, RuntimeException } from '../java/errors.js';
import { Integer } from '../java/int.js';
import { decodeUtf8, readerLines } from '../java/io.js';
import { Pattern } from '../java/regex/index.js';
import { javaReplace, javaSplit, javaTrim, stringHashCode } from '../java/strings.js';
import { getResourceAsStream } from './classpath.js';
import { LdLocale } from './LdLocale.js';

const FREQ_PATTERN = Pattern.compile('"freq" ?: ?\\{(.+?)\\}');
const N_WORDS_PATTERN = Pattern.compile('"n_words" ?: ?\\[(.+?)\\]');
const NAME_PATTERN = Pattern.compile('"name" ?: ?"(.+?)"');

// Java: com.optimaize.langdetect.cybozu.util.LangProfile (fields used by the reader)
class LangProfile {
  constructor() {
    this.name = null;
    this.freq = new Map(); // Java HashMap: iteration order only feeds order-free sums
    this.nWords = [0, 0, 0];
  }
}

// Java: LangProfileReader#read(InputStream)
function readLangProfile(buf) {
  let buffer = '';
  for (const line of readerLines(decodeUtf8(buf))) {
    if (buffer.length > 0) buffer += ' ';
    buffer += line;
  }
  const storedProfile = buffer;
  const langProfile = new LangProfile();
  let m = FREQ_PATTERN.matcher(storedProfile);
  if (m.find()) {
    const entries = javaSplit(m.group(1), ',');
    for (const entry of entries) {
      const keyValue = javaSplit(entry, ':');
      const label = javaReplace(javaTrim(keyValue[0]), '"', '');
      langProfile.freq.set(label, Integer.valueOf(keyValue[1]));
    }
  }
  m = N_WORDS_PATTERN.matcher(storedProfile);
  if (m.find()) {
    const nWords = javaSplit(m.group(1), ',');
    langProfile.nWords = nWords.map((w) => Integer.parseInt(w));
  }
  m = NAME_PATTERN.matcher(storedProfile);
  if (m.find()) {
    langProfile.name = m.group(1);
  }
  return langProfile;
}

// Java: OldLangProfileConverter#convert(LangProfile)
function convert(langProfile) {
  let locale;
  try {
    locale = LdLocale.fromString(langProfile.name);
  } catch (e) {
    throw new RuntimeException('Profile file name logic was changed in v0.5, please update your custom profiles!', e);
  }
  const builder = new LanguageProfileBuilder(locale);
  for (const [k, v] of langProfile.freq) builder.addGram(k, v);
  return builder.build();
}

// Java: com.optimaize.langdetect.profiles.LanguageProfileBuilder (subset used by the converter)
export class LanguageProfileBuilder {
  // Java: LanguageProfileBuilder#LanguageProfileBuilder(LdLocale)
  constructor(locale) {
    this.locale = locale;
    this.minimalFrequency = 1;
    this.ngrams = new Map();
  }

  // Java: LanguageProfileBuilder#addGram(String,int)
  addGram(ngram, frequency = 1) {
    let map = this.ngrams.get(ngram.length);
    if (map === undefined) {
      map = new Map();
      this.ngrams.set(ngram.length, map);
    }
    const total = (map.get(ngram) ?? 0) + frequency;
    map.set(ngram, total | 0);
    return this;
  }

  // Java: LanguageProfileBuilder#build() (minimalFrequency is always 1 here)
  build() {
    return new LanguageProfileImpl(this.locale, this.ngrams);
  }
}

// Java: com.optimaize.langdetect.profiles.LanguageProfileImpl
export class LanguageProfileImpl {
  static FQCN = 'com.optimaize.langdetect.profiles.LanguageProfileImpl';

  // Java: LanguageProfileImpl#LanguageProfileImpl(LdLocale,Map)
  constructor(locale, ngrams) {
    this.locale = locale;
    this.ngrams = ngrams;
    this.numOccurrences = new Map(); // Java: Stats#numOccurrences (long sums, exact below 2^53)
    for (const [len, map] of ngrams) {
      let count = 0;
      for (const v of map.values()) count += v;
      this.numOccurrences.set(len, count);
    }
    this.hash = null;
  }

  // Java: LanguageProfileImpl#getLocale()
  getLocale() {
    return this.locale;
  }

  // Java: LanguageProfileImpl#getGramLengths()
  getGramLengths() {
    return [...this.ngrams.keys()].sort((a, b) => a - b);
  }

  // Java: LanguageProfileImpl#getNumGramOccurrences(int)
  getNumGramOccurrences(gramLength) {
    return this.numOccurrences.get(gramLength) ?? 0;
  }

  // Java: LanguageProfileImpl#iterateGrams(int) (entries as [gram, frequency])
  iterateGrams(gramLength) {
    return this.ngrams.get(gramLength).entries();
  }

  // Java: LanguageProfileImpl#equals(Object)
  equals(o) {
    if (this === o) return true;
    if (!(o instanceof LanguageProfileImpl)) return false;
    if (!this.locale.equals(o.locale)) return false;
    if (this.ngrams.size !== o.ngrams.size) return false;
    for (const [len, map] of this.ngrams) {
      const other = o.ngrams.get(len);
      if (other === undefined || other.size !== map.size) return false;
      for (const [k, v] of map) if (other.get(k) !== v) return false;
    }
    return true;
  }

  // Java: LanguageProfileImpl#hashCode() (31 * locale.hashCode() + ImmutableMap<Integer,HashMap<String,Integer>>.hashCode())
  hashCode() {
    if (this.hash === null) {
      let ngramsHash = 0;
      for (const [len, map] of this.ngrams) {
        let inner = 0;
        for (const [k, v] of map) inner = (inner + (stringHashCode(k) ^ v)) | 0;
        ngramsHash = (ngramsHash + (len ^ inner)) | 0;
      }
      this.hash = (Math.imul(31, this.locale.hashCode()) + ngramsHash) | 0;
    }
    return this.hash;
  }

  // Java: LanguageProfileImpl#toString()
  toString() {
    let sb = `LanguageProfile{locale=${this.locale}`;
    for (const len of this.getGramLengths()) sb += `,${len}-grams=${this.ngrams.get(len).size}`;
    return `${sb}}`;
  }
}

// Java: com.optimaize.langdetect.profiles.LanguageProfileReader
export class LanguageProfileReader {
  static PROFILES_DIR = 'languages';

  // Java: LanguageProfileReader#read(InputStream) (bytes) / read(Collection<String>) (built-in profile names)
  read(arg) {
    if (Buffer.isBuffer(arg)) return convert(readLangProfile(arg));
    if (!Array.isArray(arg)) throw new IllegalArgumentException(`unsupported argument ${arg}`);
    return this.readFrom(LanguageProfileReader.PROFILES_DIR, arg);
  }

  // Java: LanguageProfileReader#read(ClassLoader,String,Collection<String>)
  readFrom(profileDirectory, profileFileNames) {
    const loaded = [];
    for (const profileFileName of profileFileNames) {
      const p = `${profileDirectory}/${profileFileName}`;
      const input = getResourceAsStream(p);
      if (input === null) {
        throw new IOException(`No language file available named ${profileFileName} at ${p}!`);
      }
      loaded.push(this.read(input));
    }
    return loaded;
  }
}
