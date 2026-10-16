// Ported from StringMatcherTest (languagetool-core); sequence matcher fast paths arrive with F26 (consistency test already covers the fallback)
import { describe, it, expect } from 'vitest';
import { Pattern } from '../../../src/lib/java/regex/index.js';
import { javaMatches } from '../../../src/lib/java/regex/index.js';
import { StringMatcher } from '../../../src/core/patterns/StringMatcher.js';
import { PatternSyntaxException } from '../../../src/lib/java/errors.js';

const range = (a, b) => Array.from({ length: b.charCodeAt(0) - a.charCodeAt(0) + 1 }, (_, i) => String.fromCharCode(a.charCodeAt(0) + i));

// Java: StringMatcherTest#assertStringMatcherConsistentWithPattern
function assertStringMatcherConsistentWithPattern(regexp, s) {
  expect(StringMatcher.regexp(regexp).matches(s)).toBe(javaMatches(s, regexp));
  expect(StringMatcher.create(regexp, true, false).matches(s))
    .toBe(Pattern.compile(regexp, Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE).matcher(s).matches());
}

// Java: StringMatcherTest#trySomeMutations
function trySomeMutations(regexp, s) {
  assertStringMatcherConsistentWithPattern(regexp, s);
  for (let i = 0; i < s.length; i++) {
    assertStringMatcherConsistentWithPattern(regexp, s.substring(0, i) + s.substring(i + 1));
    assertStringMatcherConsistentWithPattern(regexp, s.substring(0, i) + 'x' + s.substring(i + 1));
  }
  assertStringMatcherConsistentWithPattern(regexp, 'a' + s);
  assertStringMatcherConsistentWithPattern(regexp, s + 'a');
}

// Java: StringMatcherTest#assertPossibleValues
function assertPossibleValues(regexp, ...expected) {
  const actual = StringMatcher.getPossibleRegexpValues(regexp);
  expect(actual === null ? null : new Set([...actual])).toEqual(expected.length === 0 ? null : new Set(expected));
  for (const s of expected) {
    trySomeMutations(regexp, s);
  }
  trySomeMutations(regexp, regexp);
}

// Java: StringMatcherTest#assertRequiredSubstrings
function assertRequiredSubstrings(regexp, expected) {
  const actual = StringMatcher.getRequiredSubstrings(regexp);
  expect(actual === null ? null : actual.toString()).toBe(expected);

  trySomeMutations(regexp, regexp);
  if (expected !== null) {
    trySomeMutations(regexp, expected);
    trySomeMutations(regexp, expected.substring(1, expected.length - 1));
  }
  if (actual !== null) {
    for (const separator of ['', 'a', '0', ' ']) {
      trySomeMutations(regexp, actual.substrings.join(separator));
      trySomeMutations(regexp, separator + actual.substrings.join(separator));
      trySomeMutations(regexp, actual.substrings.join(separator) + separator);
    }
  }
}

