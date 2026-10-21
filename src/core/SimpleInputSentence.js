// org.languagetool.SimpleInputSentence (cache key of analysed sentences)
import { Objects } from '../lib/java/Objects.js';

export class SimpleInputSentence {
  static FQCN = 'org.languagetool.SimpleInputSentence';

  // Java: SimpleInputSentence#SimpleInputSentence(String,Language)
  constructor(text, lang) {
    this.text = Objects.requireNonNull(text);
    this.lang = Objects.requireNonNull(lang);
  }

  // Java: SimpleInputSentence#getText()
  getText() {
    return this.text;
  }

  // Java: SimpleInputSentence#equals(Object)
  equals(o) {
    if (o === null || o === undefined) return false;
    if (o === this) return true;
    if (o.constructor !== this.constructor) return false;
    return Objects.equals(this.text, o.text) && Objects.equals(this.lang, o.lang);
  }

  // Java: SimpleInputSentence#hashCode()
  hashCode() {
    return Objects.hash(this.text, this.lang);
  }

  // Java: SimpleInputSentence#toString()
  toString() {
    return this.text;
  }
}
