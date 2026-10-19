// org.languagetool.rules.UnsyncStack (ArrayList based stack)
import { RuntimeException } from '../../lib/java/errors.js';
import { abstractCollectionToString } from '../../lib/java/toString.js';

// Java: java.util.EmptyStackException
export class EmptyStackException extends RuntimeException {
  static FQCN = 'java.util.EmptyStackException';
}

// Java: UnsyncStack
export class UnsyncStack {
  static FQCN = 'org.languagetool.rules.UnsyncStack';

  // Java: UnsyncStack#UnsyncStack()
  constructor() {
    this.list = [];
  }

  // Java: ArrayList#size()
  size() {
    return this.list.length;
  }

  // Java: ArrayList#get(int)
  get(index) {
    return this.list[index];
  }

  // Java: ArrayList#iterator()
  [Symbol.iterator]() {
    return this.list[Symbol.iterator]();
  }

  // Java: UnsyncStack#push(Object)
  push(item) {
    this.list.push(item);
    return item;
  }

  // Java: UnsyncStack#pop()
  pop() {
    const obj = this.peek();
    this.list.pop();
    return obj;
  }

  // Java: UnsyncStack#peek()
  peek() {
    const len = this.size();
    if (len === 0) {
      throw new EmptyStackException();
    }
    return this.get(len - 1);
  }

  // Java: UnsyncStack#empty()
  empty() {
    return this.size() === 0;
  }

  // Java: UnsyncStack#search(Object)
  search(o) {
    const i = this.list.lastIndexOf(o);
    if (i >= 0) {
      return this.size() - i;
    }
    return -1;
  }

  // Java: AbstractCollection#toString()
  toString() {
    return abstractCollectionToString(this.list);
  }
}
