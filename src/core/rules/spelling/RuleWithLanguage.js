// org.languagetool.rules.spelling.RuleWithLanguage
import { Objects } from '../../../lib/java/Objects.js';

// Java: RuleWithLanguage
export class RuleWithLanguage {
  static FQCN = 'org.languagetool.rules.spelling.RuleWithLanguage';

  // Java: RuleWithLanguage(Rule,Language)
  constructor(rule, language) {
    this.rule = Objects.requireNonNull(rule);
    this.language = Objects.requireNonNull(language);
  }

  // Java: RuleWithLanguage#getLanguage()
  getLanguage() {
    return this.language;
  }

  // Java: RuleWithLanguage#getRule()
  getRule() {
    return this.rule;
  }

  // Java: RuleWithLanguage#equals(Object)
  equals(o) {
    if (this === o) return true;
    if (o === null || o === undefined || this.constructor !== o.constructor) return false;
    return Objects.equals(this.rule, o.rule) && Objects.equals(this.language, o.language);
  }

  // Java: RuleWithLanguage#hashCode()
  hashCode() {
    return Objects.hash(this.rule, this.language);
  }
}
