import { describe, it, expect } from 'vitest';
import * as S from '../../../src/lib/java/strings.js';
import { StringTokenizer } from '../../../src/lib/java/StringTokenizer.js';
import { arraysHashCode, listHashCode, setHashCode, mapHashCode, objectsHash, typedHash } from '../../../src/lib/java/hash.js';
import { assertThrowsJava } from '../../support/javaAssert.js';

const SIOOBE = 'java.lang.StringIndexOutOfBoundsException';

describe('strings.js (X-PROBE-STRINGS)', () => {
  it('trim removes <= U+0020 only; strip is Unicode whitespace', () => {
    expect(S.javaTrim('\u0001 a  \u0000')).toBe('a ');
    expect(S.javaTrim(' a')).toBe(' a');
    expect(S.javaStrip('  a  ')).toBe('  a');
    expect(S.javaStrip('\u0001a\u001f')).toBe('\u0001a');
    expect(S.javaIsBlank(' \t ')).toBe(true);
    expect(S.javaIsBlank(' ')).toBe(false);
    expect(S.stripLeading('  a ')).toBe('a ');
    expect(S.stripTrailing('  a ')).toBe('  a');
  });
  it('replace is literal and replaces all', () => {
    expect(S.javaReplace('line # comment', '#.*', '')).toBe('line # comment');
    expect(S.javaReplace('abc', '', '-')).toBe('-a-b-c-');
    expect(S.javaReplace('', '', '-')).toBe('-');
    expect(S.javaReplace('aaa', 'aa', 'b')).toBe('ba');
    expect(S.javaReplace('aaa', 'a', 'aa')).toBe('aaaaaa');
    expect(S.javaReplace('a$b', '$', '$1')).toBe('a$1b');
    assertThrowsJava(() => S.javaReplace('abc', 'b', null), 'java.lang.NullPointerException', 'Cannot invoke "java.lang.CharSequence.toString()" because "replacement" is null');
    expect(S.replaceChar('banana', 97, 111)).toBe('bonono');
  });
  it('compare', () => {
    expect(S.javaCompare('a', 'b')).toBe(-1);
    expect(S.javaCompare('ab', 'a')).toBe(1);
    expect(S.javaCompare('😀', '￿')).toBe(0xd83d - 0xffff);
    expect(S.compareToIgnoreCase('ABC', 'abd')).toBe(-1);
    expect(S.equalsIgnoreCase('\u{10428}', '\u{10400}')).toBe(true);
    expect(S.equalsIgnoreCase('a', null)).toBe(false);
    assertThrowsJava(() => S.javaCompare('a', null), 'java.lang.NullPointerException', 'Cannot read field "value" because "anotherString" is null');
    expect(S.CASE_INSENSITIVE_ORDER('Straße', 'STRASSE')).toBe(0xdf - 0x73);
  });
  it('regionMatches', () => {
    expect(S.regionMatches('Hello', true, 1, 'ELL', 0, 3)).toBe(true);
    expect(S.regionMatches('Hello', false, 1, 'ELL', 0, 3)).toBe(false);
    expect(S.regionMatches('Hello', 1, 'ell', 0, 3)).toBe(true);
    expect(S.regionMatches('Hello', -1, 'ell', 0, 3)).toBe(false);
    expect(S.regionMatches('Hello', 0, 'abc', 0, -1)).toBe(true);
  });
  it('indexed access errors use JDK 17 messages', () => {
    assertThrowsJava(() => S.charAt('hello', 5), SIOOBE, 'String index out of range: 5');
    assertThrowsJava(() => S.charAt('\u{1f600}', 2), SIOOBE, 'index 2, length 2');
    assertThrowsJava(() => S.substring('hello', 2, 1), SIOOBE, 'begin 2, end 1, length 5');
    assertThrowsJava(() => S.substring('hello', 6), SIOOBE, 'begin 6, end 5, length 5');
    assertThrowsJava(() => S.codePointAt('hello', 5), SIOOBE, 'index 5, length 5');
    assertThrowsJava(() => S.codePointBefore('hello', 0), SIOOBE, 'String index out of range: 0');
    assertThrowsJava(() => S.offsetByCodePoints('abc', 4, 0), 'java.lang.IndexOutOfBoundsException', null);
    expect(S.offsetByCodePoints('\u{1f600}ab', 0, 2)).toBe(3);
    expect(S.codePointCount('\u{1f600}ab', 0, 4)).toBe(3);
    expect(S.codePointBefore('\u{1f600}', 2)).toBe(0x1f600);
  });
  it('search helpers', () => {
    expect(S.indexOf('abc', '', 5)).toBe(3);
    expect(S.indexOf('abc', 'c', -3)).toBe(2);
    expect(S.lastIndexOf('abca', 'a', -1)).toBe(-1);
    expect(S.lastIndexOf('abca', '')).toBe(4);
    expect(S.startsWith('abc', 'a', -1)).toBe(false);
    expect(S.endsWith('abc', 'abcd')).toBe(false);
    expect(S.indexOfChar('a\u{1f600}', 0x1f600)).toBe(1);
    expect(S.indexOfChar('abc', -1)).toBe(-1);
    expect(S.lines('a\r\n\r\nb\r')).toEqual(['a', '', 'b']);
    expect(S.lines('\n')).toEqual(['']);
    expect(S.lines('')).toEqual([]);
    expect(S.join(', ', ['a', null, 'c'])).toBe('a, null, c');
    assertThrowsJava(() => S.repeat('ab', -1), 'java.lang.IllegalArgumentException', 'count is negative: -1');
    assertThrowsJava(() => S.concat('a', null), 'java.lang.NullPointerException', 'Cannot invoke "String.isEmpty()" because "str" is null');
  });
});

