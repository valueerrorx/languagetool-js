// java.util.PriorityQueue (natural ordering via compareTo): binary heap with identical sift order, so equal elements leave in Java's order.
import { NoSuchElementException } from '../errors.js';

// Java: java.util.PriorityQueue
export class PriorityQueue {
  static FQCN = 'java.util.PriorityQueue';

  // Java: PriorityQueue#PriorityQueue(int) (capacity does not influence the order)
  constructor() {
    this.queue = [];
    this.size_ = 0;
  }

  // Java: PriorityQueue#size()
  size() {
    return this.size_;
  }

  // Java: AbstractQueue#add(Object) / PriorityQueue#offer(Object)
  add(e) {
    const i = this.size_;
    this.size_ = i + 1;
    if (i === 0) this.queue[0] = e;
    else this.siftUp(i, e);
    return true;
  }

  // Java: PriorityQueue#poll()
  poll() {
    if (this.size_ === 0) return null;
    const queue = this.queue;
    const result = queue[0];
    const n = --this.size_;
    const x = queue[n];
    queue[n] = null;
    if (n > 0) this.siftDown(0, x);
    return result;
  }

  // Java: AbstractQueue#remove()
  remove() {
    const x = this.poll();
    if (x !== null) return x;
    throw new NoSuchElementException();
  }

  // Java: PriorityQueue#clear()
  clear() {
    this.queue = [];
    this.size_ = 0;
  }

  // Java: PriorityQueue#siftUpComparable(int,Object,Object[])
  siftUp(k, x) {
    const queue = this.queue;
    while (k > 0) {
      const parent = (k - 1) >>> 1;
      const e = queue[parent];
      if (x.compareTo(e) >= 0) break;
      queue[k] = e;
      k = parent;
    }
    queue[k] = x;
  }

  // Java: PriorityQueue#siftDownComparable(int,Object,Object[],int)
  siftDown(k, x) {
    const queue = this.queue;
    const n = this.size_;
    const half = n >>> 1;
    while (k < half) {
      let child = (k << 1) + 1;
      let c = queue[child];
      const right = child + 1;
      if (right < n && c.compareTo(queue[right]) > 0) c = queue[(child = right)];
      if (x.compareTo(c) <= 0) break;
      queue[k] = c;
      k = child;
    }
    queue[k] = x;
  }
}
