// org.languagetool.bitext.TabBitextReader (BitextReader over a two-column tab-separated file; BitextReader is the implemented interface)
import { existsSync, readFileSync, statSync } from 'node:fs';
import { FileNotFoundException, IOException, NullPointerException, RuntimeException, UnsupportedOperationException } from '../../lib/java/errors.js';
import { inputStreamReader, readerLines } from '../../lib/java/io.js';
import { javaSplit } from '../../lib/java/strings.js';
import { StringPair } from './StringPair.js';

// Java: new FileInputStream(String) failure text
function openError(filename) {
  let reason = 'No such file or directory';
  if (existsSync(filename)) reason = statSync(filename).isDirectory() ? 'Is a directory' : 'Permission denied';
  return new FileNotFoundException(`${filename} (${reason})`);
}

// Java: new BufferedReader(new InputStreamReader(new FileInputStream(filename)[, encoding])); readLine() as a line queue
export function openLineReader(filename, encoding) {
  let bytes;
  try {
    bytes = readFileSync(filename);
  } catch (e) {
    if (e.code === 'ENOENT' || e.code === 'ENOTDIR' || e.code === 'EISDIR' || e.code === 'EACCES') throw openError(filename);
    throw e;
  }
  const text = inputStreamReader(bytes, encoding === null || encoding === undefined ? 'UTF-8' : encoding).str;
  const lines = readerLines(text);
  let i = 0;
  return {
    readLine: () => (i < lines.length ? lines[i++] : null),
    close: () => {},
  };
}

// Java: TabBitextReader
export class TabBitextReader {
  static FQCN = 'org.languagetool.bitext.TabBitextReader';

  // Java: TabBitextReader#TabBitextReader(String,String)
  constructor(filename, encoding) {
    this.in = null;
    this.nextPair = null;
    this.nextLine = null;
    this.sentencePos = 0;
    this.prevLine = null;
    this.lineCount = -1;
    try {
      this.in = openLineReader(filename, encoding);
      this.nextLine = this.in.readLine();
      this.prevLine = '';
      this.nextPair = this.tab2StringPair(this.nextLine);
    } catch (e) {
      if (e instanceof IOException) throw new RuntimeException(e);
      throw e;
    }
  }

  // Java: TabBitextReader#tab2StringPair(String)
  tab2StringPair(line) {
    if (line === null) {
      return null;
    }
    const fields = javaSplit(line, '\t');
    if (fields.length < 2) {
      throw new RuntimeException('Unexpected format, expected two tab-separated columns: ' + line);
    }
    return new StringPair(fields[0], fields[1]);
  }

  // Java: TabBitextReader#iterator()
  iterator() {
    return new TabReader(this);
  }

  // Java: TabBitextReader#getColumnCount()
  getColumnCount() {
    return this.sentencePos;
  }

  // Java: TabBitextReader#getTargetColumnCount()
  getTargetColumnCount() {
    return 1;
  }

  // Java: TabBitextReader#getLineCount()
  getLineCount() {
    return this.lineCount;
  }

  // Java: TabBitextReader#getSentencePosition()
  getSentencePosition() {
    return this.sentencePos;
  }

  // Java: TabBitextReader#getCurrentLine()
  getCurrentLine() {
    return this.prevLine;
  }
}

// Java: TabBitextReader.TabReader (inner iterator)
export class TabReader {
  constructor(outer) {
    this.o = outer;
  }

  // Java: TabBitextReader.TabReader#hasNext()
  hasNext() {
    return this.o.nextLine !== null;
  }

  // Java: TabBitextReader.TabReader#next()
  next() {
    const o = this.o;
    const result = o.nextPair;
    if (result === null) throw new NullPointerException();
    o.sentencePos = o.nextPair.getSource().length + 1;
    if (o.nextLine !== null) {
      o.prevLine = o.nextLine;
      o.nextLine = o.in.readLine();
      o.nextPair = o.tab2StringPair(o.nextLine);
      o.lineCount++;
      if (o.nextLine === null) {
        o.in.close();
      }
    }
    return result;
  }

  // Java: TabBitextReader.TabReader#remove(); the file is read-only
  remove() {
    throw new UnsupportedOperationException();
  }
}
