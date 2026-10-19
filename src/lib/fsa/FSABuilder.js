// morfologik-fsa-builders FSABuilder and ConstantArcSizeFSA (port of the pinned jar, checked against its bytecode).

const ARC_SIZE = 6; // Java: ConstantArcSizeFSA#ARC_SIZE
const FLAGS_OFFSET = 0;
const LABEL_OFFSET = 1;
const BIT_ARC_FINAL = 2;
const BIT_ARC_LAST = 1;
const MAX_LABELS = 256; // Java: FSABuilder#MAX_LABELS
const DEFAULT_BUFFER_GROWTH_SIZE = 5 * 1048576; // Java: FSABuilder#BUFFER_GROWTH_SIZE

// Java: morfologik.fsa.builders.ConstantArcSizeFSA (arc = byte offset, node = offset of its first arc; labels as unsigned bytes)
export class ConstantArcSizeFSA {
  // Java: ConstantArcSizeFSA#ConstantArcSizeFSA(byte[],int)
  constructor(data, epsilon) {
    this.epsilon = epsilon;
    this.data = data;
  }

  // Java: ConstantArcSizeFSA#getRootNode()
  getRootNode() {
    return this.getEndNode(this.getFirstArc(this.epsilon));
  }

  // Java: ConstantArcSizeFSA#getFirstArc(int)
  getFirstArc(node) {
    return node;
  }

  // Java: ConstantArcSizeFSA#getArc(int,byte)
  getArc(node, label) {
    for (let arc = this.getFirstArc(node); arc !== 0; arc = this.getNextArc(arc)) {
      if (this.getArcLabel(arc) === label) return arc;
    }
    return 0;
  }

  // Java: ConstantArcSizeFSA#getNextArc(int)
  getNextArc(arc) {
    if (this.isArcLast(arc)) return 0;
    return arc + ARC_SIZE;
  }

  // Java: ConstantArcSizeFSA#getArcLabel(int) (unsigned)
  getArcLabel(arc) {
    return this.data[arc + LABEL_OFFSET];
  }

  // Java: ConstantArcSizeFSA#getArcTarget(int)
  getArcTarget(arc) {
    arc += 2;
    const d = this.data;
    return (d[arc] << 24) | (d[arc + 1] << 16) | (d[arc + 2] << 8) | d[arc + 3];
  }

  // Java: ConstantArcSizeFSA#isArcFinal(int)
  isArcFinal(arc) {
    return (this.data[arc + FLAGS_OFFSET] & BIT_ARC_FINAL) !== 0;
  }

  // Java: ConstantArcSizeFSA#isArcTerminal(int)
  isArcTerminal(arc) {
    return this.getArcTarget(arc) === 0;
  }

  // Java: ConstantArcSizeFSA#isArcLast(int)
  isArcLast(arc) {
    return (this.data[arc + FLAGS_OFFSET] & BIT_ARC_LAST) !== 0;
  }

  // Java: ConstantArcSizeFSA#getEndNode(int)
  getEndNode(arc) {
    return this.getArcTarget(arc);
  }

  // Java: FSA#visitAllStates(StateVisitor) (post-order, every state once; accept(state) false stops)
  visitAllStates(accept) {
    const visited = new Uint8Array(Math.floor(this.data.length / ARC_SIZE) + 1);
    const visit = (node) => {
      const idx = node / ARC_SIZE;
      if (visited[idx] !== 0) return true;
      visited[idx] = 1;
      for (let arc = this.getFirstArc(node); arc !== 0; arc = this.getNextArc(arc)) {
        if (!this.isArcTerminal(arc)) {
          if (!visit(this.getEndNode(arc))) return false;
        }
      }
      return accept(node);
    };
    visit(this.getRootNode());
  }
}

// Java: FSABuilder#compare(byte[],int,int,byte[],int,int) (unsigned bytes)
function compare(s1, start1, length1, s2, start2, length2) {
  const max = Math.min(length1, length2);
  for (let i = 0; i < max; i++) {
    const c1 = s1[start1++];
    const c2 = s2[start2++];
    if (c1 !== c2) return c1 - c2;
  }
  return length1 - length2;
}

