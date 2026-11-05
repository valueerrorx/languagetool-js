// morfologik-stemming Dictionary, WordData, DictionaryLookup, DictionaryIterator (byte-buffer faithful, buffers reused as in Java).
import { getResourceAsStream, getResourceRoots } from '../../core/resources/ResourceDataBroker.js';
import { FileNotFoundException, NoSuchFileException, NullPointerException, RuntimeException } from '../java/errors.js';
import { ByteBuf, bytesToString, clearAndEnsureCapacity } from './buffers.js';
import { ByteSequenceIterator, FSATraversal, MatchResult, readFSA } from './FSA.js';
import { DictionaryMetadata } from './metadata.js';

// Java: morfologik.stemming.WordData
export class WordData {
  // Java: WordData#WordData(CharsetDecoder)
  constructor(charset) {
    this.charset = charset;
    this.stemBuffer = ByteBuf.allocate(0);
    this.tagBuffer = ByteBuf.allocate(0);
    this.wordBuffer = null;
    this.wordCharSequence = null;
  }

  // Java: WordData#update(ByteBuffer,CharSequence)
  update(wordBuffer, word) {
    this.stemBuffer.clear();
    this.tagBuffer.clear();
    this.wordBuffer = wordBuffer;
    this.wordCharSequence = word;
  }

  // Java: WordData#getTag()
  getTag() {
    const s = this.#decode(this.tagBuffer);
    return s.length === 0 ? null : s;
  }

  // Java: WordData#getStem()
  getStem() {
    const s = this.#decode(this.stemBuffer);
    return s.length === 0 ? null : s;
  }

  // Java: WordData#getWord()
  getWord() {
    return this.wordCharSequence;
  }

  // Java: WordData#toString()
  toString() {
    return `WordData[${this.getWord()},${this.getStem()},${this.getTag()}]`;
  }

  // Java: BufferUtils#bytesToChars(CharsetDecoder,ByteBuffer,CharBuffer)
  #decode(buffer) {
    try {
      return this.charset.decode(buffer.a, buffer.pos, buffer.lim - buffer.pos);
    } catch (e) {
      if (e.javaClass !== 'java.nio.charset.MalformedInputException' && e.javaClass !== 'java.nio.charset.UnmappableCharacterException') throw e;
      throw new RuntimeException(`Input cannot be mapped to bytes using encoding ${this.charset.name()}: ${bytesToString(buffer.a, buffer.pos, buffer.lim - buffer.pos)}`, e);
    }
  }
}

// Java: DictionaryLookup#applyReplacements(CharSequence,LinkedHashMap)
export function applyReplacements(word, replacements) {
  let sb = String(word);
  for (const [key, value] of replacements) {
    let index = sb.indexOf(key);
    while (index !== -1) {
      sb = sb.substring(0, index) + value + sb.substring(index + key.length);
      index = sb.indexOf(key, index + key.length);
    }
  }
  return sb;
}

// Java: morfologik.stemming.DictionaryLookup
export class DictionaryLookup {
  // Java: DictionaryLookup#DictionaryLookup(Dictionary)
  constructor(dictionary) {
    this.forms = [];
    this.byteBuffer = ByteBuf.allocate(0);
    this.matchResult = { kind: MatchResult.NO_MATCH, index: 0, node: 0 };
    this.dictionary = dictionary;
    this.dictionaryMetadata = dictionary.metadata;
    this.sequenceEncoder = dictionary.metadata.getSequenceEncoderType();
    this.rootNode = dictionary.fsa.getRootNode();
    this.fsa = dictionary.fsa;
    this.matcher = new FSATraversal(this.fsa);
    this.finalStatesIterator = new ByteSequenceIterator(this.fsa, this.fsa.getRootNode());
    this.charset = dictionary.metadata.charset;
    this.separatorChar = dictionary.metadata.getSeparatorAsChar();
    this.separator = dictionary.metadata.getSeparator();
    this.prefixBytes = this.sequenceEncoder.prefixBytes();
    this.maxBytesPerChar = this.charset.maxBytesPerChar;
  }

