// Extra tests (no JUnit original) for the F25a pattern model: PatternToken, PatternRule, AbstractTokenBasedRule, Substrings, builders
import { describe, it, expect } from 'vitest';
import { AnalyzedToken } from '../../../src/core/AnalyzedToken.js';
import { PatternToken } from '../../../src/core/patterns/PatternToken.js';
import { PatternTokenBuilder } from '../../../src/core/patterns/PatternTokenBuilder.js';
import { PatternRule } from '../../../src/core/patterns/PatternRule.js';
import { RegexPatternRule } from '../../../src/core/patterns/RegexPatternRule.js';
import { PatternRuleId } from '../../../src/core/patterns/PatternRuleId.js';
import { Substrings } from '../../../src/core/patterns/Substrings.js';
import { Match, CaseConversion, IncludeRange } from '../../../src/core/patterns/Match.js';
import { convertCase } from '../../../src/core/patterns/CaseConversionHelper.js';
import { ChunkTag } from '../../../src/core/chunking/ChunkTag.js';
import { StringMatcher } from '../../../src/core/patterns/StringMatcher.js';
import { UnsupportedOperationException } from '../../../src/lib/java/errors.js';
import { arrayGet } from '../../../src/lib/java/arrays.js';
import { Pattern } from '../../../src/lib/java/regex/index.js';
import { EN, newLt, useNoopAnalysis } from '../../support/ruleTestSupport.js';

