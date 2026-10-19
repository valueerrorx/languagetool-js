// Java: org.languagetool.rules.FakeRule
import { Rule } from './model/Rule.js';
import { RuleMatch } from './model/RuleMatch.js';

// Java: FakeRule
export class FakeRule extends Rule {
  static FQCN = 'org.languagetool.rules.FakeRule';

  // Java: FakeRule#FakeRule() / FakeRule(String) / FakeRule(String,Tag)
  constructor(id, tag) {
    super();
    this.ruleId = 'FAKE-RULE';
    if (id !== undefined) {
      this.ruleId = id;
    }
    if (tag !== undefined) {
      this.setTags([tag]);
    }
  }

  // Java: FakeRule#getId()
  getId() {
    return this.ruleId;
  }

  // Java: FakeRule#getDescription()
  getDescription() {
    return '<none>';
  }

  // Java: FakeRule#match(AnalyzedSentence)
  match() {
    return RuleMatch.EMPTY_ARRAY;
  }
}
