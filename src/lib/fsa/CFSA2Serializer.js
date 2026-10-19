// morfologik-fsa-builders CFSA2Serializer without numbers (port of the pinned jar, checked against its bytecode).

const BIT_TARGET_NEXT = 128; // Java: CFSA2#BIT_TARGET_NEXT
const BIT_LAST_ARC = 64; // Java: CFSA2#BIT_LAST_ARC
const BIT_FINAL_ARC = 32; // Java: CFSA2#BIT_FINAL_ARC
const NO_STATE = -1; // Java: CFSA2Serializer#NO_STATE
const MAX_INT = 2147483647;

// growable byte sink (ByteArrayOutputStream)
class ByteSink {
  constructor() {
    this.buf = new Uint8Array(1 << 16);
    this.n = 0;
  }

  // Java: OutputStream#write(int)
  write(b) {
    if (this.n === this.buf.length) {
      const nb = new Uint8Array(this.buf.length * 2);
      nb.set(this.buf);
      this.buf = nb;
    }
    this.buf[this.n++] = b & 0xff;
  }

  // Java: ByteArrayOutputStream#toByteArray()
  toByteArray() {
    return this.buf.slice(0, this.n);
  }
}

// Java: CFSA2#writeVInt(byte[],int,int)
function writeVInt(buffer, offset, value) {
  while (value > 127) {
    buffer[offset++] = 0x80 | (value & 0x7f);
    value >>= 7;
  }
  buffer[offset++] = value & 0xff;
  return offset;
}

// Java: morfologik.fsa.builders.CFSA2Serializer (withNumbers is not supported: unused by the port)
export class CFSA2Serializer {
  // Java: CFSA2Serializer#CFSA2Serializer()
  constructor() {
    this.offsets = null;
    this.scratch = new Uint8Array(5);
    this.labelsIndex = null;
    this.labelsInvIndex = null;
  }

  // Java: CFSA2Serializer#serialize(FSA,OutputStream); returns the bytes
  serialize(fsa) {
    this.computeLabelsIndex(fsa);
    const linearized = this.linearize(fsa);
    const os = new ByteSink();
    // Emit the header (FSAHeader.write: "\fsa" + version byte)
    os.write(92);
    os.write(102);
    os.write(115);
    os.write(97);
    os.write(0xc6);
    const flags = 1 | 2 | 4; // FLEXIBLE | STOPBIT | NEXTBIT
    os.write((flags >> 8) & 0xff);
    os.write(flags & 0xff);
    // Emit labels index.
    os.write(this.labelsIndex.length);
    for (let i = 0; i < this.labelsIndex.length; i++) os.write(this.labelsIndex[i]);
    // Emit the automaton.
    this.emitNodes(fsa, os, linearized);
    return os.toByteArray();
  }

  // Java: CFSA2Serializer#computeLabelsIndex(FSA)
  computeLabelsIndex(fsa) {
    // Compute labels count.
    const countByValue = new Int32Array(256);
    fsa.visitAllStates((state) => {
      for (let arc = fsa.getFirstArc(state); arc !== 0; arc = fsa.getNextArc(arc)) countByValue[fsa.getArcLabel(arc) & 0xff]++;
      return true;
    });
    // Order by descending frequency of counts and increasing label value.
    const set = [];
    for (let i = 0; i < countByValue.length; i++) {
      if (countByValue[i] > 0) set.push({ a: i, b: countByValue[i] });
    }
    set.sort((o1, o2) => {
      const cmp = o2.b - o1.b;
      return cmp === 0 ? o1.a - o2.a : cmp;
    });
    this.labelsIndex = new Uint8Array(1 + Math.min(set.length, 31));
    this.labelsInvIndex = new Int32Array(256);
    let next = 0;
    for (let i = this.labelsIndex.length - 1; i > 0 && next < set.length; i--) {
      const e = set[next++];
      this.labelsInvIndex[e.a] = i;
      this.labelsIndex[i] = e.a;
    }
  }

  // Java: CFSA2Serializer#linearize(FSA); returns the state list
  linearize(fsa) {
    const slots = Math.floor(fsa.data.length / 6) + 1;
    this.offsets = new Int32Array(slots);
    const inlinkCount = this.computeInlinkCount(fsa, slots);
    const linearized = [];
    const maxStates = MAX_INT;
    const minInlinkCount = 2;
    const firstStates = this.computeFirstStates(inlinkCount, maxStates, minInlinkCount);
    let size = this.linearizeAndCalculateOffsets(fsa, [], linearized);
    // Compute the best number of first states.
    let bestCount = 0;
    const initialSize = size;
    const maxFirst = Math.min(150, firstStates.length);
    for (let n = Math.min(25, firstStates.length); n <= maxFirst; n += 25) {
      const newSize = this.linearizeAndCalculateOffsets(fsa, firstStates.slice(0, n), linearized);
      if (newSize < initialSize) bestCount = n;
      else break;
    }
    size = this.linearizeAndCalculateOffsets(fsa, firstStates.slice(0, bestCount), linearized);
    return linearized;
  }

