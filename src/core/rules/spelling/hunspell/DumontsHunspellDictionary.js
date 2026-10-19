// Java: org.languagetool.rules.spelling.hunspell.DumontsHunspellDictionary (dumonts JNA binding replaced by Hunspell WASM, D-013)
import { RuntimeException, NullPointerException } from '../../../../lib/java/errors.js';
import { getBytesUtf8, decodeUtf8Java } from '../../../../lib/java/charset.js';
import { WasmHunspell } from '../../../../lib/hunspell/HunspellWasm.js';

// Java: Charset.forName(encoding) + String#getBytes / new String(bytes, charset) for the encodings of the shipped dictionaries
function codec(encoding) {
  const e = encoding.toUpperCase();
  if (e === 'UTF-8' || e === 'UTF8') return { enc: getBytesUtf8, dec: (b) => decodeUtf8Java(b) };
  if (e === 'ISO8859-1' || e === 'ISO-8859-1') {
    return {
      enc: (s) => Uint8Array.from(Array.from({ length: s.length }, (_, i) => (s.charCodeAt(i) < 256 ? s.charCodeAt(i) : 0x3f))),
      dec: (b) => Buffer.from(b).toString('latin1'),
    };
  }
  throw new RuntimeException(`Unsupported hunspell dictionary encoding: ${encoding}`);
}

export class DumontsHunspellDictionary {
  static FQCN = 'org.languagetool.rules.spelling.hunspell.DumontsHunspellDictionary';

  // Java: DumontsHunspellDictionary#DumontsHunspellDictionary(Path,Path,boolean) (dictionary/affix given as bytes)
  constructor(dictionary, affix, deleteOnClose = false) {
    this.deleteOnClose = deleteOnClose;
    this.closed = false;
    this.hunspell = new WasmHunspell(affix, dictionary); // Java: new dumonts.hunspell.Hunspell(dictionary, affix)
    this.codec = codec(this.hunspell.getDicEncoding());
  }

  // Java: DumontsHunspellDictionary#isDeleteOnClose()
  isDeleteOnClose() {
    return this.deleteOnClose;
  }

  // Java: DumontsHunspellDictionary#isClosed()
  isClosed() {
    return this.closed;
  }

  // Java: dumonts.hunspell.Hunspell#getBytes (word.getBytes(charset))
  bytes(word) {
    if (word === null || word === undefined) {
      throw new NullPointerException('Cannot invoke "String.getBytes(java.nio.charset.Charset)" because "word" is null');
    }
    return this.codec.enc(word);
  }

  // Java: DumontsHunspellDictionary#spell(String)
  spell(word) {
    if (this.closed) throw new RuntimeException('Attempt to use hunspell instance after closing');
    return this.hunspell.spell(this.bytes(word)) !== 0;
  }

  // Java: DumontsHunspellDictionary#add(String)
  add(word) {
    if (this.closed) throw new RuntimeException('Attempt to use hunspell instance after closing');
    this.hunspell.add(this.bytes(word));
  }

  // Java: DumontsHunspellDictionary#suggest(String)
  suggest(word) {
    if (this.closed) throw new RuntimeException('Attempt to use hunspell instance after closing');
    return this.hunspell.suggest(this.bytes(word)).map((b) => this.codec.dec(b));
  }

  // Java: DumontsHunspellDictionary#close()
  close() {
    this.closed = true;
    this.hunspell.close();
  }
}
