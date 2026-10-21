// Ported from GermanCommaWhitespaceRuleTest (de)
import { describe, it, expect } from 'vitest';
import { Languages } from '../../../../src/core/Languages.js';
import { GermanCommaWhitespaceRule } from '../../../../src/lang/de/rules/GermanCommaWhitespaceRule.js';
import { Example } from '../../../../src/core/rules/model/Examples.js';
import { getUrl } from '../../../../src/core/Tools.js';
import { englishMessages, newLt } from '../../../support/ruleTestSupport.js';

describe('GermanCommaWhitespaceRuleTest', () => {
  // Java: GermanCommaWhitespaceRuleTest#testRule
  it('testRule', () => {
    const rule = new GermanCommaWhitespaceRule(englishMessages(),
      Example.wrong('Die Partei<marker> ,</marker> die die letzte Wahl gewann.'),
      Example.fixed('Die Partei<marker>,</marker> die die letzte Wahl gewann.'),
      getUrl('http://fake'));
    const lt = newLt(Languages.getLanguageForShortCode('de')); // Java: new JLanguageTool(de), only used for getAnalyzedSentence
    expect(rule.match(lt.getAnalyzedSentence('Es gibt 5 Millionen .de-Domains.')).length).toBe(0);
  });
});