  // Java: CFSA2Serializer#linearizeAndCalculateOffsets(FSA,IntArrayList,IntArrayList,IntIntHashMap); linearized is cleared and refilled
  linearizeAndCalculateOffsets(fsa, preordered, linearized) {
    const visited = new Uint8Array(this.offsets.length);
    const nodes = [];
    linearized.length = 0;
    for (let i = 0; i < preordered.length; i++) this.linearizeState(fsa, nodes, linearized, visited, preordered[i]);
    // Add the remaining states in DFS order.
    nodes.push(fsa.getRootNode());
    while (nodes.length > 0) {
      const node = nodes.pop();
      if (visited[node / 6] !== 0) continue;
      this.linearizeState(fsa, nodes, linearized, visited, node);
    }
    // Calculate new state offsets. This is iterative. We start with maximum potential offsets and recalculate until converged.
    for (let i = 0; i < linearized.length; i++) this.offsets[linearized[i] / 6] = MAX_INT;
    let max = 0;
    let i;
    while ((i = this.emitNodes(fsa, null, linearized)) > 0) max = i;
    return max;
  }

  // Java: CFSA2Serializer#linearizeState(FSA,IntStack,IntArrayList,BitSet,int)
  linearizeState(fsa, nodes, linearized, visited, node) {
    linearized.push(node);
    visited[node / 6] = 1;
    for (let arc = fsa.getFirstArc(node); arc !== 0; arc = fsa.getNextArc(arc)) {
      if (!fsa.isArcTerminal(arc)) {
        const target = fsa.getEndNode(arc);
        if (visited[target / 6] === 0) nodes.push(target);
      }
    }
  }

  // Java: CFSA2Serializer#computeFirstStates(IntIntHashMap,int,int): states with more than minInlinkCount inlinks, most inlinks first (ties: higher state first)
  computeFirstStates(inlinkCount, maxStates, minInlinkCount) {
    const entries = [];
    for (let s = 0; s < inlinkCount.length; s++) {
      if (inlinkCount[s] > minInlinkCount) entries.push({ a: inlinkCount[s], b: s * 6 });
    }
    entries.sort((o1, o2) => {
      const cmp = o2.a - o1.a;
      return cmp === 0 ? o2.b - o1.b : cmp;
    });
    return entries.slice(0, maxStates).map((e) => e.b);
  }

  // Java: CFSA2Serializer#computeInlinkCount(FSA)
  computeInlinkCount(fsa, slots) {
    const inlinkCount = new Int32Array(slots);
    const visited = new Uint8Array(slots);
    const nodes = [];
    nodes.push(fsa.getRootNode());
    while (nodes.length > 0) {
      const node = nodes.pop();
      if (visited[node / 6] !== 0) continue;
      visited[node / 6] = 1;
      for (let arc = fsa.getFirstArc(node); arc !== 0; arc = fsa.getNextArc(arc)) {
        if (!fsa.isArcTerminal(arc)) {
          const target = fsa.getEndNode(arc);
          inlinkCount[target / 6]++;
          if (visited[target / 6] === 0) nodes.push(target);
        }
      }
    }
    return inlinkCount;
  }

  // Java: CFSA2Serializer#emitNodes(FSA,OutputStream,IntArrayList)
  emitNodes(fsa, os, linearized) {
    let offset = 0;
    // Add dummy terminal state.
    offset += this.emitNodeData(os, 0);
    offset += this.emitArc(os, BIT_LAST_ARC, 94, fsa.getRootNode() !== 0 ? this.offsets[fsa.getRootNode() / 6] : 0);
    let offsetsChanged = false;
    const max = linearized.length;
    for (let index = 0; index < max; index++) {
      const state = linearized[index];
      const nextState = index + 1 < max ? linearized[index + 1] : NO_STATE;
      if (os === null) {
        offsetsChanged = offsetsChanged || this.offsets[state / 6] !== offset;
        this.offsets[state / 6] = offset;
      }
      offset += this.emitNodeData(os, 0);
      offset += this.emitNodeArcs(fsa, os, state, nextState);
    }
    return offsetsChanged ? offset : 0;
  }

  // Java: CFSA2Serializer#emitNodeArcs(FSA,OutputStream,int,int)
  emitNodeArcs(fsa, os, state, nextState) {
    let offset = 0;
    for (let arc = fsa.getFirstArc(state); arc !== 0; arc = fsa.getNextArc(arc)) {
      let targetOffset;
      let target;
      if (fsa.isArcTerminal(arc)) {
        targetOffset = 0;
        target = 0;
      } else {
        target = fsa.getEndNode(arc);
        targetOffset = this.offsets[target / 6];
      }
      let flags = 0;
      if (fsa.isArcFinal(arc)) flags |= BIT_FINAL_ARC;
      if (fsa.getNextArc(arc) === 0) flags |= BIT_LAST_ARC;
      if (targetOffset !== 0 && target === nextState) {
        flags |= BIT_TARGET_NEXT;
        targetOffset = 0;
      }
      offset += this.emitArc(os, flags, fsa.getArcLabel(arc), targetOffset);
    }
    return offset;
  }

  // Java: CFSA2Serializer#emitArc(OutputStream,int,byte,int)
  emitArc(os, flags, label, targetOffset) {
    let length = 0;
    const labelIndex = this.labelsInvIndex[label & 0xff];
    if (labelIndex > 0) {
      if (os !== null) os.write(flags | labelIndex);
      length++;
    } else {
      if (os !== null) {
        os.write(flags);
        os.write(label);
      }
      length += 2;
    }
    if ((flags & BIT_TARGET_NEXT) === 0) {
      const len = writeVInt(this.scratch, 0, targetOffset);
      if (os !== null) for (let i = 0; i < len; i++) os.write(this.scratch[i]);
      length += len;
    }
    return length;
  }

  // Java: CFSA2Serializer#emitNodeData(OutputStream,int) without numbers
  emitNodeData() {
    return 0;
  }
}
