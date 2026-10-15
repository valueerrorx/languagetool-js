// org.languagetool.rules.SameRuleGroupFilter (drops overlapping matches of the same rule group, keeps the first)

export class SameRuleGroupFilter {
  static FQCN = 'org.languagetool.rules.SameRuleGroupFilter';

  // Java: SameRuleGroupFilter#filter(List) (RuleMatchFilter#filter(List,AnnotatedText) delegates here); sorts the input in place
  filter(ruleMatches) {
    ruleMatches.sort((a, b) => a.compareTo(b)); // Java: Collections.sort (stable)
    const filteredRules = [];
    for (let i = 0; i < ruleMatches.length; i++) {
      const match = ruleMatches[i];
      while (i < ruleMatches.length - 1 && this.overlapAndMatch(match, ruleMatches[i + 1])) {
        i++; // skip next match
      }
      filteredRules.push(match);
    }
    return filteredRules;
  }

  // Java: SameRuleGroupFilter#overlapAndMatch(RuleMatch,RuleMatch)
  overlapAndMatch(match, nextMatch) {
    return this.overlaps(match, nextMatch) && this.haveSameRuleGroup(match, nextMatch);
  }

  // Java: SameRuleGroupFilter#overlaps(RuleMatch,RuleMatch)
  overlaps(match, nextMatch) {
    if (match.getFromPos() <= nextMatch.getToPos() && match.getToPos() >= nextMatch.getFromPos()) {
      return true;
    }
    return false;
  }

  // Java: SameRuleGroupFilter#haveSameRuleGroup(RuleMatch,RuleMatch)
  haveSameRuleGroup(match, nextMatch) {
    const id1 = match.getRule().getId();
    return id1 !== null && id1 === nextMatch.getRule().getId();
  }
}
