// org.languagetool.rules.patterns.bitext.BitextPatternRule (source pattern rule + target pattern rule; matches only if both match)
import { RuleMatch } from '../rules/model/RuleMatch.js';
import { BitextRule } from './BitextRule.js';

// Java: BitextPatternRule
export class BitextPatternRule extends BitextRule {
  static FQCN = 'org.languagetool.rules.patterns.bitext.BitextPatternRule';

  // Java: BitextPatternRule#BitextPatternRule(AbstractPatternRule,AbstractPatternRule)
  constructor(src, trg) {
    super();
    this.srcRule = src;
    this.trgRule = trg;
  }

  // Java: BitextPatternRule#getSrcRule()
  getSrcRule() {
    return this.srcRule;
  }

  // Java: BitextPatternRule#getTrgRule()
  getTrgRule() {
    return this.trgRule;
  }

  // Java: BitextPatternRule#getDescription()
  getDescription() {
    return this.srcRule.getDescription();
  }

  // Java: BitextPatternRule#getMessage()
  getMessage() {
    return this.trgRule.getMessage();
  }

  // Java: BitextPatternRule#getId()
  getId() {
    return this.srcRule.getId();
  }

  // Java: BitextPatternRule#match(AnalyzedSentence) / match(AnalyzedSentence,AnalyzedSentence)
  match(sourceSentence, targetSentence) {
    if (targetSentence === undefined) return RuleMatch.EMPTY_ARRAY;
    if (this.srcRule.match(sourceSentence).length > 0) {
      return this.trgRule.match(targetSentence);
    }
    return RuleMatch.EMPTY_ARRAY;
  }
}
