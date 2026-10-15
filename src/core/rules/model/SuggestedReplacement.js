// org.languagetool.rules.SuggestedReplacement
import { JavaEnum } from '../../../lib/java/JavaEnum.js';
import { Objects, valueOf } from '../../../lib/java/Objects.js';

// Java: SpellingCheckRule#HIGH_CONFIDENCE (float 0.99f; SpellingCheckRule itself is ported later)
const HIGH_CONFIDENCE = Math.fround(0.99);

// Java: SuggestedReplacement.SuggestionType
export class SuggestionType extends JavaEnum {
  static FQCN = 'org.languagetool.rules.SuggestedReplacement.SuggestionType';
}
SuggestionType.Default = new SuggestionType('Default', 0);
SuggestionType.Translation = new SuggestionType('Translation', 1);
SuggestionType.Curated = new SuggestionType('Curated', 2);

const EMPTY_FEATURES = Object.freeze(new Map()); // Java: Collections.emptySortedMap() (features: Map<String,float> in key order)

export class SuggestedReplacement {
  static FQCN = 'org.languagetool.rules.SuggestedReplacement';
  static SuggestionType = SuggestionType;

  // Java: SuggestedReplacement#SuggestedReplacement(String[,String[,String]]) / (SuggestedReplacement)
  constructor(replacement, shortDescription = null, suffix = null) {
    this.features = EMPTY_FEATURES;
    this.confidence = null; // Float
    this.type = SuggestionType.Default;
    this.weight = null; // Integer
    if (replacement instanceof SuggestedReplacement) {
      const repl = replacement;
      this.replacement = repl.replacement;
      this.suffix = repl.suffix;
      this.shortDescription = null;
      this.setShortDescription(repl.getShortDescription());
      this.setConfidence(repl.getConfidence());
      this.setFeatures(repl.getFeatures());
      this.setType(repl.getType());
      this.setWeight(repl.getWeight());
    } else {
      this.replacement = Objects.requireNonNull(replacement);
      this.shortDescription = shortDescription;
      this.suffix = suffix;
    }
  }

  // Java: SuggestedReplacement#getReplacement()
  getReplacement() {
    return this.replacement;
  }

  // Java: SuggestedReplacement#setReplacement(String)
  setReplacement(replacement) {
    this.replacement = Objects.requireNonNull(replacement);
  }

  // Java: SuggestedReplacement#getShortDescription()
  getShortDescription() {
    return this.shortDescription;
  }

  // Java: SuggestedReplacement#setShortDescription(String)
  setShortDescription(desc) {
    this.shortDescription = desc;
  }

  // Java: SuggestedReplacement#setType(SuggestionType)
  setType(type) {
    this.type = Objects.requireNonNull(type);
  }

  // Java: SuggestedReplacement#getType()
  getType() {
    return this.type;
  }

  // Java: SuggestedReplacement#getSuffix()
  getSuffix() {
    return this.suffix;
  }

  // Java: SuggestedReplacement#setSuffix(String)
  setSuffix(val) {
    this.suffix = val;
  }

  // Java: SuggestedReplacement#toString()
  toString() {
    return `${this.replacement}(${valueOf(this.shortDescription)})`;
  }

  // Java: SuggestedReplacement#equals(Object)
  equals(o) {
    if (this === o) return true;
    if (o === null || o === undefined || this.constructor !== o.constructor) return false;
    return this.replacement === o.replacement && Objects.equals(this.shortDescription, o.shortDescription);
  }

  // Java: SuggestedReplacement#hashCode()
  hashCode() {
    return Objects.hash(this.replacement, this.shortDescription);
  }

  // Java: SuggestedReplacement#getConfidence()
  getConfidence() {
    return this.confidence;
  }

  // Java: SuggestedReplacement#setConfidence(Float)
  setConfidence(confidence) {
    this.confidence = confidence === null || confidence === undefined ? null : Math.fround(confidence);
  }

  // Java: SuggestedReplacement#getFeatures() (unmodifiable view)
  getFeatures() {
    return this.features;
  }

  // Java: SuggestedReplacement#setFeatures(SortedMap)
  setFeatures(features) {
    this.features = features;
  }

  // Java: SuggestedReplacement#getWeight()
  getWeight() {
    return this.weight;
  }

  // Java: SuggestedReplacement#setWeight(Integer)
  setWeight(weight) {
    this.weight = weight;
  }

  // Java: SuggestedReplacement#convert(List)
  static convert(suggestions) {
    return suggestions.map((s) => new SuggestedReplacement(s));
  }

  // Java: SuggestedReplacement#topMatch(String[,String])
  static topMatch(word, shortDesc = null) {
    const sugg = new SuggestedReplacement(word, shortDesc);
    sugg.setConfidence(HIGH_CONFIDENCE);
    return [sugg];
  }
}