describe('StringBuilder', () => {
  it('append / insert / delete / replace', () => {
    const b = new S.StringBuilder('hello');
    b.append(' world').append(null).appendChar(65).append(-5).appendDouble(1e10).appendFloat(0.1);
    expect(b.toString()).toBe('hello worldnullA-51.0E100.1');
    expect(new S.StringBuilder('hello').delete(1, 3).toString()).toBe('hlo');
    expect(new S.StringBuilder('hello').delete(0, 100).toString()).toBe('');
    expect(new S.StringBuilder('hello').replace(1, 3, 'XYZ').toString()).toBe('hXYZlo');
    assertThrowsJava(() => new S.StringBuilder('').delete(1, 1), SIOOBE, 'start 1, end 0, length 0');
    assertThrowsJava(() => new S.StringBuilder('1234567').insert(8, 'Z'), SIOOBE, 'offset 8, length 7');
    assertThrowsJava(() => new S.StringBuilder('abcd').deleteCharAt(4), SIOOBE, 'index 4, length 4');
    assertThrowsJava(() => new S.StringBuilder('a').replace(5, 5, 'e'), SIOOBE, 'start 5, end 1, length 1');
    assertThrowsJava(() => new S.StringBuilder('a').setLength(-1), SIOOBE, 'String index out of range: -1');
    assertThrowsJava(() => new S.StringBuilder('a').appendCodePoint(0x110000), 'java.lang.IllegalArgumentException', 'Not a valid Unicode code point: 0x110000');
  });
  it('reverse keeps valid surrogate pairs', () => {
    expect(new S.StringBuilder('\u{1f600}ab').reverse().toString()).toBe('ba\u{1f600}');
    expect(new S.StringBuilder('\ud800a').reverse().toString()).toBe('a\ud800');
    expect(new S.StringBuilder('\udc00\ud800').reverse().toString()).toBe('𐀀');
  });
  it('setLength pads with NUL', () => {
    const b = new S.StringBuilder('hello');
    b.setLength(6);
    expect(b.toString()).toBe('hello\u0000');
    expect(b.length()).toBe(6);
  });
});

describe('StringTokenizer', () => {
  const toks = (s, d, r) => {
    const t = new StringTokenizer(s, d, r);
    const l = [];
    while (t.hasMoreTokens()) l.push(t.nextToken());
    return l;
  };
  it('tokens and delimiters', () => {
    expect(toks('a b  c', ' ', false)).toEqual(['a', 'b', 'c']);
    expect(toks('a b  c', ' ', true)).toEqual(['a', ' ', 'b', ' ', ' ', 'c']);
    expect(toks('a\u{1f600}b', '\u{1f600}', true)).toEqual(['a', '\u{1f600}', 'b']);
    expect(new StringTokenizer('a b').countTokens()).toBe(2);
  });
  it('null arguments', () => {
    assertThrowsJava(() => new StringTokenizer(null, ' '), 'java.lang.NullPointerException', 'Cannot invoke "String.length()" because "str" is null');
    assertThrowsJava(() => new StringTokenizer('a', null).hasMoreTokens(), 'java.lang.NullPointerException', null);
    assertThrowsJava(() => new StringTokenizer('').nextToken(), 'java.util.NoSuchElementException', null);
  });
});

