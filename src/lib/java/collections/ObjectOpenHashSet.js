// it.unimi.dsi.fastutil.objects.ObjectOpenHashSet 8.5.14: open addressing, linear probing, iteration backwards over the table.
import { Objects } from '../Objects.js';
import { IllegalArgumentException } from '../errors.js';

const DEFAULT_INITIAL_SIZE = 16;
const DEFAULT_LOAD_FACTOR = 0.75;
const f32 = Math.fround;

// Java: HashCommon#nextPowerOfTwo(int)
function nextPowerOfTwo(x) {
  if (x === 0) return 1;
  let n = 1;
  while (n < x) n *= 2;
  return n;
}

// Java: HashCommon#mix(int)
function mix(x) {
  const h = Math.imul(x, 0x9E3779B9);
  return h ^ (h >>> 16);
}

// Java: HashCommon#arraySize(int,float)
function arraySize(expected, f) {
  const s = Math.max(2, nextPowerOfTwo(Math.ceil(f32(expected / f))));
  if (s > (1 << 30)) throw new IllegalArgumentException(`Too large (${expected} expected elements with load factor ${f})`);
  return s;
}

// Java: HashCommon#maxFill(int,float)
function maxFill(n, f) {
  return Math.min(Math.ceil(f32(n * f)), n - 1);
}

// Java: ObjectOpenHashSet
export class ObjectOpenHashSet {
  // Java: ObjectOpenHashSet#ObjectOpenHashSet(int,float)
  constructor(expected = DEFAULT_INITIAL_SIZE, f = DEFAULT_LOAD_FACTOR) {
    if (f <= 0 || f >= 1) throw new IllegalArgumentException('Load factor must be greater than 0 and smaller than 1');
    if (expected < 0) throw new IllegalArgumentException('The expected number of elements must be nonnegative');
    this.f = f;
    this.n = arraySize(expected, f);
    this.minN = this.n;
    this.mask = this.n - 1;
    this.maxFill = maxFill(this.n, f);
    this.key = new Array(this.n + 1).fill(null);
    this.containsNull = false;
    this.size_ = 0;
  }

  // Java: ObjectOpenHashSet#add(Object)
  add(k) {
    let pos;
    if (k === null || k === undefined) {
      if (this.containsNull) return false;
      pos = this.n;
      this.containsNull = true;
    } else {
      const key = this.key;
      let curr = key[pos = mix(Objects.hashCode(k)) & this.mask];
      if (curr !== null) {
        if (Objects.equals(curr, k)) return false;
        while ((curr = key[pos = (pos + 1) & this.mask]) !== null) if (Objects.equals(curr, k)) return false;
      }
      key[pos] = k;
    }
    if (this.size_++ >= this.maxFill) this.rehash(arraySize(this.size_ + 1, this.f));
    return true;
  }

  // Java: ObjectOpenHashSet#contains(Object)
  has(k) {
    if (k === null || k === undefined) return this.containsNull;
    const key = this.key;
    let curr;
    let pos;
    if ((curr = key[pos = mix(Objects.hashCode(k)) & this.mask]) === null) return false;
    if (Objects.equals(k, curr)) return true;
    while (true) {
      if ((curr = key[pos = (pos + 1) & this.mask]) === null) return false;
      if (Objects.equals(k, curr)) return true;
    }
  }

  // Java: ObjectOpenHashSet#size()
  get size() {
    return this.size_;
  }

  // Java: ObjectOpenHashSet#realSize()
  realSize() {
    return this.containsNull ? this.size_ - 1 : this.size_;
  }

  // Java: ObjectOpenHashSet#trim()
  trim() {
    return this.trimTo(this.size_);
  }

  // Java: ObjectOpenHashSet#trim(int)
  trimTo(n) {
    const l = nextPowerOfTwo(Math.ceil(f32(n / this.f)));
    if (l >= this.n || this.size_ > maxFill(l, this.f)) return true;
    this.rehash(l);
    return true;
  }

  // Java: ObjectOpenHashSet#rehash(int)
  rehash(newN) {
    const key = this.key;
    const mask = newN - 1;
    const newKey = new Array(newN + 1).fill(null);
    let i = this.n;
    let pos;
    for (let j = this.realSize(); j-- !== 0;) {
      while (key[--i] === null);
      if (newKey[pos = mix(Objects.hashCode(key[i])) & mask] !== null) while (newKey[pos = (pos + 1) & mask] !== null);
      newKey[pos] = key[i];
    }
    newKey[newN] = key[this.n];
    this.n = newN;
    this.mask = mask;
    this.maxFill = maxFill(newN, this.f);
    this.key = newKey;
  }

  // Java: ObjectOpenHashSet#iterator() (null first, then table positions downwards)
  * [Symbol.iterator]() {
    if (this.containsNull) yield this.key[this.n];
    for (let pos = this.n; --pos >= 0;) {
      if (this.key[pos] !== null) yield this.key[pos];
    }
  }
}