// Java: FSABuilder#LEXICAL_ORDERING
export const LEXICAL_ORDERING = (a, b) => compare(a, 0, a.length, b, 0, b.length);

// Java: morfologik.fsa.builders.FSABuilder
export class FSABuilder {
  // Java: FSABuilder#FSABuilder() / FSABuilder(int)
  constructor(bufferGrowthSize = DEFAULT_BUFFER_GROWTH_SIZE) {
    this.serialized = new Uint8Array(0);
    this.size = 0;
    this.activePath = new Int32Array(0);
    this.activePathLen = 0;
    this.nextArcOffset = new Int32Array(0);
    this.hashSet = new Int32Array(2);
    this.hashSize = 0;
    this.bufferGrowthSize = Math.max(bufferGrowthSize, ARC_SIZE * MAX_LABELS);
    // Add epsilon state.
    this.epsilon = this.allocateState(1);
    this.serialized[this.epsilon + FLAGS_OFFSET] |= BIT_ARC_LAST;
    // Root state.
    this.expandActivePath(1);
    this.root = this.activePath[0];
  }

  // Java: FSABuilder#add(byte[],int,int)
  add(sequence, start, len) {
    const commonPrefix = this.commonPrefix(sequence, start, len);
    this.expandActivePath(len);
    for (let i = this.activePathLen - 1; i > commonPrefix; i--) {
      const frozenState = this.freezeState(i);
      this.setArcTarget(this.nextArcOffset[i - 1] - ARC_SIZE, frozenState);
      this.nextArcOffset[i] = this.activePath[i];
    }
    for (let i = commonPrefix + 1, j = start + commonPrefix; i <= len; i++) {
      const p = this.nextArcOffset[i - 1];
      this.serialized[p + FLAGS_OFFSET] = i === len ? BIT_ARC_FINAL : 0;
      this.serialized[p + LABEL_OFFSET] = sequence[j++];
      this.setArcTarget(p, i === len ? 0 : this.activePath[i]);
      this.nextArcOffset[i - 1] = p + ARC_SIZE;
    }
    this.activePathLen = len;
  }

  // Java: FSABuilder#complete()
  complete() {
    this.add(new Uint8Array(0), 0, 0);
    if (this.nextArcOffset[0] - this.activePath[0] === 0) {
      this.setArcTarget(this.epsilon, 0);
    } else {
      this.root = this.freezeState(0);
      this.setArcTarget(this.epsilon, this.root);
    }
    const fsa = new ConstantArcSizeFSA(this.serialized.slice(0, this.size), this.epsilon);
    this.serialized = null;
    this.hashSet = null;
    return fsa;
  }

  // Java: FSABuilder#build(Iterable)
  static build(input) {
    const builder = new FSABuilder();
    for (const chs of input) builder.add(chs, 0, chs.length);
    return builder.complete();
  }

  // Java: FSABuilder#setArcTarget(int,int)
  setArcTarget(arc, state) {
    arc += ARC_SIZE;
    for (let i = 0; i < 4; i++) {
      this.serialized[--arc] = state & 0xff;
      state >>>= 8;
    }
  }

  // Java: FSABuilder#getArcTarget(int)
  getArcTarget(arc) {
    arc += 2;
    const s = this.serialized;
    return (s[arc] << 24) | (s[arc + 1] << 16) | (s[arc + 2] << 8) | s[arc + 3];
  }

  // Java: FSABuilder#commonPrefix(byte[],int,int)
  commonPrefix(sequence, start, len) {
    const max = Math.min(len, this.activePathLen);
    let i;
    for (i = 0; i < max; i++) {
      const lastArc = this.nextArcOffset[i] - ARC_SIZE;
      if (sequence[start++] !== this.serialized[lastArc + LABEL_OFFSET]) break;
    }
    return i;
  }

