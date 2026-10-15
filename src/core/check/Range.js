// org.languagetool.Range (ignore range of a sentence with a detected other language)
import { Objects } from '../../lib/java/Objects.js';

export class Range {
  static FQCN = 'org.languagetool.Range';

  // Java: Range#Range(int,int,String)
  constructor(fromPos, toPos, lang) {
    this.fromPos = fromPos;
    this.toPos = toPos;
    this.lang = Objects.requireNonNull(lang);
  }

  // Java: Range#getFromPos()
  getFromPos() {
    return this.fromPos;
  }

  // Java: Range#getToPos()
  getToPos() {
    return this.toPos;
  }

  // Java: Range#getLang()
  getLang() {
    return this.lang;
  }

  // Java: Range#equals(Object)
  equals(o) {
    if (this === o) return true;
    if (o === null || o === undefined || this.constructor !== o.constructor) return false;
    return this.fromPos === o.fromPos && this.toPos === o.toPos && this.lang === o.lang;
  }

  // Java: Range#hashCode()
  hashCode() {
    return Objects.hash(this.fromPos, this.toPos, this.lang);
  }
}
