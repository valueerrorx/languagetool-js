// Shared FakeRule for the German filter tests (Java: org.languagetool.rules.FakeRule)
import { Rule } from '../../../../src/core/rules/model/Rule.js';
import { RuleMatch } from '../../../../src/core/rules/model/RuleMatch.js';

// Java: org.languagetool.rules.FakeRule
export class FakeRule extends Rule {
  getId() { return 'FAKE_ID'; }

  getDescription() { return 'A fake rule for tests only.'; }

  match() { return RuleMatch.EMPTY_ARRAY; }
}
