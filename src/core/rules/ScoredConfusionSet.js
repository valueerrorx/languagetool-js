// org.languagetool.rules.ScoredConfusionSet (score is a Java float)
import { IllegalArgumentException } from '../../lib/java/errors.js';
import { Objects } from '../../lib/java/Objects.js';
import { floatToString } from '../../lib/java/toString.js';
import { Float } from '../../lib/java/float.js';

// Java: ScoredConfusionSet
export class ScoredConfusionSet {
  static FQCN = 'org.languagetool.rules.ScoredConfusionSet';

  // Java: ScoredConfusionSet(float,List)
  constructor(score, words) {
    score = Math.fround(score);
    if (score <= 0) {
      throw new IllegalArgumentException('factor must be > 0: ' + floatToString(score));
    }
    this.score = score;
    this.confusionWords = words;
  }

  // Java: ScoredConfusionSet#getScore()
  getScore() {
    return this.score;
  }

  // Java: ScoredConfusionSet#getConfusionTokens()
  getConfusionTokens() {
    return this.confusionWords.map((w) => w.getString());
  }

  // Java: ScoredConfusionSet#getTokenDescriptions() (Optional<String> as string or null)
  getTokenDescriptions() {
    return this.confusionWords.map((w) => w.getDescription());
  }

  // Java: ScoredConfusionSet#toString()
  toString() {
    return `[${this.confusionWords.map((w) => w.toString()).join(', ')}]`;
  }

  // Java: ScoredConfusionSet#equals(Object)
  equals(o) {
    if (this === o) return true;
    if (o === null || o === undefined || this.constructor !== o.constructor) return false;
    return this.confusionWords.length === o.confusionWords.length
      && this.confusionWords.every((w, i) => Objects.equals(w, o.confusionWords[i])) && this.score === o.score;
  }

  // Java: ScoredConfusionSet#hashCode()
  hashCode() {
    let h = 1; // Java: List#hashCode()
    for (const w of this.confusionWords) h = (Math.imul(31, h) + w.hashCode()) | 0;
    return Objects.hash(h, Float.hashCode(this.score));
  }
}
