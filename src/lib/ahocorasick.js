// com.hankcs.algorithm.AhoCorasickDoubleArrayTrie 1.2.2 (behavioural port: goto/fail automaton instead of the double array)

import { ArrayIndexOutOfBoundsException } from './java/errors.js';

// Java: AhoCorasickDoubleArrayTrie.Hit
export class Hit {
  // Java: Hit(int,int,V)
  constructor(begin, end, value) {
    this.begin = begin;
    this.end = end;
    this.value = value;
  }
}

// Java: AhoCorasickDoubleArrayTrie.Builder state (State)
class State {
  // Java: State(int)
  constructor(depth) {
    this.depth = depth;
    this.failure = null;
    this.emits = []; // Java: TreeSet<Integer> with reverseOrder (descending)
    this.success = new Map();
  }

  // Java: State#addEmit(int) / addEmit(Collection)
  addEmit(keywords) {
    for (const k of Array.isArray(keywords) ? keywords : [keywords]) {
      if (!this.emits.includes(k)) this.emits.push(k);
    }
    this.emits.sort((a, b) => b - a);
  }

  // Java: State#nextState(Character,boolean) with ignoreRootState=false
  nextState(c) {
    const s = this.success.get(c);
    if (s === undefined && this.depth === 0) return this;
    return s === undefined ? null : s;
  }
}

// Java: AhoCorasickDoubleArrayTrie
export class AhoCorasickDoubleArrayTrie {
  static FQCN = 'com.hankcs.algorithm.AhoCorasickDoubleArrayTrie';

  constructor() {
    this.root = null;
    this.output = [];
    this.v = [];
    this.l = [];
    this.keyIndex = new Map();
    this.states = new Map(); // key -> state (for get)
  }

  // Java: AhoCorasickDoubleArrayTrie#build(Map): entries = [key, value] pairs in the map's iteration order
  build(entries) {
    const pairs = [...entries];
    this.v = pairs.map((e) => e[1]);
    this.l = new Array(pairs.length);
    this.keyIndex = new Map();
    const root = new State(0);
    this.root = root;
    pairs.forEach(([keyword], index) => {
      let cur = root;
      for (let i = 0; i < keyword.length; i++) {
        const c = keyword.charAt(i);
        let nx = cur.success.get(c);
        if (nx === undefined) {
          nx = new State(cur.depth + 1);
          cur.success.set(c, nx);
        }
        cur = nx;
      }
      cur.addEmit(index);
      this.l[index] = keyword.length;
      this.keyIndex.set(keyword, index);
    });
    // Java: constructFailureStates()
    const queue = [];
    for (const s of root.success.values()) {
      s.failure = root;
      queue.push(s);
      if (s.emits.length > 0) s.output = s.emits.slice();
    }
    while (queue.length > 0) {
      const cur = queue.shift();
      for (const [transition, target] of cur.success) {
        queue.push(target);
        let trace = cur.failure;
        while (trace.nextState(transition) === null) trace = trace.failure;
        const newFailure = trace.nextState(transition);
        target.failure = newFailure;
        target.addEmit(newFailure.emits);
        if (target.emits.length > 0) target.output = target.emits.slice();
      }
    }
  }

  // Java: AhoCorasickDoubleArrayTrie#getState(int,char)
  getState(cur, c) {
    // empty map: base/check arrays have length 1, so the first transition reads check[c + 1] out of bounds
    if (this.v.length === 0) throw new ArrayIndexOutOfBoundsException(`Index ${c.charCodeAt(0) + 1} out of bounds for length 1`);
    let s = cur.nextState(c);
    while (s === null) {
      cur = cur.failure;
      s = cur.nextState(c);
    }
    return s;
  }

  // Java: AhoCorasickDoubleArrayTrie#parseText(String)
  parseText(text) {
    let position = 1;
    let cur = this.root;
    const collected = [];
    for (let i = 0; i < text.length; ++i) {
      cur = this.getState(cur, text.charAt(i));
      const hitArray = cur.output;
      if (hitArray !== undefined) {
        for (const hit of hitArray) collected.push(new Hit(position - this.l[hit], position, this.v[hit]));
      }
      ++position;
    }
    return collected;
  }

  // Java: AhoCorasickDoubleArrayTrie#matches(String)
  matches(text) {
    let cur = this.root;
    for (let i = 0; i < text.length; ++i) {
      cur = this.getState(cur, text.charAt(i));
      if (cur.output !== undefined) return true;
    }
    return false;
  }

  // Java: AhoCorasickDoubleArrayTrie#findFirst(String)
  findFirst(text) {
    let position = 1;
    let cur = this.root;
    for (let i = 0; i < text.length; ++i) {
      cur = this.getState(cur, text.charAt(i));
      const hitArray = cur.output;
      if (hitArray !== undefined) {
        const hit = hitArray[0];
        return new Hit(position - this.l[hit], position, this.v[hit]);
      }
      ++position;
    }
    return null;
  }

  // Java: AhoCorasickDoubleArrayTrie#get(String)
  get(key) {
    const index = this.keyIndex.get(key);
    return index === undefined || key.length === 0 ? null : this.v[index];
  }

  // Java: AhoCorasickDoubleArrayTrie#size()
  size() {
    return this.v.length;
  }
}
