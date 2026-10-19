// Java: org.languagetool.rules.translation.TranslationEntry
import { listHashCode } from '../../../lib/java/hash.js';
import { Objects } from '../../../lib/java/Objects.js';
import { abstractCollectionToString } from '../../../lib/java/toString.js';

// Java: List#equals(Object) for lists of strings
function listEquals(a, b) {
  return a.length === b.length && a.every((x, i) => Objects.equals(x, b[i]));
}

// Java: TranslationEntry
export class TranslationEntry {
  static FQCN = 'org.languagetool.rules.translation.TranslationEntry';

  // Java: TranslationEntry#TranslationEntry(List,List,int)
  constructor(l1, l2, itemCount) {
    this.l1 = Objects.requireNonNull(l1);
    this.l2 = Objects.requireNonNull(l2);
    this.itemCount = itemCount;
  }

  // Java: TranslationEntry#getItemCount()
  getItemCount() {
    return this.itemCount;
  }

  // Java: TranslationEntry#getL1()
  getL1() {
    return this.l1;
  }

  // Java: TranslationEntry#getL2()
  getL2() {
    return this.l2;
  }

  // Java: TranslationEntry#toString()
  toString() {
    return `${abstractCollectionToString(this.l1)} -> ${abstractCollectionToString(this.l2)}`;
  }

  // Java: TranslationEntry#equals(Object)
  equals(o) {
    if (this === o) return true;
    if (o === null || o === undefined || this.constructor !== o.constructor) return false;
    return listEquals(this.l1, o.l1) && listEquals(this.l2, o.l2);
  }

  // Java: TranslationEntry#hashCode()
  hashCode() {
    return (Math.imul(31, (31 + listHashCode(this.l1)) | 0) + listHashCode(this.l2)) | 0;
  }
}
