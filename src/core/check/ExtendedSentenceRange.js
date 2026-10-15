// org.languagetool.ExtendedSentenceRange (sentence range with language confidence rates; output verified in F35, CORE-0084)
import { abstractMapToString, floatToString } from '../../lib/java/toString.js';

export class ExtendedSentenceRange {
  static FQCN = 'org.languagetool.ExtendedSentenceRange';

  // Java: ExtendedSentenceRange(int,int,String) / (int,int,Map)
  constructor(fromPos, toPos, languageCodeOrRates) {
    this.fromPos = fromPos;
    this.toPos = toPos;
    // LinkedHashMap<String,Float>; the String form is Collections.singletonMap(languageCode, 1.0f)
    this.languageConfidenceRates = typeof languageCodeOrRates === 'string'
      ? new Map([[languageCodeOrRates, 1.0]])
      : new Map(languageCodeOrRates);
  }

  // Java: ExtendedSentenceRange#getFromPos() (lombok @Getter)
  getFromPos() {
    return this.fromPos;
  }

  // Java: ExtendedSentenceRange#getToPos() (lombok @Getter)
  getToPos() {
    return this.toPos;
  }

  // Java: ExtendedSentenceRange#getLanguageConfidenceRates() (lombok @Getter)
  getLanguageConfidenceRates() {
    return this.languageConfidenceRates;
  }

  // Java: ExtendedSentenceRange#updateLanguageConfidenceRates(Map)
  updateLanguageConfidenceRates(languageConfidenceRates) {
    const copy = [...languageConfidenceRates];
    this.languageConfidenceRates.clear();
    for (const [k, v] of copy) this.languageConfidenceRates.set(k, v);
  }

  // Java: ExtendedSentenceRange#equals(Object)
  equals(o) {
    if (this === o) return true;
    if (o === null || o === undefined || this.constructor !== o.constructor) return false;
    return this.fromPos === o.fromPos && this.toPos === o.toPos;
  }

  // Java: ExtendedSentenceRange#hashCode()
  hashCode() {
    return (Math.imul(31, this.fromPos) + this.toPos) | 0;
  }

  // Java: ExtendedSentenceRange#toString()
  toString() {
    return `${this.fromPos}-${this.toPos}:${abstractMapToString(this.languageConfidenceRates, (v) => (typeof v === 'number' ? floatToString(v) : String(v)))}`;
  }

  // Java: ExtendedSentenceRange#compareTo(ExtendedSentenceRange)
  compareTo(o) {
    return this.fromPos < o.fromPos ? -1 : this.fromPos === o.fromPos ? 0 : 1;
  }
}
