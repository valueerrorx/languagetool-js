// org.languagetool.rules.patterns.EquivalenceTypeLocator (key of the unifier equivalence map)
import { Objects } from '../../lib/java/Objects.js';

// Java: EquivalenceTypeLocator
export class EquivalenceTypeLocator {
  static FQCN = 'org.languagetool.rules.patterns.EquivalenceTypeLocator';

  // Java: EquivalenceTypeLocator(String,String)
  constructor(feature, type) {
    this.feature = feature;
    this.type = type;
  }

  // Java: EquivalenceTypeLocator#hashCode()
  hashCode() {
    return Objects.hash(this.feature, this.type);
  }

  // Java: EquivalenceTypeLocator#equals(Object)
  equals(o) {
    if (this === o) { return true; }
    if (o === null || o === undefined) { return false; }
    if (this.constructor !== o.constructor) {
      return false;
    }
    return Objects.equals(this.feature, o.feature) && Objects.equals(this.type, o.type);
  }
}
