import { describe, it, expect } from 'vitest';
import { Pattern, Matcher, javaSplit, javaReplaceAll, javaReplaceFirst, javaMatches } from '../../../../src/lib/java/regex/index.js';
import { assertThrowsJava } from '../../../support/javaAssert.js';

const CI = Pattern.CASE_INSENSITIVE;
const UC = Pattern.UNICODE_CASE;
const UCC = Pattern.UNICODE_CHARACTER_CLASS;

// all find() results as [start,end] pairs
function finds(p, s) {
  const m = p.matcher(s);
  const out = [];
  while (m.find()) out.push([m.start(), m.end()]);
  return out;
}

describe('java.util.regex.Pattern / Matcher (X-REGEX)', () => {
  it('matches, lookingAt, find', () => {
    const p = Pattern.compile('a+b');
    expect(p.matcher('aab').matches()).toBe(true);
    expect(p.matcher('aabc').matches()).toBe(false);
    expect(p.matcher('aabc').lookingAt()).toBe(true);
    expect(finds(p, 'xaab ab')).toEqual([[1, 4], [5, 7]]);
    expect(Pattern.matches('[a-c]+', 'abcabc')).toBe(true);
  });

  it('empty matches advance by one UTF-16 unit, also inside surrogate pairs', () => {
    expect(finds(Pattern.compile('x*'), 'a😀')).toEqual([[0, 0], [1, 1], [2, 2], [3, 3]]);
    expect(finds(Pattern.compile(''), 'ab')).toEqual([[0, 0], [1, 1], [2, 2]]);
  });

  it('case folding: CASE_INSENSITIVE is ASCII only, UNICODE_CASE adds Unicode 13 simple folding', () => {
    expect(Pattern.compile('straße', CI).matcher('STRASSE').matches()).toBe(false);
    expect(Pattern.compile('ä', CI).matcher('Ä').matches()).toBe(false);
    expect(Pattern.compile('ä', CI | UC).matcher('Ä').matches()).toBe(true);
    expect(Pattern.compile('k', CI | UC).matcher('\u212a').matches()).toBe(true);
    expect(Pattern.compile('ßx', CI | UC).matcher('ẞx').matches()).toBe(true);
    expect(Pattern.compile('ß', CI | UC).matcher('ẞ').matches()).toBe(false);
  });

  it('\\w \\d \\s are ASCII unless UNICODE_CHARACTER_CLASS; \\b uses Unicode letters/digits', () => {
    expect(Pattern.compile('\\w+').matcher('äö').matches()).toBe(false);
    expect(Pattern.compile('\\w+', UCC).matcher('äö').matches()).toBe(true);
    expect(Pattern.compile('\\d').matcher('٣').matches()).toBe(false);
    expect(Pattern.compile('\\d', UCC).matcher('٣').matches()).toBe(true);
    expect(Pattern.compile('\\s').matcher('\u00a0').matches()).toBe(false);
    expect(Pattern.compile('\\s', UCC).matcher('\u00a0').matches()).toBe(true);
    expect(finds(Pattern.compile('\\bü'), 'aü ü')).toEqual([[3, 4]]);
  });

  it('line terminators, UNIX_LINES, DOTALL, MULTILINE', () => {
    expect(finds(Pattern.compile('.'), 'a\nb\r\u0085c')).toEqual([[0, 1], [2, 3], [5, 6]]);
    expect(finds(Pattern.compile('.', Pattern.UNIX_LINES), 'a\r\n')).toEqual([[0, 1], [1, 2]]);
    expect(finds(Pattern.compile('a.b', Pattern.DOTALL), 'a\nb')).toEqual([[0, 3]]);
    expect(finds(Pattern.compile('^a', Pattern.MULTILINE), 'a\r\na\n')).toEqual([[0, 1], [3, 4]]);
    expect(finds(Pattern.compile('a$', Pattern.MULTILINE), 'a\r\na')).toEqual([[0, 1], [3, 4]]);
    expect(Pattern.compile('a$').matcher('a\n').find()).toBe(true);
    expect(Pattern.compile('a\\z').matcher('a\n').find()).toBe(false);
    expect(Pattern.compile('a\\Z').matcher('a\r\n').find()).toBe(true);
  });

  it('\\p{...} follow the Unicode 13 tables of JDK 17', () => {
    expect(Pattern.compile('\\p{Lu}').matcher('Ä').matches()).toBe(true);
    expect(Pattern.compile('\\p{javaLowerCase}+').matcher('abc').matches()).toBe(true);
    expect(Pattern.compile('\\p{IsLatin}').matcher('é').matches()).toBe(true);
    expect(Pattern.compile('\\p{script=latin}').matcher('é').matches()).toBe(true);
    expect(Pattern.compile('\\p{InGreek}').matcher('α').matches()).toBe(true);
    expect(Pattern.compile('\\p{Alpha}').matcher('ä').matches()).toBe(false);
    expect(Pattern.compile('\\p{IsAlpha}').matcher('ä').matches()).toBe(true);
    expect(Pattern.compile('[\\p{Punct}…–—&&[^"\'_]]').matcher('…').matches()).toBe(true);
    expect(Pattern.compile('[\\p{Punct}…–—&&[^"\'_]]').matcher('_').matches()).toBe(false);
    expect(Pattern.compile('[\'’\\p{L}-[_]]+').matcher("l'été").matches()).toBe(true);
  });

  it('inline flags apply to the end of the enclosing group, also mid-pattern', () => {
    const p = Pattern.compile('(?-i)(?!Artur\\b)(?i)\\bArth?ur\\b', CI | UC);
    expect(p.matcher('ARTHUR').find()).toBe(true);
    expect(p.matcher('Artur').find()).toBe(false);
    expect(p.matcher('ARTUR').find()).toBe(true);
    expect(Pattern.compile('a(?i)b(?-i)c').matcher('aBc').matches()).toBe(true);
    expect(Pattern.compile('a(?i)b(?-i)c').matcher('aBC').matches()).toBe(false);
    expect(Pattern.compile('(a(?i)b)c').matcher('aBC').matches()).toBe(false);
    expect(Pattern.compile('(?i:a)b').matcher('Ab').matches()).toBe(true);
    expect(Pattern.compile('(?i)a').flags()).toBe(CI);
    expect(Pattern.compile('(a(?i)b)c').flags()).toBe(0);
    expect(Pattern.compile('(?U)\\w').flags()).toBe(UCC | UC);
  });

  it('groups, named groups, back-references, look-around, atomic, possessive', () => {
    const m = Pattern.compile('(?<y>\\d{4})-(\\d\\d)').matcher('on 2026-03');
    expect(m.find()).toBe(true);
    expect([m.group('y'), m.group(2), m.start(2), m.end('y')]).toEqual(['2026', '03', 8, 7]);
    expect(Pattern.compile('(a)\\1').matcher('aa').matches()).toBe(true);
    expect(Pattern.compile('(?i)(a)\\1').matcher('aA').matches()).toBe(true);
    expect(Pattern.compile('(?<=a)b').matcher('ab').find()).toBe(true);
    expect(Pattern.compile('(?<!a)b').matcher('ab').find()).toBe(false);
    expect(Pattern.compile('(?>a+)a').matcher('aaa').matches()).toBe(false);
    expect(Pattern.compile('a*+a').matcher('aaa').matches()).toBe(false);
    expect(Pattern.compile('a*?b').matcher('aab').matches()).toBe(true);
  });

  it('Java keeps captures of backtracked look-arounds and of earlier loop iterations', () => {
    const m = Pattern.compile('.*((?<=(\\w))In|[\\*:_]in|/-in).*').matcher('x/-inx');
    expect(m.matches()).toBe(true);
    expect([m.start(1), m.end(1), m.start(2), m.end(2)]).toEqual([1, 5, 0, 1]);
    const n = Pattern.compile('(?:(a)|b)+').matcher('ab');
    expect(n.matches()).toBe(true);
    expect(n.group(1)).toBe('a');
    const o = Pattern.compile('((?s))*').matcher('');
    expect(o.find()).toBe(true);
    expect(o.start(1)).toBe(-1);
  });

  it('PatternSyntaxException text, index and description', () => {
    const e = assertThrowsJava(() => Pattern.compile('a{2,1}'), 'java.util.regex.PatternSyntaxException',
      'Illegal repetition range near index 5\na{2,1}\n     ^');
    expect(e.getDescription()).toBe('Illegal repetition range');
    expect(e.getIndex()).toBe(5);
    expect(e.getPattern()).toBe('a{2,1}');
    assertThrowsJava(() => Pattern.compile(')'), 'java.util.regex.PatternSyntaxException', "Unmatched closing ')'\n)");
    assertThrowsJava(() => Pattern.compile('[a'), 'java.util.regex.PatternSyntaxException', 'Unclosed character class near index 1\n[a\n ^');
    assertThrowsJava(() => Pattern.compile('\\p{Foo}'), 'java.util.regex.PatternSyntaxException', 'Unknown character property name {Foo} near index 6\n\\p{Foo}\n      ^');
    assertThrowsJava(() => Pattern.compile('(?<=\\1)a'), 'java.util.regex.PatternSyntaxException');
    assertThrowsJava(() => Pattern.compile('\\0'), 'java.util.regex.PatternSyntaxException', 'Illegal octal escape sequence near index 2\n\\0');
    assertThrowsJava(() => Pattern.compile('a', 0x400), 'java.lang.IllegalArgumentException', 'Unknown flag 0x400');
  });

  it('look-behind without obvious maximum length is rejected like JDK 17', () => {
    expect(() => Pattern.compile('(?<=a*b*)c')).not.toThrow();
    expect(() => Pattern.compile('(?<=(?:a*)*)c')).toThrow();
    expect(() => Pattern.compile('(?<=a{0,1000000000}b{0,1000000000}c{0,1000000000})')).toThrow();
  });

  it('\\Q..\\E, LITERAL, quote', () => {
    expect(Pattern.compile('\\Qa.b\\E+').matcher('a.bbb').matches()).toBe(true);
    expect(Pattern.compile('a.b', Pattern.LITERAL).matcher('a.b').matches()).toBe(true);
    expect(Pattern.compile('a.b', Pattern.LITERAL).matcher('axb').matches()).toBe(false);
    expect(Pattern.quote('a.b')).toBe('\\Qa.b\\E');
    expect(Pattern.quote('a\\Eb')).toBe('\\Qa\\E\\\\E\\Qb\\E');
    expect(Pattern.compile(Pattern.quote('a\\Eb')).matcher('a\\Eb').matches()).toBe(true);
    expect(Matcher.quoteReplacement('a$b\\c')).toBe('a\\$b\\\\c');
  });

  it('Matcher state and exceptions', () => {
    const m = Pattern.compile('(a)(b)?').matcher('xa');
    assertThrowsJava(() => m.group(), 'java.lang.IllegalStateException', 'No match found');
    assertThrowsJava(() => m.start(), 'java.lang.IllegalStateException', 'No match available');
    expect(m.find()).toBe(true);
    expect([m.group(0), m.group(1), m.group(2), m.start(2), m.end(2)]).toEqual(['a', 'a', null, -1, -1]);
    assertThrowsJava(() => m.group(3), 'java.lang.IndexOutOfBoundsException', 'No group 3');
    assertThrowsJava(() => m.group('nope'), 'java.lang.IllegalArgumentException', 'No group with name <nope>');
    expect(m.find()).toBe(false);
    assertThrowsJava(() => m.group(), 'java.lang.IllegalStateException', 'No match found');
    expect(m.reset().find()).toBe(true);
    assertThrowsJava(() => m.find(-1), 'java.lang.IndexOutOfBoundsException', 'Illegal start index');
    expect(m.find(1)).toBe(true);
    expect(m.groupCount()).toBe(2);
  });

  it('replaceAll / replaceFirst with Java replacement syntax', () => {
    expect(javaReplaceAll('abc', '(b)', '[$1]')).toBe('a[b]c');
    expect(javaReplaceAll('abc', '(?<n>b)', '[${n}]')).toBe('a[b]c');
    expect(javaReplaceAll('a,b', '[,;]', '\\\\$0')).toBe('a\\,b');
    expect(javaReplaceAll('aaa', 'a*', 'X')).toBe('XX');
    expect(javaReplaceAll('abc', '', '-')).toBe('-a-b-c-');
    expect(javaReplaceFirst('aaa', 'a', 'b')).toBe('baa');
    assertThrowsJava(() => javaReplaceAll('abc', '(b)', '$2'), 'java.lang.IndexOutOfBoundsException', 'No group 2');
    assertThrowsJava(() => javaReplaceAll('abc', '(b)', '$'), 'java.lang.IllegalArgumentException', 'Illegal group reference: group index is missing');
    assertThrowsJava(() => javaReplaceAll('abc', '(b)', '\\'), 'java.lang.IllegalArgumentException', 'character to be escaped is missing');
    assertThrowsJava(() => javaReplaceAll('abc', '(b)', '$a'), 'java.lang.IllegalArgumentException', 'Illegal group reference');
    assertThrowsJava(() => javaReplaceAll('abc', '(?<n>b)', '${x}'), 'java.lang.IllegalArgumentException', 'No group with name {x}');
    expect(javaReplaceAll('abc', '(b)', '$11')).toBe('ab1c');
    expect(Pattern.compile('b').matcher('abc').replaceAll((r) => `<${r.group()}>`)).toBe('a<b>c');
  });

  it('split follows String.split', () => {
    expect(javaSplit('', ',')).toEqual(['']);
    expect(javaSplit(',', ',')).toEqual([]);
    expect(javaSplit('a,,b,,', ',')).toEqual(['a', '', 'b']);
    expect(javaSplit('a,,b,,', ',', -1)).toEqual(['a', '', 'b', '', '']);
    expect(javaSplit('a,b,c', ',', 2)).toEqual(['a', 'b,c']);
    expect(javaSplit('abc', '')).toEqual(['a', 'b', 'c']);
    expect(javaSplit('a1b2', '(?<=\\d)')).toEqual(['a1', 'b2']);
    expect(javaSplit('a.b', '.')).toEqual([]);
    expect(javaSplit('a.b', '\\.')).toEqual(['a', 'b']);
    expect(javaSplit('😀😀', '')).toEqual(['\ud83d', '\ude00', '\ud83d', '\ude00']);
    expect(Pattern.compile(',').split('a,b,,', 0)).toEqual(['a', 'b']);
  });

  it('Pattern cache returns equal results', () => {
    expect(Pattern.compile('a+', 0)).toBe(Pattern.compile('a+', 0));
    expect(Pattern.compile('a+', 0)).not.toBe(Pattern.compile('a+', CI));
    expect(javaMatches('abc', 'a.c')).toBe(true);
  });

  it('constructs only the own matcher can express still work', () => {
    expect(finds(Pattern.compile('\\Ga'), 'aab')).toEqual([[0, 1], [1, 2]]);
    expect(finds(Pattern.compile('\\X'), 'e\u0301x')).toEqual([[0, 2], [2, 3]]);
    expect(Pattern.compile('(?i)(ä)\\1', UC).matcher('äÄ').matches()).toBe(true);
    expect(finds(Pattern.compile('\\R{2}+'), '\r\n\n')).toEqual([[0, 3]]);
  });
});
