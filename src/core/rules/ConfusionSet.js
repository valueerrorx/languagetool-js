// org.languagetool.rules.ConfusionSet (factor is a Java long: BigInt)
import { IllegalArgumentException } from '../../lib/java/errors.js';
import { Objects } from '../../lib/java/Objects.js';
import { JavaHashSet } from '../../lib/java/collections/JavaHashSet.js';
import { ConfusionString } from './ConfusionString.js';
import { longHashCode } from './ConfusionPair.js';
import { uppercaseFirstChar } from '../text/StringTools.js';

// Java: ConfusionSet
export class ConfusionSet {
  static FQCN = 'org.languagetool.rules.ConfusionSet';

  // Java: ConfusionSet(long,List) / ConfusionSet(long,String...) (dispatch on the type of the first element)
  constructor(factor, ...words) {
    this.set = new JavaHashSet();
    if (factor < 1n) {
      throw new IllegalArgumentException('factor must be >= 1: ' + factor);
    }
    if (words.length === 1 && Array.isArray(words[0]) && (words[0].length === 0 || words[0][0] instanceof ConfusionString)) {
      this.factor = factor;
      this.set.addAll(Objects.requireNonNull(words[0]));
      return;
    }
    this.factor = factor;
    for (const word of words) {
      this.set.add(new ConfusionString(word, null));
    }
  }

  // Java: ConfusionSet#getFactor()
  getFactor() {
    return this.factor;
  }

  // Java: ConfusionSet#getSet()
  getSet() {
    return this.set;
  }

  // Java: ConfusionSet#getUppercaseFirstCharSet()
  getUppercaseFirstCharSet() {
    const result = new JavaHashSet();
    for (const s of this.set) {
      result.add(new ConfusionString(uppercaseFirstChar(s.getString()), s.getDescription()));
    }
    return result;
  }

  // Java: ConfusionSet#toString()
  toString() {
    return this.set.toString();
  }

  // Java: ConfusionSet#equals(Object)
  equals(o) {
    if (this === o) return true;
    if (o === null || o === undefined || this.constructor !== o.constructor) return false;
    return setEquals(this.set, o.set) && this.factor === o.factor;
  }

  // Java: ConfusionSet#hashCode()
  hashCode() {
    let h = 0; // Java: AbstractSet#hashCode() sums the element hashes
    for (const e of this.set) h = (h + e.hashCode()) | 0;
    return Objects.hash(h, longHashCode(this.factor));
  }
}

// Java: AbstractSet#equals(Object)
function setEquals(a, b) {
  if (a.size() !== b.size()) return false;
  for (const e of a) if (!b.contains(e)) return false;
  return true;
}
