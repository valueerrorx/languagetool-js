// org.languagetool.rules.RuleWithMaxFilter (keeps the longest of overlapping matches of the same pattern rule)
import { AbstractPatternRule } from '../patterns/AbstractPatternRule.js';

// Java: RuleWithMaxFilter
export class RuleWithMaxFilter {
  static FQCN = 'org.languagetool.rules.RuleWithMaxFilter';

  // Java: RuleWithMaxFilter#filter(List); sorts the input in place
  filter(ruleMatches) {
    ruleMatches.sort((a, b) => a.compareTo(b)); // Java: Collections.sort (stable)
    const filteredRules = [];
    for (let i = 0; i < ruleMatches.length; i++) {
      const match = ruleMatches[i];
      if (i < ruleMatches.length - 1) {
        let nextMatch = ruleMatches[i + 1];
        while (this.includes(match, nextMatch) && this.haveSameRule(match, nextMatch)
            && i < ruleMatches.length) {
          i++; // skip next match
          if (i < ruleMatches.length - 1) {
            nextMatch = ruleMatches[i + 1];
          }
        }
      }
      filteredRules.push(match);
    }
    return filteredRules;
  }

  // Java: RuleWithMaxFilter#includes(RuleMatch,RuleMatch)
  includes(match, nextMatch) {
    if (match.getFromPos() <= nextMatch.getFromPos() && match.getToPos() >= nextMatch.getToPos()) {
      return true;
    }
    return false;
  }

  // Java: RuleWithMaxFilter#haveSameRule(RuleMatch,RuleMatch)
  haveSameRule(match, nextMatch) {
    if (!(match.getRule() instanceof AbstractPatternRule) || !(nextMatch.getRule() instanceof AbstractPatternRule)) {
      return false;
    }
    const id1 = match.getRule().getId();
    const subId1 = match.getRule().getSubId();
    const subId2 = nextMatch.getRule().getSubId();
    if (subId1 === null && subId2 !== null) {
      return false;
    }
    if (subId1 !== null && subId2 === null) {
      return false;
    }
    return id1 !== null && id1 === nextMatch.getRule().getId()
      && (subId1 === null && subId2 === null || subId1 !== null && subId1 === subId2);
  }
}
