// Ported from PatternRuleTest#testSupportsLanguage (languagetool-core) plus extra tests of the PatternTestTools warnings
import { describe, it, expect, vi, afterEach } from 'vitest';
import '../../../src/lang/register.js';
import { PatternRule } from '../../../src/core/patterns/PatternRule.js';
import { PatternToken } from '../../../src/core/patterns/PatternToken.js';
import { FakeLanguage } from '../../support/FakeLanguage.js';
import { fail, warnIfRegexpSyntaxNotKosher } from '../../support/PatternTestTools.js';
import { getDemoLanguage } from '../../support/DemoLanguage.js';

describe('PatternRuleTest', () => {
  afterEach(() => vi.restoreAllMocks());

  // Java: PatternRuleTest#testSupportsLanguage
  it('testSupportsLanguage', () => {
    const fakeLanguage1 = new FakeLanguage('yy');
    const fakeLanguage2 = new FakeLanguage('zz');
    const patternRule1 = new PatternRule('ID', fakeLanguage1, [], '', '', '');
    expect(patternRule1.supportsLanguage(fakeLanguage1)).toBe(true);
    expect(patternRule1.supportsLanguage(fakeLanguage2)).toBe(false);
    const fakeLanguage1WithVariant1 = new FakeLanguage('zz', 'VAR1');
    const fakeLanguage1WithVariant2 = new FakeLanguage('zz', 'VAR2');
    const patternRuleVariant1 = new PatternRule('ID', fakeLanguage1WithVariant1, [], '', '', '');
    expect(patternRuleVariant1.supportsLanguage(fakeLanguage1WithVariant1)).toBe(true);
    expect(patternRuleVariant1.supportsLanguage(fakeLanguage1)).toBe(false);
    expect(patternRuleVariant1.supportsLanguage(fakeLanguage2)).toBe(false);
    expect(patternRuleVariant1.supportsLanguage(fakeLanguage1WithVariant2)).toBe(false);
  });

  // Extra: warnIfRegexpSyntaxNotKosher texts (taken from PatternTestTools.java)
  it('warnIfRegexpSyntaxNotKosher warns with the Java texts', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const lang = getDemoLanguage();
    warnIfRegexpSyntaxNotKosher([new PatternToken('foo|bar', false, false, false), new PatternToken('x', false, true, false), new PatternToken('(a|a)x.', false, true, false)], 'R', '1', lang);
    const out = err.mock.calls.map((c) => c[0]);
    expect(out).toContain(`*** WARNING: The ${lang} rule: R[1], token [1], contains "foo|bar" that is not marked as regular expression but probably is one.`);
    expect(out).toContain(`*** WARNING: The ${lang} rule: R[1], token [3], contains duplicated disjunction part (a) within "(a|a)x.".`);
  });

  // Extra: regex starting with '|' fails like org.junit.Assert#fail
  it('warnIfRegexpSyntaxNotKosher fails on leading pipe', () => {
    expect(() => warnIfRegexpSyntaxNotKosher([new PatternToken('|foo', false, true, false)], 'R', '1', getDemoLanguage()))
      .toThrow("Regex of R[1] starts or ends with '|', which is probably invalid: |foo");
    expect(() => fail('x')).toThrow('x');
  });
});
