// Extra tests for the rule model (assertions derived from the Java sources; no JUnit counterpart exists).
import { describe, it, expect } from 'vitest';
import '../../src/lang/register.js';
import { getMessageBundle } from '../../src/core/resources/ResourceBundleTools.js';
import { Rule } from '../../src/core/rules/model/Rule.js';
import { RuleMatch } from '../../src/core/rules/model/RuleMatch.js';
import { SuggestedReplacement } from '../../src/core/rules/model/SuggestedReplacement.js';
import { Categories, CategoryId, Category } from '../../src/core/rules/model/Category.js';
import { ITSIssueType } from '../../src/core/rules/model/ITSIssueType.js';
import { Tag, ToneTag } from '../../src/core/rules/model/Tag.js';
import { RuleOption } from '../../src/core/rules/model/RuleOption.js';
import { CorrectExample, Example, IncorrectExample } from '../../src/core/rules/model/Examples.js';
import { UserConfig } from '../../src/core/rules/model/UserConfig.js';
import { Premium, PremiumOff } from '../../src/core/rules/model/Premium.js';
import { CheckResults } from '../../src/core/rules/model/CheckResults.js';
import { SentenceRange } from '../../src/core/rules/model/SentenceRange.js';
import { assertThrowsJava } from '../support/javaAssert.js';

class R extends Rule {
  getId() { return 'R_ID'; }
  getDescription() { return 'd'; }
}

describe('RuleMatch', () => {
  it('rejects toPos <= fromPos', () => {
    assertThrowsJava(() => new RuleMatch(new R(), 5, 5, 'm'), 'java.lang.IllegalArgumentException', 'fromPos (5) must be less than toPos (5)');
  });

  it('parses suggestions, dedups, handles uppercase', () => {
    const m = new RuleMatch(new R(), null, 0, 3, 5, 8, 'a <suggestion>x</suggestion> <suggestion>x</suggestion> <suggestion>y</suggestion>', null, true, 'z');
    expect(m.getSuggestedReplacements()).toEqual(['X', 'Y']);
    const n = new RuleMatch(new R(), 0, 3, 'm <suggestion>q</suggestion><suggestion>a<mistake/></suggestion>');
    expect(n.getSuggestedReplacements()).toEqual(['q']);
  });

  it('toString, compareTo, specificRuleId, shortMessage', () => {
    const m = new RuleMatch(new R(), 2, 4, 'msg');
    expect(m.toString()).toBe('R_ID:2-4:msg');
    expect(m.compareTo(new RuleMatch(new R(), 3, 4, 'x'))).toBe(-1);
    expect(m.getSpecificRuleId()).toBe('R_ID');
    expect(m.getShortMessage()).toBe('');
    expect(m.getLine()).toBe(-1);
  });

  it('lazy suggestions', () => {
    const m = new RuleMatch(new R(), 0, 1, 'm');
    m.setLazySuggestedReplacements(() => [new SuggestedReplacement('a')]);
    m.addSuggestedReplacement('b');
    expect(m.getSuggestedReplacements()).toEqual(['a', 'b']);
    const k = new RuleMatch(new R(), 0, 1, 'm');
    k.setLazySuggestedReplacements(() => [new SuggestedReplacement('a')]);
    k.discardLazySuggestedReplacements();
    expect(k.getSuggestedReplacements()).toEqual([]);
  });

  it('setOffsetPosition error', () => {
    const m = new RuleMatch(new R(), 0, 1, 'm');
    assertThrowsJava(() => m.setOffsetPosition(4, 2), 'java.lang.RuntimeException',
      'fromPos (4) must be less than toPos (2) for match: <sentcontent>R_ID:0-1:m</sentcontent>');
  });
});

