// Ported from PunctuationMarkAtParagraphEndTest and PunctuationMarkAtParagraphEnd2Test (languagetool-core)
import { describe, it, expect } from 'vitest';
import { PunctuationMarkAtParagraphEnd } from '../../../src/core/rules/PunctuationMarkAtParagraphEnd.js';
import { PunctuationMarkAtParagraphEnd2 } from '../../../src/core/rules/PunctuationMarkAtParagraphEnd2.js';
import { englishMessages, newLt } from '../../support/ruleTestSupport.js';
import { getDemoLanguage, useXxTestResources } from '../../support/DemoLanguage.js';

describe('PunctuationMarkAtParagraphEndTest', () => {
  useXxTestResources();
  const EN = getDemoLanguage();

  // Java: PunctuationMarkAtParagraphEndTest#testRule
  it('testRule', () => {
    const rule = new PunctuationMarkAtParagraphEnd(englishMessages(), EN);
    rule.setTags([]);
    const lt = newLt(EN, rule);
    const n = (s) => lt.check(s).length;
    expect(n('A paragraph.\n2. Some headline\n\n(a) A new sentence.')).toBe(0);
    expect(n('A paragraph.\n\n2. Some headline\n\n(a) A new sentence.')).toBe(0);
    expect(n('A paragraph.\n2.2.1 Some headline\n\n(a) A new sentence.')).toBe(0);
    expect(n('A paragraph.\n\n2.2.1 Some headline\n\n(a) A new sentence.')).toBe(0);
    expect(n('2. This is an item in a list')).toBe(0);
    expect(n('2.2.2. This is an item in a list')).toBe(0);
    expect(n('a) This is an item in a list')).toBe(0);
    expect(n('a.) This is an item in a list')).toBe(0);
    expect(n('✓ This is an item in a list')).toBe(0);
    expect(n('* This is an item in a list')).toBe(0);
    expect(n('This is a test sentence.')).toBe(0);
    expect(n('This is a test headline')).toBe(0);
    expect(n('This is a test sentence. This is a link: http://example.com')).toBe(0); // no error because of colon
    expect(n('This is a test sentence. It can be found at http://example.com/foobar')).toBe(1);
    expect(n('This is a test sentence. And this is a second test sentence')).toBe(1);
    expect(n('"This is a test sentence. And this is a second test sentence')).toBe(1);
    expect(n('This is a test sentence. And this is a second test sentence.')).toBe(0);
    expect(n('B. v. – Beschluss vom')).toBe(0);
    expect(n('This is a test sentence.\nAnd this is a second test sentence. Here is a dot missing')).toBe(1);
    expect(n('This is a test sentence.\nAnd this is a second test sentence. Here is a dot missing.')).toBe(0);
    expect(n('This is a sentence. Another one: https://languagetool.org/foo\n\nAnother sentence\n')).toBe(0);
  });
});

describe('PunctuationMarkAtParagraphEnd2Test', () => {
  useXxTestResources();
  const EN = getDemoLanguage();

  // Java: PunctuationMarkAtParagraphEnd2Test#test
  it('test', () => {
    const rule = new PunctuationMarkAtParagraphEnd2(englishMessages(), EN);
    rule.setDefaultOn();
    const lt = newLt(EN, rule);
    const n = (s) => lt.check(s).length;
    expect(n('2. This is an item in a list')).toBe(0);
    expect(n('2.2.2. This is an item in a list')).toBe(0);
    expect(n('This is a test.')).toBe(0);
    expect(n('This is a test')).toBe(0); // too short
    expect(n('This is a really nice test')).toBe(0); // no error, might not be finished
    expect(n('This is a really nice test, and it has enough tokens\n')).toBe(1);
    expect(n('This is a really nice test, and it has enough tokens\n\n')).toBe(1);
    expect(n('"This is a really nice test, and it has enough tokens."\n\n')).toBe(0);
    expect(n('"This is a really nice test, and it has enough tokens"\n')).toBe(0); // not really clear whether the rule should match here...
    expect(n('"This is a really nice test, and it has enough tokens"\n\n')).toBe(0); // not really clear whether the rule should match here...
    expect(n('This is a test.\n\nRegards,\nJim')).toBe(0);
    expect(n('This is a test.\n\nRegards,\n\nJim')).toBe(0);
    expect(n('This is a test.\n\nKind Regards,\nJim')).toBe(0);
    expect(n('This is a test.\n\nKind Regards,\n\nJim')).toBe(0);
    expect(n('This is a test.\n\nKind Regards,\n\nJim Tester')).toBe(0);
    expect(n('This is a test.\n\nKind Regards,\n\nJim van Tester')).toBe(0);
    expect(n('This is headline-style text')).toBe(0);
    expect(n('This is headline-style text.')).toBe(0);
    expect(n('This is headline-style text. If it gets longer, a dot is needed.')).toBe(0);
    expect(n('This is headline-style text. If it gets longer, a dot is needed')).toBe(1);
    expect(n('This is a test\n\nKind Regards,\n\nJim van Tester')).toBe(0); // too short to find missing dot
    expect(n('This is a really nice test, and it has enough tokens\n\nKind Regards,\n\nJim van Tester')).toBe(1);
  });
});
