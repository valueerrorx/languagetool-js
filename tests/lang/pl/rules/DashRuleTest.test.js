// Ported from DashRuleTest (pl module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { Polish } from '../../../../src/lang/pl/language/Polish.js';
import { DashRule } from '../../../../src/lang/pl/rules/DashRule.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule();

describe('DashRuleTest (pl)', () => {
  const lang = new Polish();
  const lt = new JLanguageTool(lang);
  const rule = new DashRule(JLanguageTool.getMessageBundle(lang));

  // Java: DashRuleTest#check(int,String,String[])
  const check = (expectedErrors, text, expSuggestions = null) => {
    const ruleMatches = rule.match(lt.getAnalyzedSentence(text));
    expect(ruleMatches.length).toBe(expectedErrors);
    if (expSuggestions !== null) {
      expect(ruleMatches[0].getSuggestedReplacements()).toEqual(expSuggestions);
    }
  };

  // Java: DashRuleTest#testRule
  it('testRule', () => {
    check(0, 'Nie róbmy nic na łapu-capu.');
    check(0, 'Jedzmy kogel-mogel.');
    check(0, 'To jest ładna nota — bene, bene — odpowiedział Józek.');
    check(1, 'bim – bom', ['bim-bom']);
    check(1, 'Papua–Nowa Gwinea', ['Papua-Nowa']);
    check(1, 'Papua — Nowa Gwinea', ['Papua-Nowa']);
    check(1, 'Aix — en — Provence', ['Aix-en-Provence']);
  });
});