  // Java: DictionaryLookup#lookup(CharSequence); returns the WordData objects (volatile, reused by the next call)
  lookup(word) {
    const separator = this.separator;
    const prefixBytes = this.prefixBytes;
    const md = this.dictionaryMetadata;
    if (md.getInputConversionPairs().size > 0) word = applyReplacements(word, md.getInputConversionPairs());
    if (word === null || word === undefined) throw new NullPointerException('Cannot invoke "java.lang.CharSequence.length()" because "word" is null');
    const len = word.length;
    for (let i = 0; i < len; i++) {
      if (word[i] === this.separatorChar) return [];
    }
    // Java: BufferUtils#charsToBytes(CharsetEncoder,CharBuffer,ByteBuffer)
    const bb = clearAndEnsureCapacity(this.byteBuffer, Math.trunc(Math.fround(len * this.maxBytesPerChar)));
    let n;
    try {
      n = this.charset.encodeInto(word, bb.a);
    } catch (e) {
      if (e.javaClass !== 'java.nio.charset.MalformedInputException' && e.javaClass !== 'java.nio.charset.UnmappableCharacterException') throw e;
      return []; // UnmappableInputException
    }
    bb.pos = 0;
    bb.lim = n;
    this.byteBuffer = bb;
    const byteBuffer = bb;
    const match = this.matcher.match(this.matchResult, byteBuffer.a, 0, byteBuffer.remaining(), this.rootNode);
    let count = 0;
    if (match.kind === MatchResult.SEQUENCE_IS_A_PREFIX) {
      const arc = this.fsa.getArc(match.node, separator);
      if (arc !== 0 && !this.fsa.isArcFinal(arc)) {
        const it = this.finalStatesIterator.restartFrom(this.fsa.getEndNode(arc));
        while (it.hasNext()) {
          const iend = it.next();
          const sequence = it.buffer;
          if (count >= this.forms.length) {
            const oldLen = this.forms.length;
            this.forms.length = oldLen + 10;
            for (let i = 0; i < this.forms.length; i++) if (this.forms[i] === undefined) this.forms[i] = new WordData(this.charset);
          }
          const wordData = this.forms[count++];
          if (md.getOutputConversionPairs().size === 0) wordData.update(byteBuffer, word);
          else wordData.update(byteBuffer, applyReplacements(word, md.getOutputConversionPairs()));
          let j = prefixBytes;
          while (j < iend && sequence[j] !== separator) j++;
          wordData.stemBuffer = this.sequenceEncoder.decode(wordData.stemBuffer, byteBuffer, ByteBuf.wrap(sequence, 0, j));
          j++;
          const tagLen = iend - j;
          if (tagLen > 0) {
            wordData.tagBuffer = clearAndEnsureCapacity(wordData.tagBuffer, tagLen);
            wordData.tagBuffer.put(sequence, j, tagLen);
            wordData.tagBuffer.flip();
          }
        }
      }
    }
    return this.forms.slice(0, count);
  }

  // perf (not Java API): predicate tag -> "lookup(prefix + tag) may return entries"; false answers are certain. null = no information
  tagFilterForPrefix(prefix) {
    const md = this.dictionaryMetadata;
    if (md.getInputConversionPairs().size > 0 || typeof prefix !== 'string') return null;
    const none = () => false;
    for (let i = 0; i < prefix.length; i++) {
      if (prefix[i] === this.separatorChar) return none;
    }
    const bb = new Uint8Array(Math.trunc(Math.fround(prefix.length * this.maxBytesPerChar)));
    let n;
    try {
      n = this.charset.encodeInto(prefix, bb);
    } catch (e) {
      if (e.javaClass !== 'java.nio.charset.MalformedInputException' && e.javaClass !== 'java.nio.charset.UnmappableCharacterException') return null;
      return none;
    }
    if (this.prefixMatcher === undefined) this.prefixMatcher = new FSATraversal(this.fsa);
    const res = this.prefixMatcher.match({ kind: 0, index: 0, node: 0 }, bb, 0, n, this.rootNode);
    if (res.kind === MatchResult.NO_MATCH || res.kind === MatchResult.AUTOMATON_HAS_PREFIX) return none;
    if (res.kind !== MatchResult.SEQUENCE_IS_A_PREFIX) return null;
    const tags = new Set(); // tag bytes (as latin1 string) that are followed by the separator in some entry
    const it = new ByteSequenceIterator(this.fsa, res.node);
    const sep = this.separator;
    while (it.hasNext()) {
      const len = it.next();
      const buf = it.buffer;
      let j = 0;
      let key = '';
      while (j < len && buf[j] !== sep) key += String.fromCharCode(buf[j++]);
      if (j < len) tags.add(key);
    }
    if (this.tagKeys === undefined) this.tagKeys = new Map();
    return (tag) => {
      let k = this.tagKeys.get(tag);
      if (k === undefined) {
        k = null; // not encodable or containing the separator: lookup returns an empty list
        if (typeof tag === 'string' && !tag.includes(this.separatorChar)) {
          const tb = new Uint8Array(Math.trunc(Math.fround(tag.length * this.maxBytesPerChar)));
          try {
            const tn = this.charset.encodeInto(tag, tb);
            k = '';
            for (let i = 0; i < tn; i++) k += String.fromCharCode(tb[i]);
          } catch (e) {
            if (e.javaClass !== 'java.nio.charset.MalformedInputException' && e.javaClass !== 'java.nio.charset.UnmappableCharacterException') throw e;
          }
        } else if (typeof tag !== 'string') {
          k = undefined;
        }
        this.tagKeys.set(tag, k);
      }
      return k === undefined ? true : k !== null && tags.has(k);
    };
  }

  // Java: DictionaryLookup#iterator()
  iterator() {
    return new DictionaryIterator(this.dictionary, this.charset, true);
  }

  // Java: DictionaryLookup#getDictionary()
  getDictionary() {
    return this.dictionary;
  }

  // Java: DictionaryLookup#getSeparatorChar()
  getSeparatorChar() {
    return this.separatorChar;
  }

  [Symbol.iterator]() {
    const it = this.iterator();
    return { next: () => (it.hasNext() ? { value: it.next(), done: false } : { value: undefined, done: true }) };
  }
}

