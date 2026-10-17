// java.util.concurrent.ConcurrentHashMap (JDK 17) single-threaded: null rejection and iteration order (put/transfer/tryPresize); tree bins (table >= 64) not modelled.
import { Objects } from '../Objects.js';
import { NullPointerException } from '../errors.js';

const MAXIMUM_CAPACITY = 1 << 30;
const TREEIFY_THRESHOLD = 8;
const MIN_TREEIFY_CAPACITY = 64;

// Java: ConcurrentHashMap#spread(int)
function spread(h) {
  return (h ^ (h >>> 16)) & 0x7fffffff;
}

// Java: ConcurrentHashMap#tableSizeFor(int)
function tableSizeFor(c) {
  let n = 1;
  while (n < c) n *= 2;
  return n >= MAXIMUM_CAPACITY ? MAXIMUM_CAPACITY : n;
}

// Java: java.util.concurrent.ConcurrentHashMap
export class JavaConcurrentHashMap {
  // Java: ConcurrentHashMap#ConcurrentHashMap()
  constructor() {
    this.table = null;
    this.sizeCtl = 0;
    this.count = 0;
  }

  // Java: ConcurrentHashMap#initTable()
  initTable() {
    const n = this.sizeCtl > 0 ? this.sizeCtl : 16;
    this.table = new Array(n).fill(null);
    this.sizeCtl = n - (n >>> 2);
  }

  // Java: ConcurrentHashMap#get(Object)
  get(key) {
    if (key === null || key === undefined) throw new NullPointerException('Cannot invoke "Object.hashCode()" because "key" is null');
    const h = spread(Objects.hashCode(key));
    const tab = this.table;
    if (tab !== null) {
      for (let e = tab[(tab.length - 1) & h]; e !== null && e !== undefined; e = e.next) {
        if (e.hash === h && Objects.equals(e.key, key)) return e.val;
      }
    }
    return null;
  }

  // Java: ConcurrentHashMap#containsKey(Object)
  containsKey(key) {
    return this.get(key) !== null;
  }

  // Java: ConcurrentHashMap#put(Object,Object) -> putVal
  put(key, value) {
    if (key === null || key === undefined || value === null || value === undefined) throw new NullPointerException();
    const hash = spread(Objects.hashCode(key));
    let binCount = 0;
    for (;;) {
      if (this.table === null || this.table.length === 0) {
        this.initTable();
        continue;
      }
      const tab = this.table;
      const n = tab.length;
      const i = (n - 1) & hash;
      const f = tab[i];
      if (f === null) {
        tab[i] = { hash, key, val: value, next: null };
        break;
      }
      let oldVal = null;
      if (f.hash === -1) throw new Error('ConcurrentHashMap: forwarding node'); // unreachable single-threaded
      binCount = 1;
      for (let e = f; ; ++binCount) {
        if (e.hash === hash && Objects.equals(e.key, key)) {
          oldVal = e.val;
          e.val = value;
          break;
        }
        const pred = e;
        e = e.next;
        if (e === null) {
          pred.next = { hash, key, val: value, next: null };
          break;
        }
      }
      if (binCount !== 0) {
        if (binCount >= TREEIFY_THRESHOLD) this.treeifyBin(tab, i);
        if (oldVal !== null) return oldVal;
        break;
      }
    }
    this.addCount(binCount);
    return null;
  }

  // Java: ConcurrentHashMap#treeifyBin(Node[],int)
  treeifyBin(tab) {
    const n = tab.length;
    if (n < MIN_TREEIFY_CAPACITY) this.tryPresize(n << 1);
    else throw new Error('ConcurrentHashMap: tree bins not modelled');
  }

  // Java: ConcurrentHashMap#tryPresize(int)
  tryPresize(size) {
    const c = tableSizeFor(size + (size >>> 1) + 1);
    let sc;
    while ((sc = this.sizeCtl) >= 0) {
      const tab = this.table;
      let n;
      if (tab === null || (n = tab.length) === 0) {
        n = sc > c ? sc : c;
        this.table = new Array(n).fill(null);
        this.sizeCtl = n - (n >>> 2);
      } else if (c <= sc || n >= MAXIMUM_CAPACITY) {
        break;
      } else {
        this.transfer(tab);
      }
    }
  }

  // Java: ConcurrentHashMap#addCount(long,int)
  addCount(check) {
    let s = ++this.count;
    if (check >= 0) {
      while (s >= this.sizeCtl && this.table !== null && this.table.length < MAXIMUM_CAPACITY) {
        this.transfer(this.table);
        s = this.count;
      }
    }
  }

  // Java: ConcurrentHashMap#transfer(Node[],Node[]) (single thread, linked bins)
  transfer(tab) {
    const n = tab.length;
    const nextTab = new Array(n << 1).fill(null);
    for (let i = n - 1; i >= 0; i--) {
      const f = tab[i];
      if (f === null) continue;
      let runBit = f.hash & n;
      let lastRun = f;
      for (let p = f.next; p !== null; p = p.next) {
        const b = p.hash & n;
        if (b !== runBit) {
          runBit = b;
          lastRun = p;
        }
      }
      let ln;
      let hn;
      if (runBit === 0) {
        ln = lastRun;
        hn = null;
      } else {
        hn = lastRun;
        ln = null;
      }
      for (let p = f; p !== lastRun; p = p.next) {
        const ph = p.hash;
        if ((ph & n) === 0) ln = { hash: ph, key: p.key, val: p.val, next: ln };
        else hn = { hash: ph, key: p.key, val: p.val, next: hn };
      }
      nextTab[i] = ln;
      nextTab[i + n] = hn;
    }
    this.table = nextTab;
    this.sizeCtl = (n << 1) - (n >>> 1);
  }

  // Java: ConcurrentHashMap#size()
  size() {
    return this.count;
  }

  // Java: ConcurrentHashMap#entrySet() iteration as [key, value] pairs
  entrySet() {
    const out = [];
    if (this.table !== null) for (let b of this.table) for (; b !== null; b = b.next) out.push([b.key, b.val]);
    return out;
  }

  // Java: ConcurrentHashMap#keySet() iteration
  keySet() {
    return this.entrySet().map((e) => e[0]);
  }

  // Java: ConcurrentHashMap#values() iteration
  values() {
    return this.entrySet().map((e) => e[1]);
  }
}
