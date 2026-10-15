// Ported from UppercaseSentenceStartRuleTest (en module); the full en rule list is F17: only the English UppercaseSentenceStartRule is added
import { describe, it, expect } from 'vitest';
import { UppercaseSentenceStartRule } from '../../../src/core/rules/UppercaseSentenceStartRule.js';
import { Example } from '../../../src/core/rules/model/Examples.js';
import { getUrl } from '../../../src/core/Tools.js';
import { Languages } from '../../../src/core/Languages.js';
import { EN, englishMessages, newLt, useNoopAnalysis } from '../../support/ruleTestSupport.js';

describe('EnglishUppercaseSentenceStartRuleTest', () => {
  const english = Languages.getLanguageForShortCode('en');
  useNoopAnalysis(english);

  // Java: UppercaseSentenceStartRuleTest#testRule
  it('testRule', () => {
    const lt = newLt(english, new UppercaseSentenceStartRule(englishMessages(), english,
      Example.wrong("This house is old. <marker>it</marker> was built in 1950."),
      Example.fixed("This house is old. <marker>It</marker> was built in 1950."),
      getUrl("https://languagetool.org/insights/post/spelling-capital-letters/")));
    expect(lt.check("v8.2.0 has been released").length).toBe(0);
    expect(lt.check("In Nov. next year.").length).toBe(0);
    expect(lt.check("www.languagetool.org is a website.").length).toBe(0);
    expect(lt.check("Languagetool.org is a website.").length).toBe(0);
    expect(lt.check("1. an item in a list\n2. another item.").length).toBe(0);
    expect(lt.check("This is a sentence. microRNA is the start of another sentence.").length).toBe(0);
    expect(lt.check("This is a sentence. mRNA is the start of another sentence.").length).toBe(0);
    expect(lt.check("This is a sentence. iDeal is the start of another sentence.").length).toBe(0);
    // PENDING (needs the _IS_URL tag of the English disambiguator, F32/F45): languagetool.org is a website. -> 0
    expect(lt.check("a sentence.").length).toBe(1);
    expect(lt.check("a sentence!").length).toBe(1);
    expect(lt.check("— Dash introducing enumeration item!").length).toBe(0);
    expect(lt.check("— dash introducing enumeration item!").length).toBe(0);
    expect(lt.check("Hi Mr. Miller,\n\n\u00A0\n\nhow are you?").length).toBe(0); // special case for paste from e.g. Outlook
    expect(lt.check("ℹ\uFE0F Tree Structure.").length).toBe(0);
    expect(lt.check("ℹ Tree Structure.").length).toBe(0);
  });
});
