import { describe, it, expect } from 'vitest';
import { loadProperties } from '../../../src/lib/java/Properties.js';
import { MessageFormat } from '../../../src/lib/java/MessageFormat.js';
import { ListResourceBundle } from '../../../src/lib/java/ResourceBundle.js';
import { i18n } from '../../../src/core/Tools.js';
import { getMessageBundle } from '../../../src/core/resources/ResourceBundleTools.js';
import { IllegalArgumentException, MissingResourceException } from '../../../src/lib/java/errors.js';

// expected values from tests/golden/X-I18N (Java 17 runs)
describe('MessageFormat / Tools.i18n (X-I18N)', () => {
  const fmt = (p, ...a) => i18n(new ListResourceBundle([['p', p]]), 'p', ...a);
  it('quotes and placeholders', () => {
    expect(fmt("It's")).toBe('Its');
    expect(fmt("''{0}''", 'x')).toBe("'x'");
    expect(fmt('{1}', 'a')).toBe('{1}');
    expect(fmt('{0} {0}', 1000n)).toBe('1,000 1,000');
  });
  it('number, choice, date subformats', () => {
    expect(fmt('{0,number,#.##}', 1234.5678)).toBe('1234.57');
    expect(fmt('{0}', 0.0015)).toBe('0.002');
    expect(fmt('{0}', 0.0005)).toBe('0');
    expect(fmt('{0}', -0)).toBe('-0');
    expect(fmt('{0,choice,0#none|1#one|1<many {0}}', 5n)).toBe('many 5');
  });
  it('malformed patterns throw IllegalArgumentException', () => {
    expect(() => new MessageFormat('{0')).toThrow(IllegalArgumentException);
    expect(() => new MessageFormat('{0,foo}')).toThrow('unknown format type: foo');
    expect(() => new MessageFormat('{a}')).toThrow("can't parse argument number: a");
  });
});

describe('properties and bundle fallback (X-I18N)', () => {
  it('parses properties escapes and continuations', () => {
    const p = loadProperties('a=1\nb : x\\u00e4\\\n  y\n# c\n!d\ne\n');
    expect(p.get('a')).toBe('1');
    expect(p.get('b')).toBe('xäy');
    expect(p.get('e')).toBe('');
  });
  it('default message bundle resolves keys, missing key throws', () => {
    const b = getMessageBundle();
    expect(b.getString('checkDone')).toBe('Potential problems found: {0} (time: {1}ms)');
    expect(() => b.getString('no_such_key_xyz')).toThrow(MissingResourceException);
  });
});
