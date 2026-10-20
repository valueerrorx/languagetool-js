// java.util.TreeSet: sorted set with a Comparator (sorted array, binary search); first inserted element of equal ones wins
import { NullPointerException } from '../errors.js';

// Java: TreeSet<E>
export class TreeSet {
  static FQCN = 'java.util.TreeSet';

  // Java: TreeSet#TreeSet(Comparator)
  constructor(comparator) {
    this.comparator = comparator;
    this.items = [];
  }

  // index of the element equal to e (>= 0) or -(insertion point) - 1, like Arrays#binarySearch
  search(e) {
    let low = 0;
    let high = this.items.length - 1;
    while (low <= high) {
      const mid = (low + high) >>> 1;
      const cmp = this.comparator(this.items[mid], e);
      if (cmp < 0) low = mid + 1;
      else if (cmp > 0) high = mid - 1;
      else return mid;
    }
    return -(low + 1);
  }

  // Java: TreeSet#add(Object)
  add(e) {
    if (e === null || e === undefined) throw new NullPointerException();
    const i = this.search(e);
    if (i >= 0) return false;
    this.items.splice(-(i + 1), 0, e);
    return true;
  }

  // Java: TreeSet#contains(Object)
  contains(e) {
    if (e === null || e === undefined) throw new NullPointerException();
    return this.search(e) >= 0;
  }

  // Java: TreeSet#size()
  size() {
    return this.items.length;
  }

  // Java: TreeSet#toArray()
  toArray() {
    return [...this.items];
  }

  // Java: Iterable#iterator() as JS iteration protocol
  [Symbol.iterator]() {
    return this.items[Symbol.iterator]();
  }
}
