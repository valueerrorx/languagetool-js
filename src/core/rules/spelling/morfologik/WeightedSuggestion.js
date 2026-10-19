// Java: org.languagetool.rules.spelling.morfologik.WeightedSuggestion
import { Objects } from '../../../../lib/java/Objects.js';

// Java: WeightedSuggestion
export class WeightedSuggestion {
  static FQCN = 'org.languagetool.rules.spelling.morfologik.WeightedSuggestion';

  // Java: WeightedSuggestion#WeightedSuggestion(String,int)
  constructor(word, weight) {
    this.word = Objects.requireNonNull(word);
    this.weight = weight;
  }

  // Java: WeightedSuggestion#getWord()
  getWord() {
    return this.word;
  }

  // Java: WeightedSuggestion#getWeight()
  getWeight() {
    return this.weight;
  }

  // Java: WeightedSuggestion#compareTo(WeightedSuggestion) (Integer.compare)
  compareTo(o) {
    const a = this.weight;
    const b = o.getWeight();
    return a < b ? -1 : (a === b ? 0 : 1);
  }

  // Java: WeightedSuggestion#toString()
  toString() {
    return `${this.word}/${this.weight}`;
  }
}
