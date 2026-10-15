// Ported from RuleMatchTest (languagetool-core).
import { describe, it, expect } from 'vitest';
import '../../src/lang/register.js';
import { getMessageBundle } from '../../src/core/resources/ResourceBundleTools.js';
import { Rule } from '../../src/core/rules/model/Rule.js';
import { RuleMatch } from '../../src/core/rules/model/RuleMatch.js';

// Java: RuleMatchTest.TestRule
class TestRule extends Rule {
  constructor() {
    super(getMessageBundle());
  }

  getId() {
    return 'TEST_RULE';
  }

  getDescription() {
    return 'test rule';
  }

  match() {
    return RuleMatch.EMPTY_ARRAY;
  }
}

describe('RuleMatchTest', () => {
  // Java: RuleMatchTest#testTrimMatchEndsKeepsWhitespaceOnlyMatch
  it('testTrimMatchEndsKeepsWhitespaceOnlyMatch', () => {
    const ruleMatch = new RuleMatch(new TestRule(), null, 10, 13, 'msg');
    ruleMatch.setOriginalErrorStr('   ');
    ruleMatch.setSuggestedReplacement(' ');

    const trimmed = ruleMatch.trimMatchEnds();

    expect(trimmed).toBe(ruleMatch);
    expect(trimmed.getFromPos()).toBe(10);
    expect(trimmed.getToPos()).toBe(13);
    expect(trimmed.getOriginalErrorStr()).toBe('   ');
    expect(trimmed.getSuggestedReplacements()[0]).toBe(' ');
  });

  // Java: RuleMatchTest#testTrimMatchEndsStillTrimsCommonTokens
  it('testTrimMatchEndsStillTrimsCommonTokens', () => {
    const ruleMatch = new RuleMatch(new TestRule(), null, 10, 21, 'msg');
    ruleMatch.setOriginalErrorStr('foo bar baz');
    ruleMatch.setSuggestedReplacement('foo qux baz');

    const trimmed = ruleMatch.trimMatchEnds();

    expect(trimmed.getFromPos()).toBe(14);
    expect(trimmed.getToPos()).toBe(17);
    expect(trimmed.getOriginalErrorStr()).toBe('bar');
    expect(trimmed.getSuggestedReplacements()[0]).toBe('qux');
  });
});
