// Ported from PolishUnpairedBracketsRuleTest (pl module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { Polish } from '../../../../src/lang/pl/language/Polish.js';
import { PolishUnpairedBracketsRule } from '../../../../src/lang/pl/rules/PolishUnpairedBracketsRule.js';
import { englishMessages } from '../../../support/ruleTestSupport.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule();

describe('PolishUnpairedBracketsRuleTest', () => {
  // Java: PolishUnpairedBracketsRuleTest#testRulePolish
  it('testRulePolish', () => {
    const language = new Polish();
    const rule = new PolishUnpairedBracketsRule(englishMessages(), language);
    const lt = new JLanguageTool(language);
    const n = (s) => rule.match([lt.getAnalyzedSentence(s)]).length;
    expect(n('(To jest zdanie do testowania).')).toBe(0);
    expect(n('Piosenka ta trafiła na wiele list "Best of...", włączając w to te, które zostały utworzone przez magazyn Rolling Stone.')).toBe(0);
    expect(n('A "B" C.')).toBe(0);
    expect(n('"A" B "C".')).toBe(0);
    expect(n('W tym zdaniu jest niesparowany „cudzysłów.')).toBe(1);
  });
});
