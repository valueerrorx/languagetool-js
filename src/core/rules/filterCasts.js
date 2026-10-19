// Java cast of a rule to PatternRule in filter classes: ClassCastException text as in RuleFilter#getLanguageFromRuleMatch
import { ClassCastException } from '../../lib/java/errors.js';
import { PatternRule } from '../patterns/PatternRule.js';

// Java: (PatternRule) rule
export function castToPatternRule(rule) {
  if (rule !== null && rule !== undefined && !(rule instanceof PatternRule)) {
    throw new ClassCastException(`class ${rule.constructor.FQCN} cannot be cast to class org.languagetool.rules.patterns.PatternRule `
      + `(${rule.constructor.FQCN} and org.languagetool.rules.patterns.PatternRule are in unnamed module of loader 'app')`);
  }
  return rule;
}
