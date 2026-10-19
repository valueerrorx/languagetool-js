// Ported from AbstractSimpleReplaceRule2Test (languagetool-core); data /xx/abstract_simple_replace2.txt via the xx test resources
import { describe, it, expect } from 'vitest';
import { AbstractSimpleReplaceRule2, CaseSensitivy } from '../../../src/core/rules/AbstractSimpleReplaceRule2.js';
import { Locale } from '../../../src/lib/java/Locale.js';
import { englishMessages, newLt } from '../../support/ruleTestSupport.js';
import { getDemoLanguage, useXxTestResources } from '../../support/DemoLanguage.js';

// Java: AbstractSimpleReplaceRule2Test.MyCaseSensitiveRule
class MyCaseSensitiveRule extends AbstractSimpleReplaceRule2 {
  // Java: MyCaseSensitiveRule#getFileNames()
  getFileNames() {
    return ['/xx/abstract_simple_replace2.txt'];
  }

  // Java: MyCaseSensitiveRule#getId()
  getId() {
    return 'ABSTRACT_TEST_RULE';
  }

  // Java: MyCaseSensitiveRule#getDescription()
  getDescription() {
    return 'internal test rule';
  }

  // Java: MyCaseSensitiveRule#getShort()
  getShort() {
    return 'internal test rule';
  }

  // Java: MyCaseSensitiveRule#getMessage()
  getMessage() {
    return 'fake suggestion';
  }

  // Java: MyCaseSensitiveRule#getSuggestionsSeparator()
  getSuggestionsSeparator() {
    return ',';
  }

  // Java: MyCaseSensitiveRule#getLocale()
  getLocale() {
    return Locale.ENGLISH;
  }

  // Java: MyCaseSensitiveRule#getCaseSensitivy()
  getCaseSensitivy() {
    return CaseSensitivy.CS;
  }
}

// Java: AbstractSimpleReplaceRule2Test.MyCaseInsensitiveRule
class MyCaseInsensitiveRule extends MyCaseSensitiveRule {
  // Java: MyCaseInsensitiveRule#getCaseSensitivy()
  getCaseSensitivy() {
    return CaseSensitivy.CI;
  }
}

describe('AbstractSimpleReplaceRule2Test', () => {
  useXxTestResources();

  // Java: AbstractSimpleReplaceRule2Test#testRule
  it('testRule', () => {
    const lang = getDemoLanguage();
    const csRule = new MyCaseSensitiveRule(englishMessages(), lang);
    const lt = newLt(lang);
    expect(csRule.match(lt.getAnalyzedSentence('But a propos')).length).toBe(1);
    expect(csRule.match(lt.getAnalyzedSentence('But A propos')).length).toBe(0);
    expect(csRule.match(lt.getAnalyzedSentence('A propos')).length).toBe(0);
    expect(csRule.match(lt.getAnalyzedSentence('a propos')).length).toBe(1);
    expect(csRule.match(lt.getAnalyzedSentence('A Pokemon')).length).toBe(1);
    expect(csRule.match(lt.getAnalyzedSentence('A pokemon')).length).toBe(0);

    const ciRule = new MyCaseInsensitiveRule(englishMessages(), lang);
    expect(ciRule.match(lt.getAnalyzedSentence('But a propos')).length).toBe(1);
    expect(ciRule.match(lt.getAnalyzedSentence('But A propos')).length).toBe(1);
    expect(ciRule.match(lt.getAnalyzedSentence('A propos')).length).toBe(1);
    expect(ciRule.match(lt.getAnalyzedSentence('a propos')).length).toBe(1);
    expect(ciRule.match(lt.getAnalyzedSentence('A Pokemon')).length).toBe(1);
    expect(ciRule.match(lt.getAnalyzedSentence('A pokemon')).length).toBe(1);
  });
});
