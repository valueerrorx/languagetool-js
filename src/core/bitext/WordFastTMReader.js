// org.languagetool.bitext.WordFastTMReader (WordFast translation memory: header line skipped, columns 5 and 7)
import { UnsupportedOperationException } from '../../lib/java/errors.js';
import { arrayGet } from '../../lib/java/arrays.js';
import { javaSplit } from '../../lib/java/strings.js';
import { StringPair } from './StringPair.js';
import { TabBitextReader } from './TabBitextReader.js';

// Java: WordFastTMReader
export class WordFastTMReader extends TabBitextReader {
  static FQCN = 'org.languagetool.bitext.WordFastTMReader';

  // Java: WordFastTMReader#WordFastTMReader(String,String)
  constructor(filename, encoding) {
    super(filename, encoding);
    // skip the header (first line)
    if (this.nextLine !== null) {
      this.nextLine = this.in.readLine();
      this.nextPair = this.tab2StringPair(this.nextLine);
    }
  }

  // Java: WordFastTMReader#tab2StringPair(String)
  tab2StringPair(line) {
    if (line === null) {
      return null;
    }
    const fields = javaSplit(line, '\t');
    this.sentencePos = arrayGet(fields, 4).length + 1;
    return new StringPair(fields[4], arrayGet(fields, 6));
  }

  // Java: WordFastTMReader#iterator()
  iterator() {
    return new WordFastReader(this);
  }
}

// Java: WordFastTMReader.TabReader (inner iterator)
class WordFastReader {
  constructor(outer) {
    this.o = outer;
  }

  // Java: WordFastTMReader.TabReader#hasNext()
  hasNext() {
    return this.o.nextLine !== null;
  }

  // Java: WordFastTMReader.TabReader#next()
  next() {
    const o = this.o;
    const result = o.nextPair;
    if (o.nextLine !== null) {
      o.nextLine = o.in.readLine();
      o.nextPair = o.tab2StringPair(o.nextLine);
      if (o.nextLine === null) {
        o.in.close();
      }
    }
    return result;
  }

  // Java: WordFastTMReader.TabReader#remove(); the file is read-only
  remove() {
    throw new UnsupportedOperationException();
  }
}