// Java: morfologik.stemming.DictionaryIterator
export class DictionaryIterator {
  // Java: DictionaryIterator#DictionaryIterator(Dictionary,CharsetDecoder,boolean)
  constructor(dictionary, charset, decodeStems) {
    this.inflectedBuffer = ByteBuf.allocate(0);
    this.temp = ByteBuf.allocate(0);
    const fsa = dictionary.fsa;
    const root = fsa.getRootNode();
    this.entriesIter = root === 0 ? null : new ByteSequenceIterator(fsa, root); // FSA#getSequences(int): node 0 -> empty
    this.separator = dictionary.metadata.getSeparator();
    this.sequenceEncoder = dictionary.metadata.getSequenceEncoderType();
    this.charset = charset;
    this.entry = new WordData(charset);
    this.decodeStems = decodeStems;
  }

  // Java: DictionaryIterator#hasNext()
  hasNext() {
    return this.entriesIter !== null && this.entriesIter.hasNext();
  }

  // Java: DictionaryIterator#next()
  next() {
    let length = this.entriesIter.next();
    let array = this.entriesIter.buffer;
    let i = 0;
    while (i < length) {
      if (array[i] === this.separator) break;
      i++;
    }
    if (i === length) throw new RuntimeException('Invalid dictionary entry format (missing separator).');
    this.inflectedBuffer = clearAndEnsureCapacity(this.inflectedBuffer, i);
    this.inflectedBuffer.put(array, 0, i);
    this.inflectedBuffer.flip();
    let word;
    try {
      word = this.charset.decode(this.inflectedBuffer.a, 0, i);
    } catch (e) {
      if (e.javaClass !== 'java.nio.charset.MalformedInputException' && e.javaClass !== 'java.nio.charset.UnmappableCharacterException') throw e;
      throw new RuntimeException(`Input cannot be mapped to bytes using encoding ${this.charset.name()}: ${bytesToString(this.inflectedBuffer.a, 0, i)}`, e);
    }
    this.entry.update(this.inflectedBuffer, word);
    this.temp = clearAndEnsureCapacity(this.temp, length - i);
    i++;
    this.temp.put(array, i, length - i);
    this.temp.flip();
    array = this.temp.a;
    length = this.temp.remaining();
    i = this.sequenceEncoder.prefixBytes();
    while (i < length) {
      if (array[i] === this.separator) break;
      i++;
    }
    if (this.decodeStems) {
      this.entry.stemBuffer = this.sequenceEncoder.decode(this.entry.stemBuffer, this.inflectedBuffer, ByteBuf.wrap(array, 0, i));
    } else {
      this.entry.stemBuffer = clearAndEnsureCapacity(this.entry.stemBuffer, i);
      this.entry.stemBuffer.put(array, 0, i);
      this.entry.stemBuffer.flip();
    }
    if (i + 1 <= length) i++;
    this.entry.tagBuffer = clearAndEnsureCapacity(this.entry.tagBuffer, length - i);
    this.entry.tagBuffer.put(array, i, length - i);
    this.entry.tagBuffer.flip();
    return this.entry;
  }
}

// Java: morfologik.stemming.Dictionary
export class Dictionary {
  // Java: Dictionary#Dictionary(FSA,DictionaryMetadata)
  constructor(fsa, metadata) {
    this.fsa = fsa;
    this.metadata = metadata;
  }

  // Java: Dictionary#read(InputStream,InputStream) over whole file images
  static readImages(dictImage, infoImage) {
    return new Dictionary(readFSA(dictImage), DictionaryMetadata.read(infoImage));
  }

  // Java: Dictionary#read(Path)
  static readPath(path) {
    const slash = path.lastIndexOf('/') + 1;
    const metadata = path.substring(0, slash) + DictionaryMetadata.getExpectedMetadataFileName(path.substring(slash)); // resolveSibling
    const dict = readOrThrow(path, NoSuchFileException, (p) => p);
    const info = readOrThrow(metadata, NoSuchFileException, (p) => p);
    return Dictionary.readImages(dict, info);
  }

  // Java: Dictionary#read(URL); url = resource URL object with getPath()
  static read(url) {
    const path = url.getPath();
    const dict = readOrThrow(path, FileNotFoundException, (p) => `${p} (No such file or directory)`);
    const info = readOrThrow(DictionaryMetadata.getExpectedMetadataFileName(path), FileNotFoundException, (p) => `${p} (No such file or directory)`);
    return Dictionary.readImages(dict, info);
  }
}

// fs path of a broker resource (absolute below a root) -> class-path name with a leading slash
function resourceName(path) {
  for (const root of getResourceRoots()) {
    const prefix = root.endsWith('/') ? root : root + '/';
    if (path.startsWith(prefix)) return `/${path.slice(prefix.length)}`;
  }
  return path.startsWith('/') ? path : `/${path}`;
}

// reads a resource as one Buffer; missing -> the given Java exception
function readOrThrow(path, ErrorClass, message) {
  const bytes = getResourceAsStream(resourceName(path));
  if (bytes === null) throw new ErrorClass(message(path));
  return bytes;
}