  // Java: FSABuilder#freezeState(int)
  freezeState(activePathIndex) {
    const start = this.activePath[activePathIndex];
    const end = this.nextArcOffset[activePathIndex];
    const len = end - start;
    // Set the last arc flag on the current active path's state.
    this.serialized[end - ARC_SIZE + FLAGS_OFFSET] |= BIT_ARC_LAST;
    // Try to locate a state with an identical content in the hash set table.
    const bucketMask = this.hashSet.length - 1;
    let slot = this.hash(start, len) & bucketMask;
    for (let i = 0; ;) {
      let state = this.hashSet[slot];
      if (state === 0) {
        state = this.hashSet[slot] = this.serialize(activePathIndex);
        if (++this.hashSize > (this.hashSet.length >> 1)) this.expandAndRehash();
        return state;
      } else if (this.equivalent(state, start, len)) {
        return state;
      }
      slot = (slot + (++i)) & bucketMask;
    }
  }

  // Java: FSABuilder#expandAndRehash()
  expandAndRehash() {
    const newHashSet = new Int32Array(this.hashSet.length * 2);
    const bucketMask = newHashSet.length - 1;
    for (let j = 0; j < this.hashSet.length; j++) {
      const state = this.hashSet[j];
      if (state > 0) {
        let slot = this.hash(state, this.stateLength(state)) & bucketMask;
        for (let i = 0; newHashSet[slot] > 0;) slot = (slot + (++i)) & bucketMask;
        newHashSet[slot] = state;
      }
    }
    this.hashSet = newHashSet;
  }

  // Java: FSABuilder#stateLength(int)
  stateLength(state) {
    let p = state;
    while (!this.isArcLast(p)) p += ARC_SIZE;
    return p - state + ARC_SIZE;
  }

  // Java: FSABuilder#equivalent(int,int,int)
  equivalent(start1, start2, len) {
    if (start1 + len > this.size || start2 + len > this.size) return false;
    while (len-- > 0) {
      if (this.serialized[start1++] !== this.serialized[start2++]) return false;
    }
    return true;
  }

  // Java: FSABuilder#serialize(int)
  serialize(activePathIndex) {
    this.expandBuffers();
    const newState = this.size;
    const start = this.activePath[activePathIndex];
    const len = this.nextArcOffset[activePathIndex] - start;
    this.serialized.copyWithin(newState, start, start + len);
    this.size += len;
    return newState;
  }

  // Java: FSABuilder#hash(int,int)
  hash(start, byteCount) {
    let h = 0;
    let arcs = Math.trunc(byteCount / ARC_SIZE);
    while (--arcs >= 0) {
      h = (Math.imul(17, h) + ((this.serialized[start + LABEL_OFFSET] << 24) >> 24)) | 0;
      h = (Math.imul(17, h) + this.getArcTarget(start)) | 0;
      if (this.isArcFinal(start)) h = (h + 17) | 0;
      start += ARC_SIZE;
    }
    return h;
  }

  // Java: FSABuilder#isArcLast(int)
  isArcLast(arc) {
    return (this.serialized[arc + FLAGS_OFFSET] & BIT_ARC_LAST) !== 0;
  }

  // Java: FSABuilder#isArcFinal(int)
  isArcFinal(arc) {
    return (this.serialized[arc + FLAGS_OFFSET] & BIT_ARC_FINAL) !== 0;
  }

  // Java: FSABuilder#expandActivePath(int)
  expandActivePath(size) {
    if (this.activePath.length < size) {
      const p = this.activePath.length;
      const na = new Int32Array(size);
      na.set(this.activePath);
      this.activePath = na;
      const nn = new Int32Array(size);
      nn.set(this.nextArcOffset);
      this.nextArcOffset = nn;
      for (let i = p; i < size; i++) {
        this.nextArcOffset[i] = this.activePath[i] = this.allocateState(MAX_LABELS);
      }
    }
  }

  // Java: FSABuilder#expandBuffers()
  expandBuffers() {
    if (this.serialized.length < this.size + ARC_SIZE * MAX_LABELS) {
      const ns = new Uint8Array(this.serialized.length + this.bufferGrowthSize);
      ns.set(this.serialized);
      this.serialized = ns;
    }
  }

  // Java: FSABuilder#allocateState(int)
  allocateState(labels) {
    this.expandBuffers();
    const state = this.size;
    this.size += labels * ARC_SIZE;
    return state;
  }
}