describe('model enums and value classes', () => {
  it('ITSIssueType', () => {
    expect(ITSIssueType.LocaleSpecificContent.toString()).toBe('locale-specific-content');
    expect(ITSIssueType.getIssueType('whitespace')).toBe(ITSIssueType.Whitespace);
    assertThrowsJava(() => ITSIssueType.getIssueType('x'), 'java.lang.IllegalArgumentException');
  });

  it('Tag, ToneTag', () => {
    expect(ToneTag.REAL_TONE_TAGS.length).toBe(13);
    const r = new R();
    r.addTags(['picky', 'picky']);
    expect(r.getTags()).toEqual([Tag.picky]);
    assertThrowsJava(() => r.addTags(['nope']), 'java.lang.IllegalArgumentException', 'No enum constant org.languagetool.Tag.nope');
  });

  it('Category', () => {
    assertThrowsJava(() => new CategoryId(' '), 'java.lang.IllegalArgumentException', "Category id must not be empty: ' '");
    expect(new CategoryId('A').equals(new CategoryId('A'))).toBe(true);
    const r = new R(getMessageBundle());
    expect(r.getCategory().getId().toString()).toBe('MISC');
    expect(new R().getCategory().getName()).toBe('Miscellaneous');
    expect(Categories.TYPOS.getCategory(getMessageBundle())).toBeInstanceOf(Category);
    expect(Categories.REPETITIONS_STYLE.getCategory(getMessageBundle()).getName().length).toBeGreaterThan(0);
  });

  it('RuleOption', () => {
    const objs = RuleOption.stringToObjects('i5; btrue;sfoo;f1.5;d2.5;cx');
    expect(RuleOption.objectsToString(objs)).toBe('i5;btrue;sfoo;f1.5;d2.5;cx');
    expect(RuleOption.stringToObjects('7')).toEqual([7]);
    const o = new RuleOption(true, 't', 1, 2);
    expect([o.getMinConfigurableValue(), o.getMaxConfigurableValue()]).toEqual([0, 100]);
  });

  it('Examples', () => {
    assertThrowsJava(() => Example.wrong('x'), 'java.lang.IllegalArgumentException', "Example text must contain '<marker>...</marker>': x");
    assertThrowsJava(() => new CorrectExample('a <marker>b'), 'java.lang.IllegalArgumentException', 'Example contains <marker> but lacks </marker>:a <marker>b');
    expect(new IncorrectExample('a <marker>b</marker>', ['c', 'd']).toString()).toBe('a <marker>b</marker> [c, d]');
    const r = new R();
    r.addExamplePair(Example.wrong('a <marker>b</marker>'), Example.fixed('a <marker>c</marker>'));
    expect(r.getIncorrectExamples()[0].getCorrections()).toEqual(['c']);
  });

  it('UserConfig', () => {
    const c = new UserConfig(['a b', 'c'], [], new Map(), 3, 1n, null, null, null, false, null, null, false, ['fr', 'de', 'xx']);
    expect(c.getAcceptedPhrases()).toEqual(new Set(['a b']));
    expect(c.getPreferredLanguages()).toEqual(['de', 'fr']);
    expect(c.getUserDictName()).toBe('default');
    expect(c.hasLinguServices()).toBe(false);
    expect(new UserConfig().getPreferredLanguages()).toEqual(['']);
    expect(new UserConfig().equals(new UserConfig())).toBe(true);
  });

  it('Premium and SuggestedReplacement', () => {
    expect(Premium.get()).toBeInstanceOf(PremiumOff);
    expect(Premium.isPremiumVersion()).toBe(false);
    expect(new SuggestedReplacement('x', 'd').toString()).toBe('x(d)');
    expect(SuggestedReplacement.topMatch('w')[0].getConfidence()).toBe(Math.fround(0.99));
  });

  it('CheckResults and SentenceRange', () => {
    const cr = new CheckResults([], []);
    cr.addSentenceRanges([new SentenceRange(0, 3)]);
    expect(cr.getSentenceRanges().map(String)).toEqual(['0-3']);
  });
});
