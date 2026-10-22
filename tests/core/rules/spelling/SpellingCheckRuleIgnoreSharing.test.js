// Extra tests (no JUnit class): copy-on-write of the shared ignore sets (perf round 2)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { SpellingCheckRule } from '../../../../src/core/rules/spelling/SpellingCheckRule.js';
import { englishMessages } from '../../../support/ruleTestSupport.js';

class TestSpellRule extends SpellingCheckRule {
  getId() { return 'TEST_SPELL'; }
  getDescription() { return 'test'; }
  match() { return []; }
  isMisspelled() { return false; }
}

function make() {
  const lang = Languages.getLanguageForShortCode('en-US');
  const r = new TestSpellRule(englishMessages(), lang, null);
  r.init();
  return r;
}

describe('SpellingCheckRule ignore sharing', () => {
  it('two rules loaded from the same lists hold the same words', () => {
    const a = make();
    const b = make();
    expect(a.wordsToBeIgnored.size).toBeGreaterThan(1000);
    expect(a.wordsToBeIgnored).toBe(b.wordsToBeIgnored); // shared memo set until the first change
    expect([...a.wordsToBeIgnored]).toEqual([...b.wordsToBeIgnored]);
    expect(a.antiPatterns.length).toBe(b.antiPatterns.length);
  });

  it('addIgnoreTokens on one rule does not affect the other', () => {
    const a = make();
    const b = make();
    const before = b.wordsToBeIgnored.size;
    const token = 'Zzyzxqwordnotinlist';
    expect(a.wordsToBeIgnored.has(token)).toBe(false);
    a.addIgnoreTokens([token]);
    expect(a.wordsToBeIgnored.has(token)).toBe(true);
    expect(a.isInIgnoredSet(token)).toBe(true);
    expect(b.wordsToBeIgnored.has(token)).toBe(false);
    expect(b.isInIgnoredSet(token)).toBe(false);
    expect(b.wordsToBeIgnored.size).toBe(before);
    // a third rule built afterwards is unaffected as well
    const c = make();
    expect(c.wordsToBeIgnored.has(token)).toBe(false);
    expect(c.wordsToBeIgnored.size).toBe(before);
  });

  it('addIgnoreWords (single token) on one rule does not affect the other', () => {
    const a = make();
    const b = make();
    const before = b.wordsToBeIgnored.size;
    a.addIgnoreWords('Qqzzxxsingle');
    expect(a.wordsToBeIgnored.has('Qqzzxxsingle')).toBe(true);
    expect(b.wordsToBeIgnored.has('Qqzzxxsingle')).toBe(false);
    expect(b.wordsToBeIgnored.size).toBe(before);
  });

  it('sorted ignore dictionary of one rule reflects its own additions only', () => {
    const a = make();
    const b = make();
    a.addIgnoreTokens(['Aaaaazzzfirst']);
    a.updateIgnoredWordDictionary();
    b.updateIgnoredWordDictionary();
    expect(a.ignoreWord('Aaaaazzzfirst')).toBe(true);
    expect(b.ignoreWord('Aaaaazzzfirst')).toBe(false);
  });

  it('antiPatterns arrays are per rule (push on one does not show in the other)', () => {
    const a = make();
    const b = make();
    const n = b.antiPatterns.length;
    a.antiPatterns.push({});
    expect(b.antiPatterns.length).toBe(n);
  });
});
