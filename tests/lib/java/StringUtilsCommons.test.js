// Tests for the commons-lang3 StringUtils/RegExUtils helpers added in F22 (semantics of commons-lang3 3.x)
import { describe, it, expect } from 'vitest';
import {
  containsAny, endsWith, equalsAnyIgnoreCase, isAllBlank, isAlphanumeric, isBlank, isWhitespace, removeEnd, removeStart,
  splitByChar, startsWithAny, substringBefore,
} from '../../../src/lib/java/StringUtils.js';
import { removePattern, replaceFirst } from '../../../src/lib/java/RegExUtils.js';

describe('StringUtils (commons-lang3 subset)', () => {
  it('startsWithAny / endsWith', () => {
    expect(startsWithAny('abc', 'x', 'ab')).toBe(true);
    expect(startsWithAny('', '')).toBe(false); // empty sequence -> false
    expect(startsWithAny(null, 'a')).toBe(false);
    expect(startsWithAny('abc')).toBe(false);
    expect(startsWithAny('abc', null, 'a')).toBe(true);
    expect(endsWith('abc', 'bc')).toBe(true);
    expect(endsWith(null, null)).toBe(true);
    expect(endsWith(null, 'a')).toBe(false);
  });

  it('containsAny (CharSequence varargs)', () => {
    expect(containsAny('verrückterweise', 'xyz', 'rück')).toBe(true);
    expect(containsAny('', '')).toBe(false);
    expect(containsAny('abc', '')).toBe(true);
    expect(containsAny(null, 'a')).toBe(false);
  });

  it('isAlphanumeric / isBlank / isAllBlank / isWhitespace', () => {
    expect(isAlphanumeric('Straße1')).toBe(true);
    expect(isAlphanumeric('')).toBe(false);
    expect(isAlphanumeric('a-b')).toBe(false);
    expect(isBlank(' \t\n')).toBe(true);
    expect(isBlank(' ')).toBe(false); // Character.isWhitespace excludes NBSP
    expect(isAllBlank()).toBe(true);
    expect(isAllBlank(null, '', ' ')).toBe(true);
    expect(isAllBlank(' ', 'a')).toBe(false);
    expect(isWhitespace(null)).toBe(false);
    expect(isWhitespace('')).toBe(true);
    expect(isWhitespace('  ')).toBe(true);
  });

  it('equalsAnyIgnoreCase / removeEnd / removeStart / splitByChar / substringBefore', () => {
    expect(equalsAnyIgnoreCase('SIE', 'ich', 'sie')).toBe(true);
    expect(equalsAnyIgnoreCase(null, null)).toBe(true);
    expect(equalsAnyIgnoreCase('a', null)).toBe(false);
    expect(removeEnd('Verkaufe', 'kaufe')).toBe('Ver');
    expect(removeEnd('abc', 'x')).toBe('abc');
    expect(removeEnd('', 'x')).toBe('');
    expect(removeStart('zugeben', 'zu')).toBe('geben');
    expect(splitByChar('a  b ', ' ')).toEqual(['a', 'b']);
    expect(splitByChar('', ' ')).toEqual([]);
    expect(splitByChar(null, ' ')).toBeNull();
    expect(substringBefore('a#b#c', '#')).toBe('a');
    expect(substringBefore('abc', '')).toBe('');
    expect(substringBefore('abc', '#')).toBe('abc');
  });

  it('RegExUtils removePattern (DOTALL) / replaceFirst', () => {
    expect(removePattern('a\nb', 'a.b')).toBe('');
    expect(removePattern('unbeeindruckt', '^(be|un)')).toBe('beeindruckt');
    expect(removePattern(null, 'x')).toBeNull();
    expect(replaceFirst('VER:INF:NON', 'INF', 'EIZ')).toBe('VER:EIZ:NON');
    expect(replaceFirst(null, 'a', 'b')).toBeNull();
  });
});
