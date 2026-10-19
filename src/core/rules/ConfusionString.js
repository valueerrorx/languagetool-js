// org.languagetool.rules.ConfusionString
import { Objects } from '../../lib/java/Objects.js';

// Java: ConfusionString
export class ConfusionString {
  static FQCN = 'org.languagetool.rules.ConfusionString';

  // Java: ConfusionString(String,String)
  constructor(str, description) {
    this.str = Objects.requireNonNull(str);
    this.description = description ?? null;
  }

  // Java: ConfusionString#getString()
  getString() {
    return this.str;
  }

  // Java: ConfusionString#getDescription()
  getDescription() {
    return this.description;
  }

  // Java: ConfusionString#toString()
  toString() {
    return this.str;
  }

  // Java: ConfusionString#equals(Object)
  equals(o) {
    if (this === o) return true;
    if (o === null || o === undefined || this.constructor !== o.constructor) return false;
    return Objects.equals(this.str, o.str) && Objects.equals(this.description, o.description);
  }

  // Java: ConfusionString#hashCode()
  hashCode() {
    return Objects.hash(this.str, this.description);
  }
}
