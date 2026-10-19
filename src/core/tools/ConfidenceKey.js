// Java: org.languagetool.tools.ConfidenceKey
import { Objects } from '../../lib/java/Objects.js';

// Java: ConfidenceKey
export class ConfidenceKey {
  static FQCN = 'org.languagetool.tools.ConfidenceKey';

  // Java: ConfidenceKey#ConfidenceKey(Language,String)
  constructor(lang, ruleId) {
    this.lang = Objects.requireNonNull(lang);
    this.ruleId = Objects.requireNonNull(ruleId);
  }

  // Java: ConfidenceKey#equals(Object)
  equals(o) {
    if (this === o) return true;
    if (o === null || o === undefined || this.constructor !== o.constructor) return false;
    return Objects.equals(this.lang, o.lang) && Objects.equals(this.ruleId, o.ruleId);
  }

  // Java: ConfidenceKey#hashCode()
  hashCode() {
    return Objects.hash(this.lang, this.ruleId);
  }

  // Java: ConfidenceKey#toString()
  toString() {
    return `${this.lang.getShortCodeWithCountryAndVariant()}/${this.ruleId}`;
  }
}
