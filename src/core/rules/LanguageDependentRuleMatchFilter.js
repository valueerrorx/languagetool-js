// Java: org.languagetool.rules.LanguageDependentRuleMatchFilter

// Java: LanguageDependentRuleMatchFilter
export class LanguageDependentRuleMatchFilter {
  static FQCN = 'org.languagetool.rules.LanguageDependentRuleMatchFilter';

  // Java: LanguageDependentRuleMatchFilter#LanguageDependentRuleMatchFilter(Language,RuleSet)
  constructor(language, rules) {
    this.language = language;
    this.enabledRules = rules.allRuleIds();
  }

  // Java: LanguageDependentRuleMatchFilter#filter(List,AnnotatedText)
  filter(ruleMatches, text) {
    return this.language.filterRuleMatches(ruleMatches, text, this.enabledRules);
  }
}
