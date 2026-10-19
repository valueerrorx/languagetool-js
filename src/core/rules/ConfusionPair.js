// org.languagetool.rules.ConfusionPair (factor is a Java long: BigInt)
import { IllegalArgumentException } from '../../lib/java/errors.js';
import { Objects } from '../../lib/java/Objects.js';
import { ConfusionString } from './ConfusionString.js';
import { uppercaseFirstChar } from '../text/StringTools.js';

// Java: Long#hashCode(long)
export function longHashCode(v) {
  const u = BigInt.asUintN(64, v);
  return Number(BigInt.asIntN(32, u ^ (u >> 32n)));
}

// Java: ConfusionPair
export class ConfusionPair {
  static FQCN = 'org.languagetool.rules.ConfusionPair';

  // Java: ConfusionPair(ConfusionString,ConfusionString,long,boolean) / ConfusionPair(String,String,Long,boolean) (dispatch on the first argument)
  constructor(a, b, factor, bidirectional) {
    if (typeof a === 'string') {
      this.term1 = new ConfusionString(a, null);
      this.term2 = new ConfusionString(b, null);
    } else {
      this.term1 = Objects.requireNonNull(a);
      this.term2 = Objects.requireNonNull(b);
    }
    if (factor < 1n) {
      throw new IllegalArgumentException('factor must be >= 1: ' + factor);
    }
    this.factor = factor;
    this.bidirectional = bidirectional;
  }

  // Java: ConfusionPair#getFactor()
  getFactor() {
    return this.factor;
  }

  // Java: ConfusionPair#isBidirectional()
  isBidirectional() {
    return this.bidirectional;
  }

  // Java: ConfusionPair#getTerm1()
  getTerm1() {
    return this.term1;
  }

  // Java: ConfusionPair#getTerm2()
  getTerm2() {
    return this.term2;
  }

  // Java: ConfusionPair#getTerms()
  getTerms() {
    return Object.freeze([this.term1, this.term2]);
  }

  // Java: ConfusionPair#getUppercaseFirstCharTerms()
  getUppercaseFirstCharTerms() {
    return Object.freeze([
      new ConfusionString(uppercaseFirstChar(this.term1.getString()), this.term1.getDescription()),
      new ConfusionString(uppercaseFirstChar(this.term2.getString()), this.term2.getDescription()),
    ]);
  }

  // Java: ConfusionPair#toString()
  toString() {
    return this.term1.toString() + (this.bidirectional ? '; ' : ' -> ') + this.term2.toString();
  }

  // Java: ConfusionPair#equals(Object)
  equals(o) {
    if (this === o) return true;
    if (o === null || o === undefined || this.constructor !== o.constructor) return false;
    return this.factor === o.factor && this.bidirectional === o.bidirectional
      && this.term1.equals(o.term1) && this.term2.equals(o.term2);
  }

  // Java: ConfusionPair#hashCode()
  hashCode() {
    return Objects.hash(this.term1, this.term2, longHashCode(this.factor), this.bidirectional);
  }
}