describe('hash.js', () => {
  it('collection hash codes (oracle values)', () => {
    expect(arraysHashCode([])).toBe(1);
    expect(arraysHashCode(null)).toBe(0);
    expect(arraysHashCode([null, 'a'])).toBe(1058);
    expect(listHashCode(['a', 'b', 'c'])).toBe(126145);
    expect(setHashCode(new Set(['a', 'b', 'c']))).toBe(294);
    expect(mapHashCode(new Map([['k1', 'v1'], ['k2', 'v2']]))).toBe(1720);
    expect(mapHashCode(new Map([['a', null]]))).toBe(97);
    expect(objectsHash('a', 'b')).toBe(4066);
    expect(objectsHash()).toBe(1);
  });
});

describe('S06 review fixes (JDK 17 verified texts)', () => {
  const NPE = 'java.lang.NullPointerException';
  const tgt = 'Cannot read field "value" because "tgtStr" is null';
  it('indexOf/lastIndexOf NPE texts per entry point', () => {
    assertThrowsJava(() => S.indexOf('abc', null), NPE, 'Cannot invoke "String.coder()" because "str" is null');
    assertThrowsJava(() => S.indexOf('abc', null, 0), NPE, tgt);
    assertThrowsJava(() => S.lastIndexOf('abc', null), NPE, tgt);
    assertThrowsJava(() => S.lastIndexOf('abc', null, 1), NPE, tgt);
    const sb = new S.StringBuilder('abc');
    assertThrowsJava(() => sb.indexOf(null), NPE, tgt);
    assertThrowsJava(() => sb.indexOf(null, 0), NPE, tgt);
    assertThrowsJava(() => sb.lastIndexOf(null), NPE, tgt);
    assertThrowsJava(() => sb.lastIndexOf(null, 1), NPE, tgt);
  });
  it('regionMatches NPE by ignoreCase', () => {
    assertThrowsJava(() => S.regionMatches('abc', 0, null, 0, 1), NPE, 'Cannot read field "value" because "other" is null');
    assertThrowsJava(() => S.regionMatches('abc', -1, null, 0, 1), NPE, 'Cannot read field "value" because "other" is null');
    assertThrowsJava(() => S.regionMatches('abc', true, 0, null, 0, 1), NPE, 'Cannot invoke "String.length()" because "other" is null');
    expect(S.regionMatches('abc', true, -1, null, 0, 1)).toBe(false);
  });
  it('StringBuilder.replace null', () => {
    assertThrowsJava(() => new S.StringBuilder('abc').replace(0, 1, null), NPE, 'Cannot invoke "String.length()" because "str" is null');
    assertThrowsJava(() => new S.StringBuilder('abc').replace(5, 6, null), 'java.lang.StringIndexOutOfBoundsException', 'start 5, end 3, length 3');
    expect(() => new S.StringBuilder('abc').replace(0, 1, 5)).toThrow(TypeError);
  });
  it('repeat OOM, join null', () => {
    assertThrowsJava(() => S.repeat('ab', 2147483647), 'java.lang.OutOfMemoryError', 'Required length exceeds implementation limit');
    expect(S.repeat('ab', 3)).toBe('ababab');
    assertThrowsJava(() => S.join(null, ['a']), NPE, null);
    assertThrowsJava(() => S.join(',', null), NPE, null);
  });
  it('append typed API (P15)', () => {
    expect(new S.StringBuilder().append(5).append('x').toString()).toBe('5x');
    expect(() => new S.StringBuilder().append(1.5)).toThrow(TypeError);
    expect(() => new S.StringBuilder().append(2 ** 53)).toThrow(TypeError);
    expect(() => new S.StringBuilder().append(1n)).toThrow(TypeError);
    expect(new S.StringBuilder().appendLong(9223372036854775807n).toString()).toBe('9223372036854775807');
    expect(() => new S.StringBuilder().appendLong(1)).toThrow(TypeError);
    expect(() => new S.StringBuilder('a').insert(0, 5)).toThrow(TypeError);
  });
  it('typedHash wrappers differ from Integer', () => {
    expect(objectsHash(1)).toBe(32);
    expect(objectsHash(typedHash.Double(1))).toBe(31 + 1072693248);
    expect(objectsHash(typedHash.Double(1))).not.toBe(objectsHash(1));
    expect(objectsHash(typedHash.Long(1n))).toBe(32);
    expect(arraysHashCode([typedHash.Float(1)])).toBe(31 + 1065353216);
    expect(typedHash.Double(1).equals(typedHash.Double(1))).toBe(true);
    expect(typedHash.Double(1).equals(1)).toBe(false);
  });
});
