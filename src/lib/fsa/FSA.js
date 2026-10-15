// morfologik-fsa: FSA base (read, iteration), FSAFlags, ByteSequenceIterator, FSATraversal/MatchResult.
import { IOException, NoSuchElementException } from '../java/errors.js';
import { CFSA2 } from './CFSA2.js';
import { FSA5 } from './FSA5.js';

// Java: morfologik.fsa.FSAFlags (name, bits in enum order)
export const FSAFlags = Object.freeze([
  { name: 'FLEXIBLE', bits: 1 },
  { name: 'STOPBIT', bits: 2 },
  { name: 'NEXTBIT', bits: 4 },
  { name: 'TAILS', bits: 8 },
  { name: 'NUMBERS', bits: 256 },
  { name: 'SEPARATORS', bits: 512 },
]);

// Java: FSA#read(InputStream) over a whole file image (header: \fsa + version byte)
export function readFSA(buf) {
  // Java: FSAHeader#read(InputStream)
  if (buf.length < 4 || buf[0] !== 92 || buf[1] !== 102 || buf[2] !== 115 || buf[3] !== 97) {
    throw new IOException('Invalid file header, probably not an FSA.');
  }
  if (buf.length < 5) throw new IOException('Truncated file, no version number.');
  const version = buf[4];
  switch (version) {
    case 5:
      return new FSA5(buf, 5); // UNTESTED: no FSA5 dictionary is in the wave-1 resources
    case 0xc6:
      return new CFSA2(buf, 5);
    default:
      throw new IOException(`Unsupported automaton version: 0x${version.toString(16).padStart(2, '0')}`);
  }
}

// Java: morfologik.fsa.MatchResult
export const MatchResult = {
  EXACT_MATCH: 0,
  NO_MATCH: -1,
  AUTOMATON_HAS_PREFIX: -3,
  SEQUENCE_IS_A_PREFIX: -4,
};

// Java: morfologik.fsa.FSATraversal (match only)
export class FSATraversal {
  // Java: FSATraversal#FSATraversal(FSA)
  constructor(fsa) {
    this.fsa = fsa;
  }

  // Java: FSATraversal#match(MatchResult,byte[],int,int,int); result = {kind,index,node} object reused by the caller
  match(result, sequence, start, length, node) {
    if (node === 0) {
      result.kind = MatchResult.NO_MATCH;
      result.index = start;
      result.node = node;
      return result;
    }
    const fsa = this.fsa;
    const max = start + length;
    for (let i = start; i < max; i++) {
      const arc = fsa.getArc(node, sequence[i]);
      if (arc !== 0) {
        if (i + 1 === max && fsa.isArcFinal(arc)) {
          result.kind = MatchResult.EXACT_MATCH;
          result.index = i;
          result.node = node;
          return result;
        }
        if (fsa.isArcTerminal(arc)) {
          result.kind = MatchResult.AUTOMATON_HAS_PREFIX;
          result.index = i + 1;
          result.node = node;
          return result;
        }
        node = fsa.getEndNode(arc);
      } else {
        result.kind = i > start ? MatchResult.AUTOMATON_HAS_PREFIX : MatchResult.NO_MATCH;
        result.index = i;
        result.node = node;
        return result;
      }
    }
    result.kind = MatchResult.SEQUENCE_IS_A_PREFIX;
    result.index = 0;
    result.node = node;
    return result;
  }
}

// Java: morfologik.fsa.ByteSequenceIterator; next() returns the shared buffer {buffer,length} valid until the next call
export class ByteSequenceIterator {
  // Java: ByteSequenceIterator#ByteSequenceIterator(FSA,int)
  constructor(fsa, node) {
    this.fsa = fsa;
    this.buffer = new Uint8Array(15); // grows by 15 like the Java buffer (capacity is visible to DictionaryLookup)
    this.arcs = new Int32Array(15);
    this.position = 0;
    this.nextElement = false;
    this.length = 0;
    if (node === undefined) node = fsa.getRootNode();
    if (fsa.getFirstArc(node) !== 0) this.restartFrom(node);
  }

  // Java: ByteSequenceIterator#restartFrom(int)
  restartFrom(node) {
    this.position = 0;
    this.nextElement = false;
    this.pushNode(node);
    return this;
  }

  // Java: ByteSequenceIterator#hasNext()
  hasNext() {
    if (!this.nextElement) this.nextElement = this.advance();
    return this.nextElement;
  }

  // Java: ByteSequenceIterator#next(); returns the current sequence length (bytes in this.buffer[0,length)) or throws NoSuchElementException
  next() {
    if (this.nextElement) {
      this.nextElement = false;
      return this.length;
    }
    if (!this.advance()) throw new NoSuchElementException();
    return this.length;
  }

  // Java: ByteSequenceIterator#advance()
  advance() {
    if (this.position === 0) return false;
    const fsa = this.fsa;
    while (this.position > 0) {
      const lastIndex = this.position - 1;
      const arc = this.arcs[lastIndex];
      if (arc === 0) {
        this.position--;
        continue;
      }
      this.arcs[lastIndex] = fsa.getNextArc(arc);
      const bufferLength = this.buffer.length;
      if (lastIndex >= bufferLength) {
        const nb = new Uint8Array(bufferLength + 15);
        nb.set(this.buffer);
        this.buffer = nb;
      }
      this.buffer[lastIndex] = fsa.getArcLabel(arc);
      if (!fsa.isArcTerminal(arc)) this.pushNode(fsa.getEndNode(arc));
      if (fsa.isArcFinal(arc)) {
        this.length = lastIndex + 1;
        return true;
      }
    }
    return false;
  }

  // Java: ByteSequenceIterator#pushNode(int)
  pushNode(node) {
    if (this.position === this.arcs.length) {
      const na = new Int32Array(this.arcs.length + 15);
      na.set(this.arcs);
      this.arcs = na;
    }
    this.arcs[this.position++] = this.fsa.getFirstArc(node);
  }
}
