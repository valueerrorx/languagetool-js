import { describe, it, expect } from 'vitest';
import { Pattern } from '../../../../src/lib/java/regex/index.js';

describe('Matcher null input', () => {
  // Java: Pattern#matcher(null) -> NPE from Matcher#reset()
  it('throws the JDK 17 NPE', () => {
    expect(() => Pattern.compile('a').matcher(null)).toThrow('Cannot invoke "java.lang.CharSequence.length()" because "this.text" is null');
  });
});
