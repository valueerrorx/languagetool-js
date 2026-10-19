// Ported from ToolsTest#testCorrectTextFromMatches (the selectRules tests live in tests/core/JLanguageToolTest.test.js) plus getStream/getFullStackTrace/linguistic services
import { describe, it, expect } from 'vitest';
import { PatternRule } from '../../../src/core/patterns/PatternRule.js';
import { PatternToken } from '../../../src/core/patterns/PatternToken.js';
import { RuleMatch } from '../../../src/core/rules/model/RuleMatch.js';
import { correctTextFromMatches, getFullStackTrace, getLinguisticServices, getStream, isExternSpeller, setLinguisticServices } from '../../../src/core/Tools.js';
import { IOException, IllegalStateException, RuntimeException } from '../../../src/lib/java/errors.js';
import { getDemoLanguage } from '../../support/DemoLanguage.js';

// Java: ToolsTest.FakeRule
class FakeRule extends PatternRule {
  constructor() {
    super('FAKE_ID', getDemoLanguage(), [new PatternToken('foo', true, false, false)], 'My fake description', 'Fake message', 'Fake short message');
  }
}

describe('ToolsTest', () => {
  // Java: ToolsTest#testCorrectTextFromMatches
  it('testCorrectTextFromMatches', () => {
    const match1 = new RuleMatch(new FakeRule(), null, 0, 9, 'msg1');
    match1.setSuggestedReplacement("I've had");
    const match2 = new RuleMatch(new FakeRule(), null, 0, 9, 'msg2');
    match2.setSuggestedReplacement('I have');
    expect(correctTextFromMatches("I've have", [match1, match2])).toBe("I've had");
  });

  // Java: Tools#getFullStackTrace(Throwable)
  it('getFullStackTrace', () => {
    const st = getFullStackTrace(new RuntimeException('outer', new IOException('inner')));
    expect(st.startsWith('java.lang.RuntimeException: outer\n')).toBe(true);
    expect(st).toContain('Caused by: java.io.IOException: inner');
    expect(getFullStackTrace(new IllegalStateException('x')).endsWith('\n')).toBe(true);
  });

  // Java: Tools#getStream(String) / getStream(String,String)
  it('getStream', () => {
    expect(() => getStream('/org/languagetool/nonexistent.txt')).toThrow("Could not load file from classpath: '/org/languagetool/nonexistent.txt'");
    const data = getStream('/org/languagetool/rules/false-friends.dtd');
    expect(data.length).toBe(2044);
    expect(getStream('/org/languagetool/rules/false-friends.dtd', '3294509580a1b26701e5c7663237124bfdb9034dd710febc30f13b4b8053797b').length).toBe(2044);
    expect(() => getStream('/org/languagetool/rules/false-friends.dtd', 'abc')).toThrow(/^Checksum mismatch for the file '.*': expected abc, got 3294/);
  });

  // Java: Tools#setLinguisticServices(LinguServices)
  it('linguisticServices', () => {
    expect(isExternSpeller()).toBe(false);
    setLinguisticServices({});
    expect(isExternSpeller()).toBe(true);
    expect(getLinguisticServices()).not.toBeNull();
    setLinguisticServices(null);
    expect(isExternSpeller()).toBe(false);
  });
});
