// org.languagetool.rules.patterns.PatternRuleTransformer (interface) and its nested TransformedRules
import { unmodifiableList } from '../../lib/java/collections/Collections.js';

// Java: PatternRuleTransformer.TransformedRules
export class TransformedRules {
  static FQCN = 'org.languagetool.rules.patterns.PatternRuleTransformer$TransformedRules';

  // Java: TransformedRules(List,List)
  constructor(remainingRules, transformedRules) {
    this.remainingRules = unmodifiableList(remainingRules);
    this.transformedRules = unmodifiableList(transformedRules);
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