describe('PatternModel', () => {
  useNoopAnalysis(EN);

  it('PatternToken limits and exceptions', () => {
    const t = new PatternToken('foo', false, false, false);
    expect(() => t.setSkipNext(128)).toThrow("'skip' should be between -1 and 127");
    expect(() => t.setMinOccurrence(2)).toThrow('minOccurrences must be 0 or 1: 2');
    expect(() => t.setMaxOccurrence(0)).toThrow('maxOccurrences may not be 0');
    expect(() => t.setMaxOccurrence(-2)).toThrow('maxOccurrences should be between -1 and 127 but was: -2');
    t.setStringPosException('bar', false, false, false, false, false, null, false, false, null);
    t.setStringPosException('baz', false, false, false, true, false, null, false, false, null);
    t.setStringPosException('prev', false, false, false, false, true, null, false, false, null);
    expect(t.isExceptionMatched(new AnalyzedToken('bar', null, null))).toBe(true);
    expect(t.isExceptionMatched(new AnalyzedToken('baz', null, null))).toBe(false);
    expect(t.isMatchedByScopeNextException(new AnalyzedToken('baz', null, null))).toBe(true);
    expect(t.isMatchedByPreviousException(new AnalyzedToken('prev', null, null))).toBe(true);
    expect(t.toString()).toBe('foo/exceptions=[bar/null, baz/null]');
    t.setChunkTag(new ChunkTag('NP'));
    t.setPhraseName('ph');
    expect(t.toString()).toBe('foo {ph}/NP/exceptions=[bar/null, baz/null]');
  });

  it('PatternToken whitespace and inflected matching', () => {
    const t = new PatternTokenBuilder().token('lemma').matchInflectedForms().setIsWhiteSpaceBefore(true).build();
    const at = new AnalyzedToken('forms', 'X', 'lemma');
    at.setWhitespaceBefore(true);
    expect(t.isMatched(at)).toBe(true);
    at.setWhitespaceBefore(false);
    expect(t.isMatched(at)).toBe(false);
  });

  it('builder validations', () => {
    expect(() => new PatternTokenBuilder().token('a').min(3).max(2).build()).toThrow('minOccurrence must <= maxOccurrence: minOccurrence 3, maxOccurrence 2');
    expect(() => new PatternTokenBuilder().token(null)).toThrow();
  });

  it('PatternRule: elementNo, token hints, context estimate, toString', () => {
    const a = new PatternTokenBuilder().token('a').build();
    const b = new PatternTokenBuilder().tokenRegex('x|yy').mark(false).build();
    b.setPhraseName('p1');
    const rule = new PatternRule('ID', EN, [a, b], 'desc', 'msg', 'short');
    expect(rule.getElementNo()).toEqual([1, 1]);
    expect(rule.toPatternString()).toBe('a, x|yy {p1}');
    expect(rule.getFullId()).toBe('ID');
    rule.setSubId('2');
    expect(rule.getFullId()).toBe('ID[2]');
    expect(rule.toString()).toBe('ID[2]:[a, x|yy {p1}]:desc');
    expect(rule.estimateContextForSureMatch()).toBe(1);
    expect(rule.tokenHints.map((h) => h.lowerCaseValues)).toEqual([['a'], ['x', 'yy']]);
    expect(rule.getMaxSpanTokens()).toBe(2);
    expect(rule.getShortMessage()).toBe('short');
    expect(rule.supportsLanguage(EN)).toBe(true);
  });

  it('PatternRuleId', () => {
    expect(new PatternRuleId('a', 'b').toString()).toBe('a[b]');
    expect(() => new PatternRuleId('')).toThrow('id must be set');
    expect(() => new PatternRuleId('a', '')).toThrow('subId must be set, if specified');
  });

  it('Substrings', () => {
    const s = new Substrings(true, false, ['ab', 'cd']);
    expect(s.toString()).toBe('[ab, cd)');
    expect(s.matches('abxxcd', true)).toBe(true);
    expect(s.matches('xabcd', true)).toBe(false);
    expect(s.matches('ABxCD', false)).toBe(true);
    expect(s.find('xxabcd', true)).toBe(2);
    expect(s.find('xxabxx', true)).toBe(-1);
    expect(new Substrings(false, false, ['cd']).find('abCDe', false)).toBe(2);
    expect(s.concat(new Substrings(true, true, ['e'])).toString()).toBe('[ab, cd, e]');
  });

  it('Match and CaseConversionHelper', () => {
    const m = new Match('NN.*', 'VB', true, 'a+', 'b', CaseConversion.ALLUPPER, false, true, IncludeRange.NONE);
    expect(m.getPosRegexMatch().pattern()).toBe('NN.*');
    expect(m.getRegexMatch().pattern()).toBe('a+');
    expect(m.convertsCase()).toBe(true);
    expect(m.checksSpelling()).toBe(true);
    m.setLemmaString('lem');
    expect(m.isStaticLemma()).toBe(true);
    expect(convertCase(CaseConversion.PRESERVE, 'foo', 'Bar', EN)).toBe('Foo');
    expect(convertCase(CaseConversion.PRESERVE, 'foo', 'BAR', EN)).toBe('FOO');
    expect(convertCase(CaseConversion.STARTLOWER, 'Foo', '', EN)).toBe('foo');
    expect(convertCase(CaseConversion.FIRSTUPPER, 'fOO', '', EN)).toBe('Foo');
    expect(convertCase(CaseConversion.ALLLOWER, '', '', EN)).toBe('');
  });

  it('RegexPatternRule match with message references and mark group', () => {
    const rule = new RegexPatternRule('R', 'd', 'msg \\1', 'short', '', EN, Pattern.compile('(fo+) bar'), 1);
    expect(rule.toString()).toBe('(fo+) bar/flags:0');
    expect(rule.estimateContextForSureMatch()).toBe(-1);
    const lt = newLt(EN);
    // without a Match object for the back-reference Java fails like this
    expect(() => rule.match(lt.getAnalyzedSentence('foo bar'))).toThrow('Unexpected reference to capturing group in rule with id R.');
    rule.addSuggestionMatch(new Match(null, null, false, null, null, CaseConversion.NONE, false, false, IncludeRange.NONE));
    const m = rule.match(lt.getAnalyzedSentence('This is foo bar and fooo bar'));
    expect(m.map((x) => [x.getFromPos(), x.getToPos(), x.getMessage()])).toEqual([[8, 11, 'msg foo'], [20, 24, 'msg fooo']]);
    expect(rule.match(lt.getAnalyzedSentence('nothing here'))).toEqual([]);
  });

  it('case-insensitive getPossibleValues iteration order matches Java (Guava 33.5 sizing)', () => {
    const m = StringMatcher.create('der|die|eine', true, false);
    expect([...m.getPossibleValues()]).toEqual(['der', 'eine', 'die']);
  });

  it('tokenHints tie order matches Java probe', () => {
    const rule = new PatternRule('ID', EN, [new PatternTokenBuilder().tokenRegex('abc|abd|abe').build(),
      new PatternTokenBuilder().tokenRegex('der|die|eine').build()], 'd', 'm', 's');
    expect(rule.tokenHints.map((h) => [h.tokenIndex, h.lowerCaseValues])).toEqual([[0, ['abe', 'abd', 'abc']], [1, ['der', 'eine', 'die']]]);
  });

  it('unmodifiable views throw UnsupportedOperationException', () => {
    const t = new PatternToken('foo', false, false, false);
    expect(() => t.getAndGroup().push(t)).toThrow(UnsupportedOperationException);
    expect(() => t.getOrGroup().push(t)).toThrow(UnsupportedOperationException);
    expect(() => t.getExceptionList().push(t)).toThrow(UnsupportedOperationException);
    expect(() => StringMatcher.create('abc', false, true).getPossibleValues().add('x')).toThrow(UnsupportedOperationException);
    expect(() => StringMatcher.create('a|b', true, true).getPossibleValues().add('x')).toThrow(UnsupportedOperationException);
    t.setStringPosException('bar', false, false, false, false, false, null, false, false, null);
    expect(() => t.getExceptionList().push(t)).toThrow(UnsupportedOperationException);
  });

  it('arrayGet throws ArrayIndexOutOfBoundsException', () => {
    expect(() => arrayGet([1], 1)).toThrow('Index 1 out of bounds for length 1');
    expect(arrayGet([1], 0)).toBe(1);
  });
});
