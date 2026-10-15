// morfologik-fsa CFSA2 (version 0xC6) reader over one Uint8Array; arcs are byte offsets, no per-node objects.
import { EOFException, IOException } from '../java/errors.js';

const BIT_TARGET_NEXT = 128;
const BIT_LAST_ARC = 64;
const BIT_FINAL_ARC = 32;
const LABEL_INDEX_MASK = 31;
const FLAG_DEFS = [
  { name: 'FLEXIBLE', bits: 1 },
  { name: 'STOPBIT', bits: 2 },
  { name: 'NEXTBIT', bits: 4 },
  { name: 'TAILS', bits: 8 },
  { name: 'NUMBERS', bits: 256 },
  { name: 'SEPARATORS', bits: 512 },
];

// Java: morfologik.fsa.CFSA2
export class CFSA2 {
  static FQCN = 'morfologik.fsa.CFSA2';

  static VERSION = 0xc6;

  // Java: CFSA2#CFSA2(InputStream); buf = whole file, pos = offset after the 5 header bytes
  constructor(buf, pos) {
    if (buf.length < pos + 3) throw new EOFException();
    const flags = (buf[pos] << 8) | buf[pos + 1];
    this.flags = [];
    let all = 0;
    for (const f of FLAG_DEFS) {
      if ((flags & f.bits) !== 0) {
        this.flags.push(f.name);
        all |= f.bits;
      }
    }
    if (((flags << 16) >> 16) !== ((all << 16) >> 16)) throw new IOException(`Unrecognized flags: 0x${(((flags << 16) >> 16) >>> 0).toString(16)}`);
    this.hasNumbers = this.flags.includes('NUMBERS');
    const n = buf[pos + 2];
    if (buf.length < pos + 3 + n) throw new EOFException();
    this.labelMapping = buf.subarray(pos + 3, pos + 3 + n);
    this.arcs = buf.subarray(pos + 3 + n);
  }

  // Java: CFSA2#getRootNode()
  getRootNode() {
    return this.getDestinationNodeOffset(this.getFirstArc(0));
  }

  // Java: CFSA2#getFirstArc(int)
  getFirstArc(node) {
    if (this.hasNumbers) return this.skipVInt(node);
    return node;
  }

  // Java: CFSA2#getNextArc(int)
  getNextArc(arc) {
    if (this.isArcLast(arc)) return 0;
    return this.skipArc(arc);
  }

  // Java: CFSA2#getArc(int,byte)
  getArc(node, label) {
    const arcs = this.arcs;
    const lm = this.labelMapping;
    let arc = this.hasNumbers ? this.skipVInt(node) : node;
    while (arc !== 0) {
      const flag = arcs[arc];
      const idx = flag & LABEL_INDEX_MASK;
      if ((idx > 0 ? lm[idx] : arcs[arc + 1]) === label) return arc;
      arc = (flag & BIT_LAST_ARC) !== 0 ? 0 : this.skipArc(arc);
    }
    return 0;
  }

  // Java: FSA#getArcCount(int)
  getArcCount(node) {
    let count = 0;
    for (let arc = this.getFirstArc(node); arc !== 0; arc = this.getNextArc(arc)) count++;
    return count;
  }

  // Java: CFSA2#getEndNode(int)
  getEndNode(arc) {
    return this.getDestinationNodeOffset(arc);
  }

  // Java: CFSA2#getArcLabel(int) (unsigned byte value)
  getArcLabel(arc) {
    const index = this.arcs[arc] & LABEL_INDEX_MASK;
    if (index > 0) return this.labelMapping[index];
    return this.arcs[arc + 1];
  }

  // Java: CFSA2#getRightLanguageCount(int)
  getRightLanguageCount(node) {
    return readVInt(this.arcs, node);
  }

  // Java: CFSA2#isArcFinal(int)
  isArcFinal(arc) {
    return (this.arcs[arc] & BIT_FINAL_ARC) !== 0;
  }

  // Java: CFSA2#isArcTerminal(int)
  isArcTerminal(arc) {
    return this.getDestinationNodeOffset(arc) === 0;
  }

  // Java: CFSA2#isArcLast(int)
  isArcLast(arc) {
    return (this.arcs[arc] & BIT_LAST_ARC) !== 0;
  }

  // Java: CFSA2#isNextSet(int)
  isNextSet(arc) {
    return (this.arcs[arc] & BIT_TARGET_NEXT) !== 0;
  }

  // Java: CFSA2#getFlags() (flag names in enum order)
  getFlags() {
    return this.flags;
  }

  // Java: CFSA2#getDestinationNodeOffset(int)
  getDestinationNodeOffset(arc) {
    const arcs = this.arcs;
    if ((arcs[arc] & BIT_TARGET_NEXT) !== 0) {
      while ((arcs[arc] & BIT_LAST_ARC) === 0) arc = this.getNextArc(arc);
      return this.skipArc(arc);
    }
    return readVInt(arcs, arc + ((arcs[arc] & LABEL_INDEX_MASK) === 0 ? 2 : 1));
  }

  // Java: CFSA2#skipArc(int)
  skipArc(offset) {
    const arcs = this.arcs;
    const flag = arcs[offset++];
    if ((flag & LABEL_INDEX_MASK) === 0) offset++;
    if ((flag & BIT_TARGET_NEXT) === 0) offset = this.skipVInt(offset);
    return offset;
  }

  // Java: CFSA2#skipVInt(int)
  skipVInt(offset) {
    const arcs = this.arcs;
    while (arcs[offset++] >= 128);
    return offset;
  }
}

// Java: CFSA2#readVInt(byte[],int)
function readVInt(array, offset) {
  let b = array[offset];
  let value = b & 0x7f;
  for (let shift = 7; b >= 128; shift += 7) {
    b = array[++offset];
    value |= (b & 0x7f) << shift;
  }
  return value;
}
