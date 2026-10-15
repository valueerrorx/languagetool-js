// Tests for the F16 shared helpers: StringUtils#isNumeric/isNumericSpace/equalsAny, java.net.URL, Tools#getUrl, MessageFormat#format
import { describe, it, expect } from 'vitest';
import { isNumeric, isNumericSpace, equalsAny } from '../../../src/lib/java/StringUtils.js';
import { URL, MalformedURLException } from '../../../src/lib/java/URL.js';
import { MessageFormat } from '../../../src/lib/java/MessageFormat.js';
import { getUrl } from '../../../src/core/Tools.js';
import { RuntimeException } from '../../../src/lib/java/errors.js';

describe('F16 helpers', () => {
  it('isNumeric', () => {
    expect(isNumeric('123')).toBe(true);
    expect(isNumeric('')).toBe(false);
    expect(isNumeric(null)).toBe(false);
    expect(isNumeric('12 3')).toBe(false);
    expect(isNumeric('١٢')).toBe(true); // Arabic-indic digits: Character.isDigit
    expect(isNumeric('1.5')).toBe(false);
  });
  it('isNumericSpace', () => {
    expect(isNumericSpace('1 000 000')).toBe(true);
    expect(isNumericSpace('')).toBe(true);
    expect(isNumericSpace(null)).toBe(false);
    expect(isNumericSpace('1a')).toBe(false);
  });
  it('equalsAny', () => {
    expect(equalsAny('a', 'b', 'a')).toBe(true);
    expect(equalsAny('a')).toBe(false);
    expect(equalsAny(null, null)).toBe(true);
  });
  it('URL and getUrl', () => {
    expect(new URL('https://languagetool.org/x#y').toString()).toBe('https://languagetool.org/x#y');
    expect(() => new URL('foo')).toThrow(MalformedURLException);
    expect(() => new URL('foo://x')).toThrow('unknown protocol: foo');
    expect(getUrl('http://fake').toString()).toBe('http://fake');
    expect(() => getUrl('nope')).toThrow(RuntimeException);
  });
  it('MessageFormat.format', () => {
    expect(MessageFormat.format('Unpaired symbol: \'\'{0}\'\' seems to be missing', ']')).toBe("Unpaired symbol: ']' seems to be missing");
  });
});
