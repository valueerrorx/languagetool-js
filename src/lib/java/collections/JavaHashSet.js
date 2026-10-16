// java.util.HashSet iteration order (backed by JavaHashMap: bucket order, insertion order within a bucket).
import { JavaHashMap } from './JavaHashMap.js';

const PRESENT = true;

// Java: java.util.HashSet
export class JavaHashSet {
  // Java: HashSet#HashSet() / HashSet(int) / HashSet(Collection); initial = undefined | int capacity | iterable
  constructor(initial = undefined) {
    if (initial !== undefined && initial !== null && typeof initial !== 'number') {
      const items = Array.isArray(initial) ? initial : [...initial];
      this.map = new JavaHashMap(Math.max(Math.trunc(Math.fround(items.length / Math.fround(0.75))) + 1, 16));
      this.addAll(items);
    } else {
      this.map = new JavaHashMap(typeof initial === 'number' ? initial : null);
    }
  }

  // Java: HashSet#add(Object)
  add(e) {
    return this.map.put(e, PRESENT) === null;
  }

  // Java: HashSet#addAll(Collection)
  addAll(items) {
    let modified = false;
    for (const e of items) if (this.add(e)) modified = true;
    return modified;
  }

  // Java: HashSet#remove(Object)
  remove(e) {
    return this.map.remove(e) !== null;
  }

  // Java: HashSet#contains(Object)
  contains(e) {
    return this.map.containsKey(e);
  }

  // Java: HashSet#size()
  size() {
    return this.map.size();
  }

  // Java: HashSet#isEmpty()
  isEmpty() {
    return this.map.size() === 0;
  }

  // Java: AbstractCollection#retainAll(Collection) with a Set argument (contains)
  retainAll(other) {
    let modified = false;
    for (const e of this.map.keySet()) {
      if (!other.contains(e)) {
        this.remove(e);
        modified = true;
      }
    }
    return modified;
  }

  // Java: HashSet#iterator()
  [Symbol.iterator]() {
    return this.map.keySet()[Symbol.iterator]();
  }

  // Java: AbstractCollection#toString()
  toString() {
    return `[${[...this].join(', ')}]`;
  }
}
