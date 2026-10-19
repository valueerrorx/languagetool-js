// org.languagetool.rules.spelling.symspell.implementation.SuggestItem (MIT, Hampus Londogard)
import { Long } from '../../../../../lib/java/long.js';

// Java: SuggestItem; count is a Java long (BigInt)
export class SuggestItem {
  static FQCN = 'org.languagetool.rules.spelling.symspell.implementation.SuggestItem';

  // Java: SuggestItem(String,int,long)
  constructor(term, distance, count) {
    this.term = term;
    this.distance = distance;
    this.count = count;
  }

  // Java: SuggestItem#compare(SuggestItem,SuggestItem)
  compare(suggestItem, t1) {
    return suggestItem.compareTo(t1);
  }

  // Java: SuggestItem#equals(Object)
  equals(obj) {
    return obj instanceof SuggestItem && this.term === obj.term;
  }

  // Java: SuggestItem#hashCode()
  hashCode() {
    let h = 0;
    for (let i = 0; i < this.term.length; i++) h = (Math.imul(31, h) + this.term.charCodeAt(i)) | 0;
    return h;
  }

  // Java: SuggestItem#toString()
  toString() {
    return `{${this.term}, ${this.distance}, ${this.count}}`;
  }

  // Java: SuggestItem#compareTo(SuggestItem)
  compareTo(other) {
    // order by distance ascending, then by frequency count descending
    if (this.distance === other.distance) return Long.compare(other.count, this.count);
    return this.distance < other.distance ? -1 : this.distance === other.distance ? 0 : 1;
  }

  // Java: SuggestItem#clone()
  clone() {
    return new SuggestItem(this.term, this.distance, this.count);
  }
}
