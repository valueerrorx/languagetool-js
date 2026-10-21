// java.util.HashMap iteration order (bucket index by spread hash, insertion order within a bucket; bins in tables >= 64 are never treeified here, treeBinsNeeded flags that case).
import { Objects } from '../Objects.js';

// Java: HashMap#tableSizeFor(int)
function tableSizeFor(cap) {
  let n = 1;
  while (n < cap) n *= 2;
  return Math.min(n, 1 << 30);
}

const EMPTY_BIN = Object.freeze([]); // perf: shared placeholder of an empty bin, replaced by an array on first insert

// Java: java.util.HashMap
export class JavaHashMap {
  // Java: HashMap#HashMap() / HashMap(int)
  constructor(initialCapacity = null) {
    this.table = null;
    this.size_ = 0;
    this.threshold = initialCapacity === null ? 0 : tableSizeFor(initialCapacity);
    this.treeBinsNeeded = false; // set when Java would treeify a bin (iteration order of that bin is then not modelled)
  }

  // Java: HashMap#HashMap(Map) - entries = [key, value] pairs of the source map (distinct keys); putMapEntries sizing, then puts in source order
  static copyOf(entries) {
    const s = entries.length;
    const m = new JavaHashMap();
    if (s > 0) {
      const ft = Math.fround(Math.fround(s / Math.fround(0.75)) + 1);
      const t = ft < (1 << 30) ? Math.trunc(ft) : (1 << 30);
      m.threshold = tableSizeFor(t);
    }
    for (const [k, v] of entries) m.put(k, v);
    return m;
  }

  // Java: HashMap#hash(Object)
  static hash(key) {
    const h = Objects.hashCode(key);
    return (h ^ (h >>> 16)) | 0;
  }

  // Java: HashMap#resize() (re-inserting in iteration order keeps the relative order of split bins)
  resize() {
    const old = this.table;
    const newCap = old === null ? (this.threshold > 0 ? this.threshold : 16) : old.length * 2;
    const table = new Array(newCap).fill(EMPTY_BIN);
    if (old !== null) {
      for (const bin of old) {
        for (const node of bin) {
          const idx = node.hash & (newCap - 1);
          const b = table[idx];
          if (b === EMPTY_BIN) table[idx] = [node];
          else b.push(node);
        }
      }
    }
    this.table = table;
    this.threshold = Math.floor(newCap * 0.75);
  }

  // Java: HashMap#treeifyBin(Node[],int); small tables resize instead of treeifying
  treeifyBin() {
    if (this.table.length < 64) this.resize();
    else this.treeBinsNeeded = true;
  }

  // Java: HashMap#put(Object,Object)
  put(key, value) {
    if (this.table === null) this.resize();
    const hash = JavaHashMap.hash(key);
    const idx = hash & (this.table.length - 1);
    let bin = this.table[idx];
    if (bin === EMPTY_BIN) bin = this.table[idx] = [];
    for (const node of bin) {
      if (node.hash === hash && Objects.equals(node.key, key)) {
        const old = node.value;
        node.value = value;
        return old;
      }
    }
    bin.push({ hash, key, value });
    if (bin.length >= 9) this.treeifyBin(); // Java: binCount >= TREEIFY_THRESHOLD - 1
    if (++this.size_ > this.threshold) this.resize();
    return null;
  }

  // Java: HashMap#getNode(Object)
  getNode(key) {
    if (this.table === null) return null;
    const hash = JavaHashMap.hash(key);
    for (const node of this.table[hash & (this.table.length - 1)]) if (node.hash === hash && Objects.equals(node.key, key)) return node;
    return null;
  }

  // Java: HashMap#get(Object)
  get(key) {
    const n = this.getNode(key);
    return n === null ? null : n.value;
  }

  // Java: HashMap#containsKey(Object)
  containsKey(key) {
    return this.getNode(key) !== null;
  }

  // Java: HashMap#remove(Object); returns the removed value or null
  remove(key) {
    if (this.table === null) return null;
    const hash = JavaHashMap.hash(key);
    const bin = this.table[hash & (this.table.length - 1)];
    for (let i = 0; i < bin.length; i++) {
      if (bin[i].hash === hash && Objects.equals(bin[i].key, key)) {
        const value = bin[i].value;
        bin.splice(i, 1);
        this.size_--;
        return value;
      }
    }
    return null;
  }

  // Java: HashMap#clear() (table capacity is kept)
  clear() {
    if (this.table !== null) this.table.fill(EMPTY_BIN);
    this.size_ = 0;
  }

  // Java: HashMap#computeIfAbsent(Object,Function); JDK 17: resize before insert when size > threshold, new node at bin head, null result not stored
  computeIfAbsent(key, fn) {
    if (this.size_ > this.threshold || this.table === null || this.table.length === 0) this.resize();
    const hash = JavaHashMap.hash(key);
    const idx = hash & (this.table.length - 1);
    let bin = this.table[idx];
    if (bin === EMPTY_BIN) bin = this.table[idx] = [];
    let old = null;
    for (const node of bin) {
      if (node.hash === hash && Objects.equals(node.key, key)) {
        old = node;
        if (node.value !== null) return node.value;
        break;
      }
    }
    const v = fn(key);
    if (v === null || v === undefined) return null;
    if (old !== null) {
      old.value = v;
      return v;
    }
    bin.unshift({ hash, key, value: v });
    if (bin.length >= 8) this.treeifyBin(); // Java: binCount >= TREEIFY_THRESHOLD - 1 (binCount = nodes before insert)
    ++this.size_;
    return v;
  }

  // Java: HashMap#compute(Object,BiFunction); JDK 17: resize before insert when size > threshold, new node at bin head, null result removes/is not stored
  compute(key, fn) {
    if (this.size_ > this.threshold || this.table === null || this.table.length === 0) this.resize();
    const hash = JavaHashMap.hash(key);
    const idx = hash & (this.table.length - 1);
    let bin = this.table[idx];
    if (bin === EMPTY_BIN) bin = this.table[idx] = [];
    let old = null;
    let binCount = 0;
    for (const node of bin) {
      if (node.hash === hash && Objects.equals(node.key, key)) {
        old = node;
        break;
      }
      ++binCount;
    }
    const v = fn(key, old === null ? null : old.value);
    if (old !== null) {
      if (v !== null && v !== undefined) old.value = v;
      else this.remove(key);
    } else if (v !== null && v !== undefined) {
      bin.unshift({ hash, key, value: v });
      if (binCount >= 7) this.treeifyBin(); // Java: binCount >= TREEIFY_THRESHOLD - 1
      ++this.size_;
    }
    return v === undefined ? null : v;
  }

  // Java: HashMap#size()
  size() {
    return this.size_;
  }

  // Java: HashMap#entrySet() iteration as [key, value] pairs
  entrySet() {
    const out = [];
    if (this.table !== null) for (const bin of this.table) for (const n of bin) out.push([n.key, n.value]);
    return out;
  }

  // Java: HashMap#keySet() iteration
  keySet() {
    return this.entrySet().map((e) => e[0]);
  }

  // Java: HashMap#values() iteration
  values() {
    return this.entrySet().map((e) => e[1]);
  }
}
