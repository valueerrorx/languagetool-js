// morfologik-fsa FSA5 (version 5) reader. UNTESTED: no wave-1 dictionary uses it, no oracle fixture exists.
import { EOFException } from '../java/errors.js';

// Java: morfologik.fsa.FSA5
export class FSA5 {
  static FQCN = 'morfologik.fsa.FSA5';

  static VERSION = 5;

  // Java: FSA5#FSA5(InputStream); buf = whole file, pos = offset after the 5 header bytes
  constructor(buf, pos) {
    if (buf.length < pos + 3) throw new EOFException();
    this.filler = buf[pos];
    this.annotation = buf[pos + 1];
    const gtlnode = buf[pos + 2];
    this.flags = ['FLEXIBLE', 'STOPBIT', 'NEXTBIT'];
    if ((gtlnode & 0xf0) !== 0) this.flags.push('NUMBERS');
    this.nodeDataLength = (gtlnode >>> 4) & 0xf;
    this.gtl = gtlnode & 0xf;
    this.arcs = buf.subarray(pos + 3);
  }

  // Java: FSA5#getRootNode()
  getRootNode() {
    const finalNode = this.skipArc(this.getFirstArc(0));
    return this.getDestinationNodeOffset(this.getFirstArc(finalNode));
  }

  // Java: FSA5#getFirstArc(int)
  getFirstArc(node) {
    return this.nodeDataLength + node;
  }

  // Java: FSA5#getNextArc(int)
  getNextArc(arc) {
    if (this.isArcLast(arc)) return 0;
    return this.skipArc(arc);
  }

  // Java: FSA5#getArc(int,byte)
  getArc(node, label) {
    for (let arc = this.getFirstArc(node); arc !== 0; arc = this.getNextArc(arc)) {
      if (this.getArcLabel(arc) === label) return arc;
    }
    return 0;
  }

  // Java: FSA#getArcCount(int)
  getArcCount(node) {
    let count = 0;
    for (let arc = this.getFirstArc(node); arc !== 0; arc = this.getNextArc(arc)) count++;
    return count;
  }

  // Java: FSA5#getEndNode(int)
  getEndNode(arc) {
    return this.getDestinationNodeOffset(arc);
  }

  // Java: FSA5#getArcLabel(int)
  getArcLabel(arc) {
    return this.arcs[arc];
  }

  // Java: FSA5#isArcFinal(int)
  isArcFinal(arc) {
    return (this.arcs[arc + 1] & 1) !== 0;
  }

  // Java: FSA5#isArcTerminal(int)
  isArcTerminal(arc) {
    return this.getDestinationNodeOffset(arc) === 0;
  }

  // Java: FSA5#getRightLanguageCount(int)
  getRightLanguageCount(node) {
    return decodeFromBytes(this.arcs, node, this.nodeDataLength);
  }

  // Java: FSA5#getFlags()
  getFlags() {
    return this.flags;
  }

  // Java: FSA5#isArcLast(int)
  isArcLast(arc) {
    return (this.arcs[arc + 1] & 2) !== 0;
  }

  // Java: FSA5#isNextSet(int)
  isNextSet(arc) {
    return (this.arcs[arc + 1] & 4) !== 0;
  }

  // Java: FSA5#getDestinationNodeOffset(int)
  getDestinationNodeOffset(arc) {
    if (this.isNextSet(arc)) return this.skipArc(arc);
    return decodeFromBytes(this.arcs, arc + 1, this.gtl) >>> 3;
  }

  // Java: FSA5#skipArc(int)
  skipArc(offset) {
    return offset + (this.isNextSet(offset) ? 1 + 1 : 1 + this.gtl);
  }
}

// Java: FSA5#decodeFromBytes(byte[],int,int)
function decodeFromBytes(arcs, start, n) {
  let r = 0;
  for (let i = n; --i >= 0;) r = (r << 8) | arcs[start + i];
  return r;
}