describe('StringMatcherTest', () => {
  // Java: StringMatcherTest#syntaxIsValidated
  it('syntaxIsValidated', () => {
    expect(() => StringMatcher.regexp('tú|?')).toThrow(PatternSyntaxException);
  });

  // Java: StringMatcherTest#testGetPossibleValues
  it('testGetPossibleValues', () => {
    assertPossibleValues('x.*');
    assertPossibleValues('x+');
    assertPossibleValues('a.c');
    assertPossibleValues('a{2}');
    assertPossibleValues('[a-z]', ...range('a', 'z'));
    assertPossibleValues('[^a]');
    assertPossibleValues('a[a-z]', ...range('a', 'z').map((c) => 'a' + c));
    assertPossibleValues('(?=a)');

    assertPossibleValues('[A-Z]', ...range('A', 'Z'));
    assertPossibleValues('[ -~]'); // space (0x20) to tilde (0x7e), width 94 > 64
    assertPossibleValues('[a-z]+');
    assertPossibleValues('[a-z]*');

    assertPossibleValues('', '');
    assertPossibleValues('^x$', 'x');
    assertPossibleValues('aa|bb', 'aa', 'bb');
    assertPossibleValues('aa', 'aa');
    assertPossibleValues('aa|', 'aa', '');
    assertPossibleValues('aa?', 'aa', 'a');
    assertPossibleValues('[abc]', 'a', 'b', 'c');
    assertPossibleValues('[abc]', 'a', 'b', 'c');
    assertPossibleValues('a(bc)?', 'a', 'abc');
    assertPossibleValues('a(b|c)', 'ab', 'ac');
    assertPossibleValues('(a|b)(c|d)', 'ac', 'ad', 'bc', 'bd');
    assertPossibleValues('\\.|\\-', '.', '-');
    assertPossibleValues('[\\.\\-]', '.', '-');
    assertPossibleValues('are|is|w(?:as|ere)', 'are', 'is', 'was', 'were');
    assertPossibleValues('[,;:-]', ',', ';', ':', '-');
    assertPossibleValues('(?:[-‑])', '-', '‑');
    assertPossibleValues('[0-9]', ...range('0', '9'));
    assertPossibleValues('[0-9X]', ...range('0', '9'), 'X');
    assertPossibleValues('tú|\\?', 'tú', '?');
    assertPossibleValues('NN|PRP\\$', 'NN', 'PRP$');
    assertPossibleValues('\\\\b', '\\b');
  });

  // Java: StringMatcherTest#requiredSubstrings
  it('requiredSubstrings', () => {
    assertRequiredSubstrings('', '[]');
    assertRequiredSubstrings('foo', '[foo]');
    assertRequiredSubstrings('foo|bar', null);
    assertRequiredSubstrings('\\w', null);
    assertRequiredSubstrings('PRP.+', '[PRP)');
    assertRequiredSubstrings('.*PRP.+', '(PRP)');
    assertRequiredSubstrings('.*PRP', '(PRP]');
    assertRequiredSubstrings('.+PRP', '(PRP]');
    assertRequiredSubstrings('a.+b', '[a, b]');
    assertRequiredSubstrings('a.*b', '[a, b]');
    assertRequiredSubstrings('\\bZünglein an der (Wage)\\b', '[Zünglein an der Wage]');
    assertRequiredSubstrings('(ökumenische[rn]?) (.*Messen?)', '[ökumenische,  , Messe)');
    assertRequiredSubstrings('(CO2|Kohlendioxid|Schadstoff)\\-?Emulsion(en)?', '(Emulsion)');
    assertRequiredSubstrings('\\bder (\\w*(Verkehrs|Verbots|Namens|Hinweis|Warn)schild)', '[der , schild]');
    assertRequiredSubstrings('\\bvon Seiten\\b', '[von Seiten]');
    assertRequiredSubstrings('((\\-)?[0-9]+[0-9.,]{0,15})(?:[\\s  ]+)(°[^CFK])', '(°)');
    assertRequiredSubstrings('\\b(teils\\s[^,]+\\steils)\\b', '[teils, teils]');
    assertRequiredSubstrings('§ ?(\\d+[a-z]?)', '[§)');
  });

  // Java: StringMatcherTest#noSOEOnLongDisjunction
  it('noSOEOnLongDisjunction', () => {
    const count = 100000;
    const pattern = Array.from({ length: count }, (_, i) => 'a' + i).join('|');
    const matcher = StringMatcher.create(pattern, true, true);
    for (let i = 0; i < count; i++) {
      expect(matcher.matches('a' + i)).toBe(true);
      expect(matcher.matches('b' + i)).toBe(false);
    }
  }, 60000);

  // Java: StringMatcherTest#specializedSequenceMatcherIsConsistent
  it('specializedSequenceMatcherIsConsistent', () => {
    const regexps = [
      '[a-z]+|,', "['-].+", "[^'-].+", '\\p{L}', '\\p{Ll}.+', '\\p{Lu}.+', '[a-z]+', '\\d+',
      '[1234567890]{1,2}', '[1234567890][1234567890., ]+[1234567890]', '\\p{P}\\p{P}+', '[_~°]+',
      '0o[0-7]+', '0x[0-9A-Fa-f]+', '[A-Z]+\\d+', '#.+', '@.+', '.+e', '.+[aei]sses', 'a.*b', 'a.+b',
      'aa?', 'a{2,3}b', '[a-c]?[0-9]*x', '(?-i)Han', '\\.|\\-', '[\\d ,\\.]+', '−?[\\d .,]+%?',
      '[a-z]+|,|[0-9]', '\\p{Lu}.*', '\\w+', '\\d?', 'a|', '|a', '\\p{N}+', '[^a-z]+', '[abc]*d',
      'x*', 'x+', 'x?', '[^\\d]+',
    ];
    const alphabet = ['a', 'A', 'b', 'B', '1', '-', '.', ' ', 'à', 'À', 'ç', 'Ç', '·', 'é', 'É', '_', 'x', 'X'];
    const samples = [''];
    for (const c1 of alphabet) {
      samples.push(c1);
      for (const c2 of alphabet) {
        samples.push(c1 + c2);
        for (const c3 of alphabet) {
          samples.push(c1 + c2 + c3);
        }
      }
    }
    for (const regexp of regexps) {
      for (const caseSensitive of [true, false]) {
        const reference = Pattern.compile(regexp, caseSensitive ? 0 : Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
        const matcher = StringMatcher.create(regexp, true, caseSensitive);
        for (const sample of samples) {
          expect(matcher.matches(sample), `regexp '${regexp}', caseSensitive=${caseSensitive}, input '${sample}'`)
            .toBe(reference.matcher(sample).matches());
        }
      }
    }
  }, 120000);
});
