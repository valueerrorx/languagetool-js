// Small data types without own behaviour (CORE-0352); interfaces (LineExpander, RuleMatcher, Tagger, BitextReader, PatternRuleTransformer) need no JS counterpart.
import { JavaEnum } from '../../lib/java/JavaEnum.js';
import { Objects } from '../../lib/java/Objects.js';

// Java: org.languagetool.rules.SuggestionWithMessage
export class SuggestionWithMessage {
  static FQCN = 'org.languagetool.rules.SuggestionWithMessage';

  // Java: SuggestionWithMessage#SuggestionWithMessage(String) / (String,String)
  constructor(suggestion, message = null) {
    this.suggestion = Objects.requireNonNull(suggestion);
    this.message = message;
  }

  // Java: SuggestionWithMessage#getSuggestion()
  getSuggestion() {
    return this.suggestion;
  }

  // Java: SuggestionWithMessage#getMessage()
  getMessage() {
    return this.message;
  }
}

// Java: org.languagetool.rules.MatchPosition
export class MatchPosition {
  static FQCN = 'org.languagetool.rules.MatchPosition';

  // Java: MatchPosition#MatchPosition(int,int)
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }

  // Java: MatchPosition#getStart()
  getStart() {
    return this.start;
  }

  // Java: MatchPosition#getEnd()
  getEnd() {
    return this.end;
  }

  // Java: MatchPosition#toString()
  toString() {
    return `${this.start}-${this.end}`;
  }

  // Java: MatchPosition#equals(Object)
  equals(o) {
    if (this === o) return true;
    if (o === null || o === undefined || o.constructor !== this.constructor) return false;
    return Objects.equals(this.start, o.start) && Objects.equals(this.end, o.end);
  }

  // Java: MatchPosition#hashCode()
  hashCode() {
    return Objects.hash(this.start, this.end);
  }
}

// Java: org.languagetool.rules.patterns.EquivalenceTypeLocator
export class EquivalenceTypeLocator {
  static FQCN = 'org.languagetool.rules.patterns.EquivalenceTypeLocator';

  // Java: EquivalenceTypeLocator#EquivalenceTypeLocator(String,String)
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
    return Objects.equals(this.feature, o.feature)
        && Objects.equals(this.type, o.type);
  }
}

// Java: org.languagetool.rules.patterns.PatternRuleTransformer.TransformedRules
export class TransformedRules {
  static FQCN = 'org.languagetool.rules.patterns.PatternRuleTransformer.TransformedRules';

  // Java: TransformedRules#TransformedRules(List,List)
  constructor(remainingRules, transformedRules) {
    this.remainingRules = Object.freeze(remainingRules.slice());
    this.transformedRules = Object.freeze(transformedRules.slice());
  }

  // Java: TransformedRules#getRemainingRules()
  getRemainingRules() {
    return this.remainingRules;
  }

  // Java: TransformedRules#getTransformedRules()
  getTransformedRules() {
    return this.transformedRules;
  }
}

// Java: org.languagetool.tagging.disambiguation.rules.DisambiguatedExample
export class DisambiguatedExample {
  static FQCN = 'org.languagetool.tagging.disambiguation.rules.DisambiguatedExample';

  // Java: DisambiguatedExample#DisambiguatedExample(String) / (String,String,String)
  constructor(example, input = null, output = null) {
    this.example = example;
    this.input = input;
    this.output = output;
  }

  // Java: DisambiguatedExample#getExample()
  getExample() {
    return this.example;
  }

  // Java: DisambiguatedExample#getAmbiguous()
  getAmbiguous() {
    return this.input;
  }

  // Java: DisambiguatedExample#getDisambiguated()
  getDisambiguated() {
    return this.output;
  }

  // Java: DisambiguatedExample#toString()
  toString() {
    return `${this.example}: ${this.input} -> ${this.output}`;
  }
}

// Java: org.languagetool.LanguageMaintainedState
export class LanguageMaintainedState extends JavaEnum {
  static FQCN = 'org.languagetool.LanguageMaintainedState';
}
LanguageMaintainedState.ActivelyMaintained = new LanguageMaintainedState('ActivelyMaintained', 0);
LanguageMaintainedState.LookingForNewMaintainer = new LanguageMaintainedState('LookingForNewMaintainer', 1);
